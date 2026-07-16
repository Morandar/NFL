-- Adds human-readable game names and permanent-account resume support.
alter table public.games add column if not exists name text;
update public.games set name = 'Hra ' || code where name is null or char_length(trim(name)) < 2;
alter table public.games alter column name set not null;
alter table public.games drop constraint if exists games_name_check;
alter table public.games add constraint games_name_check check (char_length(name) between 2 and 60);

create or replace function public.create_named_game(
  target_league_id uuid,
  target_season_id uuid,
  initial_state jsonb,
  display_name text,
  requested_name text
)
returns table (game_id uuid, game_code text, game_name text, game_state jsonb, game_version bigint)
language plpgsql security definer set search_path = public as $$
declare created_game public.games; candidate text; clean_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_league_member(target_league_id) then raise exception 'Not a league member'; end if;
  if not exists (select 1 from public.seasons where id = target_season_id and league_id = target_league_id) then
    raise exception 'Season does not belong to league';
  end if;
  if char_length(trim(display_name)) not between 2 and 30 then raise exception 'Invalid display name'; end if;
  clean_name := trim(requested_name);
  if char_length(clean_name) not between 2 and 60 then raise exception 'Game name must have 2–60 characters'; end if;
  loop
    candidate := public.generate_code(6);
    exit when not exists (select 1 from public.games where code = candidate);
  end loop;
  insert into public.games (league_id, season_id, code, name, host_user_id, state)
  values (target_league_id, target_season_id, candidate, clean_name, auth.uid(), initial_state)
  returning * into created_game;
  insert into public.game_members (game_id, user_id, display_name)
  values (created_game.id, auth.uid(), trim(display_name));
  insert into public.game_events (game_id, actor_user_id, event_type, payload)
  values (created_game.id, auth.uid(), 'game_created', jsonb_build_object('name', created_game.name));
  return query select created_game.id, created_game.code, created_game.name, created_game.state, created_game.version;
end;
$$;

create or replace function public.resume_game(target_game_id uuid)
returns table (
  game_id uuid,
  normalized_code text,
  game_name text,
  display_name text,
  game_state jsonb,
  game_version bigint,
  host_user_id uuid
)
language plpgsql security definer set search_path = public as $$
declare selected_game public.games; member_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into selected_game from public.games where id = target_game_id and status <> 'archived';
  if selected_game.id is null then raise exception 'Game not found'; end if;
  if not public.is_league_member(selected_game.league_id) then raise exception 'Not a league member'; end if;
  select gm.display_name into member_name from public.game_members gm
  where gm.game_id = selected_game.id and gm.user_id = auth.uid();
  if member_name is null then
    select p.display_name into member_name from public.profiles p where p.id = auth.uid();
    member_name := coalesce(nullif(trim(member_name), ''), 'Player');
    begin
      insert into public.game_members (game_id, user_id, display_name)
      values (selected_game.id, auth.uid(), member_name);
    exception when unique_violation then
      member_name := left(member_name, 22) || ' ' || left(auth.uid()::text, 6);
      insert into public.game_members (game_id, user_id, display_name)
      values (selected_game.id, auth.uid(), member_name);
    end;
  else
    update public.game_members set last_seen_at = now()
    where game_id = selected_game.id and user_id = auth.uid();
  end if;
  return query select selected_game.id, selected_game.code, selected_game.name, member_name,
    selected_game.state, selected_game.version, selected_game.host_user_id;
end;
$$;

create or replace function public.rename_game(target_game_id uuid, requested_name text)
returns text language plpgsql security definer set search_path = public as $$
declare selected_game public.games; clean_name text := trim(requested_name);
begin
  if char_length(clean_name) not between 2 and 60 then raise exception 'Game name must have 2–60 characters'; end if;
  select * into selected_game from public.games where id = target_game_id;
  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.host_user_id <> auth.uid() and not public.is_league_admin(selected_game.league_id) then
    raise exception 'Only host or league admin can rename game';
  end if;
  update public.games set name = clean_name, updated_at = now() where id = target_game_id;
  insert into public.game_events (game_id, actor_user_id, event_type, payload)
  values (target_game_id, auth.uid(), 'game_renamed', jsonb_build_object('name', clean_name));
  return clean_name;
end;
$$;

grant execute on function public.create_named_game(uuid, uuid, jsonb, text, text) to authenticated;
grant execute on function public.resume_game(uuid), public.rename_game(uuid, text) to authenticated;
