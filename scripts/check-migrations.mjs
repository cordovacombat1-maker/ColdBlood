// Applies supabase/migrations/*.sql to an in-memory Postgres (PGlite) with a
// minimal stand-in for Supabase's auth schema, then checks that row-level
// security keeps each user's rows private. Run: npm run db:check
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? 'supabase/migrations'
const db = new PGlite()

await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated;
`)

for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(dir, f), 'utf8'))
  console.log('applied', f)
}

await db.exec(`
  grant usage on schema public to authenticated;
  grant all on all tables in schema public to authenticated;
`)

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}')`)

const as = async (uid, sql) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`)
  try {
    return await db.query(sql)
  } finally {
    await db.exec('reset role')
  }
}

let failures = 0
const expect = (cond, msg) => {
  console.log(cond ? '  ok  ' : '  FAIL', msg)
  if (!cond) failures++
}

const profiles = await db.query('select count(*)::int as n from public.profiles')
expect(profiles.rows[0].n === 2, 'signup trigger created a profile per user')

await as(A, `insert into public.weigh_ins (weight) values (221.4)`)
await as(B, `insert into public.weigh_ins (weight) values (199.0)`)
const aRows = await as(A, 'select weight from public.weigh_ins')
expect(aRows.rows.length === 1 && Number(aRows.rows[0].weight) === 221.4, 'user A only sees own weigh-in')

let blocked = false
try {
  await as(A, `insert into public.weigh_ins (user_id, weight) values ('${B}', 1)`)
} catch {
  blocked = true
}
expect(blocked, 'user A cannot insert a row owned by user B')

const upd = await as(A, `update public.profiles set nickname = 'x' where user_id = '${B}' returning id`)
expect(upd.rows.length === 0, "user A cannot update user B's profile")

let lessonBlocked = false
try {
  await as(A, `insert into public.lessons (title, category) values ('t', 'c')`)
} catch {
  lessonBlocked = true
}
expect(lessonBlocked, 'non-admin cannot write global lessons')

await db.exec(`insert into public.videos (user_id, title, url, is_curated) values (null, 'Jab basics', 'https://youtu.be/x', true)`)
const vids = await as(B, 'select title from public.videos')
expect(vids.rows.length === 1, 'curated videos are visible to every user')

const tables = await db.query(`
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)
expect(tables.rows.length === 0, 'RLS enabled on every public table' +
  (tables.rows.length ? ': missing ' + tables.rows.map((r) => r.relname).join(', ') : ''))

if (failures) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll migration checks passed')
