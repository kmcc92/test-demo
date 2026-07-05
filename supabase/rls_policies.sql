-- =============================================================================
-- TEST — Phase 5 Step 10c: Row-Level Security
-- =============================================================================
-- Run this ENTIRE script in the Supabase SQL Editor (Dashboard → SQL Editor).
-- It is IDEMPOTENT and re-runnable: every policy is DROP-IF-EXISTS then CREATE,
-- and ENABLE ROW LEVEL SECURITY is a no-op when already enabled. Policies are
-- created BEFORE RLS is enabled on each table, so a table is never left locked
-- out.
--
-- AUTH MODEL: real Supabase Auth (Step 10b). The app uses ONE anon-key client
-- that carries the signed-in user's JWT, so auth.jwt()->>'email' identifies the
-- caller. Logged-out visitors send the `anon` role. service_role (server/admin)
-- and SECURITY DEFINER functions BYPASS RLS.
--
-- DESIGN NOTES / deviations from a naive per-table plan (see Step 10c diagnostic):
--   * Global storefront + /verify are browsable LOGGED OUT → global tables get
--     PUBLIC (anon+authenticated) SELECT, not authenticated-only.
--   * Merchant role is NOT in the JWT (email allowlist is client-side). Merchant
--     writes are enforced as `merchant_id = auth email` on merchant_products
--     (the merchant_id column IS populated with the merchant's email). It is the
--     same allowlist rule, now enforced server-side.
--   * certificates.merchant_id is NULL in the app (registration never passes it),
--     so certificates INSERT is scoped to `authenticated` (no anon writes) rather
--     than to a merchant — identity is immutable (no UPDATE/DELETE policy).
--   * marketplace_listings status transitions are driven by the BUYER (mark sold)
--     and ANY viewer (settle→ended), not the seller → UPDATE is `authenticated`,
--     INSERT is scoped to the seller.
--   * certificate_status has no owner column and is written by owner AND merchant
--     → writes are `authenticated`.
--   * service_requests has NO owner column and the merchant reads ALL of them
--     (Step 9 global design) → SELECT/INSERT/UPDATE are `authenticated`.
--     ⚠ LIMITATION (accepted, documented): service requests are NOT per-user
--     isolated at the DB layer — any authenticated user can query all rows.
--     True isolation needs an owner column + role-in-JWT (a future step).
--   * purchases: SECURITY DEFINER `transfer_ownership` performs the cross-user
--     buyer-insert + seller-delete and BYPASSES these policies (verified in
--     dashboard). Direct client writes (regular checkout / remove) are scoped to
--     the owner's own email.
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

create policy merchant_products_select_all
  on public.merchant_products for select
  to anon, authenticated
  using (true);

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

create policy marketplace_listings_select_all
  on public.marketplace_listings for select
  to anon, authenticated
  using (true);

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
-- purchases  — PRIVATE, per-user (email). Cross-user transfer is done by the
--   SECURITY DEFINER transfer_ownership RPC, which BYPASSES these policies.
-- -----------------------------------------------------------------------------
drop policy if exists purchases_select_owner  on public.purchases;
drop policy if exists purchases_insert_owner  on public.purchases;
drop policy if exists purchases_delete_owner  on public.purchases;

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
-- service_requests  — GLOBAL among AUTHENTICATED users (no owner column; the
--   merchant reads all, the customer filters client-side). NOT anon-readable.
--   ⚠ NOT per-user isolated at the DB layer — see limitation note in header.
-- -----------------------------------------------------------------------------
drop policy if exists service_requests_select_auth  on public.service_requests;
drop policy if exists service_requests_insert_auth  on public.service_requests;
drop policy if exists service_requests_update_auth  on public.service_requests;

create policy service_requests_select_auth
  on public.service_requests for select
  to authenticated
  using (true);

create policy service_requests_insert_auth
  on public.service_requests for insert
  to authenticated
  with check (true);

create policy service_requests_update_auth
  on public.service_requests for update
  to authenticated
  using (true) with check (true);
-- (no DELETE policy → the app never deletes service requests)

alter table public.service_requests enable row level security;

-- -----------------------------------------------------------------------------
-- marketplace_bids  — PROVISIONAL (bids are still session-only, out of scope).
--   Added only so the table is not an open door; revisit at the bids migration.
-- -----------------------------------------------------------------------------
drop policy if exists marketplace_bids_select_all    on public.marketplace_bids;
drop policy if exists marketplace_bids_insert_bidder on public.marketplace_bids;

create policy marketplace_bids_select_all
  on public.marketplace_bids for select
  to anon, authenticated
  using (true);

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
