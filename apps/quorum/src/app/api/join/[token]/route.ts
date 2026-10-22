import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookieName, fail, favoriteSchema, readJson, setSession, view } from "@/lib/api";
import { demoFavorites } from "@/lib/demo";
import { sameOrigin, verifySession } from "@/lib/security";
import { loadEvents, mutateEvents, sessionSecret } from "@/lib/store";
import { resolveLiveFavorites, signFavoriteSelection } from "@/lib/favorite-proof";
import { saveAttendee } from "@/lib/membership";

export const runtime = "nodejs";
const schema = z.object({ name: z.string().trim().min(1).max(40), favorites: z.array(favoriteSchema).min(3).max(5) });
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const event = (await loadEvents()).find(e => e.inviteToken === token);
    if (!event) throw new Error("This invitation was not found.");
    const jar = await cookies();
    const secret = await sessionSecret();
    const session = verifySession(jar.get(cookieName(event.id, "attendee"))?.value, event.id, "attendee", secret);
    const member = session && event.attendees.find(a => a.id === session.subject);
    const memberView = member ? view(event, { role: "attendee", selfId: member.id }) : undefined;
    if (memberView && event.mode === "live") memberView.attendees = memberView.attendees.map(attendee => attendee.id === memberView.selfId ? { ...attendee, favorites: attendee.favorites.map(favorite => ({ ...favorite, selectionProof: signFavoriteSelection(event.id, favorite, secret) })) } : attendee);
    return NextResponse.json({ id: event.id, name: event.name, city: event.city, date: event.date, mode: event.mode, count: event.attendees.length, ...(memberView ? { event: memberView } : {}) }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return fail(error, 404); }
}
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    sameOrigin(request);
    const { token } = await context.params;
    const input = schema.parse(await readJson(request));
    const snapshot = (await loadEvents()).find(e => e.inviteToken === token);
    if (!snapshot) throw new Error("This invitation was not found.");
    const jar = await cookies();
    const secret = await sessionSecret();
    const prior = verifySession(jar.get(cookieName(snapshot.id, "attendee"))?.value, snapshot.id, "attendee", secret);
    const id = prior?.subject ?? randomUUID();
    const event = await mutateEvents(events => {
      const saved = events.find(e => e.id === snapshot.id)!;
      const favorites = saved.mode === "live" ? resolveLiveFavorites(input.favorites, saved.id, secret) : input.favorites.map(favorite => {
        const canonical = demoFavorites.find(f => f.id === favorite.id);
        if (!canonical) throw new Error("Select a favorite from the synthetic catalog.");
        return canonical;
      });
      saveAttendee(saved, { id, name: input.name, favorites });
      return saved;
    });
    const response = NextResponse.json(view(event, { role: "attendee", selfId: id }));
    await setSession(response, event.id, "attendee", id);
    return response;
  } catch (error) { return fail(error); }
}
