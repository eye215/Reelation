alter table public.invite_participations add column if not exists submission_fingerprint text;
create unique index if not exists invite_participations_invite_fingerprint_uidx on public.invite_participations(invite_id,submission_fingerprint) where submission_fingerprint is not null;

create or replace function public.submit_invite_participation(p_token_hash text,p_submission_fingerprint text,p_nickname text,p_birth_date date,p_birth_time time,p_birth_time_known boolean,p_gender public.gender_type,p_consent_version text)
returns table(cast_member_id uuid,participation_id uuid,board_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_invite public.invites%rowtype;v_birth_id uuid;v_cast_id uuid;v_participation_id uuid;
begin
  if char_length(trim(p_nickname)) not between 1 and 40 then raise exception 'INVALID_NICKNAME' using errcode='22023'; end if;
  if p_birth_date is null or p_birth_date>current_date then raise exception 'INVALID_BIRTH_DATE' using errcode='22023'; end if;
  if p_birth_time_known and p_birth_time is null then raise exception 'INVALID_BIRTH_TIME' using errcode='22023'; end if;
  if p_consent_version<>'invite-v1' then raise exception 'CONSENT_REQUIRED' using errcode='22023'; end if;
  select i.* into v_invite from public.invites i join public.casting_boards b on b.id=i.board_id where i.token_hash=p_token_hash and i.status='ACTIVE' and (i.expires_at is null or i.expires_at>now()) and b.invite_enabled=true for update of i;
  if not found then raise exception 'INVITE_INVALID' using errcode='P0001'; end if;
  if exists(select 1 from public.invite_participations p where p.invite_id=v_invite.id and p.submission_fingerprint=p_submission_fingerprint and p.status='ACTIVE') then raise exception 'DUPLICATE_PARTICIPATION' using errcode='23505'; end if;
  insert into public.birth_profiles(birth_date,birth_time,birth_time_known,calendar_type,gender) values(p_birth_date,case when p_birth_time_known then p_birth_time else null end,p_birth_time_known,'SOLAR',p_gender) returning id into v_birth_id;
  insert into public.cast_members(board_id,nickname,source_type,birth_profile_id,status) values(v_invite.board_id,trim(p_nickname),'INVITE',v_birth_id,'ACTIVE') returning id into v_cast_id;
  insert into public.invite_participations(invite_id,cast_member_id,consent_version,consented_at,status,submission_fingerprint) values(v_invite.id,v_cast_id,p_consent_version,now(),'ACTIVE',p_submission_fingerprint) returning id into v_participation_id;
  return query select v_cast_id,v_participation_id,v_invite.board_id;
end $$;
revoke all on function public.submit_invite_participation(text,text,text,date,time,boolean,public.gender_type,text) from public,anon,authenticated;
grant execute on function public.submit_invite_participation(text,text,text,date,time,boolean,public.gender_type,text) to service_role;
