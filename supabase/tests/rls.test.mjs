// Row-level security tests: applies every migration plus seed.sql to an
// in-memory Postgres (PGlite), then checks what visitors, leaders, and admins
// can and can't do. Run with: npm run test:db
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";

const repo = fileURLToPath(new URL("..", import.meta.url)); // supabase/
const db = new PGlite({ extensions: { citext } });

// ── Minimal stand-ins for what Supabase provides ──
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);

// ── The original prototype tables, to prove the reset migration clears them ──
await db.exec(`
  create table bible_studies (id uuid primary key default gen_random_uuid(), title text, audience text,
    day_of_week int, meeting_time time, location text, capacity int, is_active bool);
  create table leaders (id uuid primary key default gen_random_uuid(), name text);
  create table study_leaders (study_id uuid, leader_id uuid);
  create table tags (id uuid primary key, name text);
  create table study_tags (study_id uuid, tag_id uuid);
  create table members (id uuid primary key, name text);
  insert into bible_studies (title, location) values ('Corinthians', 'Newman');
`);

const migrations = readdirSync(`${repo}/migrations`).filter((f) => f.endsWith(".sql")).sort();
for (const f of [...migrations.map((m) => `migrations/${m}`), "seed.sql"]) {
  await db.exec(readFileSync(`${repo}/${f}`, "utf8"));
  console.log("applied", f);
}

let failures = 0;
async function as(role, sub, sql, params) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${sub ?? ""}'; set role ${role};`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}
async function expect(label, fn, check) {
  let result, error;
  try { result = await fn(); } catch (e) { error = e; }
  const ok = check(result, error);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${error ? `  (${error.message})` : ""}`);
}
const rows = (r) => r?.rows?.length ?? -1;
const affected = (r) => r?.affectedRows ?? -1;

const U1 = "11111111-1111-4111-8111-111111111111"; // new leader
const U2 = "22222222-2222-4222-8222-222222222222"; // admin
await db.exec(`insert into auth.users values ('${U1}', 'newleader@example.com'), ('${U2}', 'admin@example.com');`);
const SEED = "5a7d0c2e-2222-4b00-8000-000000000001";
const NEW = "33333333-3333-4333-8333-333333333333";
const DEMO = "c0000000-0000-4000-8000-000000000001";

console.log("\n— Visitor (anon) —");
await expect("sees all 9 seed studies", () => as("anon", null, "select id from bible_studies"), (r) => rows(r) === 9);
await expect("legacy Corinthians row is gone", () => as("anon", null, "select 1 from bible_studies where title = 'Corinthians'"), (r) => rows(r) === 0);
await expect("cannot read private addresses", () => as("anon", null, "select * from study_private"), (r) => rows(r) === 0);
await expect("cannot read inquiries", () => as("anon", null, "select * from inquiries"), (r, e) => rows(r) === 0 || !!e);
await expect("cannot edit a study", () => as("anon", null, "update bible_studies set title = 'x'"), (r, e) => affected(r) === 0 || !!e);
await expect("join returns the private address", () =>
  as("anon", null, "select * from submit_inquiry($1, 'Visitor', 'v@example.com')", [SEED]),
  (r) => r?.rows[0]?.address === "4108 Pecan Grove Ln, Eastwood");
await expect("rate limit blocks the 6th join in an hour", async () => {
  for (let i = 0; i < 6; i++) await as("anon", null, "select * from submit_inquiry($1, 'Spam', 'spam@example.com')", [SEED]);
}, (_r, e) => e?.message.includes("Too many"));

console.log("\n— New leader (signed in, unapproved) —");
await expect("creates own profile", () => as("authenticated", U1, "insert into leaders (auth_user_id, name) values ($1, 'New Leader')", [U1]), (_r, e) => !e);
await expect("cannot self-approve on insert", () => as("authenticated", U2, "insert into leaders (auth_user_id, name, approved) values ($1, 'X', true)", [U2]), (_r, e) => !!e);
await expect("cannot self-approve on update", () => as("authenticated", U1, "update leaders set approved = true where auth_user_id = $1", [U1]), (_r, e) => !!e);
await expect("cannot create a profile for someone else", () => as("authenticated", U1, "insert into leaders (auth_user_id, name) values ($1, 'Imposter')", [U2]), (_r, e) => !!e);
await expect("a study must have a campus", () =>
  as("authenticated", U1, `insert into bible_studies (id, slug, title, summary, day_of_week, start_time, format)
    values ($1, 'new-study', 'New Study', 'Hi', 2, '19:00', 'in_person')`, [NEW]), (_r, e) => e?.message.includes("campus_id"));
await expect("…with a campus it works (trigger links creator)", () =>
  as("authenticated", U1, `insert into bible_studies (id, campus_id, slug, title, summary, day_of_week, start_time, format)
    values ($1, $2, 'new-study', 'New Study', 'Hi', 2, '19:00', 'in_person')`, [NEW, DEMO]), (_r, e) => !e);
await expect("sees own new study", () => as("authenticated", U1, "select id from bible_studies where id = $1", [NEW]), (r) => rows(r) === 1);
await expect("sets own private address", () => as("authenticated", U1, "update study_private set address = '1 Main St' where study_id = $1", [NEW]), (r) => affected(r) === 1);
await expect("study hidden from public until approved", () => as("anon", null, "select id from bible_studies where id = $1", [NEW]), (r) => rows(r) === 0);
await expect("cannot read another study's address", () => as("authenticated", U1, "select * from study_private where study_id = $1", [SEED]), (r) => rows(r) === 0);
await expect("cannot edit another leader's study", () => as("authenticated", U1, "update bible_studies set title = 'hijack' where id = $1", [SEED]), (r) => affected(r) === 0);
await expect("cannot attach self to another study", () =>
  as("authenticated", U1, "insert into study_leaders (study_id, leader_id) select $1, id from leaders where auth_user_id = $2", [SEED, U1]), (_r, e) => !!e);
await expect("cannot read another study's inquiries", () => as("authenticated", U1, "select * from inquiries where study_id = $1", [SEED]), (r) => rows(r) === 0);
await expect("cannot call admin approval", () => as("authenticated", U1, "select set_leader_approval(id, true) from leaders where auth_user_id = $1", [U1]), (_r, e) => e?.message.includes("Admins only"));
await expect("can tag own study", () =>
  as("authenticated", U1, "insert into study_tags (study_id, tag_id) select $1, id from tags where slug = 'men'", [NEW]), (_r, e) => !e);

console.log("\n— Admin —");
await db.exec(`insert into leaders (auth_user_id, name, approved, is_admin) values ('${U2}', 'Admin', true, true);`);
await expect("lists leaders with emails", () => as("authenticated", U2, "select * from admin_list_leaders()"), (r) => r?.rows.some((x) => x.email === "newleader@example.com"));
await expect("approves the new leader", () => as("authenticated", U2, "select set_leader_approval(id, true) from leaders where auth_user_id = $1", [U1]), (_r, e) => !e);
await expect("approved study now public", () => as("anon", null, "select id from bible_studies where id = $1", [NEW]), (r) => rows(r) === 1);
await expect("paused study leaves the directory", async () => {
  await as("authenticated", U1, "update bible_studies set status = 'paused' where id = $1", [NEW]);
  return as("anon", null, "select id from bible_studies where id = $1", [NEW]);
}, (r) => rows(r) === 0);
await expect("leader can mark inquiry status only", async () => {
  await as("authenticated", U1, "update bible_studies set status = 'active' where id = $1", [NEW]);
  await as("anon", null, "select * from submit_inquiry($1, 'Friend', null, '+15125550000')", [NEW]);
  return as("authenticated", U1, "update inquiries set status = 'contacted' where study_id = $1", [NEW]);
}, (r) => affected(r) === 1);
await expect("…but cannot rewrite what the visitor said", () => as("authenticated", U1, "update inquiries set name = 'x' where study_id = $1", [NEW]), (_r, e) => !!e);

console.log("\n— Campuses —");
await expect("visitors can read campuses", () => as("anon", null, "select slug from campuses"), (r) => r?.rows[0]?.slug === "demo");
await expect("every sample study is on the demo campus", () => as("anon", null, "select count(*)::int n from bible_studies where campus_id = $1 and id::text like '5a7d0c2e%'", [DEMO]), (r) => r?.rows[0]?.n === 9);
await expect("childcare column is gone", () => db.query("select childcare from bible_studies"), (_r, e) => !!e);
await expect("visitors cannot add campuses", () => as("anon", null, "insert into campuses (slug, name) values ('x', 'X U')"), (_r, e) => !!e);
await expect("leaders cannot add campuses", () => as("authenticated", U1, "insert into campuses (slug, name) values ('x', 'X U')"), (_r, e) => !!e);
await expect("admins add campuses", () => as("authenticated", U2, "insert into campuses (slug, name, city) values ('baylor', 'Baylor University', 'Waco, TX')"), (_r, e) => !e);
await expect("reserved addresses are refused", () => as("authenticated", U2, "insert into campuses (slug, name) values ('leader', 'Leader U')"), (_r, e) => !!e);
await expect("malformed addresses are refused", () => as("authenticated", U2, "insert into campuses (slug, name) values ('Bad Slug', 'Bad U')"), (_r, e) => !!e);
await expect("a campus with studies can't be removed", () => as("authenticated", U2, "delete from campuses where id = $1", [DEMO]), (_r, e) => !!e);
await expect("leader moves their study to the new campus", () =>
  as("authenticated", U1, "update bible_studies set campus_id = (select id from campuses where slug = 'baylor') where id = $1", [NEW]), (r) => affected(r) === 1);
await expect("an empty campus can be removed", async () => {
  await as("authenticated", U2, "insert into campuses (slug, name) values ('empty', 'Empty U')");
  return as("authenticated", U2, "delete from campuses where slug = 'empty'");
}, (r) => affected(r) === 1);

console.log("\n— Campus tags —");
await expect("audience tags are the campus set", () => db.query("select string_agg(slug, ',' order by slug) s from tags where category = 'audience'"),
  (r) => r?.rows[0]?.s === "co-ed,freshmen,grad-students,men,upperclassmen,women");
await expect("no study points at a retired tag", () => db.query("select count(*)::int n from study_tags st left join tags t on t.id = st.tag_id where t.id is null"), (r) => r?.rows[0]?.n === 0);

console.log("\n— Removing people —");
await expect("visitors can't delete anyone", () => as("anon", null, "delete from inquiries"), (r, e) => affected(r) === 0 || !!e);
await expect("leader can't remove another study's people", () =>
  as("authenticated", U1, "delete from inquiries where study_id = $1 returning id", [SEED]), (r) => rows(r) === 0);
await expect("…and those people are still there", () => db.query("select count(*)::int n from inquiries where study_id = $1", [SEED]), (r) => r?.rows[0]?.n > 0);
await expect("leader removes someone from their own study", () =>
  as("authenticated", U1, "delete from inquiries where study_id = $1 returning id", [NEW]), (r) => rows(r) === 1);

console.log("\n— Study requests (\"nothing fits my schedule\") —");
const U3 = "44444444-4444-4444-8444-444444444444"; // missionary
await db.exec(`insert into auth.users values ('${U3}', 'missionary@example.com');
  insert into leaders (auth_user_id, name, approved) values ('${U3}', 'Sam Missionary', true);`);
const BAYLOR = (await db.query("select id from campuses where slug = 'baylor'")).rows[0].id;
await expect("visitors can read campus contacts", () => as("anon", null, "select * from campus_contacts"), (_r, e) => !e);
await expect("leaders can't make themselves a campus contact", () =>
  as("authenticated", U3, "insert into campus_contacts (campus_id, leader_id) select $1, id from leaders where auth_user_id = $2", [DEMO, U3]), (_r, e) => !!e);
await expect("admins assign a campus contact", () =>
  as("authenticated", U2, "insert into campus_contacts (campus_id, leader_id) select $1, id from leaders where auth_user_id = $2", [DEMO, U3]), (_r, e) => !e);
await expect("visitors can't insert requests directly", () =>
  as("anon", null, "insert into study_requests (campus_id, name, email) values ($1, 'X', 'x@example.com')", [DEMO]), (_r, e) => !!e);
await expect("visitors submit a request through the function", () =>
  as("anon", null, "select submit_study_request($1, 'Casey', 'casey@example.com', null, '{2,4}', '{evening}', 'Tue/Thu nights')", [DEMO]), (_r, e) => !e);
await expect("bad days are refused", () =>
  as("anon", null, "select submit_study_request($1, 'Bad', 'bad@example.com', null, '{9}', '{}')", [DEMO]), (_r, e) => !!e);
await expect("bad times are refused", () =>
  as("anon", null, "select submit_study_request($1, 'Bad', 'bad@example.com', null, '{}', '{midnight}')", [DEMO]), (_r, e) => !!e);
await expect("requests are rate-limited", async () => {
  for (let i = 0; i < 6; i++) await as("anon", null, "select submit_study_request($1, 'Spam', 'spam2@example.com')", [DEMO]);
}, (_r, e) => e?.message.includes("Too many"));
await expect("visitors can't read requests", () => as("anon", null, "select * from study_requests"), (r, e) => rows(r) === 0 || !!e);
await expect("the campus contact sees their campus's requests", () =>
  as("authenticated", U3, "select name, days, times from study_requests where campus_id = $1 and name = 'Casey'", [DEMO]),
  (r) => rows(r) === 1 && r.rows[0].times[0] === "evening");
await expect("a regular leader can't see requests", () => as("authenticated", U1, "select * from study_requests"), (r) => rows(r) === 0);
await expect("a contact can't see another campus's requests", async () => {
  await as("anon", null, "select submit_study_request($1, 'Other', 'other@example.com')", [BAYLOR]);
  return as("authenticated", U3, "select * from study_requests where campus_id = $1", [BAYLOR]);
}, (r) => rows(r) === 0);
await expect("the contact can update a request's status", () =>
  as("authenticated", U3, "update study_requests set status = 'contacted' where name = 'Casey'"), (r) => affected(r) === 1);
await expect("…but can't rewrite what the student said", () =>
  as("authenticated", U3, "update study_requests set name = 'x' where name = 'Casey'"), (_r, e) => !!e);
await expect("the contact can remove a request", () =>
  as("authenticated", U3, "delete from study_requests where name = 'Casey' returning id"), (r) => rows(r) === 1);

console.log(`\n${failures ? `${failures} FAILED` : "All checks passed"}`);
process.exit(failures ? 1 : 0);
