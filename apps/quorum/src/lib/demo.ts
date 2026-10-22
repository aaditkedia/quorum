import type { Attendee, Candidate, Favorite } from "./types";

// Entirely hand-authored synthetic examples. These are NOT Qloo response records.
export const demoFavorites: Favorite[] = [
  { id: "demo:artist:night-orchard", name: "Night Orchard", type: "artist", source: "synthetic" },
  { id: "demo:movie:paper-planets", name: "Paper Planets", type: "movie", source: "synthetic" },
  { id: "demo:book:slow-sundays", name: "Slow Sundays", type: "book", source: "synthetic" },
  { id: "demo:artist:neon-ensemble", name: "Neon Ensemble", type: "artist", source: "synthetic" },
  { id: "demo:movie:city-lights-again", name: "City Lights Again", type: "movie", source: "synthetic" },
  { id: "demo:brand:field-notes-studio", name: "Field Notes Studio", type: "brand", source: "synthetic" },
  { id: "demo:book:tiny-adventures", name: "Tiny Adventures", type: "book", source: "synthetic" },
  { id: "demo:artist:amber-hour", name: "Amber Hour", type: "artist", source: "synthetic" },
  { id: "demo:movie:weekend-people", name: "Weekend People", type: "movie", source: "synthetic" },
];
export function seededAttendees(): Attendee[] {
  return ["Maya", "Leo", "Nina", "Sam"].map((name, profile) => ({ id: crypto.randomUUID(), name, profile, favorites: [demoFavorites[profile % 3], demoFavorites[3 + profile % 3], demoFavorites[6 + profile % 3]] }));
}
const options: [string, string, Candidate["category"], string, string[], number[]][] = [
  ["juniper", "Juniper Table", "dining", "A long table, seasonal bowls, and room for every conversation.", ["plant-forward", "easygoing"], [.91, .77, .87, .83]],
  ["lantern", "Little Lantern", "dining", "Share plates, warm light, and a playful late-evening menu.", ["share plates", "lively"], [.8, .93, .74, .85]],
  ["supper", "The Supper Club", "dining", "A crowd favorite with a louder soundtrack and bold flavors.", ["high energy", "bold"], [.99, .99, .30, .99]],
  ["meadow", "Meadow Kitchen", "dining", "A quiet neighborhood kitchen for an unhurried second stop.", ["quiet", "seasonal"], [.77, .7, .96, .76]],
  ["studio", "Paper Moon Studio", "activity", "Make something together in a relaxed, hands-on workshop.", ["creative", "collaborative"], [.9, .75, .94, .82]],
  ["arcade", "After Hours Arcade", "activity", "Competitive games and bright lights for the high-energy crew.", ["games", "energetic"], [.99, .99, .29, .99]],
  ["riverwalk", "Riverwalk Hour", "activity", "A self-guided wander with photo prompts and conversation.", ["outdoors", "slow pace"], [.83, .78, .89, .86]],
  ["amber", "Amber Hour", "playlist", "Warm indie melodies for the space between conversations.", ["indie", "mellow"], [.86, .79, .94, .87]],
  ["neon", "Neon Ensemble", "playlist", "Upbeat electronic textures for the start of the evening.", ["electronic", "upbeat"], [.99, .99, .25, .99]],
  ["orchard", "Night Orchard", "playlist", "A little soul, a little jazz, and a shared rhythm.", ["soul", "jazz"], [.88, .84, .85, .82]],
  ["arts-quarter", "The Arts Quarter", "destination", "A fictional walkable creative neighborhood for this sample.", ["walkable", "creative"], [.85, .82, .91, .88]],
  ["downtown", "Downtown District", "destination", "A fictional busy central district for this sample.", ["central", "lively"], [.98, .96, .4, .98]],
];
export function syntheticCandidates(attendees: Attendee[]): Candidate[] {
  return options.map(([id, name, category, description, tags, vector]) => ({ id: `demo:pick:${id}`, name, category, type: category === "playlist" ? "artist" : category === "destination" ? "destination" : "place", description, tags, source: "synthetic", scores: Object.fromEntries(attendees.map((a, i) => {
    // Favorites deterministically select a fictional taste profile; no model score is claimed.
    const profile = a.profile ?? a.favorites.reduce((n, f) => n + [...f.id].reduce((s, char) => s + char.charCodeAt(0), 0), 0) % 4;
    return [a.id, vector[profile ?? i % 4]];
  })) }));
}
