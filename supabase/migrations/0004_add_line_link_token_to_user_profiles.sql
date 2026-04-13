alter table public.user_profiles
  add column if not exists line_link_token text;

create unique index if not exists user_profiles_line_link_token_idx
  on public.user_profiles (line_link_token)
  where line_link_token is not null;
