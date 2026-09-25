# Bible Study Directory

Find a Bible study this week: no sign-up, no pressure. Browse, filter, and join a group in ten seconds.

See [docs/PLAN.md](docs/PLAN.md) for the architecture, data model, and roadmap.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Supabase credentials (or an unreachable project) the app runs
on the bundled seed data in `lib/data/seed-data.ts`, and join requests are logged instead of saved.

## Connect Supabase

1. Copy `.env.example` to `.env.local` and fill in your project URL and anon key.
2. Apply the schema and sample data with the Supabase CLI:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push --include-seed
   ```

   The first migration drops the Sep 2026 prototype tables if they exist.
3. In the dashboard, **Authentication → URL Configuration**: set Site URL to `http://localhost:3000`
   (your real domain later) and add `http://localhost:3000/**` to Redirect URLs.
4. Optional but recommended, so sign-in links work when opened on a different device:
   **Authentication → Email Templates → Magic Link**, change the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/leader`
5. Sign in at `/leader`, create your profile, then make yourself an admin in the SQL editor:

   ```sql
   update leaders set is_admin = true, approved = true
   where auth_user_id = (select id from auth.users where email = 'you@example.com');
   ```

Supabase's built-in email only delivers to your project's team members (a few per hour). Before
inviting other leaders, set up custom SMTP (for example Resend) under **Authentication → SMTP**.

After editing `lib/data/seed-data.ts`, regenerate the SQL with `npm run db:seed-sql`.

## Scripts

| Script               | What it does                            |
| -------------------- | --------------------------------------- |
| `npm run dev`        | Dev server                              |
| `npm run build`      | Production build (includes type check)  |
| `npm run lint`       | ESLint                                  |
| `npm run typecheck`  | `tsc --noEmit`                          |
| `npm run db:seed-sql`| Regenerate `supabase/seed.sql`          |
