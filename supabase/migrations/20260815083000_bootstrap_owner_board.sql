create or replace function public.bootstrap_owner_board(
  p_nickname text,
  p_birth_date date,
  p_birth_time time,
  p_birth_time_known boolean,
  p_gender public.gender_type
)
returns table(board_id uuid, public_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_birth_id uuid;
  v_board_id uuid;
  v_public_id uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if char_length(trim(p_nickname)) not between 1 and 40 then raise exception 'INVALID_NICKNAME' using errcode='22023'; end if;
  if p_birth_date is null or p_birth_date > current_date then raise exception 'INVALID_BIRTH_DATE' using errcode='22023'; end if;
  if p_birth_time_known and p_birth_time is null then raise exception 'INVALID_BIRTH_TIME' using errcode='22023'; end if;

  select u.birth_profile_id into v_birth_id from public.users u where u.id = v_user_id;
  if not found then
    insert into public.birth_profiles(birth_date,birth_time,birth_time_known,calendar_type,gender)
    values(p_birth_date,case when p_birth_time_known then p_birth_time else null end,p_birth_time_known,'SOLAR',p_gender)
    returning id into v_birth_id;
    insert into public.users(id,nickname,birth_profile_id) values(v_user_id,trim(p_nickname),v_birth_id);
  end if;

  select b.id,b.public_id into v_board_id,v_public_id from public.casting_boards b where b.owner_user_id=v_user_id;
  if not found then
    insert into public.casting_boards(owner_user_id,title,invite_enabled,is_published)
    values(v_user_id,trim(p_nickname)||'의 Reelation',true,true)
    returning id,casting_boards.public_id into v_board_id,v_public_id;
  end if;

  insert into public.public_reels(public_id,board_id,owner_nickname,title,cast_count,is_active)
  values(v_public_id,v_board_id,trim(p_nickname),trim(p_nickname)||'의 Reelation',0,true)
  on conflict(board_id) do update set owner_nickname=excluded.owner_nickname,title=excluded.title,is_active=true,updated_at=now();

  return query select v_board_id,v_public_id;
end;
$$;

revoke all on function public.bootstrap_owner_board(text,date,time,boolean,public.gender_type) from public,anon;
grant execute on function public.bootstrap_owner_board(text,date,time,boolean,public.gender_type) to authenticated;
