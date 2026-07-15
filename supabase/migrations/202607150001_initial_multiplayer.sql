-- NFL Conquest: persistent accounts, leagues, seasons and games.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 50),
  owner_id uuid not null references auth.users(id) on delete restrict,
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{8}$'),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 50),
  year integer not null check (year between 2020 and 2100),
  status text not null default 'active' check (status in ('planned', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  unique (league_id, year, name)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_user_id uuid not null references auth.users(id) on delete restrict,
  state jsonb not null,
  version bigint not null default 1,
  status text not null default 'active' check (status in ('setup', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_members (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create table public.game_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index league_members_user_idx on public.league_members(user_id);
create index seasons_league_idx on public.seasons(league_id, year desc);
create index games_season_idx on public.games(season_id, updated_at desc);
create index game_members_seen_idx on public.game_members(game_id, last_seen_at desc);
create index game_events_game_idx on public.game_events(game_id, created_at desc);
create unique index game_members_unique_name_idx on public.game_members(game_id, lower(display_name));

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.seasons enable row level security;
alter table public.games enable row level security;
alter table public.game_members enable row level security;
alter table public.game_events enable row level security;

create or replace function public.is_league_member(target_league_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.league_members where league_id = target_league_id and user_id = auth.uid());
$$;

create or replace function public.is_league_admin(target_league_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.league_members
    where league_id = target_league_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_game_member(target_game_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.game_members where game_id = target_game_id and user_id = auth.uid());
$$;

create policy "authenticated profiles are visible" on public.profiles
for select to authenticated using (true);
create policy "users update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "members read leagues" on public.leagues
for select to authenticated using (public.is_league_member(id));
create policy "members read memberships" on public.league_members
for select to authenticated using (public.is_league_member(league_id));
create policy "members read seasons" on public.seasons
for select to authenticated using (public.is_league_member(league_id));
create policy "members read games" on public.games
for select to authenticated using (public.is_league_member(league_id));
create policy "game members read presence" on public.game_members
for select to authenticated using (public.is_game_member(game_id));
create policy "game members read history" on public.game_events
for select to authenticated using (public.is_game_member(game_id));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(
      case
        when char_length(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'Player'), '@', 1)))) >= 2
          then trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'Player'), '@', 1)))
        else 'Player'
      end,
      30
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.generate_code(code_length integer)
returns text language plpgsql security definer set search_path = public as $$
declare alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; candidate text := ''; position integer;
begin
  for position in 1..code_length loop
    candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return candidate;
end;
$$;

create or replace function public.create_league(league_name text, season_name text, season_year integer)
returns table (league_id uuid, invite_code text, season_id uuid)
language plpgsql security definer set search_path = public as $$
declare created_league public.leagues; created_season public.seasons; candidate text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(league_name)) not between 2 and 50 then raise exception 'League name must have 2–50 characters'; end if;
  if char_length(trim(season_name)) not between 2 and 50 then raise exception 'Season name must have 2–50 characters'; end if;
  if season_year not between 2020 and 2100 then raise exception 'Invalid season year'; end if;
  loop
    candidate := public.generate_code(8);
    exit when not exists (select 1 from public.leagues where leagues.invite_code = candidate);
  end loop;
  insert into public.leagues (name, owner_id, invite_code)
  values (trim(league_name), auth.uid(), candidate) returning * into created_league;
  insert into public.league_members (league_id, user_id, role)
  values (created_league.id, auth.uid(), 'owner');
  insert into public.seasons (league_id, name, year, status)
  values (created_league.id, trim(season_name), season_year, 'active') returning * into created_season;
  return query select created_league.id, created_league.invite_code, created_season.id;
end;
$$;

create or replace function public.join_league(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare selected_league_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into selected_league_id from public.leagues where invite_code = upper(trim(code)) and archived_at is null;
  if selected_league_id is null then raise exception 'League not found'; end if;
  insert into public.league_members (league_id, user_id) values (selected_league_id, auth.uid()) on conflict do nothing;
  return selected_league_id;
end;
$$;

create or replace function public.create_game(target_league_id uuid, target_season_id uuid, initial_state jsonb, display_name text)
returns table (game_id uuid, game_code text, game_state jsonb, game_version bigint)
language plpgsql security definer set search_path = public as $$
declare created_game public.games; candidate text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(display_name)) not between 2 and 30 then raise exception 'Invalid display name'; end if;
  if not public.is_league_member(target_league_id) then raise exception 'Not a league member'; end if;
  if not exists (select 1 from public.seasons where id = target_season_id and league_id = target_league_id) then
    raise exception 'Season does not belong to league';
  end if;
  loop
    candidate := public.generate_code(6);
    exit when not exists (select 1 from public.games where code = candidate);
  end loop;
  insert into public.games (league_id, season_id, code, host_user_id, state)
  values (target_league_id, target_season_id, candidate, auth.uid(), initial_state) returning * into created_game;
  insert into public.game_members (game_id, user_id, display_name)
  values (created_game.id, auth.uid(), trim(display_name));
  insert into public.game_events (game_id, actor_user_id, event_type)
  values (created_game.id, auth.uid(), 'game_created');
  return query select created_game.id, created_game.code, created_game.state, created_game.version;
end;
$$;

create or replace function public.join_game(game_code text, display_name text)
returns table (game_id uuid, normalized_code text, game_state jsonb, game_version bigint, host_user_id uuid)
language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(display_name)) not between 2 and 30 then raise exception 'Invalid display name'; end if;
  select * into selected_game from public.games where code = upper(trim(game_code)) and status <> 'archived';
  if selected_game.id is null then raise exception 'Game not found'; end if;
  if not public.is_league_member(selected_game.league_id) then raise exception 'Join the league first'; end if;
  insert into public.game_members (game_id, user_id, display_name, last_seen_at)
  values (selected_game.id, auth.uid(), trim(display_name), now())
  on conflict (game_id, user_id) do update set display_name = excluded.display_name, last_seen_at = now();
  return query select selected_game.id, selected_game.code, selected_game.state, selected_game.version, selected_game.host_user_id;
end;
$$;

create or replace function public.update_game_state(target_game_id uuid, next_state jsonb, expected_version bigint)
returns table (game_state jsonb, game_version bigint, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare updated_game public.games;
begin
  if not public.is_game_member(target_game_id) then raise exception 'Not a game member'; end if;
  update public.games set state = next_state, version = version + 1, updated_at = now()
  where id = target_game_id and version = expected_version returning * into updated_game;
  if updated_game.id is null then raise exception using errcode = '40001', message = 'Game state changed; reload and retry'; end if;
  insert into public.game_events (game_id, actor_user_id, event_type, payload)
  values (target_game_id, auth.uid(), 'state_updated', jsonb_build_object('version', updated_game.version));
  return query select updated_game.state, updated_game.version, updated_game.updated_at;
end;
$$;

create or replace function public.touch_game_member(target_game_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.game_members set last_seen_at = now() where game_id = target_game_id and user_id = auth.uid();
$$;

revoke all on public.profiles, public.leagues, public.league_members, public.seasons, public.games, public.game_members, public.game_events from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant update (display_name, avatar_url, updated_at) on public.profiles to authenticated;
grant execute on function public.is_league_member(uuid), public.is_league_admin(uuid), public.is_game_member(uuid) to authenticated;
grant execute on function public.create_league(text, text, integer), public.join_league(text) to authenticated;
grant execute on function public.create_game(uuid, uuid, jsonb, text), public.join_game(text, text) to authenticated;
grant execute on function public.update_game_state(uuid, jsonb, bigint), public.touch_game_member(uuid) to authenticated;

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_members;
alter publication supabase_realtime add table public.game_events;
