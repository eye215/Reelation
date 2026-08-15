alter table public.users add column if not exists profile_image_url text, add column if not exists auth_provider text;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_nickname text;
begin
  v_nickname:=left(trim(coalesce(new.raw_user_meta_data->>'nickname',new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'full_name','Reelation 사용자')),40);
  if v_nickname='' then v_nickname:='Reelation 사용자'; end if;
  insert into public.users(id,nickname,profile_image_url,auth_provider)
  values(new.id,v_nickname,left(coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture',''),2048),new.raw_app_meta_data->>'provider')
  on conflict(id) do update set nickname=case when public.users.nickname='Reelation 사용자' then excluded.nickname else public.users.nickname end,
    profile_image_url=coalesce(nullif(excluded.profile_image_url,''),public.users.profile_image_url),auth_provider=coalesce(excluded.auth_provider,public.users.auth_provider),updated_at=now();
  return new;
end $$;
revoke all on function public.handle_new_auth_user() from public,anon,authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of raw_user_meta_data,raw_app_meta_data on auth.users for each row execute function public.handle_new_auth_user();

insert into public.users(id,nickname,profile_image_url,auth_provider)
select au.id,left(coalesce(nullif(trim(au.raw_user_meta_data->>'nickname'),''),nullif(trim(au.raw_user_meta_data->>'name'),''),'Reelation 사용자'),40),
nullif(coalesce(au.raw_user_meta_data->>'avatar_url',au.raw_user_meta_data->>'picture'),''),au.raw_app_meta_data->>'provider'
from auth.users au on conflict(id) do nothing;

create or replace function public.bootstrap_owner_board(p_nickname text,p_birth_date date,p_birth_time time,p_birth_time_known boolean,p_gender public.gender_type)
returns table(board_id uuid,public_id uuid) language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_user_id uuid:=auth.uid();v_birth_id uuid;v_board_id uuid;v_public_id uuid;v_movie_id uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if char_length(trim(p_nickname)) not between 1 and 40 then raise exception 'INVALID_NICKNAME' using errcode='22023'; end if;
  if p_birth_date is null or p_birth_date>current_date then raise exception 'INVALID_BIRTH_DATE' using errcode='22023'; end if;
  if p_birth_time_known and p_birth_time is null then raise exception 'INVALID_BIRTH_TIME' using errcode='22023'; end if;
  select u.birth_profile_id into v_birth_id from public.users u where u.id=v_user_id;
  if not found then insert into public.users(id,nickname) values(v_user_id,trim(p_nickname)); end if;
  if v_birth_id is null then
    insert into public.birth_profiles(birth_date,birth_time,birth_time_known,calendar_type,gender)
    values(p_birth_date,case when p_birth_time_known then p_birth_time else null end,p_birth_time_known,'SOLAR',p_gender) returning id into v_birth_id;
    update public.users set nickname=trim(p_nickname),birth_profile_id=v_birth_id,updated_at=now() where id=v_user_id;
  end if;
  select b.id,b.public_id into v_board_id,v_public_id from public.casting_boards b where b.owner_user_id=v_user_id;
  if not found then insert into public.casting_boards(owner_user_id,title,invite_enabled,is_published)
    values(v_user_id,trim(p_nickname)||'의 Reelation',true,true) returning id,casting_boards.public_id into v_board_id,v_public_id; end if;
  insert into public.movies(board_id,owner_user_id,status,title) values(v_board_id,v_user_id,'DRAFT',trim(p_nickname)||'의 Reelation')
  on conflict(board_id) do update set owner_user_id=excluded.owner_user_id,updated_at=now() returning id into v_movie_id;
  insert into public.public_reels(public_id,board_id,movie_id,owner_nickname,title,cast_count,is_active)
  values(v_public_id,v_board_id,v_movie_id,trim(p_nickname),trim(p_nickname)||'의 Reelation',0,true)
  on conflict(board_id) do update set movie_id=excluded.movie_id,owner_nickname=excluded.owner_nickname,title=excluded.title,is_active=true,updated_at=now();
  return query select v_board_id,v_public_id;
end $$;
revoke all on function public.bootstrap_owner_board(text,date,time,boolean,public.gender_type) from public,anon;
grant execute on function public.bootstrap_owner_board(text,date,time,boolean,public.gender_type) to authenticated;
