# Home Key Clean: turning on real accounts and messaging

The site needs a database so clients and pros on different devices can see each other.
This uses Supabase (free plan is enough to start). Takes about 10 minutes.

## 1. Create the database
1. Go to supabase.com, sign in, and click **New project**. Pick any name and region, and save the database password.
2. When the project is ready, open **SQL Editor > New query**.
3. Open `supabase-setup.sql` from this folder, copy everything, paste it in, and click **Run**.
   You should see "Success. No rows returned". It is safe to run again.

## 2. Sign-up settings
1. **Authentication > Sign In / Providers > Email**:
   - For testing, turn **Confirm email** OFF so new accounts work instantly.
   - When you launch, turn it ON. The site already handles this: it keeps the client's booking and submits it after they confirm and log in. For real email delivery, set up your own SMTP under Authentication > Emails, because Supabase's built-in sender allows only a few emails per hour.
2. **Authentication > URL Configuration**: set **Site URL** to your live address (for example https://homekeyclean.com).

## 3. Connect the site
1. In Supabase, open **Project Settings > API**. Copy the **Project URL** and the **anon public** key.
2. In your GitHub repo, open `config.js`, click the pencil icon, paste both values between the quotes, and commit.
   Only ever use the anon key. Never paste the `service_role` key anywhere on the site.

## 4. Upload the new files
Drag every file from this folder into your GitHub repo (Add file > Upload files) and commit. There are no sub-folders, so names can't get mixed up. Same-named files are replaced. Netlify redeploys automatically.

## 5. Turn on Stripe payments ($20 when a pro accepts)
Card details are handled entirely by Stripe. The website never sees a card number, and the secret key stays on Supabase's servers, never in GitHub.
1. **Re-run `supabase-setup.sql`** in the SQL Editor (it is safe to run again). This makes accepting require a successful payment, so pros can't skip it.
2. In Supabase, open **Edge Functions > Deploy a new function > Via Editor**. Name it exactly `billing`. Delete the sample code, paste in everything from `billing-function.ts`, and click **Deploy**.
3. In **Edge Functions > Secrets**, add two secrets:
   - `STRIPE_SECRET_KEY`: your Stripe secret key (starts with `sk_test_` while testing).
   - `SITE_URL`: your live address with no trailing slash, for example `https://homekeyclean.com`.
4. Make sure `config.js` has your Stripe publishable key (it already contains the test one). It is safe to be public.
5. In Stripe, stay in **Test mode** while you try it. Add a card in the pro portal under **Billing** using the test card `4242 4242 4242 4242`, any future expiry, any CVC.
   - To test a decline, use `4000 0000 0000 0002`.
6. Check that the secret key is only in the Supabase secret, and nowhere else (not in `config.js`, not in GitHub, not in a chat). If it was ever pasted anywhere else, roll it in Stripe under Developers > API keys.

Going live later: finish activating your Stripe account, then replace the test keys with live ones (`pk_live_` in `config.js`, `sk_live_` in the Supabase secret) and test once with a real card.

## 6. Try it
1. Go to `/pro/`, click **Create account**, and sign up as a pro. Choose services and areas as ZIP prefixes (the first 3 digits of a ZIP, so `900-935` covers most of Los Angeles).
2. Create at least 5 pro accounts to see all 5 options. Use a different email for each.
3. On the homepage, run the booking funnel as a client. It creates the account at the last step.
4. Back in the pro portal, the pro sees the request after the client asks for a quote, can accept or decline, and can then message the client.

## How it works
- Matching is done in the database. Each request goes to up to 5 pros who offer that service in that ZIP, picking the pros who have been shown least often first.
- A pro sees only the client's first name, ZIP and job details until they accept. Accepting charges the pro's card $20 through Stripe, then unlocks the client's name, email, phone and the ability to reply.
- Clients can message any matched pro. A pro can reply only after accepting.
- Clients see every job they've requested, which pros were matched, who accepted, and all their conversations, at `/account/`.

## Not included yet
- **Refunds.** Issue them from the Stripe dashboard. The request stays accepted on the site.
- **Stripe webhooks.** Not needed for this flow, but useful later for disputes and payment alerts.
- **Email or text alerts** when a request or message arrives. Pros and clients currently see updates when they open the site.
- **Admin screen** to review pros or remove accounts. Use the Supabase Table Editor for now.
- Pro identity and license checks.
