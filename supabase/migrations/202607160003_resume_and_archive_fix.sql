-- Makes account-based resume deterministic and adds non-destructive game removal.
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
declare
  selected_game_id uuid;
  selected_code text;
  selected_name text;
  selected_state jsonb;
  selected_version bigint;
  selected_host uuid;
  selected_league uuid;
  resolved_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select g.id, g.code, g.name, g.state, g.version, g.host_user_id, g.league_id
  into selected_game_id, selected_code, selected_name, selected_state, selected_version, selected_host, selected_league
  from public.games g
  where g.id = target_game_id and g.status <> 'archived';

  if selected_game_id is null then raise exception 'Game not found or archived'; end if;
  if not public.is_league_member(selected_league) then raise exception 'Not a league member'; end if;

  select gm.display_name into resolved_name
  from public.game_members gm
  where gm.game_id = selected_game_id and gm.user_id = auth.uid();

  if resolved_name is null then
    select p.display_name into resolved_name from public.profiles p where p.id = auth.uid();
    resolved_name := coalesce(nullif(trim(resolved_name), ''), 'Player');
    begin
      insert into public.game_members (game_id, user_id, display_name)
      values (selected_game_id, auth.uid(), resolved_name);
    exception when unique_violation then
      resolved_name := left(resolved_name, 22) || ' ' || left(auth.uid()::text, 6);
      insert into public.game_members (game_id, user_id, display_name)
      values (selected_game_id, auth.uid(), resolved_name);
    end;
  else
    update public.game_members gm set last_seen_at = now()
    where gm.game_id = selected_game_id and gm.user_id = auth.uid();
  end if;

  return query select selected_game_id, selected_code, selected_name, resolved_name,
    selected_state, selected_version, selected_host;
end;
$$;

create or replace function public.archive_game(target_game_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare selected_game public.games;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into selected_game from public.games g where g.id = target_game_id;
  if selected_game.id is null then raise exception 'Game not found'; end if;
  if selected_game.host_user_id <> auth.uid() and not public.is_league_admin(selected_game.league_id) then
    raise exception 'Only host or league admin can archive game';
  end if;
  update public.games set status = 'archived', updated_at = now() where id = target_game_id;
  insert into public.game_events (game_id, actor_user_id, event_type)
  values (target_game_id, auth.uid(), 'game_archived');
end;
$$;

grant execute on function public.resume_game(uuid), public.archive_game(uuid) to authenticated;
