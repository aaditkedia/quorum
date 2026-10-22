import { date, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const events = pgTable("quorum_events", {
  id: uuid("id").primaryKey(),
  organizerUserId: text("organizer_user_id").notNull(),
  inviteTokenHash: text("invite_token_hash").notNull().unique(),
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  city: text("city").notNull(),
  budget: integer("budget").notNull(),
  eventDate: date("event_date").notNull(),
  mode: text("mode").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventState = pgTable("quorum_event_state", {
  eventId: uuid("event_id").primaryKey().references(() => events.id, { onDelete: "cascade" }),
  inviteToken: text("invite_token").notNull(),
  attendees: jsonb("attendees").notNull().default([]),
  plan: jsonb("plan"),
});

export const attendees = pgTable("quorum_attendees", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendeeFavorites = pgTable("quorum_attendee_favorites", {
  attendeeId: uuid("attendee_id").notNull().references(() => attendees.id, { onDelete: "cascade" }),
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  source: text("source").notNull(),
}, table => ({ pk: primaryKey({ columns: [table.attendeeId, table.entityId] }) }));

export const plans = pgTable("quorum_plans", {
  id: uuid("id").primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  selectedEntityIds: jsonb("selected_entity_ids").notNull(),
  minimumAffinity: numeric("minimum_affinity").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planScores = pgTable("quorum_plan_scores", {
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  attendeeId: uuid("attendee_id").notNull().references(() => attendees.id, { onDelete: "cascade" }),
  entityId: text("entity_id").notNull(),
  affinity: numeric("affinity").notNull(),
}, table => ({ pk: primaryKey({ columns: [table.planId, table.attendeeId, table.entityId] }) }));

export const agentSteps = pgTable("quorum_agent_steps", {
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  seq: integer("seq").notNull(),
  agent: text("agent").notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => ({ pk: primaryKey({ columns: [table.planId, table.seq] }) }));

export const qlooCache = pgTable("quorum_qloo_cache", {
  requestHash: text("request_hash").primaryKey(),
  response: jsonb("response").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
