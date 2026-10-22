import test from "node:test";
import assert from "node:assert/strict";
import { signSession, verifySession, sameOrigin } from "../src/lib/security";
const secret = "test-secret-is-long-and-never-a-production-key";
const session = { eventId: "event-a", role: "attendee" as const, subject: "guest-1", expiresAt: Date.now() + 60_000 };
test("signed attendees cannot cross events or become organizers", () => {
  const token = signSession(session, secret);
  assert.equal(verifySession(token, "event-a", "attendee", secret)?.subject, "guest-1");
  assert.equal(verifySession(token, "event-b", "attendee", secret), null);
  assert.equal(verifySession(token, "event-a", "organizer", secret), null);
});
test("tampered payload, wrong secret, malformed token and expiration fail closed", () => {
  const token = signSession(session, secret);
  assert.equal(verifySession(token.slice(1), "event-a", "attendee", secret), null);
  assert.equal(verifySession(token, "event-a", "attendee", "wrong"), null);
  assert.equal(verifySession("garbage", "event-a", "attendee", secret), null);
  assert.equal(verifySession(signSession({ ...session, expiresAt: 0 }, secret), "event-a", "attendee", secret), null);
});
test("browser writes reject foreign origins", () => {
  assert.throws(() => sameOrigin(new Request("http://localhost:3103/api/events", { headers: { Origin: "https://attacker.example" } })), /Cross-origin/);
  assert.doesNotThrow(() => sameOrigin(new Request("http://localhost:3103/api/events", { headers: { Origin: "http://localhost:3103" } })));
});
