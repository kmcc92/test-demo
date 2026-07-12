-- =============================================================================
-- TEST — Stage 6: ownership_transfers (append-only ledger + public provenance)
-- =============================================================================
-- PREREQUISITE: run supabase/uid_migration.sql FIRST — this script reuses the
-- public.fill_user_id_from_email() trigger function it creates.
--
-- Run this ENTIRE script in the Supabase SQL Editor (Dashboard → SQL Editor).
-- It is IDEMPOTENT and re-runnable: table/index/trigger use IF NOT EXISTS or
-- CREATE OR REPLACE / DROP-IF-EXISTS, and ENABLE ROW LEVEL SECURITY is a no-op
-- when already enabled. Policies are created BEFORE RLS is enabled so the table
-- is never left locked out.
--
-- WHAT THIS DOES
--   1. Creates public.ownership_transfers — an APPEND-ONLY ledger of every
--      ownership transfer (auction/resale settlement). One row per transfer,
--      keyed by the Stripe payment reference (payment_ref), so a retried write
--      is an idempotent 23505.
--   2. Fills user_id from buyer_email via the shared BEFORE INSERT trigger — the
--      BUYER owns the ledger row (same mechanism as purchases; keeps the
--      SECURITY DEFINER transfer_ownership RPC path unchanged).
--   3. RLS: uid-scoped INSERT + owner SELECT; NO update/delete policy → the
--      ledger is append-only at the database level.
--   4. Adds ownership_provenance_public() — a SECURITY DEFINER read that projects
--      ONLY public-safe columns (certificate_id, product_name, price,
--      transferred_at). It NEVER exposes buyer_email, seller_email, buyer_wallet,
--      or payment_ref. This is the public /verify + /library provenance surface;
--      lib/repositories/supabase/ownershipTransferRepo.ts reads it via
--      supabase.rpc('ownership_provenance_public').
--
-- AFTER RUNNING: Realtime is intentionally NOT required for this table — the
-- repo hydrates through the RPC (realtime deferred, see the repo header). No
-- "enable Realtime" step is needed here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Table — append-only ledger. Columns mirror buildOwnershipTransferRow()
--    (lib/ownership-transfers.ts); user_id is trigger-filled, not client-sent.
-- -----------------------------------------------------------------------------
create table if not exists public.ownership_transfers (
  payment_ref     text primary key,          -- Stripe payment ref = idempotency key
  certificate_id  text not null,
  product_id      text not null,
  product_name    text not null,
  buyer_email     text not null,
  seller_email    text not null,
  price           integer not null,
  buyer_wallet    text,                       -- private; never on public surfaces
  user_id         uuid references auth.users(id),  -- buyer uid (trigger-filled)
  transferred_at  timestamptz not null default now(),
  metadata        jsonb not null default '{}'::jsonb
);

-- Provenance reads and RLS filter by these → index both.
create index if not exists ownership_transfers_certificate_id_idx
  on public.ownership_transfers (certificate_id);
create index if not exists ownership_transfers_user_id_idx
  on public.ownership_transfers (user_id);

-- -----------------------------------------------------------------------------
-- 2) BEFORE INSERT trigger — derive user_id from buyer_email (reuses the shared
--    SECURITY DEFINER function from uid_migration.sql). AUTHORITATIVE: it always
--    overwrites any client-supplied user_id, so the uid insert policy below makes
--    a forged buyer_email self-defeating (resolves to the victim's uid, which
--    then fails the with-check).
-- -----------------------------------------------------------------------------
drop trigger if exists ownership_transfers_fill_user_id on public.ownership_transfers;
create trigger ownership_transfers_fill_user_id
  before insert on public.ownership_transfers
  for each row execute function public.fill_user_id_from_email('buyer_email');

-- -----------------------------------------------------------------------------
-- 3) RLS — uid-scoped (greenfield table → NO deprecated email policies).
--    SELECT: the buyer (row owner) sees the full private row. Everyone else —
--    including the seller and anon visitors — reads provenance through the
--    SECURITY DEFINER function below (public columns only).
--    INSERT: only the authenticated buyer (user_id resolved from buyer_email by
--    the trigger must equal auth.uid()). The transfer_ownership RPC path is
--    unaffected — it inserts the purchase row, not this ledger row; the ledger
--    insert is a normal authenticated client write.
--    NO update/delete policy → APPEND-ONLY at the database level.
-- -----------------------------------------------------------------------------
drop policy if exists ownership_transfers_select_owner on public.ownership_transfers;
drop policy if exists ownership_transfers_insert_uid   on public.ownership_transfers;

create policy ownership_transfers_select_owner
  on public.ownership_transfers for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy ownership_transfers_insert_uid
  on public.ownership_transfers for insert
  to authenticated
  with check (user_id = (select auth.uid()));

alter table public.ownership_transfers enable row level security;

-- -----------------------------------------------------------------------------
-- 4) PUBLIC provenance read path (companion to the owner-scoped RLS above).
--    /verify + /library provenance read ACROSS ALL users; the owner-scoped
--    SELECT makes a direct global read impossible, so they read through this
--    SECURITY DEFINER function instead. It runs as the owner (bypasses RLS) but
--    projects ONLY public columns — NEVER buyer_email / seller_email /
--    buyer_wallet / payment_ref. Callable by anon (logged-out /verify must work).
-- -----------------------------------------------------------------------------
drop function if exists public.ownership_provenance_public();

create function public.ownership_provenance_public()
returns table (
  certificate_id text,
  product_name text,
  price integer,
  transferred_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select certificate_id, product_name, price, transferred_at
  from public.ownership_transfers
  order by transferred_at desc
$$;

grant execute on function public.ownership_provenance_public() to anon, authenticated;

-- =============================================================================
-- VERIFICATION (run after the script)
-- =============================================================================
-- 1) RLS enabled + append-only (no update/delete policy):
--    select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'ownership_transfers';
--    -- expect exactly: SELECT (owner), INSERT (uid). No UPDATE/DELETE.
--
-- 2) Trigger installed:
--    select tgname from pg_trigger where tgrelid = 'public.ownership_transfers'::regclass;
--
-- 3) Public function exposes NO private columns (must return only the 4 public):
--    select * from public.ownership_provenance_public() limit 1;
