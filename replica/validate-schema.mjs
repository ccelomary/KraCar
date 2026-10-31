// Run with Node; install @electric-sql/pglite in a temporary tool directory and
// set PGLITE_MODULE_DIR to that directory's node_modules/@electric-sql/pglite.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = process.env.PGLITE_MODULE_DIR;
const moduleUrl = (name) => root ? pathToFileURL(path.join(root, 'dist', name)).href : null;
const { PGlite } = await import(moduleUrl('index.js') ?? '@electric-sql/pglite');
const { btree_gist } = await import(moduleUrl('contrib/btree_gist.js') ?? '@electric-sql/pglite/contrib/btree_gist');
const db = new PGlite({ extensions: { btree_gist } });
const checks = [];
const q = (sql, params = []) => db.query(sql, params);
const check = (name, ok) => { if (!ok) throw new Error(name); checks.push(name); };
async function rejects(name, sql, params, expectedCode) {
  try { await q(sql, params); } catch (error) {
    if (error.code !== expectedCode) throw error;
    checks.push(name); return;
  }
  throw new Error(`Expected rejection: ${name}`);
}
try {
  await db.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  checks.push('Fresh migration applies with btree_gist');
  const tables = (await q("select tablename,rowsecurity from pg_tables where schemaname='app'")).rows;
  check('25 application tables, all with RLS enabled', tables.length === 25 && tables.every(t => t.rowsecurity));
  check('Every table has UUID ID and creation/update timestamps', (await q(`select count(*)::int n from information_schema.columns where table_schema='app' and
    ((column_name='id' and data_type='uuid') or (column_name in ('created_at','updated_at') and data_type='timestamp with time zone'))`)).rows[0].n === 75);
  const org1 = (await q("insert into app.organizations(name,public_host) values ('Test One','one.test') returning id")).rows[0].id;
  const org2 = (await q("insert into app.organizations(name,public_host) values ('Test Two','two.test') returning id")).rows[0].id;
  const city = (await q("insert into app.cities(org_id,slug,names) values ($1,'demo','{}') returning id", [org1])).rows[0].id;
  const supplier = (await q("insert into app.suppliers(org_id,city_id,business_name) values ($1,$2,'Own test supplier') returning id", [org1,city])).rows[0].id;
  const listing = (await q("insert into app.listings(org_id,supplier_id,city_id,category,slug,title,base_cents,price_unit) values ($1,$2,$3,'car','demo','Own test car',3000,'day') returning id", [org1,supplier,city])).rows[0].id;
  await rejects('Cross-organization supplier/city link rejected', "insert into app.suppliers(org_id,city_id,business_name) values ($1,$2,'Invalid')", [org2,city], '23503');
  const resource = (await q("insert into app.resources(org_id,supplier_id,code,kind) values ($1,$2,'CAR-1','car') returning id", [org1,supplier])).rows[0].id;
  async function quote() {
    return (await q(`insert into app.quotes(org_id,listing_id,session_hash,starts_at,ends_at,expires_at,rules_version,subtotal_cents,tax_cents,total_cents,due_now_cents,configuration,price_lines,policy_snapshot)
      values ($1,$2,repeat('a',64),'2030-01-01 12:00Z','2030-01-02 12:00Z',now()+interval '15 minutes',1,3000,0,3000,1000,'{}','[]','{}') returning id`, [org1,listing])).rows[0].id;
  }
  const quote1 = await quote(); const quote2 = await quote();
  await rejects('Quote snapshots cannot be updated', 'update app.quotes set total_cents=3100 where id=$1', [quote1], 'P0001');
  async function booking(quoteId, key) {
    return (await q(`insert into app.bookings(org_id,quote_id,reference,request_key,request_hash,traveler,trip_snapshot,price_snapshot,policy_snapshot,total_cents,due_now_cents,starts_at,ends_at)
      values ($1,$2,$3,$3,repeat('b',64),'{}','{}','{}','{}',3000,1000,'2030-01-01 12:00Z','2030-01-02 12:00Z') returning id`, [org1,quoteId,key])).rows[0].id;
  }
  const booking1 = await booking(quote1,'DEMO-1'); const booking2 = await booking(quote2,'DEMO-2');
  await rejects('A quote cannot create two bookings', `insert into app.bookings(org_id,quote_id,reference,request_key,request_hash,traveler,trip_snapshot,price_snapshot,policy_snapshot,total_cents,due_now_cents,starts_at,ends_at)
    values ($1,$2,'DUP','DUP',repeat('b',64),'{}','{}','{}','{}',3000,1000,'2030-01-01 12:00Z','2030-01-02 12:00Z')`, [org1,quote1], '23505');
  const allocation = (await q(`insert into app.allocations(org_id,resource_id,booking_id,starts_at,ends_at,state,expires_at)
    values ($1,$2,$3,'2030-01-01 12:00Z','2030-01-02 12:00Z','held',now()-interval '1 minute') returning id`, [org1,resource,booking1])).rows[0].id;
  await rejects('Expired but unreleased hold still blocks overlapping inventory', `insert into app.allocations(org_id,resource_id,booking_id,starts_at,ends_at,state,expires_at)
    values ($1,$2,$3,'2030-01-01 13:00Z','2030-01-02 13:00Z','held',now()+interval '1 hour')`, [org1,resource,booking2], '23P01');
  await q(`insert into app.allocations(org_id,resource_id,booking_id,starts_at,ends_at,state,expires_at)
    values ($1,$2,$3,'2030-01-02 12:00Z','2030-01-03 12:00Z','held',now()+interval '1 hour')`, [org1,resource,booking2]);
  checks.push('Adjacent half-open allocations accepted');
  await rejects('Maintenance also conflicts with booked resource time', `insert into app.allocations(org_id,resource_id,starts_at,ends_at,state)
    values ($1,$2,'2030-01-01 15:00Z','2030-01-01 16:00Z','maintenance')`, [org1,resource], '23P01');
  await rejects('Confirmation without supplier approval rejected', "update app.bookings set state='confirmed',confirmed_at=now() where id=$1", [booking1], 'P0001');
  await rejects('Confirmation without prepayment rejected', "update app.bookings set state='confirmed',confirmed_at=now(),supplier_approved_at=now() where id=$1", [booking1], 'P0001');
  const payment = (await q(`insert into app.payment_attempts(org_id,booking_id,provider,provider_account,request_key,amount_cents,state)
    values ($1,$2,'fake','test','PAY-1',1000,'succeeded') returning id`, [org1,booking1])).rows[0].id;
  await rejects('Confirmation with only a hold rejected', "update app.bookings set state='confirmed',confirmed_at=now(),supplier_approved_at=now() where id=$1", [booking1], 'P0001');
  await q("update app.allocations set state='reserved' where id=$1", [allocation]);
  await q("update app.bookings set state='confirmed',confirmed_at=now(),supplier_approved_at=now() where id=$1", [booking1]);
  checks.push('Approved paid booking with reserved resource confirms');
  await q("insert into app.refunds(org_id,payment_id,request_key,amount_cents,reason) values ($1,$2,'REF-1',600,'Test')", [org1,payment]);
  await rejects('Pending refunds reserve funds against over-refunding', "insert into app.refunds(org_id,payment_id,request_key,amount_cents,reason) values ($1,$2,'REF-2',500,'Test')", [org1,payment], 'P0001');
  await q("insert into app.webhook_events(org_id,provider,provider_account,event_id,event_type,payload) values ($1,'fake','test','EVENT-1','paid','{}')", [org1]);
  await rejects('Repeated provider webhook event rejected', "insert into app.webhook_events(org_id,provider,provider_account,event_id,event_type,payload) values ($1,'fake','test','EVENT-1','paid','{}')", [org1], '23505');
  await db.exec('set role app_runtime');
  check('Runtime with no tenant context cannot see bookings', (await q('select * from app.bookings')).rows.length === 0);
  await q("select set_config('app.org_id',$1,false)", [org1]);
  check('Runtime sees only selected tenant', (await q('select id from app.organizations')).rows.length === 1 && (await q('select id from app.bookings')).rows.length === 2);
  await rejects('RLS rejects writes to another organization', "insert into app.cities(org_id,slug,names) values ($1,'forbidden','{}')", [org2], '42501');
  await q("select set_config('app.org_id',$1,false)", [org2]);
  check('Switching tenant hides other organization bookings', (await q('select id from app.bookings')).rows.length === 0);
  await rejects('Runtime cannot mutate audit history', "delete from app.audit_events", [], '42501');
  await db.exec('reset role');
  const version = (await q('select version()')).rows[0].version;
  const report = `# Schema validation\n\nDate: 2026-10-20. Isolated in-memory PGlite PostgreSQL; no remote database or payment service.\n\nEngine: ${version}\n\n${checks.length} checks passed:\n\n${checks.map(c => '- ' + c).join('\n')}\n\nLimits: single-session database checks do not prove simultaneous multi-connection behavior, application authorization, Supabase deployment privileges, provider signatures/delivery, tax correctness, or production readiness. Run the integration/browser checks in architecture.md during implementation. PGlite dependency lives in a temporary tool directory, outside application source.\n\nRe-run with Node and PGLITE_MODULE_DIR set as described in validate-schema.mjs.\n`;
  await writeFile(new URL('./schema-validation.md', import.meta.url), report);
  console.log(`${checks.length} checks passed; schema-validation.md written.`);
} finally { await db.close(); }
