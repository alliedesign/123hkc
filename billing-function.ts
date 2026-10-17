// Supabase Edge Function "billing": all Stripe work happens here, on the server.
// Secrets needed (Supabase > Edge Functions > Secrets): STRIPE_SECRET_KEY, SITE_URL
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FEE_CENTS = 2000; // $20 per accepted request

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

async function stripe(path: string, method: string, params?: Record<string, string>, idem?: string) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Payments aren't set up yet (missing STRIPE_SECRET_KEY secret).");
  const headers: Record<string, string> = { Authorization: "Bearer " + key };
  let body: string | undefined;
  if (params) { body = new URLSearchParams(params).toString(); headers["content-type"] = "application/x-www-form-urlencoded"; }
  if (idem) headers["Idempotency-Key"] = idem;
  const r = await fetch("https://api.stripe.com" + path, { method, headers, body });
  const data = await r.json();
  if (!r.ok) {
    const e = new Error(data?.error?.message || "Stripe request failed") as Error & { stripe?: unknown };
    e.stripe = data?.error;
    throw e;
  }
  return data;
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Please log in first." }, 401);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "Please log in again." }, 401);
    const uid = u.user.id;
    const { data: prof } = await admin.from("profiles").select("role,name,email").eq("id", uid).maybeSingle();
    if (!prof || prof.role !== "pro") return json({ error: "Only pro accounts can use billing." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // Find or create this pro's Stripe customer
    async function customerId(create: boolean): Promise<string | null> {
      const { data: b } = await admin.from("pro_billing").select("stripe_customer_id").eq("pro_id", uid).maybeSingle();
      if (b?.stripe_customer_id) return b.stripe_customer_id;
      if (!create) return null;
      const c = await stripe("/v1/customers", "POST", { email: prof!.email, name: prof!.name, "metadata[pro_id]": uid });
      const { error } = await admin.from("pro_billing").insert({ pro_id: uid, stripe_customer_id: c.id });
      if (error) throw new Error(error.message);
      return c.id;
    }
    async function card(cus: string) {
      const l = await stripe(`/v1/payment_methods?customer=${encodeURIComponent(cus)}&type=card&limit=1`, "GET");
      const pm = l.data?.[0];
      return pm ? { id: pm.id as string, brand: pm.card?.brand as string, last4: pm.card?.last4 as string } : null;
    }

    if (action === "status") {
      const cus = await customerId(false);
      const c = cus ? await card(cus) : null;
      return json({ card: c ? { brand: c.brand, last4: c.last4 } : null });
    }

    if (action === "setup") {
      const cus = await customerId(true);
      const site = (Deno.env.get("SITE_URL") || req.headers.get("origin") || "").replace(/\/$/, "");
      if (!site) return json({ error: "SITE_URL secret is not set." }, 500);
      const s = await stripe("/v1/checkout/sessions", "POST", {
        mode: "setup", customer: cus!, "payment_method_types[0]": "card",
        success_url: site + "/pro/?card=added", cancel_url: site + "/pro/?card=cancelled",
      });
      return json({ url: s.url });
    }

    if (action === "accept") {
      const offerId = String(body.offer_id || "");
      const { data: o } = await admin.from("offers").select("id,pro_id,request_id,status").eq("id", offerId).maybeSingle();
      if (!o || o.pro_id !== uid) return json({ error: "Request not found." }, 404);
      if (o.status === "accepted") return json({ ok: true, already: true });
      if (o.status !== "requested") return json({ error: "This request can no longer be accepted." }, 409);
      const cus = await customerId(false);
      const c = cus ? await card(cus) : null;
      if (!cus || !c) return json({ error: "Add a payment card in Billing first." }, 402);
      let pi;
      try {
        pi = await stripe("/v1/payment_intents", "POST", {
          amount: String(FEE_CENTS), currency: "usd", customer: cus, payment_method: c.id,
          off_session: "true", confirm: "true", receipt_email: prof.email,
          description: "Home Key Clean: accepted request",
          "metadata[offer_id]": o.id, "metadata[request_id]": o.request_id, "metadata[pro_id]": uid,
        }, `accept-${o.id}-${c.id}`);
      } catch (e) {
        const se = (e as { stripe?: { payment_intent?: { id: string } } }).stripe;
        if (se?.payment_intent?.id) { try { await stripe(`/v1/payment_intents/${se.payment_intent.id}/cancel`, "POST", {}); } catch (_) { /* ignore */ } }
        return json({ error: "Your card was declined: " + (e as Error).message + " Update your card in Billing and try again." }, 402);
      }
      if (pi.status !== "succeeded") {
        try { await stripe(`/v1/payment_intents/${pi.id}/cancel`, "POST", {}); } catch (_) { /* ignore */ }
        return json({ error: "Your bank needs extra verification for this payment. Update your card in Billing and try again." }, 402);
      }
      const { error: fe } = await admin.rpc("finalize_accept", { p_offer: o.id, p_pro: uid, p_pi: pi.id });
      if (fe) return json({ error: "Payment went through but the request could not be updated: " + fe.message + ". Contact support with reference " + pi.id + "." }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || "Something went wrong." }, 500);
  }
}

Deno.serve(handle);
