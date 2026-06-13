# Audio Portal

A private client portal for previewing and downloading audio files.

## Stack
- React + Vite (frontend)
- Supabase (database, auth, file storage)
- Vercel (hosting)

## Local development

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to vercel.com, click "Add New Project", import your repo
3. Add these environment variables in Vercel's project settings:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click Deploy

## Adding clients

1. Go to Supabase → Authentication → Users → Add user
2. Enter their email and a temporary password, turn on Auto Confirm
3. Then go to Supabase → SQL Editor and run:
   ```sql
   insert into clients (name, email, role)
   values ('Client Name', 'client@email.com', 'client');
   ```
4. Give the client their email and temporary password to log in
