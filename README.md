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
2. Apply the schema and sample data, either with the Supabase CLI:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

   or by pasting `supabase/migrations/*.sql` and then `supabase/seed.sql` into the SQL editor.

After editing `lib/data/seed-data.ts`, regenerate the SQL with `npm run db:seed-sql`.

## Scripts

| Script               | What it does                            |
| -------------------- | --------------------------------------- |
| `npm run dev`        | Dev server                              |
| `npm run build`      | Production build (includes type check)  |
| `npm run lint`       | ESLint                                  |
| `npm run typecheck`  | `tsc --noEmit`                          |
| `npm run db:seed-sql`| Regenerate `supabase/seed.sql`          |
