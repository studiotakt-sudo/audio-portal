# Client self-signup — setup guide

The code for signup, the pending-approval gate, and admin approval is built.
Three things happen in dashboards (not code). Do them in order.

## 1. Run the migration
In the Supabase SQL editor, run `migrations/phase8_signup.sql`.
It adds the `approved` flag, makes existing clients approved, gates the RLS
policies on approval, and lets a new user create their own pending profile.

## 2. Turn ON email confirmation (Supabase)
Supabase dashboard → Authentication → Providers → Email.
- Ensure "Confirm email" is ENABLED. (New signups must click a link before they
  can sign in — this verifies the address and blocks bots.)
- Authentication → URL Configuration: set "Site URL" to your live portal URL
  (e.g. https://your-portal.vercel.app) so the confirmation link points home.

## 3. Get an email when someone signs up (Resend + webhook)
This sends YOU a note whenever a new pending client row is created.

a) Create a free account at resend.com. Verify a sending domain (or use their
   onboarding sandbox sender to start). Create an API key.

b) Supabase dashboard → Database → Webhooks → Create a new hook:
   - Table: `clients`
   - Events: Insert
   - Type: HTTP Request → POST to the Resend API
     URL:  https://api.resend.com/emails
     Headers:
       Authorization: Bearer YOUR_RESEND_API_KEY
       Content-Type: application/json
     Body (JSON):
       {
         "from": "portal@your-domain.com",
         "to": "you@your-domain.com",
         "subject": "New Cypher Cache signup",
         "html": "Someone requested access. Check the Clients → Pending list in the admin panel."
       }

   (Supabase can template the new row's fields into the body; the static message
   above is enough to prompt you to go approve them. If you want the person's
   email in the notification, include `{{ record.email }}` in the html.)

Alternative to the webhook: the project already has a Supabase Edge Function
(`admin-users`). A small `notify` function could send via Resend from code
instead — more control, more setup. The webhook above is the low-effort path.

## How it works once live
1. You share the portal link. New person clicks "Request access", enters name +
   email + password.
2. Supabase sends them a confirmation email. They click it.
3. On first sign-in they get a "waiting for approval" screen and can see nothing.
   (RLS guarantees this even if they poke at the browser console.)
4. You get a Resend email. In the admin panel, Clients tab shows a "pending
   signups" box. Approve (they get in) or Reject (account removed).
5. Approved clients see all unrestricted published tracks, exactly like clients
   you create by hand.

## Security summary
- Passwords: handled by Supabase Auth (bcrypt, server-side). Never in the browser.
- Email confirmation: blocks bots, verifies the address.
- Approval gate: enforced in the DATABASE via RLS (`current_client_id()` returns
  nothing for unapproved users), so an unapproved account cannot read tracks even
  by bypassing the app.
- A self-signup can only ever create an unapproved `client` row for their own
  auth id — they cannot self-approve or make themselves admin.
