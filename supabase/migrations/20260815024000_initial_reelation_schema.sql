create extension if not exists pgcrypto;

create type public.calendar_type as enum ('SOLAR','LUNAR');
create type public.gender_type as enum ('MALE','FEMALE','OTHER');
create type public.cast_source_type as enum ('MANUAL','INVITE');
create type public.cast_status as enum ('ACTIVE','REMOVED');
create type public.invite_status as enum ('ACTIVE','DISABLED','EXPIRED');
create type public.participation_status as enum ('ACTIVE','WITHDRAWN');
create type public.analysis_status as enum ('CALCULATING','NARRATIVE_PENDING','DONE','FAILED');
create type public.narrative_status as enum ('PENDING','DONE','FAILED');
create type public.analysis_confidence as enum ('HIGH','STANDARD');

create table public.birth_profiles (
  id uuid primary key default gen_random_uuid(), birth_date date not null check (birth_date <= current_date),
  birth_time time, birth_time_known boolean not null default false,
  calendar_type public.calendar_type not null, gender public.gender_type not null,
  timezone text, birthplace text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((birth_time_known and birth_time is not null) or (not birth_time_known))
);
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade, nickname text not null check (char_length(nickname) between 1 and 40),
  birth_profile_id uuid unique references public.birth_profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.casting_boards (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null unique references public.users(id) on delete cascade,
  title text, invite_enabled boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.cast_members (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.casting_boards(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 40), source_type public.cast_source_type not null,
  birth_profile_id uuid not null references public.birth_profiles(id), linked_user_id uuid references public.users(id) on delete set null,
  relationship_type text check (relationship_type in ('FRIEND','ROMANTIC_INTEREST','PARTNER','WORK','FAMILY','ACQUAINTANCE','OTHER')),
  status public.cast_status not null default 'ACTIVE', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.invites (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.casting_boards(id) on delete cascade,
  token_hash text not null unique, status public.invite_status not null default 'ACTIVE', expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.invite_participations (
  id uuid primary key default gen_random_uuid(), invite_id uuid not null references public.invites(id) on delete cascade,
  cast_member_id uuid not null unique references public.cast_members(id) on delete cascade,
  participant_user_id uuid references public.users(id) on delete set null, consent_version text not null, consented_at timestamptz not null,
  status public.participation_status not null default 'ACTIVE', created_at timestamptz not null default now()
);
create table public.saju_profiles (
  id uuid primary key default gen_random_uuid(), birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  engine_version text not null, year_stem text not null, year_branch text not null, month_stem text not null, month_branch text not null,
  day_stem text not null, day_branch text not null, hour_stem text, hour_branch text, structured_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(birth_profile_id,engine_version)
);
create table public.relationship_analyses (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.casting_boards(id) on delete cascade,
  cast_member_id uuid not null references public.cast_members(id) on delete cascade,
  owner_saju_profile_id uuid not null references public.saju_profiles(id), cast_saju_profile_id uuid not null references public.saju_profiles(id),
  scoring_version text not null, overall_score double precision not null check (overall_score between 0 and 100),
  attraction_score double precision not null check (attraction_score between 0 and 100), stability_score double precision not null check (stability_score between 0 and 100),
  impact_score double precision not null check (impact_score between 0 and 100), growth_score double precision not null check (growth_score between 0 and 100),
  longevity_score double precision not null check (longevity_score between 0 and 100), cooperation_score double precision not null check (cooperation_score between 0 and 100),
  conflict_score double precision not null check (conflict_score between 0 and 100), global_role text not null,
  confidence public.analysis_confidence not null, feature_codes jsonb not null default '[]'::jsonb, status public.analysis_status not null default 'CALCULATING',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(board_id,cast_member_id,scoring_version)
);
create table public.genre_analyses (
  id uuid primary key default gen_random_uuid(), relationship_analysis_id uuid not null references public.relationship_analyses(id) on delete cascade,
  genre text not null check (genre in ('ROMANCE','FRIENDSHIP','CAREER','GROWTH')), score double precision not null check (score between 0 and 100),
  role text not null, created_at timestamptz not null default now(), unique(relationship_analysis_id,genre)
);
create table public.rankings (
  id uuid primary key default gen_random_uuid(), board_id uuid not null references public.casting_boards(id) on delete cascade,
  cast_member_id uuid not null references public.cast_members(id) on delete cascade, type text not null, rank integer not null check(rank > 0),
  raw_score double precision not null check(raw_score between 0 and 100), scoring_version text not null, created_at timestamptz not null default now(),
  unique(board_id,cast_member_id,type,scoring_version)
);
create table public.narratives (
  id uuid primary key default gen_random_uuid(), relationship_analysis_id uuid not null references public.relationship_analyses(id) on delete cascade,
  prompt_version text not null, model_version text not null, headline text not null check(char_length(headline)<=30), summary text not null check(char_length(summary)<=160),
  role_reason text not null check(char_length(role_reason)<=220), relationship_pattern text not null check(char_length(relationship_pattern)<=220),
  conflict_pattern text not null check(char_length(conflict_pattern)<=180), long_term_pattern text not null check(char_length(long_term_pattern)<=180),
  status public.narrative_status not null default 'PENDING', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(relationship_analysis_id,prompt_version)
);

create index cast_members_board_id_idx on public.cast_members(board_id);
create index cast_members_linked_user_id_idx on public.cast_members(linked_user_id) where linked_user_id is not null;
create index invites_board_id_idx on public.invites(board_id);
create index relationship_analyses_board_id_idx on public.relationship_analyses(board_id);
create index relationship_analyses_cast_member_id_idx on public.relationship_analyses(cast_member_id);
create index genre_analyses_relationship_id_idx on public.genre_analyses(relationship_analysis_id);
create index rankings_board_type_idx on public.rankings(board_id,type);

alter table public.birth_profiles enable row level security;
alter table public.users enable row level security;
alter table public.casting_boards enable row level security;
alter table public.cast_members enable row level security;
alter table public.invites enable row level security;
alter table public.invite_participations enable row level security;
alter table public.saju_profiles enable row level security;
alter table public.relationship_analyses enable row level security;
alter table public.genre_analyses enable row level security;
alter table public.rankings enable row level security;
alter table public.narratives enable row level security;

grant select,insert,update,delete on public.users,public.birth_profiles,public.casting_boards,public.cast_members,public.invites to authenticated;
grant select on public.relationship_analyses,public.genre_analyses,public.rankings,public.narratives to authenticated;
revoke all on public.saju_profiles,public.invite_participations from anon,authenticated;

create policy users_own on public.users for all to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy boards_own on public.casting_boards for all to authenticated using ((select auth.uid())=owner_user_id) with check ((select auth.uid())=owner_user_id);
create policy casts_owner_select on public.cast_members for select to authenticated using (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy casts_owner_insert on public.cast_members for insert to authenticated with check (source_type='MANUAL' and exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy casts_owner_update on public.cast_members for update to authenticated using (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid()))) with check (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy casts_owner_delete on public.cast_members for delete to authenticated using (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy birth_profiles_owner_select on public.birth_profiles for select to authenticated using (exists(select 1 from public.users u where u.id=(select auth.uid()) and u.birth_profile_id=birth_profiles.id) or exists(select 1 from public.cast_members c join public.casting_boards b on b.id=c.board_id where c.birth_profile_id=birth_profiles.id and c.source_type='MANUAL' and b.owner_user_id=(select auth.uid())));
create policy birth_profiles_owner_insert on public.birth_profiles for insert to authenticated with check (true);
create policy birth_profiles_owner_update on public.birth_profiles for update to authenticated using (exists(select 1 from public.users u where u.id=(select auth.uid()) and u.birth_profile_id=birth_profiles.id) or exists(select 1 from public.cast_members c join public.casting_boards b on b.id=c.board_id where c.birth_profile_id=birth_profiles.id and c.source_type='MANUAL' and b.owner_user_id=(select auth.uid()))) with check (true);
create policy birth_profiles_owner_delete on public.birth_profiles for delete to authenticated using (exists(select 1 from public.users u where u.id=(select auth.uid()) and u.birth_profile_id=birth_profiles.id) or exists(select 1 from public.cast_members c join public.casting_boards b on b.id=c.board_id where c.birth_profile_id=birth_profiles.id and c.source_type='MANUAL' and b.owner_user_id=(select auth.uid())));
create policy invites_owner on public.invites for all to authenticated using (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid()))) with check (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy analyses_owner_select on public.relationship_analyses for select to authenticated using (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy genres_owner_select on public.genre_analyses for select to authenticated using (exists(select 1 from public.relationship_analyses a join public.casting_boards b on b.id=a.board_id where a.id=relationship_analysis_id and b.owner_user_id=(select auth.uid())));
create policy rankings_owner_select on public.rankings for select to authenticated using (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy narratives_owner_select on public.narratives for select to authenticated using (exists(select 1 from public.relationship_analyses a join public.casting_boards b on b.id=a.board_id where a.id=relationship_analysis_id and b.owner_user_id=(select auth.uid())));
