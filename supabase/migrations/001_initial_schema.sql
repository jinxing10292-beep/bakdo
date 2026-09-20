create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  balance bigint not null default 10000 check (balance >= 0),
  xp bigint not null default 0,
  level int not null default 1,
  last_daily_claim date,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta bigint not null,
  balance_after bigint not null,
  reason text not null,
  round_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.game_rounds (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  bet bigint not null,
  payout bigint not null default 0,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists public.game_config (
  game text primary key,
  enabled boolean not null default true,
  min_bet bigint not null default 10,
  max_bet bigint not null default 100000,
  params jsonb not null default '{}'
);

create table if not exists public.items (
  id bigint generated always as identity primary key,
  name text not null,
  type text not null,
  price bigint not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id bigint not null references public.items(id) on delete cascade,
  quantity bigint not null default 1,
  created_at timestamptz not null default now(),
  unique(user_id, item_id)
);

create table if not exists public.swords (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level int not null default 0,
  name text not null,
  forged_at timestamptz not null default now(),
  sold_at timestamptz,
  sold_price bigint default 0
);

create table if not exists public.daily_claims (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  claimed_on date not null,
  unique(user_id, claimed_on)
);

alter table public.profiles enable row level security;
alter table public.ledger enable row level security;
alter table public.game_rounds enable row level security;
alter table public.game_config enable row level security;
alter table public.items enable row level security;
alter table public.inventory enable row level security;
alter table public.swords enable row level security;
alter table public.daily_claims enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "ledger_self_select" on public.ledger;
create policy "ledger_self_select" on public.ledger
for select using (auth.uid() = user_id);

drop policy if exists "rounds_self_select" on public.game_rounds;
create policy "rounds_self_select" on public.game_rounds
for select using (auth.uid() = user_id);

drop policy if exists "items_read" on public.items;
create policy "items_read" on public.items
for select using (true);

drop policy if exists "inventory_self_select" on public.inventory;
create policy "inventory_self_select" on public.inventory
for select using (auth.uid() = user_id);

drop policy if exists "swords_self_select" on public.swords;
create policy "swords_self_select" on public.swords
for select using (auth.uid() = user_id);

drop policy if exists "daily_claims_self_select" on public.daily_claims;
create policy "daily_claims_self_select" on public.daily_claims
for select using (auth.uid() = user_id);

drop policy if exists "game_config_read" on public.game_config;
create policy "game_config_read" on public.game_config
for select using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, 'player_' || substr(new.id::text, 1, 8));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_leaderboard(limit_count int default 10)
returns table (user_id uuid, nickname text, balance bigint)
language sql
security definer
set search_path = public
as $$
  select p.id, p.nickname, p.balance
  from public.profiles p
  order by p.balance desc, p.created_at asc
  limit limit_count;
$$;

create or replace function public.claim_daily_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := current_date;
  v_balance bigint;
  v_exists integer;
  v_new_balance bigint;
  v_claim_id bigint;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select count(*) into v_exists
  from public.daily_claims
  where user_id = v_uid and claimed_on = v_today;

  if v_exists > 0 then
    raise exception 'ALREADY_CLAIMED';
  end if;

  select balance into v_balance from public.profiles where id = v_uid for update;

  v_new_balance := v_balance + 5000;
  update public.profiles set balance = v_new_balance, last_daily_claim = v_today where id = v_uid;

  insert into public.daily_claims (user_id, claimed_on) values (v_uid, v_today) returning id into v_claim_id;
  insert into public.ledger (user_id, delta, balance_after, reason, round_id)
  values (v_uid, 5000, v_new_balance, 'daily_bonus', null);

  return jsonb_build_object('balance', v_new_balance, 'claimed_on', v_today);
end;
$$;

create or replace function public.create_sword()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_inserted bigint;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_name := '나무 검';

  insert into public.swords (user_id, level, name)
  values (v_uid, 0, v_name)
  returning id into v_inserted;

  return jsonb_build_object('sword_id', v_inserted, 'name', v_name, 'level', 0);
end;
$$;

create or replace function public.sell_sword(p_sword_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sword record;
  v_sell_price bigint;
  v_balance bigint;
  v_new_balance bigint;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_sword
  from public.swords
  where id = p_sword_id and user_id = v_uid and sold_at is null;

  if not found then
    raise exception 'INVALID_SWORD';
  end if;

  v_sell_price := 120 + (v_sword.level * 220);

  select balance into v_balance from public.profiles where id = v_uid for update;
  v_new_balance := v_balance + v_sell_price;

  update public.profiles set balance = v_new_balance where id = v_uid;
  update public.swords
    set sold_at = now(), sold_price = v_sell_price, name = v_sword.name
  where id = p_sword_id;

  insert into public.ledger (user_id, delta, balance_after, reason, round_id)
  values (v_uid, v_sell_price, v_new_balance, 'sword:sell', null);

  return jsonb_build_object('sold_price', v_sell_price, 'balance', v_new_balance);
end;
$$;

insert into public.game_config (game, params)
values
  ('coinflip', '{"multiplier": 1.95}'),
  ('dice', '{"multiplier": 5}'),
  ('rps', '{"multiplier": 1.94}'),
  ('roulette', '{"multiplier": 35}'),
  ('slots', '{"multiplier": 10}'),
  ('jackpot', '{"multiplier": 50}');

insert into public.items (name, type, price, description)
values
  ('보호권', 'protect', 2000, '강화 실패 시 1회 보호'),
  ('강화 주문서', 'boost', 1500, '강화 성공률 +5%p');

revoke all on function public.get_leaderboard(int) from public, anon;
grant execute on function public.get_leaderboard(int) to authenticated;

revoke all on function public.claim_daily_bonus() from public, anon;
grant execute on function public.claim_daily_bonus() to authenticated;

revoke all on function public.create_sword() from public, anon;
grant execute on function public.create_sword() to authenticated;

revoke all on function public.sell_sword(bigint) from public, anon;
grant execute on function public.sell_sword(bigint) to authenticated;
