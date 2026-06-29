create extension if not exists "uuid-ossp";

-- Enums
create type public.trait_type as enum ('positive', 'negative');
create type public.game_status as enum ('pending', 'active', 'finished');
create type public.step_type as enum ('instructions', 'status', 'results', 'team_arrangement');
create type public.game_type as enum ('strongness', 'mental', 'cooperation', 'velocity', 'deception');

-- Event (single row — controls countdown and character lock)
create table public.event (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  event_start_at timestamptz not null,
  created_at     timestamptz not null default now()
);

-- Profiles (extends auth.users)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile row on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trait options
create table public.trait_options (
  id   uuid primary key default uuid_generate_v4(),
  name text not null,
  type public.trait_type not null,
  constraint trait_options_name_type_unique unique (name, type)
);

-- Background options
create table public.background_options (
  id   uuid primary key default uuid_generate_v4(),
  name text not null unique
);

-- Players / characters
create table public.players (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  character_name   text,
  creature         text,
  positive_trait_1 uuid references public.trait_options(id),
  positive_trait_2 uuid references public.trait_options(id),
  negative_trait_1 uuid references public.trait_options(id),
  negative_trait_2 uuid references public.trait_options(id),
  background       uuid references public.background_options(id),
  is_complete      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint players_user_id_unique unique (user_id)
);

-- Games (current_step_id FK added after game_steps)
create table public.games (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  order_index     integer not null,
  status          public.game_status not null default 'pending',
  current_step_id uuid,
  team_size       integer not null default 1,
  game_type       public.game_type not null,
  constraint games_order_index_unique unique (order_index)
);

-- Game steps
create table public.game_steps (
  id          uuid primary key default uuid_generate_v4(),
  game_id     uuid not null references public.games(id) on delete cascade,
  step_type   public.step_type not null,
  order_index integer not null,
  content     jsonb not null default '{}',
  constraint game_steps_order_unique unique (game_id, order_index)
);

-- Back-fill FK from games to game_steps
alter table public.games
  add constraint games_current_step_id_fkey
  foreign key (current_step_id) references public.game_steps(id) on delete set null;

-- Game status entries (realtime-watched)
create table public.game_status_entries (
  id         uuid primary key default uuid_generate_v4(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  status     text not null default 'alive',
  updated_at timestamptz not null default now(),
  constraint game_status_entries_unique unique (game_id, player_id)
);

-- Leaderboard
create table public.leaderboard (
  id        uuid primary key default uuid_generate_v4(),
  game_id   uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  points    integer not null default 0,
  constraint leaderboard_unique unique (game_id, player_id)
);

-- RLS
alter table public.event               enable row level security;
alter table public.profiles            enable row level security;
alter table public.trait_options       enable row level security;
alter table public.background_options  enable row level security;
alter table public.players             enable row level security;
alter table public.games               enable row level security;
alter table public.game_steps          enable row level security;
alter table public.game_status_entries enable row level security;
alter table public.leaderboard         enable row level security;

-- Event
create policy "event_read_all"    on public.event for select using (true);
create policy "event_write_admin" on public.event for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Profiles
create policy "profiles_read_all"   on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Traits / backgrounds (read-only for everyone)
create policy "trait_options_read"      on public.trait_options      for select using (true);
create policy "background_options_read" on public.background_options for select using (true);

-- Players
create policy "players_read_all"   on public.players for select using (true);
create policy "players_insert_own" on public.players for insert with check (auth.uid() = user_id);
create policy "players_update_own" on public.players for update using (auth.uid() = user_id);

-- Games + steps + status + leaderboard: read all, write admin only
create policy "games_read_all"    on public.games for select using (true);
create policy "games_write_admin" on public.games for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "game_steps_read_all"    on public.game_steps for select using (true);
create policy "game_steps_write_admin" on public.game_steps for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "game_status_read_all"    on public.game_status_entries for select using (true);
create policy "game_status_write_admin" on public.game_status_entries for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "leaderboard_read_all"    on public.leaderboard for select using (true);
create policy "leaderboard_write_admin" on public.leaderboard for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Enable realtime on tables that the /live page subscribes to
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_status_entries;
alter publication supabase_realtime add table public.leaderboard;
