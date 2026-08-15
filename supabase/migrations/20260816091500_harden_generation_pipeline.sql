create index if not exists analysis_jobs_board_id_idx on public.analysis_jobs(board_id);
create index if not exists movie_generation_jobs_movie_id_idx on public.movie_generation_jobs(movie_id);
create index if not exists movie_generation_jobs_requested_by_idx on public.movie_generation_jobs(requested_by);

drop policy if exists public_reels_owner_write on public.public_reels;
create policy public_reels_owner_insert on public.public_reels for insert to authenticated
with check(exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy public_reels_owner_update on public.public_reels for update to authenticated
using(exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())))
with check(exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));
create policy public_reels_owner_delete on public.public_reels for delete to authenticated
using(exists(select 1 from public.casting_boards b where b.id=board_id and b.owner_user_id=(select auth.uid())));

drop policy if exists public_cast_entries_owner_write on public.public_cast_entries;
create policy public_cast_entries_owner_insert on public.public_cast_entries for insert to authenticated
with check(exists(select 1 from public.public_reels r join public.casting_boards b on b.id=r.board_id where r.public_id=public_cast_entries.public_id and b.owner_user_id=(select auth.uid())));
create policy public_cast_entries_owner_update on public.public_cast_entries for update to authenticated
using(exists(select 1 from public.public_reels r join public.casting_boards b on b.id=r.board_id where r.public_id=public_cast_entries.public_id and b.owner_user_id=(select auth.uid())))
with check(exists(select 1 from public.public_reels r join public.casting_boards b on b.id=r.board_id where r.public_id=public_cast_entries.public_id and b.owner_user_id=(select auth.uid())));
create policy public_cast_entries_owner_delete on public.public_cast_entries for delete to authenticated
using(exists(select 1 from public.public_reels r join public.casting_boards b on b.id=r.board_id where r.public_id=public_cast_entries.public_id and b.owner_user_id=(select auth.uid())));
