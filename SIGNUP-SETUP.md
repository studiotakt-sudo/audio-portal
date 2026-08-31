# Invite-only client signup — setup guide

Signup is NOT public. It lives at /signup?code=XXXX and only works with a valid
invite code you generate in the admin Invites tab. Even with a valid code, a new
person sees nothing until you approve them.

## 1. Run the migrations (Supabase SQL editor, in order)
- migrations/phase8_signup.sql   (approval gate + RLS)
- migrations/phase9_signup_codes.sql   (invite codes + company field)
Phase 9 seeds a starter code CYPHER-WELCOME for testing.

## 2. Email confirmation (Supabase)
Authentication -> Providers -> Email: enable "Confirm email".
Authentication -> URL Configuration: set Site URL to your live portal URL.

## 3. Deploy with vercel.json
vercel.json (included) rewrites all paths to index.html so /signup?code=... does
not 404 on Vercel. Keep it in the repo root.

## 4. Signup notification to you (Resend + webhook)
- resend.com account, verify a sender, make an API key.
- Supabase -> Database -> Webhooks -> new hook: table clients, event Insert,
  HTTP POST to https://api.resend.com/emails
  Headers: Authorization: Bearer YOUR_KEY / Content-Type: application/json
  Body: {"from":"portal@your-domain.com","to":"you@your-domain.com",
         "subject":"New Cypher Cache signup",
         "html":"Someone signed up. Approve them in the admin Clients tab."}

## Day to day
1. Admin -> Invites tab -> create a code (label it), Copy link.
2. Send the link. They enter Name / Company / Email / Password.
3. They confirm via email, then see a "waiting for approval" screen.
4. You get a Resend email. Clients tab shows them under pending, with company.
   Approve or Reject.

## Security
- Invite code checked via a SECURITY DEFINER function; codes table never exposed.
- Passwords handled by Supabase Auth (bcrypt).
- Email confirmation verifies address, blocks bots.
- Approval gate enforced in the DATABASE via RLS: unapproved users read nothing.
- A signup can only create an unapproved client row for their own auth id.
