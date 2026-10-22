-- Hosted event payload + invite token (server-side only; never commit Qloo cache rows).
CREATE TABLE IF NOT EXISTS quorum_event_state (
  event_id uuid PRIMARY KEY REFERENCES quorum_events(id) ON DELETE CASCADE,
  invite_token text NOT NULL,
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  plan jsonb
);
