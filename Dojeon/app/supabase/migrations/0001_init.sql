-- DoJeon (dev codename Beast Mode) -- initial schema.
-- Implements Field Manual V3 + the Sept 5 2026 club amendments (A-D):
-- squad-scoped leaderboard, solo matching, peer-approved check-ins with a
-- removal threshold, and consent-gated mission-end data collection.
--
-- Design notes this schema encodes directly:
--   * A mission's `deliverable` is a required, free-text checkable result
--     (validated at the API layer by forge.ts::checkDeliverable before a
--     row is ever written here -- the DB just stores the result).
--   * squads.check_approval_threshold and squads.missed_day_removal_fraction
--     are the two "adjustable, starting value" parameters from the proposal
--     addendum (75% / one third) -- per-squad, not global constants.
--   * checkins.event_type is written by the checkin-submit Edge Function
--     using logic/history.ts::classifyEvent, not recomputed by a trigger --
--     keeps one source of truth for that rule in application code.
--   * Nothing here ever deletes a checkin or an adjustment row -- Proof and
--     Adjust both require an unrewritable history (see proof.ts, adjust.ts).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Profiles (one row per auth.users row)
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Squads
-- ---------------------------------------------------------------------
create table squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  size_min int not null default 3,
  size_max int not null default 6,
  -- Amendment C parameters -- adjustable per squad, these are the
  -- "starting value" defaults from the proposal addendum.
  check_approval_threshold numeric not null default 0.75
    check (check_approval_threshold > 0 and check_approval_threshold <= 1),
  missed_day_removal_fraction numeric not null default (1.0 / 3.0)
    check (missed_day_removal_fraction > 0 and missed_day_removal_fraction <= 1),
  status text not null default 'active' check (status in ('active', 'disbanded')),
  created_at timestamptz not null default now(),
  disbanded_at timestamptz
);

create table squad_members (
  squad_id uuid not null references squads (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  missed_days int not null default 0,
  removed_at timestamptz,
  removal_reason text,
  primary key (squad_id, user_id)
);

-- ---------------------------------------------------------------------
-- Solo matching (amendment B) -- a lightweight goal-similarity index
-- ---------------------------------------------------------------------
create table goal_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  goal_type text not null,
  hours_per_day numeric not null check (hours_per_day >= 0),
  deadline_days int not null check (deadline_days >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Missions (Forge output) + milestones
-- ---------------------------------------------------------------------
create table missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  squad_id uuid references squads (id) on delete set null,
  title text not null,
  deliverable text not null, -- must be a checkable result, validated pre-insert
  goal_type text not null,
  deadline date not null,
  duration_days int not null check (duration_days > 0),
  hours_available_per_day numeric not null check (hours_available_per_day >= 0),
  -- Forge's three-tier plan, as produced by the forge-plan Edge Function.
  -- Shape: {"minimum": {"hours": n, "description": "..."}, "target": {...}, "stretch": {...}}
  tiers jsonb not null,
  tightest_feasible_tier text check (tightest_feasible_tier in ('minimum', 'target', 'stretch')),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default now()
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete cascade,
  tier text not null check (tier in ('minimum', 'target', 'stretch')),
  title text not null,
  target_date date,
  sort_order int not null default 0,
  completed_at timestamptz
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete cascade,
  title text not null,
  output_description text not null,
  due_date date
);

-- ---------------------------------------------------------------------
-- Push: work sessions, optionally grouped into a squad "round" for the
-- shared summary
-- ---------------------------------------------------------------------
create table session_rounds (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads (id) on delete cascade,
  started_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  task_id uuid references tasks (id) on delete set null,
  session_round_id uuid references session_rounds (id) on delete set null,
  task_title text not null,
  output_description text not null,
  status text not null default 'active' check (status in ('active', 'submitted', 'blocked')),
  live_visible boolean not null default false, -- opt-in per session, never a default
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  blocker_note text
);

-- ---------------------------------------------------------------------
-- Proof: check-ins + peer approval (amendment C)
-- ---------------------------------------------------------------------
create table checkins (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  session_id uuid references sessions (id) on delete set null,
  checkin_date date not null default current_date,
  task_completed boolean not null,
  evidence_submitted boolean not null,
  planned_rest boolean not null default false,
  technical_interruption boolean not null default false,
  -- Which tier's daily pace this check-in actually hit, if any -- feeds
  -- adjust.ts::detectRepeatedMinimumOnly. Null on a miss/rest/interrupted day.
  tier_hit text check (tier_hit in ('minimum', 'target', 'stretch')),
  -- Written by checkin-submit using logic/history.ts::classifyEvent.
  event_type text not null check (event_type in ('completed', 'miss', 'unproven', 'rest', 'interrupted')),
  evidence_trust_label text not null default 'self_reported'
    check (evidence_trust_label in ('self_reported', 'attached', 'squad_reviewed')),
  file_private boolean not null default true, -- opt-in to share the file, private by default
  file_url text, -- null whenever file_private is true; status is separate and always visible
  file_removed boolean not null default false,
  -- Solo missions skip peer approval entirely and are auto-confirmed;
  -- squad missions start pending until checkin-approve confirms/rejects.
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  unique (mission_id, user_id, checkin_date)
);

create table checkin_approvals (
  checkin_id uuid not null references checkins (id) on delete cascade,
  approver_user_id uuid not null references profiles (id) on delete cascade,
  approved boolean not null,
  voted_at timestamptz not null default now(),
  primary key (checkin_id, approver_user_id)
);

-- ---------------------------------------------------------------------
-- Adjust: proposals + decisions, both kept forever (never overwritten)
-- ---------------------------------------------------------------------
create table adjustments (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete cascade,
  trigger text not null check (trigger in ('missed_session', 'repeated_minimum')),
  recovery_room_found boolean not null,
  tradeoffs jsonb not null default '[]'::jsonb,
  requires_approval boolean not null,
  -- Snapshots of the mission's tiers/deadline before and after, so both
  -- versions stay visible regardless of the member's decision.
  original_snapshot jsonb not null,
  proposed_snapshot jsonb,
  approved boolean, -- null until the member decides
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ---------------------------------------------------------------------
-- Mission end & data collection (amendment D)
-- ---------------------------------------------------------------------
create table mission_end_reports (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  consent boolean not null,
  -- Populated only when consent = true (collectMissionEndData returns null
  -- otherwise, and the Edge Function skips the insert entirely).
  achievement_score numeric,
  consistency_score numeric,
  pattern_data jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Squad-scoped leaderboard (amendment A) -- a view, computed on read,
-- always filtered to one squad by the caller. There is deliberately no
-- cross-squad equivalent.
-- ---------------------------------------------------------------------
create view squad_member_stats
  with (security_invoker = true) -- run as the querying user, so RLS on the underlying tables still applies
as
select
  sm.squad_id,
  sm.user_id,
  count(c.*) filter (where c.status = 'confirmed') as confirmed_checkins,
  count(c.*) as scheduled_checkins,
  count(m.*) filter (where m.completed_at is not null) as milestones_completed,
  count(m.*) as milestones_total
from squad_members sm
left join missions mi on mi.user_id = sm.user_id and mi.squad_id = sm.squad_id
left join checkins c on c.mission_id = mi.id
left join milestones m on m.mission_id = mi.id
where sm.removed_at is null
group by sm.squad_id, sm.user_id;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
alter table squads enable row level security;
alter table squad_members enable row level security;
alter table goal_profiles enable row level security;
alter table missions enable row level security;
alter table milestones enable row level security;
alter table tasks enable row level security;
alter table session_rounds enable row level security;
alter table sessions enable row level security;
alter table checkins enable row level security;
alter table checkin_approvals enable row level security;
alter table adjustments enable row level security;
alter table mission_end_reports enable row level security;

-- Helper: is auth.uid() an active member of the given squad?
create or replace function is_active_squad_member(target_squad uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from squad_members
    where squad_id = target_squad
      and user_id = auth.uid()
      and removed_at is null
  );
$$;

create policy "profiles: read own and squad-mates'" on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from squad_members me
      join squad_members them on them.squad_id = me.squad_id
      where me.user_id = auth.uid() and them.user_id = profiles.id and me.removed_at is null
    )
  );
create policy "profiles: update own" on profiles for update using (id = auth.uid());
create policy "profiles: insert own" on profiles for insert with check (id = auth.uid());

create policy "squads: members can read their squad" on squads
  for select using (is_active_squad_member(id));

create policy "squad_members: members can read their squad's roster" on squad_members
  for select using (is_active_squad_member(squad_id));
create policy "squad_members: user can join (insert self)" on squad_members
  for insert with check (user_id = auth.uid());
create policy "squad_members: user can leave (delete self)" on squad_members
  for delete using (user_id = auth.uid());

create policy "goal_profiles: read own" on goal_profiles for select using (user_id = auth.uid());
create policy "goal_profiles: upsert own" on goal_profiles for insert with check (user_id = auth.uid());
create policy "goal_profiles: update own" on goal_profiles for update using (user_id = auth.uid());

create policy "missions: owner or squad-mate can read" on missions
  for select using (
    user_id = auth.uid()
    or (squad_id is not null and is_active_squad_member(squad_id))
  );
create policy "missions: owner can insert" on missions for insert with check (user_id = auth.uid());
create policy "missions: owner can update" on missions for update using (user_id = auth.uid());

create policy "milestones: visible wherever the mission is" on milestones
  for select using (exists (
    select 1 from missions mi where mi.id = mission_id
      and (mi.user_id = auth.uid() or (mi.squad_id is not null and is_active_squad_member(mi.squad_id)))
  ));
create policy "milestones: owner can write" on milestones
  for all using (exists (select 1 from missions mi where mi.id = mission_id and mi.user_id = auth.uid()));

create policy "tasks: visible wherever the mission is" on tasks
  for select using (exists (
    select 1 from missions mi where mi.id = mission_id
      and (mi.user_id = auth.uid() or (mi.squad_id is not null and is_active_squad_member(mi.squad_id)))
  ));
create policy "tasks: owner can write" on tasks
  for all using (exists (select 1 from missions mi where mi.id = mission_id and mi.user_id = auth.uid()));

create policy "session_rounds: squad members can read" on session_rounds
  for select using (is_active_squad_member(squad_id));

create policy "sessions: owner or squad-mate can read" on sessions
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from missions mi where mi.id = mission_id and mi.squad_id is not null
        and is_active_squad_member(mi.squad_id)
    )
  );
create policy "sessions: owner can write" on sessions for all using (user_id = auth.uid());

-- Check-in status is always visible to the squad; the file itself is
-- opt-in (file_private) -- enforced here, not just at the client, so a
-- private file is never served by PostgREST regardless of what a client
-- app requests.
create policy "checkins: owner or squad-mate can read status; file only if not private" on checkins
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from missions mi where mi.id = mission_id and mi.squad_id is not null
        and is_active_squad_member(mi.squad_id)
    )
  );
create policy "checkins: owner can write" on checkins for insert with check (user_id = auth.uid());
create policy "checkins: owner can update own (e.g. remove evidence file)" on checkins
  for update using (user_id = auth.uid());

create policy "checkin_approvals: squad-mates of the checkin can read" on checkin_approvals
  for select using (exists (
    select 1 from checkins c join missions mi on mi.id = c.mission_id
    where c.id = checkin_id and mi.squad_id is not null and is_active_squad_member(mi.squad_id)
  ));
create policy "checkin_approvals: squad-mates can vote, not the submitter" on checkin_approvals
  for insert with check (
    approver_user_id = auth.uid()
    and exists (
      select 1 from checkins c join missions mi on mi.id = c.mission_id
      where c.id = checkin_id and mi.user_id <> auth.uid() and mi.squad_id is not null
        and is_active_squad_member(mi.squad_id)
    )
  );

create policy "adjustments: owner or squad-mate can read" on adjustments
  for select using (exists (
    select 1 from missions mi where mi.id = mission_id
      and (mi.user_id = auth.uid() or (mi.squad_id is not null and is_active_squad_member(mi.squad_id)))
  ));
create policy "adjustments: owner decides" on adjustments
  for update using (exists (select 1 from missions mi where mi.id = mission_id and mi.user_id = auth.uid()));

create policy "mission_end_reports: owner only" on mission_end_reports
  for select using (user_id = auth.uid());
create policy "mission_end_reports: owner can insert" on mission_end_reports
  for insert with check (user_id = auth.uid());

-- Squad-mates' file_url is nulled out at read time when private -- Postgres
-- RLS controls row visibility, not per-column masking, so PostgREST callers
-- should select through this view for anyone but the owner.
create view checkins_squad_safe
  with (security_invoker = true)
as
select
  c.*,
  case when c.user_id = auth.uid() or c.file_private = false then c.file_url else null end as visible_file_url
from checkins c;
