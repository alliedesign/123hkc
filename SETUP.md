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

## 5. Try it
1. Go to `/pro/`, click **Create account**, and sign up as a pro. Choose services and areas as ZIP prefixes (the first 3 digits of a ZIP, so `900-935` covers most of Los Angeles).
2. Create at least 5 pro accounts to see all 5 options. Use a different email for each.
3. On the homepage, run the booking funnel as a client. It creates the account at the last step.
4. Back in the pro portal, the pro sees the request after the client asks for a quote, can accept or decline, and can then message the client.

## How it works
- Matching is done in the database. Each request goes to up to 5 pros who offer that service in that ZIP, picking the pros who have been shown least often first.
- A pro sees only the client's first name, ZIP and job details until they accept. Accepting records a $20 fee and unlocks the client's name, email, phone and the ability to reply.
- Clients can message any matched pro. A pro can reply only after accepting.
- Clients see every job they've requested, which pros were matched, who accepted, and all their conversations, at `/account/`.

## Not included yet
- **Payments.** Accepted requests are recorded in each pro's Billing tab. Charging the $20 automatically needs Stripe.
- **Email or text alerts** when a request or message arrives. Pros and clients currently see updates when they open the site.
- **Admin screen** to review pros or remove accounts. Use the Supabase Table Editor for now.
- Pro identity and license checks.
