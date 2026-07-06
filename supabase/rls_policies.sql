-- =============================================================================
-- TEST — Phase 5 Step 10c: Row-Level Security (+ Stage 6 auth.uid migration)
-- =============================================================================
-- PREREQUISITE (Stage 6): run supabase/uid_migration.sql FIRST — the policies
-- below reference user_id columns and public.is_merchant(), which that script
-- creates. This script fails loudly (undefined column/function) if run early.
--
-- Run this ENTIRE script in the Supabase SQL Editor (Dashboard → SQL Editor).
-- It is IDEMPOTENT and re-runnable: every policy is DROP-IF-EXISTS then CREATE,
-- and ENABLE ROW LEVEL SECURITY is a no-op when already enabled. Policies are
-- created BEFORE RLS is enabled on each table, so a table is never left locked
-- out.
--
-- AUTH MODEL: real Supabase Auth (Step 10b). The app uses ONE anon-key client
-- that carries the signed-in user's JWT. Stage 6: the CANONICAL owner key is
-- auth.uid() against each table's user_id column (populated by uid_migration's
-- backfill + insert triggers). The original auth.jwt()->>'email' policies are
-- kept alongside, clearly marked DEPRECATED — permissive policies OR together,
-- so during the transition a row is accessible if EITHER key matches. Remove
-- the DEPRECATED block of each table after the uid path is verified (two-account
-- isolation checklist). Logged-out visitors send the `anon` role. service_role
-- (server/admin) and SECURITY DEFINER functions BYPASS RLS.
--
-- DESIGN NOTES / deviations from a naive per-table plan (see Step 10c diagnostic):
--   * Global storefront + /verify are browsable LOGGED OUT → global tables get
--     PUBLIC (anon+authenticated) SELECT, not authenticated-only.
--   * Merchant role: Stage 6 adds public.merchants (uid role table) +
--     is_merchant() so policies can grant the merchant server-side. On
--     merchant_products, writes are canonically scoped by user_id = auth.uid()
--     (filled from merchant_id, which holds the merchant's email); the direct
--     email comparison remains only as a DEPRECATED transitional policy.
--   * certificates.merchant_id is NULL in the app (registration never passes it),
--     so certificates INSERT is scoped to `authenticated` (no anon writes) rather
--     than to a merchant — identity is immutable (no UPDATE/DELETE policy).
--   * marketplace_listings status transitions are driven by the BUYER (mark sold)
--     and ANY viewer (settle→ended), not the seller → UPDATE is `authenticated`,
--     INSERT is scoped to the seller.
--   * certificate_status has no owner column and is written by owner AND merchant
--     → writes are `authenticated`.
--   * service_requests: Stage 6 CLOSES the Step 9 gap — rows now carry user_id
--     (DEFAULT auth.uid()) and are per-user isolated; the merchant (is_merchant())
--     reads/updates the whole queue. Legacy rows (user_id NULL, unattributable —
--     the table never had an email column) stay globally visible to authenticated
--     users, matching their pre-migration exposure.
--   * purchases: SECURITY DEFINER `transfer_ownership` performs the cross-user
--     buyer-insert + seller-delete and BYPASSES these policies (verified in
--     dashboard). Direct client writes (regular checkout / remove) are scoped to
--     the owner's user_id = auth.uid() (email policies DEPRECATED).
--   * marketplace_bids is unused by the app (bids are still session-only — out of
--     scope). Policies here are PROVISIONAL, added only so the table is not an
--     open door; revisit when bids are migrated.
--
-- auth.jwt() is wrapped in (select ...) so Postgres caches it per-statement
-- (RLS performance best practice). Email comparisons use lower() on both sides
-- to be case-robust.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- certificates  — GLOBAL read (incl. anon /verify); immutable identity
-- -----------------------------------------------------------------------------
drop policy if exists certificates_select_all    on public.certificates;
drop policy if exists certificates_insert_auth   on public.certificates;

create policy certificates_select_all
  on public.certificates for select
  to anon, authenticated
  using (true);

create policy certificates_insert_auth
  on public.certificates for insert
  to authenticated
  with check (true);
-- (no UPDATE/DELETE policy → certificate identity is immutable)

alter table public.certificates enable row level security;

-- -----------------------------------------------------------------------------
-- certificate_status  — GLOBAL read; written by owner AND merchant (no owner col)
-- -----------------------------------------------------------------------------
drop policy if exists certificate_status_select_all  on public.certificate_status;
drop policy if exists certificate_status_insert_auth  on public.certificate_status;
drop policy if exists certificate_status_update_auth  on public.certificate_status;
drop policy if exists certificate_status_delete_auth  on public.certificate_status;

create policy certificate_status_select_all
  on public.certificate_status for select
  to anon, authenticated
  using (true);

create policy certificate_status_insert_auth
  on public.certificate_status for insert
  to authenticated
  with check (true);

create policy certificate_status_update_auth
  on public.certificate_status for update
  to authenticated
  using (true) with check (true);

-- clearStatus() deletes the row ("active" == absent row, Step 6a)
create policy certificate_status_delete_auth
  on public.certificate_status for delete
  to authenticated
  using (true);

alter table public.certificate_status enable row level security;

-- -----------------------------------------------------------------------------
-- certificate_events  — GLOBAL read; APPEND-ONLY ledger (insert only)
-- -----------------------------------------------------------------------------
drop policy if exists certificate_events_select_all  on public.certificate_events;
drop policy if exists certificate_events_insert_auth  on public.certificate_events;

create policy certificate_events_select_all
  on public.certificate_events for select
  to anon, authenticated
  using (true);

create policy certificate_events_insert_auth
  on public.certificate_events for insert
  to authenticated
  with check (true);
-- (no UPDATE/DELETE policy → append-only)

alter table public.certificate_events enable row level security;

-- -----------------------------------------------------------------------------
-- merchant_products  — GLOBAL read (anon storefront); MERCHANT-scoped writes
--   merchant_id is the merchant's email (= auth email) → real server-side gate
-- -----------------------------------------------------------------------------
drop policy if exists merchant_products_select_all       on public.merchant_products;
drop policy if exists merchant_products_insert_merchant  on public.merchant_products;
drop policy if exists merchant_products_update_merchant  on public.merchant_products;
drop policy if exists merchant_products_delete_merchant  on public.merchant_products;
drop policy if exists merchant_products_insert_uid       on public.merchant_products;
drop policy if exists merchant_products_update_uid       on public.merchant_products;
drop policy if exists merchant_products_delete_uid       on public.merchant_products;

create policy merchant_products_select_all
  on public.merchant_products for select
  to anon, authenticated
  using (true);

-- Canonical uid scoping. user_id is filled by the insert trigger (from
-- merchant_id, which holds the merchant's email) — the client sends no uid.
create policy merchant_products_insert_uid
  on public.merchant_products for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy merchant_products_update_uid
  on public.merchant_products for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy merchant_products_delete_uid
  on public.merchant_products for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- DEPRECATED (email-based) — remove after uid verification. While present,
-- writes pass if EITHER the email OR the uid policy matches.
create policy merchant_products_insert_merchant
  on public.merchant_products for insert
  to authenticated
  with check (lower(merchant_id) = lower((select auth.jwt() ->> 'email')));

create policy merchant_products_update_merchant
  on public.merchant_products for update
  to authenticated
  using (lower(merchant_id) = lower((select auth.jwt() ->> 'email')))
  with check (lower(merchant_id) = lower((select auth.jwt() ->> 'email')));

create policy merchant_products_delete_merchant
  on public.merchant_products for delete
  to authenticated
  using (lower(merchant_id) = lower((select auth.jwt() ->> 'email')));

alter table public.merchant_products enable row level security;

-- -----------------------------------------------------------------------------
-- marketplace_listings  — GLOBAL read; INSERT by seller; UPDATE by any auth user
--   (buyer marks sold, any viewer settles→ended — not the seller). No delete.
-- -----------------------------------------------------------------------------
drop policy if exists marketplace_listings_select_all     on public.marketplace_listings;
drop policy if exists marketplace_listings_insert_seller   on public.marketplace_listings;
drop policy if exists marketplace_listings_update_auth      on public.marketplace_listings;
drop policy if exists marketplace_listings_insert_uid       on public.marketplace_listings;

create policy marketplace_listings_select_all
  on public.marketplace_listings for select
  to anon, authenticated
  using (true);

-- Canonical uid scoping. user_id (the seller's uid) is filled by the insert
-- trigger from seller_email.
create policy marketplace_listings_insert_uid
  on public.marketplace_listings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- DEPRECATED (email-based) — remove after uid verification.
create policy marketplace_listings_insert_seller
  on public.marketplace_listings for insert
  to authenticated
  with check (lower(seller_email) = lower((select auth.jwt() ->> 'email')));

-- Status lifecycle (active→ended/sold) is finalized by buyers/viewers, so UPDATE
-- is open to any authenticated user (documented in Step 10c diagnostic).
create policy marketplace_listings_update_auth
  on public.marketplace_listings for update
  to authenticated
  using (true) with check (true);
-- (no DELETE policy → listings are never deleted by the app)

alter table public.marketplace_listings enable row level security;

-- -----------------------------------------------------------------------------
-- purchases  — PRIVATE, per-user (auth.uid canonical; email DEPRECATED).
--   Cross-user transfer is done by the SECURITY DEFINER transfer_ownership RPC,
--   which BYPASSES these policies (its buyer-row insert gets user_id from the
--   fill_user_id_from_email trigger — see uid_migration.sql).
-- -----------------------------------------------------------------------------
drop policy if exists purchases_select_owner  on public.purchases;
drop policy if exists purchases_insert_owner  on public.purchases;
drop policy if exists purchases_delete_owner  on public.purchases;
drop policy if exists purchases_select_uid    on public.purchases;
drop policy if exists purchases_insert_uid    on public.purchases;
drop policy if exists purchases_delete_uid    on public.purchases;

-- Canonical uid scoping.
create policy purchases_select_uid
  on public.purchases for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy purchases_insert_uid
  on public.purchases for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy purchases_delete_uid
  on public.purchases for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- DEPRECATED (email-based) — remove after uid verification. While present, a
-- row is accessible if EITHER the email OR the uid policy matches (permissive
-- policies OR together). Legacy rows whose email never registered in auth.users
-- keep user_id NULL and remain reachable ONLY through these policies.
create policy purchases_select_owner
  on public.purchases for select
  to authenticated
  using (lower(email) = lower((select auth.jwt() ->> 'email')));

create policy purchases_insert_owner
  on public.purchases for insert
  to authenticated
  with check (lower(email) = lower((select auth.jwt() ->> 'email')));

create policy purchases_delete_owner
  on public.purchases for delete
  to authenticated
  using (lower(email) = lower((select auth.jwt() ->> 'email')));
-- (no UPDATE policy → purchase records are immutable client-side)

alter table public.purchases enable row level security;

-- -----------------------------------------------------------------------------
-- PUBLIC ARCHIVE read path (companion to purchases RLS)
-- -----------------------------------------------------------------------------
-- /library is a PUBLIC archive of every sold, certificated piece — it reads
-- ACROSS ALL users. Once purchases SELECT is owner-scoped (above), a direct
-- global read is impossible, so the archive reads through this SECURITY DEFINER
-- function instead. It runs as the owner (bypasses purchases RLS) but exposes
-- ONLY public columns — NEVER email / wallet_address / tx_hash. Callable by anon
-- (logged-out /library must work). lib/repositories/supabase/archiveRepo.ts calls
-- it via supabase.rpc('archive_public').
drop function if exists public.archive_public();

create function public.archive_public()
returns table (
  certificate_id text,
  product_name text,
  product_image text,
  product_description text,
  price integer,
  purchased_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select certificate_id, product_name, product_image, product_description,
         price, purchased_at
  from public.purchases
  where certificate_id is not null
  order by purchased_at desc
$$;

grant execute on function public.archive_public() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- service_requests  — Stage 6: PER-USER isolated (closes the Step 9/10c gap).
--   Owner = user_id (DEFAULT auth.uid() on insert — the requesting customer).
--   The MERCHANT (public.merchants role table, is_merchant()) reads and updates
--   ALL requests — that is the workflow (quote/deny/complete). Customers see and
--   update only their own rows (accept/decline/pay). NOT anon-readable.
--
--   ⚠ The pre-Stage-6 open policies (using (true)) are REPLACED, not kept:
--   keeping them alongside would OR-away all isolation. Legacy rows have
--   user_id NULL (the table had no owner/email column, so no backfill is
--   possible); the `user_id is null` clause keeps them visible/updatable by any
--   authenticated user — exactly the pre-migration behavior, for those rows
--   only. New rows are isolated from day one.
-- -----------------------------------------------------------------------------
drop policy if exists service_requests_select_auth  on public.service_requests;
drop policy if exists service_requests_insert_auth  on public.service_requests;
drop policy if exists service_requests_update_auth  on public.service_requests;
drop policy if exists service_requests_select_uid   on public.service_requests;
drop policy if exists service_requests_insert_uid   on public.service_requests;
drop policy if exists service_requests_update_uid   on public.service_requests;

create policy service_requests_select_uid
  on public.service_requests for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or user_id is null            -- legacy pre-migration rows (unattributable)
    or public.is_merchant()      -- merchant works the whole queue
  );

create policy service_requests_insert_uid
  on public.service_requests for insert
  to authenticated
  with check (user_id = (select auth.uid()));  -- DEFAULT auth.uid() fills it

create policy service_requests_update_uid
  on public.service_requests for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or user_id is null
    or public.is_merchant()
  )
  with check (
    user_id = (select auth.uid())
    or user_id is null
    or public.is_merchant()
  );
-- (no DELETE policy → the app never deletes service requests)

alter table public.service_requests enable row level security;

-- -----------------------------------------------------------------------------
-- marketplace_bids  — PROVISIONAL (bids are still session-only, out of scope).
--   Added only so the table is not an open door; revisit at the bids migration.
-- -----------------------------------------------------------------------------
drop policy if exists marketplace_bids_select_all    on public.marketplace_bids;
drop policy if exists marketplace_bids_insert_bidder on public.marketplace_bids;
drop policy if exists marketplace_bids_insert_uid    on public.marketplace_bids;

create policy marketplace_bids_select_all
  on public.marketplace_bids for select
  to anon, authenticated
  using (true);

-- Canonical uid scoping (user_id filled by the insert trigger from bidder_email).
create policy marketplace_bids_insert_uid
  on public.marketplace_bids for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- DEPRECATED (email-based) — remove after uid verification.
create policy marketplace_bids_insert_bidder
  on public.marketplace_bids for insert
  to authenticated
  with check (lower(bidder_email) = lower((select auth.jwt() ->> 'email')));

alter table public.marketplace_bids enable row level security;

-- =============================================================================
-- VERIFICATION (run after the script; all should look right)
-- =============================================================================
-- 1) Every public table has rowsecurity = true:
--    select tablename, rowsecurity from pg_tables where schemaname = 'public'
--    order by tablename;
--
-- 2) Policies per table:
--    select tablename, policyname, cmd, roles
--    from pg_policies where schemaname = 'public' order by tablename, cmd;
--
-- 3) CONFIRM transfer_ownership bypasses RLS (must be SECURITY DEFINER):
--    select proname, prosecdef from pg_proc where proname = 'transfer_ownership';
--    -- prosecdef must be TRUE. If FALSE, cross-user auction transfers will fail
--    -- under RLS (the buyer's client cannot delete the seller's purchase row).

-- =============================================================================
-- CLEANUP — run ONLY after the uid path passes the two-account isolation
-- checklist. Removes the DEPRECATED email-based policies (pastes cleanly).
-- =============================================================================
-- drop policy if exists purchases_select_owner              on public.purchases;
-- drop policy if exists purchases_insert_owner              on public.purchases;
-- drop policy if exists purchases_delete_owner              on public.purchases;
-- drop policy if exists merchant_products_insert_merchant   on public.merchant_products;
-- drop policy if exists merchant_products_update_merchant   on public.merchant_products;
-- drop policy if exists merchant_products_delete_merchant   on public.merchant_products;
-- drop policy if exists marketplace_listings_insert_seller  on public.marketplace_listings;
-- drop policy if exists marketplace_bids_insert_bidder      on public.marketplace_bids;
-- NOTE: after dropping purchases_select_owner, any purchases row whose email
-- never registered in auth.users (user_id NULL) becomes unreachable by clients.

-- =============================================================================
-- ROLLBACK (only if RLS must be lifted — pastes cleanly)
-- =============================================================================
-- alter table public.certificates          disable row level security;
-- alter table public.certificate_status    disable row level security;
-- alter table public.certificate_events    disable row level security;
-- alter table public.merchant_products     disable row level security;
-- alter table public.marketplace_listings  disable row level security;
-- alter table public.purchases             disable row level security;
-- alter table public.service_requests      disable row level security;
-- alter table public.marketplace_bids      disable row level security;
-- (policies can remain; they are inert while RLS is disabled)
