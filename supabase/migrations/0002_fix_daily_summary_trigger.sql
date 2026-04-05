-- Version 0002
-- Make the daily summary trigger safe for DELETE operations
-- and remove empty summaries when the last log of a day is deleted.

create or replace function public.update_daily_summary()
returns trigger language plpgsql as $$
declare
  target_user_id uuid;
  target_date date;
begin
  if TG_OP = 'DELETE' then
    target_user_id := OLD.user_id;
    target_date := OLD.logged_at;
  else
    target_user_id := NEW.user_id;
    target_date := NEW.logged_at;
  end if;

  if exists (
    select 1
    from public.food_logs
    where user_id = target_user_id and logged_at = target_date
  ) then
    insert into public.daily_summaries (user_id, summary_date, total_calories, total_protein_g, total_carbs_g, total_fat_g)
    select
      target_user_id,
      target_date,
      coalesce(sum(calories), 0),
      coalesce(sum(protein_g), 0),
      coalesce(sum(carbs_g), 0),
      coalesce(sum(fat_g), 0)
    from public.food_logs
    where user_id = target_user_id and logged_at = target_date
    on conflict (user_id, summary_date)
    do update set
      total_calories  = excluded.total_calories,
      total_protein_g = excluded.total_protein_g,
      total_carbs_g   = excluded.total_carbs_g,
      total_fat_g     = excluded.total_fat_g,
      updated_at      = now();
  else
    delete from public.daily_summaries
    where user_id = target_user_id and summary_date = target_date;
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists after_food_log on public.food_logs;
create trigger after_food_log
  after insert or update or delete on public.food_logs
  for each row execute function public.update_daily_summary();
