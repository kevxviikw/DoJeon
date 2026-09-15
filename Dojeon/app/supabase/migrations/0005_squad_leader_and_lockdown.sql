-- Club presentation amendments (2026-09-15):
--   * Squads now have an explicit leader: squads.created_by, whoever
--     created it (squad-create sets this). Only the leader can delete the
--     squad, and only before any member has actually started work under
--     it (see the squad-delete Edge Function for the "started" check --
--     any session or checkin logged under one of the squad's missions).
--   * Members can no longer leave a squad on their own -- the self-leave
--     policy is dropped. The only ways a member's squad_members row goes
--     away now are the leader deleting the whole squad (cascades), or the
--     automatic missed-day removal sweep (squad-removal-sweep).
--   * squad_members.last_swept_date makes that daily sweep idempotent --
--     each member's missed_days increments at most once per calendar day
--     even if the sweep runs more than once on it.

alter table squads add column created_by uuid references profiles (id);
alter table squad_members add column last_swept_date date;

drop policy "squad_members: user can leave (delete self)" on squad_members;

create policy "squads: leader can delete their squad" on squads
  for delete using (created_by = auth.uid());
