
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_market text default 'crypto',
  default_risk_pct numeric(5,2) default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- trade details
  asset text not null,
  market text not null check (market in ('forex','crypto','stocks')),
  direction text not null check (direction in ('buy','sell')),
  entry_price numeric not null,
  stop_loss numeric not null,
  take_profit numeric not null,
  position_size numeric not null,
  risk_pct numeric,
  strategy text,
  timeframe text,
  session text,
  -- pre-trade psychology
  reason text not null,
  setup text not null,
  confidence int not null check (confidence between 1 and 10),
  emotion_before text not null check (emotion_before in ('calm','fear','greed','fomo','revenge')),
  -- screenshots
  entry_screenshot_path text,
  exit_screenshot_path text,
  tag text check (tag in ('perfect_setup','mistake','emotional')),
  -- close-out / post-trade
  status text not null default 'open' check (status in ('open','closed')),
  exit_price numeric,
  pnl numeric,
  followed_plan boolean,
  emotion_after text check (emotion_after in ('satisfaction','regret','frustration','overconfidence')),
  notes text,
  closed_at timestamptz,
  -- meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trades_user_created_idx on public.trades(user_id, created_at desc);
create index trades_user_status_idx on public.trades(user_id, status);

-- No-trade days
create table public.no_trade_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Streaks
create table public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_day date,
  challenge_started_at date,
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_trades_updated before update on public.trades for each row execute function public.set_updated_at();
create trigger trg_streaks_updated before update on public.streaks for each row execute function public.set_updated_at();

-- New user handler
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.streaks (user_id, challenge_started_at)
  values (new.id, current_date);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.trades enable row level security;
alter table public.no_trade_days enable row level security;
alter table public.streaks enable row level security;

create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);

create policy "own trades all" on public.trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own ntd all" on public.no_trade_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own streak select" on public.streaks for select using (auth.uid() = user_id);
create policy "own streak update" on public.streaks for update using (auth.uid() = user_id);
create policy "own streak insert" on public.streaks for insert with check (auth.uid() = user_id);

-- Storage bucket
insert into storage.buckets (id, name, public) values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

create policy "own screenshots select" on storage.objects for select
  using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own screenshots insert" on storage.objects for insert
  with check (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own screenshots update" on storage.objects for update
  using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own screenshots delete" on storage.objects for delete
  using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
