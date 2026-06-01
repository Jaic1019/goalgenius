# GoalGenius — Deployment Guide
# Free hosting: Supabase (DB + Auth) + Vercel (frontend)
# Total time: ~20 minutes

---

## STEP 1 — Create Supabase project (free)

1. Go to https://supabase.com and sign up / log in
2. Click **New project**
3. Name it `goalgenius`, pick a region close to you, set a DB password
4. Wait ~2 minutes for it to provision
5. Go to **Settings > API** and copy:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon public key** → long string starting with `eyJ...`

---

## STEP 2 — Run the database setup

1. In Supabase, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open `SUPABASE_SETUP.sql` from this folder, paste it all, click **Run**
4. You should see "Success" — your tables are ready

---

## STEP 3 — Create your admin account

1. In Supabase: **Authentication > Users > Invite user**
2. Enter your email, click **Send invitation**
3. Check your email, set your password
4. Back in Supabase SQL Editor, run this (replace with your actual email):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'your@email.com');
```

5. Now you're an admin ✅

---

## STEP 4 — Disable email confirmation (for employee accounts)

So employees don't need to verify their email when you create their accounts:

1. Supabase > **Authentication > Settings**
2. Under **Email Auth**, turn OFF **"Enable email confirmations"**
3. Save

---

## STEP 5 — Deploy to Vercel (free)

### Option A: GitHub (recommended)

1. Create a free account at https://github.com
2. Create a new repository called `goalgenius`
3. Upload this entire folder to the repo
4. Go to https://vercel.com, sign up with GitHub
5. Click **Add New > Project**, import your `goalgenius` repo
6. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
7. Click **Deploy**
8. Done! Vercel gives you a URL like `goalgenius.vercel.app`

### Option B: Vercel CLI (if you know the terminal)

```bash
npm install -g vercel
cd goalgenius
cp .env.example .env.local
# Edit .env.local with your Supabase values
vercel --prod
# Follow prompts, add env vars when asked
```

---

## STEP 6 — Create employee accounts

1. Log in to your app at the Vercel URL
2. Go to **Admin > Users**
3. Fill in name, email, and a temporary password
4. Click **Create Account**
5. Share the URL + their email + password with each employee

---

## YOUR APP IS LIVE 🎉

- **App URL**: https://goalgenius.vercel.app (or your custom domain)
- **Admin login**: your email + password from Step 3
- **Free limits**: Supabase free = 50k rows, 500MB. Vercel free = unlimited deploys. Both are way more than enough for 50 employees.

---

## Tips

- **Custom domain**: In Vercel settings you can add a custom domain (e.g. `worldcup.yourcompany.com`) for free
- **Match status**: Use Admin > Matches to set a match to "Live" before it starts and "Finished" once done
- **Results**: Use Admin > Results to enter the final score — points update instantly
- **Leaderboard**: Everyone can see it at /leaderboard — no login needed
