import type { Attendee, QuorumEvent } from "./types";

/** The same attendee resubmitting unchanged taste must not erase a working plan. */
export function saveAttendee(event: QuorumEvent, attendee: Attendee) {
  const favorites = attendee.favorites.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (new Set(favorites.map(f => f.id.toLowerCase())).size !== favorites.length) throw new Error("Choose different favorites.");
  const existing = event.attendees.find(a => a.id === attendee.id);
  const previousFavorites = existing?.favorites.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (existing && existing.name === attendee.name && JSON.stringify(previousFavorites) === JSON.stringify(favorites)) return false;
  if (existing) { existing.name = attendee.name; existing.favorites = favorites; delete existing.profile; }
  else {
    if (event.attendees.length >= 8) throw new Error("This prototype supports up to eight attendees.");
    event.attendees.push({ id: attendee.id, name: attendee.name, favorites });
  }
  delete event.plan;
  return true;
}
