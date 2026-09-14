-- Usernames.
--
-- profiles gained a display_name in 0001 and an auto-created row in 0002,
-- but nothing gave a member a stable, unique handle to be found by. This
-- adds one:
--   * profiles.username -- unique, case-insensitive, lowercase [a-z0-9_],
--     3-20 chars. NULL until the member picks one.
--   * a NULL username is the "hasn't finished onboarding" signal the app
--     gates the main tabs on (see app/mobile/app/_layout.tsx). The 0002
--     handle_new_user trigger still only sets display_name, so every new
--     row starts with username NULL and lands on the onboarding screen.
--   * is_username_available(text) -- a security-definer check the onboarding
--     screen calls, since a brand-new member can't SELECT other profiles
--     under RLS (own + squad-mates only) to check uniqueness themselves.

create extension if not exists citext;

alter table profiles
  add column username citext unique;

alter table profiles
  add constraint profiles_username_format
  check (username is null or username::text ~ '^[a-z0-9_]{3,20}$');

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select
    lower(coalesce(candidate, '')) ~ '^[a-z0-9_]{3,20}$'
    and not exists (
      select 1 from public.profiles p
      where lower(p.username::text) = lower(candidate)
    );
$$;

grant execute on function public.is_username_available(text) to authenticated;
