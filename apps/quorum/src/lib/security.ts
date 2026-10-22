import { createHmac, timingSafeEqual } from "node:crypto";
import { requestOrigin } from "@hackathon/swarm-core";

export type Session = { eventId: string; subject: string; role: "organizer" | "attendee"; expiresAt: number };
export function signSession(session: Session, secret: string) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifySession(token: string | undefined, eventId: string, role: Session["role"], secret: string): Session | null {
  if (!token || token.length > 2048) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return session.eventId === eventId && session.role === role && typeof session.subject === "string" && session.expiresAt > Date.now() ? session : null;
  } catch { return null; }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin(request)) throw new Error("Cross-origin requests are not accepted.");
}
