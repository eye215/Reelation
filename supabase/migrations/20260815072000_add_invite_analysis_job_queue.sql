create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.casting_boards(id) on delete cascade,
  cast_member_id uuid not null unique references public.cast_members(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index analysis_jobs_status_created_idx
  on public.analysis_jobs (status, created_at);

alter table public.analysis_jobs enable row level security;

revoke all on public.analysis_jobs from anon, authenticated;
grant select on public.analysis_jobs to authenticated;

create policy analysis_jobs_owner_select
  on public.analysis_jobs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.casting_boards board
      where board.id = board_id
        and board.owner_user_id = (select auth.uid())
    )
  );

create or replace function public.enqueue_invite_analysis()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.analysis_jobs (board_id, cast_member_id)
  values (new.board_id, new.id)
  on conflict (cast_member_id) do nothing;

  return new;
end;
$$;

revoke all on function public.enqueue_invite_analysis() from public, anon, authenticated;

create trigger cast_members_enqueue_invite_analysis
after insert on public.cast_members
for each row
when (new.source_type = 'INVITE')
execute function public.enqueue_invite_analysis();
