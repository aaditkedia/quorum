import type { Attendee, Candidate } from "./types";

/** Missing evidence is never silently interpreted as a zero affinity. */
export function negotiate(attendees: Pick<Attendee, "id">[], candidates: Candidate[], trip = false) {
  if (!attendees.length) throw new Error("At least one attendee is required.");
  if (new Set(attendees.map(a => a.id)).size !== attendees.length) throw new Error("Attendees must be unique.");
  if (new Set(candidates.map(c => c.id)).size !== candidates.length) throw new Error("Candidate IDs must be unique.");
  for (const candidate of candidates) for (const attendee of attendees) {
    const score = candidate.scores[attendee.id];
    if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error("Incomplete or invalid affinity evidence.");
  }
  const dining = candidates.filter(c => c.category === "dining");
  const activities = candidates.filter(c => c.category === "activity");
  const playlists = candidates.filter(c => c.category === "playlist");
  const destinations = trip ? candidates.filter(c => c.category === "destination") : [undefined];
  if (dining.length < 2 || !activities.length || !playlists.length || !destinations.length) throw new Error("Not enough fully scored candidates to compose the plan.");
  const points: Record<string, number> = {};
  for (const attendee of attendees) {
    for (const category of ["dining", "activity", "playlist", "destination"]) {
      const group = candidates.filter(c => c.category === category);
      for (const candidate of group) {
        // Equal scores share the same rank. IDs only break ties between complete plans.
        const lower = group.filter(other => other.scores[attendee.id] < candidate.scores[attendee.id]).length;
        const equal = group.filter(other => other.scores[attendee.id] === candidate.scores[attendee.id]).length;
        points[candidate.id] = (points[candidate.id] ?? 0) + lower + (equal - 1) / 2;
      }
    }
  }
  const evaluate = (picks: Candidate[]) => {
    const happiness = Object.fromEntries(attendees.map(a => [a.id, picks.reduce((sum, c) => sum + c.scores[a.id], 0) / picks.length]));
    return { picks: picks.map(c => c.id), happiness, minimum: Math.min(...Object.values(happiness)), average: Object.values(happiness).reduce((a, b) => a + b, 0) / attendees.length, borda: picks.reduce((sum, c) => sum + points[c.id], 0) };
  };
  let best: ReturnType<typeof evaluate> | undefined;
  let baseline: ReturnType<typeof evaluate> | undefined;
  let combinations = 0;
  const epsilon = 1e-10;
  for (let a = 0; a < dining.length; a++) for (let b = a + 1; b < dining.length; b++) for (const activity of activities) for (const playlist of playlists) for (const destination of destinations) {
    const selected = [dining[a], dining[b], activity, playlist, ...(destination ? [destination] : [])];
    if (new Set(selected.map(c => (c.entityId ?? c.id).toLowerCase())).size !== selected.length) continue;
    const option = evaluate(selected);
    combinations++;
    const stable = option.picks.slice().sort().join(",");
    const prior = best?.picks.slice().sort().join(",") ?? "";
    if (!best || option.minimum > best.minimum + epsilon || (Math.abs(option.minimum - best.minimum) <= epsilon && (option.borda > best.borda || (option.borda === best.borda && stable < prior)))) best = option;
    const baselineIds = baseline?.picks.slice().sort().join(",") ?? "";
    if (!baseline || option.average > baseline.average + epsilon || (Math.abs(option.average - baseline.average) <= epsilon && (option.minimum > baseline.minimum + epsilon || (Math.abs(option.minimum - baseline.minimum) <= epsilon && stable < baselineIds)))) baseline = option;
  }
  if (!best || !baseline) throw new Error("Not enough distinct entities to compose a complete plan.");
  return { ...best!, baselineMinimum: baseline!.minimum, combinations };
}
