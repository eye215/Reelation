alter function public.bootstrap_owner_board(text,date,time,boolean,public.gender_type) security invoker;

create index if not exists movies_theme_key_idx on public.movies(theme_key);
create index if not exists analytics_events_board_id_idx on public.analytics_events(board_id);
create index if not exists analytics_events_actor_user_id_idx on public.analytics_events(actor_user_id);

create policy analytics_no_client_access on public.analytics_events
for all to anon,authenticated using(false) with check(false);

comment on table public.analytics_events is 'Server-only append target. Client roles have neither privileges nor an allowing RLS policy.';

