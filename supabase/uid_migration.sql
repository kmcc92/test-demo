-- =============================================================================
-- TEST — Stage 6 Step: email → auth.uid ownership scoping (SCHEMA + BACKFILL)
-- =============================================================================
-- Run this ENTIRE script in the Supabase SQL Editor BEFORE re-running
-- supabase/rls_policies.sql (the policies there now reference user_id and
-- public.is_merchant(), which this script creates). It is IDEMPOTENT and
-- re-runnable: adds are IF NOT EXISTS, backfills only touch NULL user_id rows,
-- and functions/triggers are CREATE OR REPLACE / DROP-IF-EXISTS.
--
-- WHAT THIS DOES
--   1. Adds user_id uuid REFERENCES auth.users(id) to every owner-scoped table:
--      purchases, marketplace_listings, merchant_products, service_requests,
--      marketplace_bids. The column is NULLABLE during the transition (legacy
--      rows whose email has no auth.users account can never be backfilled, and
--      service_requests has NO email column to backfill from at all).
--   2. Backfills user_id by joining the table's email column → auth.users
--      (case-insensitive). service_requests is EXCLUDED — it has no email
--      column, so pre-migration rows keep user_id NULL forever (accepted;
--      the RLS policies keep NULL rows readable so nothing disappears).
--   3. Installs a BEFORE INSERT trigger on each email-bearing table that fills
--      user_id from the row's email when the client omits it. This keeps the
--      SECURITY DEFINER transfer_ownership RPC working UNCHANGED: the buyer
--      row it inserts carries buyer_email, and the trigger resolves the uid —
--      correct regardless of WHICH client executes the settlement.
--   4. service_requests (no email column) instead gets DEFAULT auth.uid():
--      the inserting customer owns the row.
--   5. Creates public.merchants (uid role table, seeded from merchant@test.com)
--      and public.is_merchant() so the service_requests policies can grant the
--      merchant read/update over ALL requests server-side — closing the
--      documented "no owner column" isolation gap without putting a role in
--      the JWT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) user_id columns (nullable during transition; FK to auth.users)
-- -----------------------------------------------------------------------------
alter table public.purchases
  add column if not exists user_id uuid references auth.users(id);

alter table public.marketplace_listings
  add column if not exists user_id uuid references auth.users(id);

alter table public.merchant_products
  add column if not exists user_id uuid references auth.users(id);

alter table public.service_requests
  add column if not exists user_id uuid references auth.users(id);

alter table public.marketplace_bids
  add column if not exists user_id uuid references auth.users(id);

-- service_requests has no email column → the inserting user owns the row.
alter table public.service_requests
  alter column user_id set default auth.uid();

-- Ownership is immutable once attributed: an UPDATE can never reassign or NULL
-- an existing user_id (blocks a customer "downgrading" their own row to the
-- globally-visible legacy state). Claiming a legacy NULL row stays possible.
create or replace function public.service_requests_preserve_user_id()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(old.user_id, new.user_id);
  return new;
end;
$$;

drop trigger if exists service_requests_preserve_user_id on public.service_requests;
create trigger service_requests_preserve_user_id
  before update on public.service_requests
  for each row execute function public.service_requests_preserve_user_id();

-- RLS filters on user_id on every read → index each table.
create index if not exists purchases_user_id_idx            on public.purchases (user_id);
create index if not exists marketplace_listings_user_id_idx on public.marketplace_listings (user_id);
create index if not exists merchant_products_user_id_idx    on public.merchant_products (user_id);
create index if not exists service_requests_user_id_idx     on public.service_requests (user_id);
create index if not exists marketplace_bids_user_id_idx     on public.marketplace_bids (user_id);

-- -----------------------------------------------------------------------------
-- 2) BEFORE INSERT trigger: derive user_id from the row's email column.
--    tg_argv[0] names the email column (differs per table). SECURITY DEFINER is
--    required to read auth.users. Fires for the transfer_ownership RPC too, so
--    the buyer's purchase row gets the buyer's uid without touching the RPC.
--
--    AUTHORITATIVE: when the email column is present it ALWAYS overwrites any
--    client-supplied user_id. Combined with the uid insert policies
--    (user_id = auth.uid()), this makes email spoofing self-defeating: a forged
--    email resolves to the victim's uid, which then fails the policy check.
-- -----------------------------------------------------------------------------
create or replace function public.fill_user_id_from_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := to_jsonb(new) ->> tg_argv[0];
  if v_email is not null then
    new.user_id := (
      select id from auth.users where lower(email) = lower(v_email) limit 1
    );
  else
    -- Never trust a client-supplied uid that has no email to verify it against.
    new.user_id := null;
  end if;
  return new;
end;
$$;

-- Not client-callable: only fired as a trigger.
revoke execute on function public.fill_user_id_from_email() from public, anon, authenticated;

drop trigger if exists purchases_fill_user_id on public.purchases;
create trigger purchases_fill_user_id
  before insert on public.purchases
  for each row execute function public.fill_user_id_from_email('email');

drop trigger if exists marketplace_listings_fill_user_id on public.marketplace_listings;
create trigger marketplace_listings_fill_user_id
  before insert on public.marketplace_listings
  for each row execute function public.fill_user_id_from_email('seller_email');

drop trigger if exists merchant_products_fill_user_id on public.merchant_products;
create trigger merchant_products_fill_user_id
  before insert on public.merchant_products
  for each row execute function public.fill_user_id_from_email('merchant_id');

drop trigger if exists marketplace_bids_fill_user_id on public.marketplace_bids;
create trigger marketplace_bids_fill_user_id
  before insert on public.marketplace_bids
  for each row execute function public.fill_user_id_from_email('bidder_email');

-- -----------------------------------------------------------------------------
-- 3) Backfill user_id for existing rows (email → auth.users join, case-robust).
--    Rows whose email has NO auth.users account keep user_id NULL — those
--    identities cannot log in, so uid-scoped reads correctly never return them.
-- -----------------------------------------------------------------------------
update public.purchases p
set user_id = u.id
from auth.users u
where p.user_id is null and lower(p.email) = lower(u.email);

update public.marketplace_listings l
set user_id = u.id
from auth.users u
where l.user_id is null and lower(l.seller_email) = lower(u.email);

update public.merchant_products m
set user_id = u.id
from auth.users u
where m.user_id is null and lower(m.merchant_id) = lower(u.email);

update public.marketplace_bids b
set user_id = u.id
from auth.users u
where b.user_id is null and lower(b.bidder_email) = lower(u.email);

-- (service_requests: intentionally NO backfill — no email column exists.)

-- -----------------------------------------------------------------------------
-- 4) Merchant role, server-side (uid-based; replaces the client-only email
--    allowlist as the enforcement mechanism for service_requests policies).
--    RLS enabled with NO policies → clients can never read or write it; only
--    SECURITY DEFINER code (is_merchant) touches it.
-- -----------------------------------------------------------------------------
create table if not exists public.merchants (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.merchants enable row level security;

-- Seed from the existing allowlist. If merchant@test.com has not registered in
-- Supabase Auth yet, this inserts nothing — verify with the query at the bottom
-- BEFORE running rls_policies.sql, or the merchant dashboard will lose access
-- to other users' service requests.
insert into public.merchants (user_id)
select id from auth.users where lower(email) = 'merchant@test.com'
on conflict do nothing;

create or replace function public.is_merchant()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.merchants where user_id = auth.uid())
$$;

grant execute on function public.is_merchant() to authenticated;

-- -----------------------------------------------------------------------------
-- 5) Realtime DELETE payloads must carry user_id (not just the PK) for the
--    client-side user_id filter on purchase deletes (seller side of a
--    transfer). FULL replica identity makes old-row values available.
-- -----------------------------------------------------------------------------
alter table public.purchases replica identity full;

-- =============================================================================
-- VERIFICATION (run after the script)
-- =============================================================================
-- 1) Backfill coverage — remaining NULLs should only be emails with no account:
--    select 'purchases' t, count(*) filter (where user_id is null) nulls, count(*) total from public.purchases
--    union all select 'marketplace_listings', count(*) filter (where user_id is null), count(*) from public.marketplace_listings
--    union all select 'merchant_products',    count(*) filter (where user_id is null), count(*) from public.merchant_products
--    union all select 'service_requests',     count(*) filter (where user_id is null), count(*) from public.service_requests
--    union all select 'marketplace_bids',     count(*) filter (where user_id is null), count(*) from public.marketplace_bids;
--
-- 2) Merchant seeded (MUST return 1 row before running rls_policies.sql):
--    select * from public.merchants;
--
-- 3) Triggers installed:
--    select tgname, tgrelid::regclass from pg_trigger where tgname like '%fill_user_id%';
