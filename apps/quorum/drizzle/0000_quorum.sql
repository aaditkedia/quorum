-- Optional hosted schema. NOT applied or used by the local JSON adapter.
CREATE TABLE quorum_events (
  id uuid PRIMARY KEY, organizer_user_id text NOT NULL, invite_token_hash text UNIQUE NOT NULL,
  name text NOT NULL, event_type text NOT NULL, city text NOT NULL,
  budget integer NOT NULL CHECK (budget >= 0), event_date date NOT NULL,
  mode text NOT NULL CHECK (mode IN ('demo', 'live')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE quorum_attendees (
  id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES quorum_events(id) ON DELETE CASCADE,
  display_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE quorum_attendee_favorites (
  attendee_id uuid NOT NULL REFERENCES quorum_attendees(id) ON DELETE CASCADE,
  entity_id text NOT NULL, entity_type text NOT NULL, source text NOT NULL,
  PRIMARY KEY (attendee_id, entity_id)
);
CREATE TABLE quorum_plans (
  id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES quorum_events(id) ON DELETE CASCADE,
  selected_entity_ids jsonb NOT NULL, minimum_affinity numeric NOT NULL,
  source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE quorum_plan_scores (
  plan_id uuid NOT NULL REFERENCES quorum_plans(id) ON DELETE CASCADE,
  attendee_id uuid NOT NULL REFERENCES quorum_attendees(id) ON DELETE CASCADE,
  entity_id text NOT NULL, affinity numeric NOT NULL CHECK (affinity BETWEEN 0 AND 1),
  PRIMARY KEY (plan_id, attendee_id, entity_id)
);
CREATE TABLE quorum_agent_steps (
  plan_id uuid NOT NULL REFERENCES quorum_plans(id) ON DELETE CASCADE,
  seq integer NOT NULL, agent text NOT NULL, detail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (plan_id, seq)
);
-- Private server-side response cache. Never expose publicly or commit its rows.
CREATE TABLE quorum_qloo_cache (
  request_hash text PRIMARY KEY, response jsonb NOT NULL, expires_at timestamptz NOT NULL
);
