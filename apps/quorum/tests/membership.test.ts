import test from "node:test";
import assert from "node:assert/strict";
import { saveAttendee } from "../src/lib/membership";
import { demoFavorites } from "../src/lib/demo";
import type { Plan, QuorumEvent } from "../src/lib/types";
function sample(): QuorumEvent {
  return { id: "event", name: "Sample", type: "social", city: "Sample City", budget: 0, date: "2026-10-30", mode: "demo", inviteToken: "private", createdAt: "sample", attendees: [{ id: "member", name: "Maya", favorites: demoFavorites.slice(0, 3) }], plan: { id: "saved-plan" } as Plan };
}
test("returning attendee with unchanged favorites preserves the working plan", () => {
  const event = sample();
  assert.equal(saveAttendee(event, { ...event.attendees[0], favorites: event.attendees[0].favorites.slice().reverse() }), false);
  assert.equal(event.plan?.id, "saved-plan");
  assert.equal(event.attendees.length, 1);
});
test("changed taste invalidates stale scores and updates only that member", () => {
  const event = sample();
  event.attendees.push({ id: "other", name: "Sam", favorites: demoFavorites.slice(2, 5) });
  const other = structuredClone(event.attendees[1]);
  assert.equal(saveAttendee(event, { id: "member", name: "Maya", favorites: demoFavorites.slice(1, 4) }), true);
  assert.equal(event.plan, undefined);
  assert.deepEqual(event.attendees[1], other);
});
test("full group permits existing member updates and rejects a ninth attendee", () => {
  const event = sample();
  for (let i = 1; i < 8; i++) saveAttendee(event, { id: `member-${i}`, name: `Person ${i}`, favorites: demoFavorites.slice(0, 3) });
  assert.doesNotThrow(() => saveAttendee(event, { id: "member", name: "New name", favorites: demoFavorites.slice(0, 3) }));
  assert.throws(() => saveAttendee(event, { id: "ninth", name: "Extra", favorites: demoFavorites.slice(0, 3) }), /eight attendees/);
});
