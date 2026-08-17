do $$ begin
  create type public.movie_job_status as enum ('PENDING','PROCESSING','DONE','FAILED');
exception when duplicate_object then null; end $$;

create table if not exists public.movie_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies(id) on delete cascade,
  movie_version_id uuid not null unique references public.movie_versions(id) on delete cascade,
  requested_by uuid not null references public.users(id) on delete cascade,
  status public.movie_job_status not null default 'PENDING',
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists movie_generation_jobs_status_created_idx
  on public.movie_generation_jobs(status, created_at);
alter table public.cast_members add column if not exists character_image_key text;
alter table public.movie_generation_jobs enable row level security;
revoke all on public.movie_generation_jobs from anon, authenticated;
grant select on public.movie_generation_jobs to authenticated;
create policy movie_generation_jobs_owner_select on public.movie_generation_jobs
for select to authenticated using (
  exists(select 1 from public.movies m where m.id=movie_id and m.owner_user_id=(select auth.uid()))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('movie-posters','movie-posters',true,10485760,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- No client write policy is created: only the service role may publish immutable poster versions.

create or replace function public.recalculate_board_rankings(p_board_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer;
begin
  delete from public.rankings where board_id=p_board_id;

  with latest as (
    select distinct on (a.cast_member_id) a.*
    from public.relationship_analyses a
    join public.cast_members c on c.id=a.cast_member_id and c.status='ACTIVE'
    where a.board_id=p_board_id
    order by a.cast_member_id,a.updated_at desc
  ), scores as (
    select cast_member_id,scoring_version,t.type,t.score
    from latest a cross join lateral (values
      ('overall',a.overall_score),('attraction',a.attraction_score),('stability',a.stability_score),
      ('impact',a.impact_score),('growth',a.growth_score),('longevity',a.longevity_score),
      ('cooperation',a.cooperation_score),('conflict',a.conflict_score)
    ) t(type,score)
    union all
    select a.cast_member_id,a.scoring_version,lower(g.genre),g.score
    from latest a join public.genre_analyses g on g.relationship_analysis_id=a.id
  ), ranked as (
    select cast_member_id,scoring_version,type,score,
      row_number() over(partition by type order by score desc,cast_member_id)::integer as position
    from scores
  )
  insert into public.rankings(board_id,cast_member_id,type,rank,raw_score,scoring_version)
  select p_board_id,cast_member_id,type,position,score,scoring_version from ranked;

  select count(*) into v_count from public.cast_members where board_id=p_board_id and status='ACTIVE';
  update public.public_reels set cast_count=v_count,updated_at=now() where board_id=p_board_id;

  delete from public.public_cast_entries e
  using public.public_reels r where r.board_id=p_board_id and e.public_id=r.public_id;
  insert into public.public_cast_entries(public_id,cast_member_public_id,nickname,influence_score,influence_rank,image_key)
  select pr.public_id,c.id,coalesce(c.public_name,c.nickname),round(r.raw_score)::integer,r.rank,c.character_image_key
  from public.rankings r
  join public.cast_members c on c.id=r.cast_member_id and c.status='ACTIVE'
  join public.public_reels pr on pr.board_id=r.board_id
  where r.board_id=p_board_id and r.type='overall';
  return v_count;
end $$;
revoke all on function public.recalculate_board_rankings(uuid) from public,anon,authenticated;
grant execute on function public.recalculate_board_rankings(uuid) to service_role;

alter table public.invite_participations add column if not exists participant_user_id uuid references public.users(id) on delete set null;
create unique index if not exists invite_participations_invite_user_uidx
  on public.invite_participations(invite_id,participant_user_id)
  where participant_user_id is not null and status='ACTIVE';

create or replace function public.submit_authenticated_invite_participation(
  p_participant_user_id uuid,p_token_hash text,p_submission_fingerprint text,p_nickname text,
  p_birth_date date,p_birth_time time,p_birth_time_known boolean,p_gender public.gender_type,p_consent_version text
) returns table(cast_member_id uuid,participation_id uuid,board_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_invite public.invites%rowtype;v_birth_id uuid;v_cast_id uuid;v_participation_id uuid;
begin
  if p_participant_user_id is null or not exists(select 1 from auth.users where id=p_participant_user_id) then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if char_length(trim(p_nickname)) not between 1 and 40 then raise exception 'INVALID_NICKNAME' using errcode='22023'; end if;
  if p_birth_date is null or p_birth_date>current_date then raise exception 'INVALID_BIRTH_DATE' using errcode='22023'; end if;
  if p_birth_time_known and p_birth_time is null then raise exception 'INVALID_BIRTH_TIME' using errcode='22023'; end if;
  if p_consent_version<>'invite-v1' then raise exception 'CONSENT_REQUIRED' using errcode='22023'; end if;
  select i.* into v_invite from public.invites i join public.casting_boards b on b.id=i.board_id
  where i.token_hash=p_token_hash and i.status='ACTIVE' and (i.expires_at is null or i.expires_at>now()) and b.invite_enabled=true for update of i;
  if not found then raise exception 'INVITE_INVALID' using errcode='P0001'; end if;
  if exists(select 1 from public.invite_participations p where p.invite_id=v_invite.id and p.participant_user_id=p_participant_user_id and p.status='ACTIVE')
    then raise exception 'DUPLICATE_PARTICIPATION' using errcode='23505'; end if;
  insert into public.birth_profiles(birth_date,birth_time,birth_time_known,calendar_type,gender)
  values(p_birth_date,case when p_birth_time_known then p_birth_time else null end,p_birth_time_known,'SOLAR',p_gender) returning id into v_birth_id;
  insert into public.users(id,nickname,birth_profile_id)
  values(p_participant_user_id,trim(p_nickname),v_birth_id)
  on conflict(id) do update set nickname=excluded.nickname,birth_profile_id=excluded.birth_profile_id,updated_at=now();
  insert into public.cast_members(board_id,linked_user_id,nickname,public_name,source_type,birth_profile_id,status)
  values(v_invite.board_id,p_participant_user_id,trim(p_nickname),trim(p_nickname),'INVITE',v_birth_id,'ACTIVE') returning id into v_cast_id;
  insert into public.invite_participations(invite_id,cast_member_id,participant_user_id,consent_version,consented_at,status,submission_fingerprint)
  values(v_invite.id,v_cast_id,p_participant_user_id,p_consent_version,now(),'ACTIVE',p_submission_fingerprint) returning id into v_participation_id;
  return query select v_cast_id,v_participation_id,v_invite.board_id;
end $$;
revoke all on function public.submit_authenticated_invite_participation(uuid,text,text,text,date,time,boolean,public.gender_type,text) from public,anon,authenticated;
grant execute on function public.submit_authenticated_invite_participation(uuid,text,text,text,date,time,boolean,public.gender_type,text) to service_role;
