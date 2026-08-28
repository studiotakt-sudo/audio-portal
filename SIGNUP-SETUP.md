# Invite-only client signup — setup guide

Signup is NOT public. It lives at `/signup?code=XXXX` and only works with a
valid invite code you generate in the admin panel. Even with a valid code, a
new person sees nothing until you approve them.

Do these dashboard steps in order (the code is already built).

## 1. Run the migrations
In the Supabase SQL editor, run BOTH, in order:
- `migrations/phase8_signup.sql`  (approval gate + RLS)
- `migrations/phase9_signup_codes.sql`  (invite codes + company field)

Phase 9 seeds one starter code, `CYPHER-WELCOME`, so you can test right away.

## 2. Turn ON email confirmation (Supabase)
Authentication → Providers → Email: enable "Confirm email".
Authentication → URL Configuration: set "Site URL" to your live portal URL, so
the confirmation link and signup redirect come back to the right place.

## 3. Deploy — the /signup route needs the SPA rewrite
`vercel.json` (included) rewrites all paths to index.html so visiting
`/signup?code=...` directly doesn't 404. Make sure it's in the repo root when
you deploy. (Without it, the signup deep-link 404s on Vercel.)

## 4. Signup email notification to you (Resend + webhook)
So you know when to go approve someone.
- Create a resend.com account, verify a sender, make an API key.
- Supabase → Database → Webhooks → new hook:
  Table `clients`, event Insert, HTTP POST to https://api.resend.com/emails
  Headers: Authorization: Bearer YOUR_KEY / Content-Type: application/json
  Body: {"from":"portal@your-domain.com","to":"you@your-domain.com",
         "subject":"New Cypher Cache signup",
         "html":"Someone signed up. Approve them in the admin Clients tab."}

## Using it day to day
1. Admin panel -> Invites tab -> create a code (label it so you remember who it's
   for). Click "Copy link" — that's {yoursite}/signup?code=CODE.
2. Send that link to the person. They open it, enter Name / Company / Email /
   Password, submit.
3. They confirm via email, then land on a "waiting for approval" screen.
4. You get a Resend email. Clients tab shows them under "pending signups" with
   their company. Approve or Reject.
5. Approved -> they can browse. Rejected -> account removed.

## Managing codes
- Invites tab lists every code with its status (active / disabled / expired).
- Disable a code to stop its link working without deleting it; Enable to re-open.
- Delete removes it permanently.
- One code can invite many people (it's a shared link). Make per-client codes if
  you want to track who used which link.

## Security summary
- Signup requires a valid invite code, checked via a SECURITY DEFINER function
  so the codes table itself is never exposed to the browser.
- Passwords handled by Supabase Auth (bcrypt, server-side).
- Email confirmation verifies the address and blocks bots.
- Approval gate is enforced in the DATABASE via RLS — an unapproved (or
  code-less) user cannot read any track data even via the console.
- A signup can only create an unapproved client row for their own auth id;
  they cannot self-approve or become admin.
