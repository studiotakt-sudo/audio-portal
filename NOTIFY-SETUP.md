# Signup notification email — setup

Emails you whenever someone signs up, via an Edge Function + Resend.
(A plain Supabase→Resend webhook can't work: Supabase sends its own payload
shape, which Resend doesn't accept. The function reshapes it correctly.)

## 1. Deploy the function
    supabase functions deploy notify-signup
(or paste supabase/functions/notify-signup/index.ts into the dashboard's
Edge Functions editor and deploy there.)

## 2. Set the function's secrets
Supabase → Edge Functions → notify-signup → Secrets (or CLI: supabase secrets set):
    RESEND_API_KEY = your Resend API key
    NOTIFY_TO      = the inbox that should receive alerts (your email)
    NOTIFY_FROM    = noreply@contact.cyphercache.music   (your verified sender)

## 3. Point a Database Webhook at the function
Supabase → Database → Webhooks → Create:
    Name:   notify-on-signup
    Table:  clients
    Events: Insert  (only)
    Type:   Supabase Edge Function
    Edge Function: notify-signup
    Method: POST
(Choosing "Supabase Edge Function" as the type wires the URL and auth for you,
so you don't hand-enter the Resend URL or headers — the function holds those.)

## 4. Test
Do a signup through your /signup?code=... link. You should get an email.
If not, check: Edge Functions → notify-signup → Logs (shows what happened and
any Resend error), and the webhook's own delivery history.

## Notes
- from must be your VERIFIED Resend sender (contact.cyphercache.music), or
  Resend rejects it with "not authorized to send" — same rule as the auth emails.
- The function never fails the signup: if the email can't send, it logs and
  returns 200 so the client's account is still created.
