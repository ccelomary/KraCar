-- Independent travel service: proposed first migration, PostgreSQL 17+.
-- Apply once to a fresh database using a migration owner with CREATEROLE.
-- No reference-company data, secrets, Supabase auth schema, or live services needed.
begin;
create extension if not exists btree_gist;
create schema app;
revoke all on schema app from public;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end $$;

create function app.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := clock_timestamp(); return new; end $$;

create table app.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  public_host text not null unique,
  timezone text not null default 'Africa/Casablanca' check (timezone = 'Africa/Casablanca'),
  currency text not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  user_id uuid not null, -- Supabase Auth subject; intentionally not coupled to auth.users for portability.
  role text not null check (role in ('owner','operations','finance','support')),
  active boolean not null default true,
  unique (org_id,user_id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index memberships_user_idx on app.memberships(user_id,active);
create table app.cities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  slug text not null, names jsonb not null,
  active boolean not null default true,
  unique (org_id,id), unique (org_id,slug),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  city_id uuid not null,
  business_name text not null, contacts jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','verified','suspended')),
  unique (org_id,id),
  foreign key (org_id,city_id) references app.cities(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index suppliers_city_idx on app.suppliers(org_id,city_id,status);
create index suppliers_status_idx on app.suppliers(org_id,status);
create table app.listings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  supplier_id uuid not null, city_id uuid not null,
  category text not null check (category in ('car','driver','boat','activity')),
  slug text not null, title text not null, translations jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  brand text, vehicle_type text, transmission text, fuel text,
  specifications jsonb not null default '{}', inclusions jsonb not null default '[]',
  base_cents bigint not null check (base_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  price_unit text not null check (price_unit in ('day','trip','person','group','hour')),
  rules_version integer not null default 1 check (rules_version > 0),
  pricing_rules jsonb not null default '{}', cancellation_rules jsonb not null default '{}',
  similar_allowed boolean not null default false,
  unique (org_id,id), unique (org_id,slug),
  foreign key (org_id,supplier_id) references app.suppliers(org_id,id) on delete restrict,
  foreign key (org_id,city_id) references app.cities(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index listings_supplier_idx on app.listings(org_id,supplier_id);
create index listings_search_idx on app.listings(org_id,status,category,city_id,base_cents,id);
create index listings_city_idx on app.listings(org_id,city_id);
create index listings_brand_idx on app.listings(org_id,brand);
create index listings_type_idx on app.listings(org_id,vehicle_type);
create index listings_transmission_idx on app.listings(org_id,transmission);
create index listings_fuel_idx on app.listings(org_id,fuel);
create index listings_price_idx on app.listings(org_id,base_cents,id);
create table app.listing_media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  listing_id uuid not null, object_key text not null, alt_text jsonb not null default '{}',
  license_record text not null, sort_order integer not null default 0,
  foreign key (org_id,listing_id) references app.listings(org_id,id) on delete cascade,
  unique (org_id,listing_id,sort_order),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.listing_options (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  listing_id uuid not null, label text not null,
  unit_cents bigint not null check (unit_cents >= 0), currency text not null default 'EUR' check (currency = 'EUR'),
  duration_minutes integer check (duration_minutes > 0), capacity integer check (capacity > 0),
  active boolean not null default true,
  unique (org_id,id), unique (org_id,listing_id,id),
  foreign key (org_id,listing_id) references app.listings(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index options_listing_idx on app.listing_options(org_id,listing_id,active);
create table app.protection_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  listing_id uuid not null, code text not null, label text not null,
  daily_cents bigint not null check (daily_cents >= 0),
  excess_cents bigint not null check (excess_cents >= 0), deposit_cents bigint not null check (deposit_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  minimum_age integer not null check (minimum_age between 18 and 100),
  minimum_licence_months integer not null default 24 check (minimum_licence_months >= 0),
  terms jsonb not null, active boolean not null default true,
  unique (org_id,id), unique (org_id,listing_id,id), unique (org_id,listing_id,code),
  foreign key (org_id,listing_id) references app.listings(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.addons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  listing_id uuid not null, label text not null,
  unit_cents bigint not null check (unit_cents >= 0), currency text not null default 'EUR' check (currency = 'EUR'),
  charge_basis text not null check (charge_basis in ('booking','day','person')),
  max_quantity integer not null check (max_quantity > 0), active boolean not null default true,
  unique (org_id,id),
  foreign key (org_id,listing_id) references app.listings(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index addons_listing_idx on app.addons(org_id,listing_id,active);
create table app.coupons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  code text not null check (code = upper(code)),
  basis_points integer not null check (basis_points between 1 and 10000),
  starts_at timestamptz not null, expires_at timestamptz not null,
  max_redemptions integer check (max_redemptions > 0), active boolean not null default true,
  check (expires_at > starts_at), unique (org_id,id), unique (org_id,code),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index coupons_expiry_idx on app.coupons(org_id,expires_at);
create table app.resources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  supplier_id uuid not null, code text not null,
  kind text not null check (kind in ('car','driver_vehicle','boat','activity_unit')),
  status text not null default 'active' check (status in ('active','inactive')),
  details jsonb not null default '{}',
  unique (org_id,id), unique (org_id,supplier_id,code),
  foreign key (org_id,supplier_id) references app.suppliers(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  listing_id uuid not null, option_id uuid, plan_id uuid, coupon_id uuid,
  session_hash text not null check (length(session_hash) = 64),
  starts_at timestamptz not null, ends_at timestamptz not null,
  timezone text not null default 'Africa/Casablanca' check (timezone = 'Africa/Casablanca'),
  expires_at timestamptz not null, rules_version integer not null check (rules_version > 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  subtotal_cents bigint not null check (subtotal_cents >= 0), discount_cents bigint not null default 0 check (discount_cents >= 0),
  tax_cents bigint not null check (tax_cents >= 0), total_cents bigint not null check (total_cents >= 0),
  due_now_cents bigint not null check (due_now_cents > 0),
  configuration jsonb not null, price_lines jsonb not null, policy_snapshot jsonb not null,
  is_estimate boolean not null default false,
  check (ends_at > starts_at), check (expires_at > created_at),
  check (discount_cents <= subtotal_cents), check (total_cents = subtotal_cents - discount_cents + tax_cents),
  check (due_now_cents <= total_cents),
  unique (org_id,id),
  foreign key (org_id,listing_id) references app.listings(org_id,id) on delete restrict,
  foreign key (org_id,listing_id,option_id) references app.listing_options(org_id,listing_id,id) on delete restrict,
  foreign key (org_id,listing_id,plan_id) references app.protection_plans(org_id,listing_id,id) on delete restrict,
  foreign key (org_id,coupon_id) references app.coupons(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index quotes_option_idx on app.quotes(org_id,listing_id,option_id);
create index quotes_plan_idx on app.quotes(org_id,listing_id,plan_id);
create index quotes_coupon_idx on app.quotes(org_id,coupon_id);
create index quotes_session_idx on app.quotes(org_id,session_hash,created_at);
create index quotes_expiry_idx on app.quotes(org_id,expires_at);
create table app.bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  quote_id uuid not null, reference text not null, request_key text not null,
  request_hash text not null check (length(request_hash) = 64),
  state text not null default 'requested' check (state in ('requested','awaiting_payment','confirmed','completed','cancelled','expired','declined')),
  traveler jsonb not null, -- Restricted PII: validated structured names/contact/DOB/residence.
  trip_snapshot jsonb not null, price_snapshot jsonb not null, policy_snapshot jsonb not null,
  currency text not null default 'EUR' check (currency = 'EUR'),
  total_cents bigint not null check (total_cents >= 0), due_now_cents bigint not null check (due_now_cents > 0 and due_now_cents <= total_cents),
  starts_at timestamptz not null, ends_at timestamptz not null, check (ends_at > starts_at),
  supplier_approved_at timestamptz, payment_deadline timestamptz, confirmed_at timestamptz,
  unique (org_id,id), unique (org_id,reference), unique (org_id,request_key), unique (org_id,quote_id),
  foreign key (org_id,quote_id) references app.quotes(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index bookings_state_idx on app.bookings(org_id,state,created_at);
create index bookings_start_idx on app.bookings(org_id,starts_at,id);
create index bookings_deadline_idx on app.bookings(org_id,state,payment_deadline);
create table app.allocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  resource_id uuid not null, booking_id uuid,
  starts_at timestamptz not null, ends_at timestamptz not null,
  state text not null check (state in ('held','reserved','maintenance','released')),
  expires_at timestamptz,
  check (ends_at > starts_at), check (state <> 'held' or expires_at is not null),
  check ((state = 'maintenance' and booking_id is null) or state <> 'maintenance'),
  check (state not in ('held','reserved') or booking_id is not null),
  unique (org_id,id),
  foreign key (org_id,resource_id) references app.resources(org_id,id) on delete restrict,
  foreign key (org_id,booking_id) references app.bookings(org_id,id) on delete restrict,
  exclude using gist (resource_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
    where (state in ('held','reserved','maintenance')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index allocations_booking_idx on app.allocations(org_id,booking_id);
create index allocations_resource_idx on app.allocations(org_id,resource_id);
create index allocations_expiry_idx on app.allocations(org_id,state,expires_at);
create unique index allocations_one_active_booking_idx on app.allocations(org_id,booking_id) where state in ('held','reserved');
create table app.booking_access_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  booking_id uuid not null, token_hash text not null unique check (length(token_hash) = 64),
  purpose text not null check (purpose in ('exchange','session')),
  expires_at timestamptz not null, consumed_at timestamptz, revoked_at timestamptz,
  foreign key (org_id,booking_id) references app.bookings(org_id,id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index tokens_booking_idx on app.booking_access_tokens(org_id,booking_id);
create index tokens_expiry_idx on app.booking_access_tokens(expires_at);
create table app.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  booking_id uuid not null, provider text not null,
  provider_account text not null, provider_session_id text, provider_payment_id text,
  request_key text not null, amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  state text not null default 'creating' check (state in ('creating','pending','succeeded','failed','expired')),
  paid_at timestamptz, unique (org_id,id), unique (org_id,request_key),
  unique (provider,provider_account,provider_session_id), unique (provider,provider_account,provider_payment_id),
  foreign key (org_id,booking_id) references app.bookings(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index payments_booking_idx on app.payment_attempts(org_id,booking_id,state);
create unique index payments_one_open_idx on app.payment_attempts(org_id,booking_id) where state in ('creating','pending');
create index payments_state_idx on app.payment_attempts(org_id,state,created_at);
create table app.refunds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  payment_id uuid not null, request_key text not null,
  provider_refund_id text, amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  state text not null default 'requested' check (state in ('requested','pending','succeeded','failed')),
  reason text not null, unique (org_id,id), unique (org_id,request_key),
  foreign key (org_id,payment_id) references app.payment_attempts(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index refunds_payment_idx on app.refunds(org_id,payment_id,state);
create index refunds_state_idx on app.refunds(org_id,state,created_at);
create table app.webhook_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  provider text not null, provider_account text not null, event_id text not null,
  event_type text not null, payload jsonb not null, -- Minimal normalized fields; no card data/raw contact payload.
  state text not null default 'pending' check (state in ('pending','processing','done','failed')),
  attempts integer not null default 0 check (attempts >= 0), lease_until timestamptz,
  unique (provider,provider_account,event_id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index webhooks_work_idx on app.webhook_events(org_id,state,lease_until,created_at);
create table app.support_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  booking_id uuid, request_key text not null,
  kind text not null check (kind in ('question','change','cancel','emergency')),
  contact jsonb not null, message text not null, proposed_change jsonb,
  state text not null default 'open' check (state in ('open','reviewing','resolved','rejected')),
  submitted_at timestamptz not null default now(), unique (org_id,request_key),
  foreign key (org_id,booking_id) references app.bookings(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index support_booking_idx on app.support_requests(org_id,booking_id);
create index support_work_idx on app.support_requests(org_id,state,submitted_at);
create table app.partner_applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  city_id uuid not null, request_key text not null,
  category text not null check (category in ('car','driver','boat','activity')),
  company_name text not null, owner_name text not null, contacts jsonb not null,
  rc_number text not null, fleet_count integer check (fleet_count >= 0), description text not null,
  authority_ack boolean not null check (authority_ack), policy_version text not null,
  state text not null default 'submitted' check (state in ('submitted','reviewing','approved','rejected')),
  unique (org_id,id), unique (org_id,request_key),
  foreign key (org_id,city_id) references app.cities(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index applications_city_idx on app.partner_applications(org_id,city_id);
create index applications_work_idx on app.partner_applications(org_id,state,created_at);
create table app.document_files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  application_id uuid not null, object_key text not null unique,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png')),
  byte_count bigint not null check (byte_count between 1 and 5242880),
  sha256 text not null check (length(sha256) = 64),
  scan_state text not null default 'quarantined' check (scan_state in ('quarantined','clean','rejected')),
  foreign key (org_id,application_id) references app.partner_applications(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index documents_application_idx on app.document_files(org_id,application_id);
create index documents_scan_idx on app.document_files(org_id,scan_state,created_at);
create table app.content_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  kind text not null check (kind in ('policy','faq','article','landing')),
  slug text not null, locale text not null check (locale in ('en','fr','ar','es','de','it','nl','pl','pt','ru')),
  revision integer not null check (revision > 0), title text not null, body jsonb not null,
  published_at timestamptz, unique (org_id,id), unique (org_id,kind,slug,locale,revision),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index content_published_idx on app.content_pages(org_id,kind,locale,published_at);
create table app.consent_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  booking_id uuid, session_hash text,
  purpose text not null check (purpose in ('booking_terms','privacy_contact','cookies','partner_terms')),
  policy_versions jsonb not null, choice jsonb not null,
  check (booking_id is not null or session_hash is not null),
  foreign key (org_id,booking_id) references app.bookings(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index consent_booking_idx on app.consent_records(org_id,booking_id);
create index consent_session_idx on app.consent_records(org_id,session_hash,created_at);
create table app.outbox_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  booking_id uuid, dedupe_key text not null, topic text not null, payload jsonb not null,
  state text not null default 'pending' check (state in ('pending','processing','done','dead')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(), lease_until timestamptz, last_error_code text,
  unique (org_id,dedupe_key),
  foreign key (org_id,booking_id) references app.bookings(org_id,id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index outbox_work_idx on app.outbox_events(org_id,state,available_at,lease_until);
create index outbox_booking_idx on app.outbox_events(org_id,booking_id);
create table app.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete restrict,
  actor_user_id uuid, action text not null, entity_type text not null, entity_id uuid not null,
  details jsonb not null default '{}', -- IDs/statuses only; redact contact fields and tokens.
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index audit_entity_idx on app.audit_events(org_id,entity_type,entity_id,created_at);
create index audit_actor_idx on app.audit_events(org_id,actor_user_id,created_at);

-- Every tenant-owned child uses composite FKs: an ID from another org cannot be attached.
-- Private schema, no browser DB grants. Server verifies role/guest token before every query.
-- Runtime uses a nonowner, non-BYPASSRLS login that inherits app_runtime privileges.
grant usage on schema app to app_runtime;
grant select,insert,update,delete on all tables in schema app to app_runtime;
revoke update,delete on app.audit_events,app.consent_records from app_runtime;
revoke all on all functions in schema app from public;

do $$ declare t record; tenant_column text; begin
  for t in select tablename from pg_tables where schemaname = 'app' loop
    tenant_column := case when t.tablename = 'organizations' then 'id' else 'org_id' end;
    execute format('alter table app.%I enable row level security', t.tablename);
    execute format('create policy tenant_scope on app.%I to app_runtime using (%I = nullif(current_setting(''app.org_id'',true),'''')::uuid) with check (%I = nullif(current_setting(''app.org_id'',true),'''')::uuid)', t.tablename, tenant_column, tenant_column);
    execute format('create trigger touch_updated_at before update on app.%I for each row execute function app.touch_updated_at()', t.tablename);
  end loop;
end $$;

-- Quote totals/configuration are immutable: recalculate by creating a new quote ID.
create function app.reject_quote_update() returns trigger language plpgsql as $$
begin raise exception 'Quotes are immutable; create a new quote'; end $$;
create trigger immutable_quote before update on app.quotes for each row execute function app.reject_quote_update();
revoke all on function app.reject_quote_update() from public;

-- Monetary cross-row checks require locking the parent payment row, not client math.
create function app.guard_refund() returns trigger language plpgsql as $$
declare p app.payment_attempts; reserved bigint;
begin
  select * into strict p from app.payment_attempts where org_id = new.org_id and id = new.payment_id for update;
  if p.state <> 'succeeded' or p.currency <> new.currency then raise exception 'Refund requires successful payment in matching currency'; end if;
  select coalesce(sum(amount_cents),0) into reserved from app.refunds
    where org_id = new.org_id and payment_id = new.payment_id and id <> new.id and state in ('requested','pending','succeeded');
  if new.state in ('requested','pending','succeeded') and reserved + new.amount_cents > p.amount_cents then
    raise exception 'Refund exceeds unrefunded payment';
  end if;
  return new;
end $$;
create trigger refund_limit before insert or update on app.refunds for each row execute function app.guard_refund();
revoke all on function app.guard_refund() from public;

create function app.guard_confirmation() returns trigger language plpgsql as $$
declare paid bigint; refunded bigint;
begin
  if new.state = 'confirmed' then
    if new.supplier_approved_at is null or new.confirmed_at is null then raise exception 'Supplier approval and confirmation time required'; end if;
    select coalesce(sum(amount_cents),0) into paid from app.payment_attempts
      where org_id = new.org_id and booking_id = new.id and state = 'succeeded' and currency = new.currency;
    select coalesce(sum(r.amount_cents),0) into refunded from app.refunds r join app.payment_attempts p on p.org_id = r.org_id and p.id = r.payment_id
      where p.org_id = new.org_id and p.booking_id = new.id and r.state in ('requested','pending','succeeded');
    if paid - refunded < new.due_now_cents then raise exception 'Required prepayment not covered'; end if;
    if not exists (select 1 from app.allocations where org_id = new.org_id and booking_id = new.id and state = 'reserved'
      and starts_at <= new.starts_at and ends_at >= new.ends_at) then raise exception 'Reserved resource required'; end if;
  end if;
  return new;
end $$;
create trigger confirmation_guard before insert or update on app.bookings for each row execute function app.guard_confirmation();
revoke all on function app.guard_confirmation() from public;
commit;
