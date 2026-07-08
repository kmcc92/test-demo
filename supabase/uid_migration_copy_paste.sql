-- Copy-paste ready version of uid_migration.sql
-- Run this entire script in the Supabase SQL Editor.

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

alter table public.service_requests
  alter column user_id set default auth.uid();

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

create index if not exists purchases_user_id_idx on public.purchases (user_id);
create index if not exists marketplace_listings_user_id_idx on public.marketplace_listings (user_id);
create index if not exists merchant_products_user_id_idx on public.merchant_products (user_id);
create index if not exists service_requests_user_id_idx on public.service_requests (user_id);
create index if not exists marketplace_bids_user_id_idx on public.marketplace_bids (user_id);

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
    new.user_id := null;
  end if;
  return new;
end;
$$;

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

create table if not exists public.merchants (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.merchants enable row level security;

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

alter table public.purchases replica identity full;

select 'purchases' as table_name, count(*) filter (where user_id is null) as null_user_id, count(*) as total
from public.purchases
union all
select 'marketplace_listings', count(*) filter (where user_id is null), count(*) from public.marketplace_listings
union all
select 'merchant_products', count(*) filter (where user_id is null), count(*) from public.merchant_products
union all
select 'service_requests', count(*) filter (where user_id is null), count(*) from public.service_requests
union all
select 'marketplace_bids', count(*) filter (where user_id is null), count(*) from public.marketplace_bids;

select * from public.merchants;

select tgname, tgrelid::regclass from pg_trigger where tgname like '%fill_user_id%';
