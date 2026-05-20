-- scla-labelling -- initial schema (v1).
--
-- Run from the Supabase SQL editor. No RLS: tenancy is enforced at
-- the Next.js API-route layer because every protected query scopes
-- by session.labeller_id (the service-role key talks to the DB on
-- behalf of the authenticated labeller).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- labellers: invited people
-- ---------------------------------------------------------------------------

create table labellers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  is_admin boolean not null default false,
  invited_at timestamptz not null default now(),
  first_seen_at timestamptz,
  last_active_at timestamptz
);

-- ---------------------------------------------------------------------------
-- magic_tokens: one-time auth links
-- ---------------------------------------------------------------------------

create table magic_tokens (
  token text primary key,
  labeller_id uuid not null references labellers(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index magic_tokens_labeller_idx on magic_tokens (labeller_id);

-- ---------------------------------------------------------------------------
-- sessions: cookie-backed auth
-- ---------------------------------------------------------------------------

create table sessions (
  id text primary key,  -- random token, stored as a cookie
  labeller_id uuid not null references labellers(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_active_at timestamptz not null default now()
);

create index sessions_labeller_idx on sessions (labeller_id);
create index sessions_expires_idx on sessions (expires_at);

-- ---------------------------------------------------------------------------
-- tasks: the candidate frames to label
--
-- One row per frame to label. task_type is the polymorphic discriminator
-- ('gesture' for v1; 'tracking', 'field_kp' future). r2_frame_key is the
-- non-enumerable storage path -- labellers see a signed URL, never the
-- key itself.
-- ---------------------------------------------------------------------------

create table tasks (
  id uuid primary key default gen_random_uuid(),
  task_type text not null,
  match_id text not null,
  frame_idx integer not null,

  -- Anchor metadata for the labeller's context (why this frame was queued).
  -- For gestures: anchor in {'whistle', 'score', 'random_negative'},
  -- anchor_time_s carries the underlying event time, offset_s the offset
  -- from the anchor.
  anchor text,
  anchor_time_s double precision,
  offset_s double precision,

  -- R2 key the labeller never sees.
  r2_frame_key text not null,

  -- For overlap-based QC: how many distinct labellers need to label this
  -- task before it's considered "done". v1 ships with 1 everywhere; a
  -- later session can flip selected tasks to 2 for inter-rater agreement.
  required_labels integer not null default 1,

  -- For assignment: which labeller this task is assigned to. Null = open
  -- to anyone in the pool. An admin can pre-assign a queue per labeller.
  assigned_to uuid references labellers(id) on delete set null,

  created_at timestamptz not null default now(),
  unique (task_type, match_id, frame_idx)
);

create index tasks_type_match_idx on tasks (task_type, match_id);
create index tasks_assigned_idx on tasks (assigned_to)
  where assigned_to is not null;

-- ---------------------------------------------------------------------------
-- labels: the actual annotations
--
-- One row per (task, labeller). v1 always 1:1 because required_labels=1.
-- value is a JSONB blob whose shape varies by task_type so the schema
-- doesn't need migrating when a new task type lands:
--   gesture:  {"gesture": "penalty", "confidence": "high"}
--   tracking: {"identity_id": 5} -- future
--   field_kp: {"keypoints": {"name": [x, y], ...}} -- future
-- ---------------------------------------------------------------------------

create table labels (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  labeller_id uuid not null references labellers(id) on delete cascade,
  value jsonb not null,
  -- 'high' | 'medium' -- labeller's certainty signal
  confidence text not null default 'high',
  notes text,
  -- Wall-clock time the labeller spent on this label, ms. Lets the
  -- admin spot suspiciously fast labelling at a glance.
  duration_ms integer,
  created_at timestamptz not null default now(),
  unique (task_id, labeller_id)
);

create index labels_labeller_idx on labels (labeller_id, created_at desc);
create index labels_task_idx on labels (task_id);
create index labels_value_gesture_idx on labels ((value->>'gesture'));

-- ---------------------------------------------------------------------------
-- Convenience views
-- ---------------------------------------------------------------------------

-- Per-labeller progress: how many labels each labeller has produced
-- and when they were last active.
create view labeller_progress as
select
  l.id,
  l.email,
  l.display_name,
  l.is_admin,
  l.invited_at,
  l.first_seen_at,
  l.last_active_at,
  (select count(*) from labels lb where lb.labeller_id = l.id) as labels_count
from labellers l;

-- Per-class counts across the whole gesture corpus. Powers the admin
-- dashboard's "are we balanced?" question.
create view gesture_class_counts as
select
  lb.value->>'gesture' as gesture,
  count(*) as n
from labels lb
join tasks t on t.id = lb.task_id
where t.task_type = 'gesture'
group by lb.value->>'gesture';
