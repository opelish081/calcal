-- =============================================
-- CalCal — Supabase Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- USERS (extends NextAuth users via adapter)
-- =============================================
create table if not exists public.user_profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text unique not null,
  name        text,
  avatar_url  text,
  -- Body data
  weight_kg   numeric(5,2),
  height_cm   numeric(5,1),
  age         integer,
  gender      text check (gender in ('male', 'female', 'other')),
  -- LINE integration
  line_user_id text unique,
  -- Timestamps
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- =============================================
-- PROGRAMS (user nutrition goals)
-- =============================================
create type program_type as enum (
  'sedentary',       -- desk job, no exercise
  'light_active',    -- light exercise 1-3 days/week
  'moderate_active', -- gym 3-5 days/week
  'very_active'      -- athlete / hard training daily
);

create table if not exists public.user_programs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.user_profiles(id) on delete cascade,
  program_type    program_type not null,
  -- Calculated targets
  bmr             numeric(7,2),       -- Basal Metabolic Rate
  tdee            numeric(7,2),       -- Total Daily Energy Expenditure
  target_calories numeric(7,2),
  target_protein_g numeric(6,2),
  target_carbs_g  numeric(6,2),
  target_fat_g    numeric(6,2),
  -- Goal
  goal            text check (goal in ('lose_weight','maintain','gain_muscle')) default 'maintain',
  -- Active flag — only one program active per user
  is_active       boolean default true,
  started_at      timestamptz default now(),
  ended_at        timestamptz,
  -- Questionnaire answers stored as JSON
  quiz_answers    jsonb,
  created_at      timestamptz default now()
);

-- Only one active program per user
create unique index on public.user_programs (user_id) where is_active = true;

-- =============================================
-- FOOD LOGS
-- =============================================
create table if not exists public.food_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.user_profiles(id) on delete cascade,
  -- Food info
  food_name   text not null,
  amount_g    numeric(7,2),
  meal_type   text check (meal_type in ('breakfast','lunch','dinner','snack')) default 'snack',
  -- Macros (per entry)
  calories    numeric(7,2) default 0,
  protein_g   numeric(6,2) default 0,
  carbs_g     numeric(6,2) default 0,
  fat_g       numeric(6,2) default 0,
  fiber_g     numeric(6,2) default 0,
  -- Source
  source      text check (source in ('manual','ai_scan','line_photo','search')) default 'manual',
  ai_analysis jsonb,
  -- When
  logged_at   date not null default current_date,
  created_at  timestamptz default now()
);

create index on public.food_logs (user_id, logged_at);

-- =============================================
-- DAILY SUMMARIES (computed/cached)
-- =============================================
create table if not exists public.daily_summaries (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.user_profiles(id) on delete cascade,
  summary_date     date not null,
  total_calories   numeric(7,2) default 0,
  total_protein_g  numeric(6,2) default 0,
  total_carbs_g    numeric(6,2) default 0,
  total_fat_g      numeric(6,2) default 0,
  -- Progress vs goal
  calories_goal    numeric(7,2),
  protein_goal     numeric(6,2),
  goal_met         boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(user_id, summary_date)
);

-- =============================================
-- AI RECOMMENDATIONS
-- =============================================
create table if not exists public.ai_recommendations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.user_profiles(id) on delete cascade,
  rec_date        date not null default current_date,
  meal_type       text,
  recommendations jsonb,  -- array of {food, calories, protein, why}
  ai_message      text,
  created_at      timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table public.user_profiles       enable row level security;
alter table public.user_programs       enable row level security;
alter table public.food_logs           enable row level security;
alter table public.daily_summaries     enable row level security;
alter table public.ai_recommendations  enable row level security;

-- Policies: users can only access their own data
create policy "own profile" on public.user_profiles      for all using (auth.uid() = id);
create policy "own programs" on public.user_programs     for all using (auth.uid() = user_id);
create policy "own logs" on public.food_logs             for all using (auth.uid() = user_id);
create policy "own summaries" on public.daily_summaries  for all using (auth.uid() = user_id);
create policy "own recs" on public.ai_recommendations    for all using (auth.uid() = user_id);

-- Service role bypass for LINE webhook
create policy "service role bypass" on public.user_profiles
  for all using (auth.role() = 'service_role');
create policy "service role logs" on public.food_logs
  for all using (auth.role() = 'service_role');

-- =============================================
-- FUNCTION: update daily summary trigger
-- =============================================
create or replace function public.update_daily_summary()
returns trigger language plpgsql as $$
begin
  insert into public.daily_summaries (user_id, summary_date, total_calories, total_protein_g, total_carbs_g, total_fat_g)
  select
    NEW.user_id,
    NEW.logged_at,
    coalesce(sum(calories), 0),
    coalesce(sum(protein_g), 0),
    coalesce(sum(carbs_g), 0),
    coalesce(sum(fat_g), 0)
  from public.food_logs
  where user_id = NEW.user_id and logged_at = NEW.logged_at
  on conflict (user_id, summary_date)
  do update set
    total_calories  = excluded.total_calories,
    total_protein_g = excluded.total_protein_g,
    total_carbs_g   = excluded.total_carbs_g,
    total_fat_g     = excluded.total_fat_g,
    updated_at      = now();
  return NEW;
end;
$$;

create trigger after_food_log
  after insert or update or delete on public.food_logs
  for each row execute function public.update_daily_summary();
