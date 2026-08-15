alter table public.saju_profiles
  alter column year_stem drop not null,
  alter column year_branch drop not null,
  alter column month_stem drop not null,
  alter column month_branch drop not null,
  add column if not exists calculation_scope text not null default 'DAY_PILLAR_MVP'
    check (calculation_scope in ('DAY_PILLAR_MVP', 'FOUR_PILLARS'));

alter table public.relationship_analyses
  add column if not exists cast_tier text,
  add column if not exists life_role text,
  add column if not exists relationship_genre text;
