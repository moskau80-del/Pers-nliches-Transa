-- PackLager Cloud: Tabellen, automatische Benutzerzuordnung und Row Level Security
create extension if not exists pgcrypto;

create table if not exists public.gear (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category text default '',
  weight_g numeric not null default 0 check (weight_g >= 0),
  quantity integer not null default 1 check (quantity > 0),
  location text default '',
  brand text default '',
  price_chf numeric not null default 0 check (price_chf >= 0),
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.pack_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.pack_list_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pack_list_id uuid not null references public.pack_lists(id) on delete cascade,
  gear_id uuid not null references public.gear(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(pack_list_id, gear_id)
);

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category text default '',
  weight_g numeric not null default 0 check (weight_g >= 0),
  price_chf numeric not null default 0 check (price_chf >= 0),
  url text default '',
  priority text not null default 'Mittel' check (priority in ('Hoch','Mittel','Tief')),
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.gear enable row level security;
alter table public.pack_lists enable row level security;
alter table public.pack_list_items enable row level security;
alter table public.wishlist enable row level security;

create policy "gear own rows" on public.gear for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "lists own rows" on public.pack_lists for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "list items own rows" on public.pack_list_items for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "wishlist own rows" on public.wishlist for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists gear_owner_idx on public.gear(owner_id);
create index if not exists pack_lists_owner_idx on public.pack_lists(owner_id);
create index if not exists pack_list_items_owner_idx on public.pack_list_items(owner_id);
create index if not exists wishlist_owner_idx on public.wishlist(owner_id);
