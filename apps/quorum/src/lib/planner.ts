import "server-only";
import { randomUUID } from "node:crypto";
import { negotiate } from "./fairness";
import { syntheticCandidates } from "./demo";
import { extractAffinity } from "./qloo-affinity";
import { insights, searchTags } from "./qloo";
import { selectPoolIds } from "./candidate-pool";
import { appendLlmNarration } from "./llm-narration";
import type { Candidate, Category, Plan, QuorumEvent, TraceStep } from "./types";

async function liveCandidates(event: QuorumEvent, log: (agent: string, detail: string) => void) {
  const diningTags = await searchTags("restaurant");
  const activityTags = await searchTags("museum");
  const diningTag = diningTags[0]?.id ?? diningTags.find(t => t.name.toLowerCase().includes("restaurant"))?.id;
  const activityTag = activityTags[0]?.id;
  if (!diningTag || !activityTag) {
    log("Scout", "Tag lookup returned sparse results; continuing with entity signals only.");
  } else {
    log("Scout", `Resolved dining and activity tags through /v2/tags; gathering candidates in ${event.city}.`);
  }
  const categories: { category: Category; type: string; tags?: string[] }[] = [
    { category: "dining", type: "place", tags: diningTag ? [diningTag] : undefined },
    { category: "activity", type: "place", tags: activityTag ? [activityTag] : undefined },
    { category: "playlist", type: "artist" },
    ...(event.type === "trip" ? [{ category: "destination" as const, type: "destination" }] : []),
  ];
  const candidates: Candidate[] = [];
  for (const slot of categories) {
    const lists = await Promise.allSettled(event.attendees.map(a => insights(a.favorites, slot.type, event.city, undefined, slot.tags)));
    const failed = lists.find(result => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    const successful = lists.flatMap(list => list.status === "fulfilled" ? [list.value] : []);
    const metadata = new Map(successful.flat().map(entity => [entity.entity_id, entity]));
    const pool = new Map<string, Candidate>(selectPoolIds(successful, 8).map(id => {
      const entity = metadata.get(id)!;
      return [id, { id: `${slot.category}:${id}`, entityId: id, name: entity.name, category: slot.category, type: slot.type, description: entity.properties?.description?.slice(0, 450) || "Qloo entity. Check venue details and availability before booking.", tags: (entity.tags ?? []).flatMap(t => (t.name ? [t.name] : [])).slice(0, 3), scores: {}, source: "qloo" }];
    }));
    const ids = [...pool.keys()];
    if (!ids.length) throw new Error(`No Qloo ${slot.category} coverage. Try a city with documented coverage.`);
    let missingAffinity = 0;
    for (const attendee of event.attendees) {
      const scored = await insights(attendee.favorites, slot.type, event.city, ids, slot.tags);
      for (const entity of scored) {
        const affinity = extractAffinity(entity);
        if (affinity === undefined) { missingAffinity++; continue; }
        const candidate = pool.get(entity.entity_id);
        if (candidate) candidate.scores[attendee.id] = affinity;
      }
    }
    const complete = [...pool.values()].filter(c => event.attendees.every(a => c.scores[a.id] !== undefined));
    if (missingAffinity) log("Scout", `${missingAffinity} Qloo rows in ${slot.category} lacked affinity evidence and were skipped; ${complete.length} candidates remain fully scored.`);
    candidates.push(...complete);
  }
  if (!candidates.length) throw new Error("Qloo returned no fully scored candidates. Affinity gaps were skipped instead of inventing scores; try another city or broader favorites.");
  return candidates;
}

export async function buildPlan(event: QuorumEvent): Promise<Plan> {
  if (!event.attendees.length) throw new Error("Add an attendee before negotiating.");
  if (event.mode === "live" && event.type === "trip" && event.attendees.length > 7) throw new Error("A live trip currently supports seven people under the 60-request budget. Synthetic trips support eight.");
  const steps: TraceStep[] = [];
  const log = (agent: string, detail: string) => steps.push({ seq: steps.length + 1, agent, detail, status: "complete", createdAt: new Date().toISOString() });
  log("Planner", `Prepare a ${event.type} for ${event.attendees.length} people. ${event.mode === "demo" ? "Hand-authored synthetic evidence only." : "Live Qloo evidence only."}`);
  const candidates = event.mode === "demo" ? syntheticCandidates(event.attendees).filter(c => event.type === "trip" || c.category !== "destination") : await liveCandidates(event, log);
  for (const attendee of event.attendees) {
    const favorite = attendee.favorites[0];
    const top = candidates.slice().sort((a, b) => b.scores[attendee.id] - a.scores[attendee.id])[0];
    log(`${attendee.name} · persona`, `${favorite.name} is one of ${attendee.name}'s selected favorites. Highest scored candidate: ${top.name} (${Math.round(top.scores[attendee.id] * 100)}). ${event.mode === "demo" ? "Synthetic profile mapping; no Qloo call." : "Scores sourced from Qloo affinity fields when present."}`);
  }
  log("Scout", `${candidates.length} fully scored candidates across dining, activity, playlist${event.type === "trip" ? ", and destination" : ""}. Budget is a planning brief; prices and availability need confirmation.`);
  const result = negotiate(event.attendees, candidates, event.type === "trip");
  log("Negotiator", `Compared ${result.combinations} complete plans. Maximize minimum attendee mean; Borda points break ties. Lowest mean fit: ${Math.round(result.minimum * 100)}.`);
  for (const attendee of event.attendees) {
    const lowest = candidates.filter(c => result.picks.includes(c.id)).sort((a, b) => a.scores[attendee.id] - b.scores[attendee.id])[0];
    log(`${attendee.name} · objection`, `Lowest selected fit is ${lowest.name} (${Math.round(lowest.scores[attendee.id] * 100)}). All alternatives were evaluated; the selected plan preserves the best group minimum under the stated rule.`);
  }
  try {
    await appendLlmNarration(event, { id: "pending", mode: event.mode, candidates, ...result, steps, createdAt: new Date().toISOString() }, candidates, steps);
  } catch (error) {
    log("Negotiator", `LLM narration skipped: ${error instanceof Error ? error.message : "unknown error"}. Deterministic trace remains authoritative.`);
  }
  log("Planner", "Published a local proposal with two dining picks, one shared activity and one playlist artist. This is a proposal; no reservation or message was sent.");
  return { id: randomUUID(), mode: event.mode, candidates, ...result, steps, createdAt: new Date().toISOString() };
}
