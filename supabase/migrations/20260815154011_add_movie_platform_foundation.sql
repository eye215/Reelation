do $$ begin
  create type public.movie_status as enum ('DRAFT','GENERATING','COMPLETED','UPDATED','ARCHIVED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.movie_generation_reason as enum ('INITIAL','MANUAL_REGENERATE','NEW_INTERPRETATION');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.movie_artifact_status as enum ('PENDING','GENERATING','DONE','FAILED');
exception when duplicate_object then null; end $$;

create table if not exists public.movie_themes (
  key text primary key,
  genre text not null check (genre in ('ROMANCE','ROMANTIC_COMEDY','MELODRAMA','NOIR','PSYCHOLOGICAL_THRILLER','HEALING_DRAMA','GROWTH_DRAMA','MYSTERY','FANTASY')),
  label text not null,
  tokens jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.movie_themes(key,genre,label,tokens) values
  ('romance_warm','ROMANCE','Warm Romance','{"accent":"#eaa0ae","surface":"#f6eee9"}'),
  ('noir_dark','NOIR','Dark Noir','{"accent":"#b84648","surface":"#111114"}'),
  ('mystery_deep','MYSTERY','Deep Mystery','{"accent":"#6384ad","surface":"#111720"}'),
  ('growth_natural','GROWTH_DRAMA','Natural Growth','{"accent":"#92d8a2","surface":"#101412"}')
on conflict(key) do update set genre=excluded.genre,label=excluded.label,tokens=excluded.tokens,updated_at=now();

create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null unique references public.casting_boards(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  status public.movie_status not null default 'DRAFT',
  title text,
  primary_genre text check (primary_genre is null or primary_genre in ('ROMANCE','ROMANTIC_COMEDY','MELODRAMA','NOIR','PSYCHOLOGICAL_THRILLER','HEALING_DRAMA','GROWTH_DRAMA','MYSTERY','FANTASY')),
  theme_key text references public.movie_themes(key),
  character_type text,
  tagline text,
  current_version integer not null default 0 check(current_version >= 0),
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movie_versions (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  movie_version integer not null check(movie_version > 0),
  prompt_version text not null,
  model_version text not null,
  input_hash text not null,
  generation_reason public.movie_generation_reason not null,
  movie_payload jsonb not null default '{}'::jsonb,
  poster_status public.movie_artifact_status not null default 'PENDING',
  poster_image_key text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  unique(movie_id,movie_version),
  unique(movie_id,input_hash,prompt_version,model_version)
);

alter table public.cast_members add column if not exists public_name text;
alter table public.cast_members drop constraint if exists cast_members_public_name_check;
alter table public.cast_members add constraint cast_members_public_name_check check(public_name is null or char_length(trim(public_name)) between 1 and 40);

alter table public.public_reels
  add column if not exists movie_id uuid unique references public.movies(id) on delete cascade,
  add column if not exists primary_genre text,
  add column if not exists theme_key text,
  add column if not exists character_type text,
  add column if not exists tagline text,
  add column if not exists poster_image_key text;

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null check(event_name in ('movie_created','invite_created','invite_opened','birth_submitted','cast_created','poster_generated','ranking_viewed','share_clicked')),
  movie_id uuid references public.movies(id) on delete set null,
  board_id uuid references public.casting_boards(id) on delete set null,
  actor_user_id uuid references public.users(id) on delete set null,
  anonymous_session_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists movies_owner_user_id_idx on public.movies(owner_user_id);
create index if not exists movie_versions_movie_id_idx on public.movie_versions(movie_id);
create index if not exists analytics_events_movie_created_idx on public.analytics_events(movie_id,created_at desc);

insert into public.movies(board_id,owner_user_id,status,title)
select b.id,b.owner_user_id,'DRAFT',b.title from public.casting_boards b
on conflict(board_id) do nothing;

update public.public_reels pr set movie_id=m.id
from public.movies m where m.board_id=pr.board_id and pr.movie_id is null;

create or replace function public.mark_movie_cast_updated()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  update public.movies set status='UPDATED',updated_at=now()
  where board_id=case when tg_op='DELETE' then old.board_id else new.board_id end
    and status in ('COMPLETED','UPDATED');
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists cast_marks_movie_updated on public.cast_members;
create trigger cast_marks_movie_updated after insert or update or delete on public.cast_members
for each row execute function public.mark_movie_cast_updated();

alter table public.movie_themes enable row level security;
alter table public.movies enable row level security;
alter table public.movie_versions enable row level security;
alter table public.analytics_events enable row level security;

revoke all on public.movie_themes,public.movies,public.movie_versions,public.analytics_events from anon,authenticated;
grant select on public.movie_themes to anon,authenticated;
grant select,insert,update,delete on public.movies,public.movie_versions to authenticated;

create policy movie_themes_read_active on public.movie_themes for select to anon,authenticated using(is_active=true);
create policy movies_owner_all on public.movies for all to authenticated
using((select auth.uid())=owner_user_id)
with check((select auth.uid())=owner_user_id and exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy movie_versions_owner_all on public.movie_versions for all to authenticated
using(exists(select 1 from public.movies m where m.id=movie_id and m.owner_user_id=(select auth.uid())))
with check(exists(select 1 from public.movies m where m.id=movie_id and m.owner_user_id=(select auth.uid())));

grant select(public_id,owner_nickname,title,hero_image_key,cast_count,movie_id,primary_genre,theme_key,character_type,tagline,poster_image_key) on public.public_reels to anon,authenticated;

create or replace function public.bootstrap_owner_board(
  p_nickname text,p_birth_date date,p_birth_time time,p_birth_time_known boolean,p_gender public.gender_type
) returns table(board_id uuid,public_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user_id uuid:=auth.uid();v_birth_id uuid;v_board_id uuid;v_public_id uuid;v_movie_id uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if char_length(trim(p_nickname)) not between 1 and 40 then raise exception 'INVALID_NICKNAME' using errcode='22023'; end if;
  if p_birth_date is null or p_birth_date>current_date then raise exception 'INVALID_BIRTH_DATE' using errcode='22023'; end if;
  if p_birth_time_known and p_birth_time is null then raise exception 'INVALID_BIRTH_TIME' using errcode='22023'; end if;
  select u.birth_profile_id into v_birth_id from public.users u where u.id=v_user_id;
  if not found then
    insert into public.birth_profiles(birth_date,birth_time,birth_time_known,calendar_type,gender)
    values(p_birth_date,case when p_birth_time_known then p_birth_time else null end,p_birth_time_known,'SOLAR',p_gender) returning id into v_birth_id;
    insert into public.users(id,nickname,birth_profile_id) values(v_user_id,trim(p_nickname),v_birth_id);
  end if;
  select b.id,b.public_id into v_board_id,v_public_id from public.casting_boards b where b.owner_user_id=v_user_id;
  if not found then
    insert into public.casting_boards(owner_user_id,title,invite_enabled,is_published)
    values(v_user_id,trim(p_nickname)||'의 Reelation',true,true) returning id,casting_boards.public_id into v_board_id,v_public_id;
  end if;
  insert into public.movies(board_id,owner_user_id,status,title)
  values(v_board_id,v_user_id,'DRAFT',trim(p_nickname)||'의 Reelation')
  on conflict(board_id) do update set owner_user_id=excluded.owner_user_id,updated_at=now() returning id into v_movie_id;
  insert into public.public_reels(public_id,board_id,movie_id,owner_nickname,title,cast_count,is_active)
  values(v_public_id,v_board_id,v_movie_id,trim(p_nickname),trim(p_nickname)||'의 Reelation',0,true)
  on conflict(board_id) do update set movie_id=excluded.movie_id,owner_nickname=excluded.owner_nickname,title=excluded.title,is_active=true,updated_at=now();
  return query select v_board_id,v_public_id;
end; $$;

revoke all on function public.bootstrap_owner_board(text,date,time,boolean,public.gender_type) from public,anon;
grant execute on function public.bootstrap_owner_board(text,date,time,boolean,public.gender_type) to authenticated;

comment on table public.movies is 'Private owner movie lifecycle. Casting boards remain the compatibility and participation aggregate.';
comment on table public.movie_versions is 'Immutable AI generation cache. Cast changes never create rows here; only explicit generation requests do.';
comment on column public.cast_members.public_name is 'Optional public display name; UI resolves public_name before nickname.';

