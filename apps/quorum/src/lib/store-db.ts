import "server-only";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { eventState, events } from "@/db/schema";
import { hashInviteToken } from "./invite";
import type { Plan, QuorumEvent } from "./types";

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for hosted storage.");
  return drizzle(neon(url));
}

function rowToEvent(row: typeof events.$inferSelect, state: typeof eventState.$inferSelect): QuorumEvent {
  return {
    id: row.id,
    name: row.name,
    type: row.eventType as QuorumEvent["type"],
    city: row.city,
    budget: row.budget,
    date: row.eventDate,
    mode: row.mode as QuorumEvent["mode"],
    inviteToken: state.inviteToken,
    createdAt: row.createdAt.toISOString(),
    attendees: state.attendees as QuorumEvent["attendees"],
    plan: state.plan as Plan | undefined,
    organizerUserId: row.organizerUserId,
  };
}

async function upsertEvent(event: QuorumEvent) {
  const db = database();
  await db.insert(events).values({
    id: event.id,
    organizerUserId: event.organizerUserId ?? "local",
    inviteTokenHash: hashInviteToken(event.inviteToken),
    name: event.name,
    eventType: event.type,
    city: event.city,
    budget: event.budget,
    eventDate: event.date,
    mode: event.mode,
    createdAt: new Date(event.createdAt),
  }).onConflictDoUpdate({
    target: events.id,
    set: {
      name: event.name,
      eventType: event.type,
      city: event.city,
      budget: event.budget,
      eventDate: event.date,
      mode: event.mode,
      organizerUserId: event.organizerUserId ?? "local",
      inviteTokenHash: hashInviteToken(event.inviteToken),
    },
  });
  await db.insert(eventState).values({
    eventId: event.id,
    inviteToken: event.inviteToken,
    attendees: event.attendees,
    plan: event.plan ?? null,
  }).onConflictDoUpdate({
    target: eventState.eventId,
    set: {
      inviteToken: event.inviteToken,
      attendees: event.attendees,
      plan: event.plan ?? null,
    },
  });
}

export async function loadEventsDb(): Promise<QuorumEvent[]> {
  const rows = await database().select({ event: events, state: eventState }).from(events).innerJoin(eventState, eq(events.id, eventState.eventId));
  return rows.map(({ event, state }) => rowToEvent(event, state));
}

export async function mutateEventsDb<T>(change: (list: QuorumEvent[]) => T | Promise<T>): Promise<T> {
  const list = await loadEventsDb();
  const result = await change(list);
  for (const event of list) await upsertEvent(event);
  return result;
}

export async function sessionSecretDb() {
  const secret = process.env.QUORUM_SESSION_SECRET ?? process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret || secret.length < 32) throw new Error("Set QUORUM_SESSION_SECRET or NEON_AUTH_COOKIE_SECRET to at least 32 random characters.");
  return secret;
}
