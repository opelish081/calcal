-- Version 0001
-- CalCal uses NextAuth Google sign-in, not Supabase Auth users.
-- user_profiles.id must therefore be app-managed instead of referencing auth.users(id).

alter table public.user_profiles
  drop constraint if exists user_profiles_id_fkey;
