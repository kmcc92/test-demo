-- Copy-paste ready version of rls_policies.sql
-- Run this entire script in the Supabase SQL Editor after uid_migration_copy_paste.sql.

-- certificates

drop policy if exists certificates_select_all on public.certificates;
drop policy if exists certificates_insert_auth on public.certificates;

create policy certificates_select_all
  on public.certificates for select
  to anon, authenticated
  using (true);

create policy certificates_insert_auth
  on public.certificates for insert
  to authenticated
  with check (true);

alter table public.certificates enable row level security;

-- certificate_status

drop policy if exists certificate_status_select_all on public.certificate_status;
drop policy if exists certificate_status_insert_auth on public.certificate_status;
drop policy if exists certificate_status_update_auth on public.certificate_status;
drop policy if exists certificate_status_delete_auth on public.certificate_status;

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

create policy certificate_status_delete_auth
  on public.certificate_status for delete
  to authenticated
  using (true);

alter table public.certificate_status enable row level security;

-- certificate_events

drop policy if exists certificate_events_select_all on public.certificate_events;
drop policy if exists certificate_events_insert_auth on public.certificate_events;

create policy certificate_events_select_all
  on public.certificate_events for select
  to anon, authenticated
  using (true);

create policy certificate_events_insert_auth
  on public.certificate_events for insert
  to authenticated
  with check (true);

alter table public.certificate_events enable row level security;

-- merchant_products

drop policy if exists merchant_products_select_all on public.merchant_products;
drop policy if exists merchant_products_insert_merchant on public.merchant_products;
drop policy if exists merchant_products_update_merchant on public.merchant_products;
drop policy if exists merchant_products_delete_merchant on public.merchant_products;
drop policy if exists merchant_products_insert_uid on public.merchant_products;
drop policy if exists merchant_products_update_uid on public.merchant_products;
drop policy if exists merchant_products_delete_uid on public.merchant_products;

create policy merchant_products_select_all
  on public.merchant_products for select
  to anon, authenticated
  using (true);

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

-- marketplace_listings

drop policy if exists marketplace_listings_select_all on public.marketplace_listings;
drop policy if exists marketplace_listings_insert_seller on public.marketplace_listings;
drop policy if exists marketplace_listings_update_auth on public.marketplace_listings;
drop policy if exists marketplace_listings_insert_uid on public.marketplace_listings;

create policy marketplace_listings_select_all
  on public.marketplace_listings for select
  to anon, authenticated
  using (true);

create policy marketplace_listings_insert_uid
  on public.marketplace_listings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy marketplace_listings_insert_seller
  on public.marketplace_listings for insert
  to authenticated
  with check (lower(seller_email) = lower((select auth.jwt() ->> 'email')));

create policy marketplace_listings_update_auth
  on public.marketplace_listings for update
  to authenticated
  using (true) with check (true);

alter table public.marketplace_listings enable row level security;

-- purchases

drop policy if exists purchases_select_owner on public.purchases;
drop policy if exists purchases_insert_owner on public.purchases;
drop policy if exists purchases_delete_owner on public.purchases;
drop policy if exists purchases_select_uid on public.purchases;
drop policy if exists purchases_insert_uid on public.purchases;
drop policy if exists purchases_delete_uid on public.purchases;

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

alter table public.purchases enable row level security;

-- archive_public

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

-- service_requests

drop policy if exists service_requests_select_auth on public.service_requests;
drop policy if exists service_requests_insert_auth on public.service_requests;
drop policy if exists service_requests_update_auth on public.service_requests;
drop policy if exists service_requests_select_uid on public.service_requests;
drop policy if exists service_requests_insert_uid on public.service_requests;
drop policy if exists service_requests_update_uid on public.service_requests;

create policy service_requests_select_uid
  on public.service_requests for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or user_id is null
    or public.is_merchant()
  );

create policy service_requests_insert_uid
  on public.service_requests for insert
  to authenticated
  with check (user_id = (select auth.uid()));

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

alter table public.service_requests enable row level security;

-- marketplace_bids

drop policy if exists marketplace_bids_select_all on public.marketplace_bids;
drop policy if exists marketplace_bids_insert_bidder on public.marketplace_bids;
drop policy if exists marketplace_bids_insert_uid on public.marketplace_bids;

create policy marketplace_bids_select_all
  on public.marketplace_bids for select
  to anon, authenticated
  using (true);

create policy marketplace_bids_insert_uid
  on public.marketplace_bids for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy marketplace_bids_insert_bidder
  on public.marketplace_bids for insert
  to authenticated
  with check (lower(bidder_email) = lower((select auth.jwt() ->> 'email')));

alter table public.marketplace_bids enable row level security;
