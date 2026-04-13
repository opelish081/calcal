-- Version 0003
-- Speed up recent-food history queries that filter by user
-- and order by most recently created log entries.

create index if not exists food_logs_user_created_at_idx
  on public.food_logs (user_id, created_at desc);
