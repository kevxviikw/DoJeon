-- Auto-create a profiles row for every auth user.
--
-- 0001_init.sql keys every user-owned table (missions, goal_profiles,
-- squad_members, checkins, ...) to profiles(id), but nothing ever inserted
-- a profiles row -- there is no trigger here and the client never writes
-- one. A freshly signed-in user therefore hit
--   insert or update on table "missions" violates foreign key constraint
--   "missions_user_id_fkey"
-- on their first Forge (forge-plan is the first core-loop function that
-- writes a profiles-keyed row). Supabase's standard fix: a security-definer
-- trigger on auth.users.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who already signed in before this trigger existed.
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'member'
  )
from auth.users u
on conflict (id) do nothing;
