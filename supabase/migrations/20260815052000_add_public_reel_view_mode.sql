alter table public.casting_boards
  add column if not exists public_id uuid not null default gen_random_uuid(),
  add column if not exists is_published boolean not null default true;
create unique index if not exists casting_boards_public_id_idx on public.casting_boards(public_id);

create table public.public_reels (
  public_id uuid primary key,
  board_id uuid not null unique references public.casting_boards(id) on delete cascade,
  owner_nickname text not null check(char_length(owner_nickname) between 1 and 40),
  title text,
  hero_image_key text,
  cast_count integer not null default 0 check(cast_count >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.public_cast_entries (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null references public.public_reels(public_id) on delete cascade,
  cast_member_public_id uuid not null default gen_random_uuid(),
  nickname text not null check(char_length(nickname) between 1 and 40),
  influence_score integer not null check(influence_score between 0 and 100),
  influence_rank integer not null check(influence_rank > 0),
  image_key text,
  updated_at timestamptz not null default now(),
  unique(public_id,cast_member_public_id),
  unique(public_id,influence_rank)
);

create index public_cast_entries_public_id_idx on public.public_cast_entries(public_id);
alter table public.public_reels enable row level security;
alter table public.public_cast_entries enable row level security;

revoke all on public.public_reels,public.public_cast_entries from anon,authenticated;
grant select(public_id,owner_nickname,title,hero_image_key,cast_count) on public.public_reels to anon,authenticated;
grant select(cast_member_public_id,nickname,influence_score,influence_rank,image_key,public_id) on public.public_cast_entries to anon,authenticated;
grant insert,update,delete on public.public_reels,public.public_cast_entries to authenticated;

create policy public_reels_read_active on public.public_reels for select to anon,authenticated
using (is_active = true);
create policy public_cast_entries_read_active on public.public_cast_entries for select to anon,authenticated
using (exists(select 1 from public.public_reels r where r.public_id=public_cast_entries.public_id and r.is_active=true));
create policy public_reels_owner_write on public.public_reels for all to authenticated
using (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())))
with check (exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy public_cast_entries_owner_write on public.public_cast_entries for all to authenticated
using (exists(select 1 from public.public_reels r join public.casting_boards b on b.id=r.board_id where r.public_id=public_cast_entries.public_id and b.owner_user_id=(select auth.uid())))
with check (exists(select 1 from public.public_reels r join public.casting_boards b on b.id=r.board_id where r.public_id=public_cast_entries.public_id and b.owner_user_id=(select auth.uid())));

-- Raw birth profiles, private analyses, category scores and narratives remain outside
-- these public projection tables and retain their owner-only RLS policies.
