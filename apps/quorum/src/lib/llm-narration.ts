import "server-only";
import { z } from "zod";
import { generateJson } from "@hackathon/swarm-core/providers";
import type { Attendee, Candidate, Plan, QuorumEvent, TraceStep } from "./types";

const narrationSchema = z.object({
  objectionLines: z.array(z.object({ attendeeName: z.string(), detail: z.string().max(600) })).max(12),
  negotiatorSummary: z.string().max(900),
});

export const llmNarrationReady = () => process.env.QUORUM_ENABLE_LLM === "true" && Boolean(resolveLlmKey());

function resolveLlmKey() {
  const provider = process.env.QUORUM_LLM_PROVIDER ?? "openai";
  if (provider === "gemini") return process.env.GEMINI_API_KEY;
  if (provider === "groq") return process.env.GROQ_API_KEY;
  return process.env.OPENAI_API_KEY;
}

export async function appendLlmNarration(event: QuorumEvent, plan: Plan, candidates: Candidate[], steps: TraceStep[]) {
  if (!llmNarrationReady()) return;
  const picks = candidates.filter(c => plan.picks.includes(c.id));
  const provider = (process.env.QUORUM_LLM_PROVIDER ?? "openai") as "openai" | "gemini" | "groq";
  const model = process.env.QUORUM_LLM_MODEL ?? (provider === "gemini" ? "gemini-2.0-flash" : provider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4.1-mini");
  const payload = {
    event: { name: event.name, city: event.city, type: event.type, mode: event.mode },
    attendees: event.attendees.map((a: Attendee) => ({ name: a.name, favorites: a.favorites.map(f => f.name) })),
    selected: picks.map(c => ({ category: c.category, name: c.name, scores: c.scores })),
    fairness: { minimum: plan.minimum, average: plan.average, combinations: plan.combinations },
  };
  const narration = await generateJson(payload, {
    provider,
    model,
    apiKey: resolveLlmKey()!,
    enabled: true,
    systemPrompt: "You explain a group itinerary chosen by maximin fairness over Qloo taste affinity scores. Be honest: scores are taste-fit evidence, not happiness surveys. Do not invent venues or claim bookings were made.",
    schema: narrationSchema,
    maxOutputTokens: 1200,
  });
  const negotiatorIndex = steps.findIndex(s => s.agent === "Negotiator");
  if (negotiatorIndex >= 0) steps[negotiatorIndex].detail = `${steps[negotiatorIndex].detail} ${narration.negotiatorSummary}`;
  for (const line of narration.objectionLines) {
    const attendee = event.attendees.find(a => a.name === line.attendeeName);
    if (!attendee) continue;
    const idx = steps.findIndex(s => s.agent === `${attendee.name} · objection`);
    if (idx >= 0) steps[idx].detail = line.detail;
  }
}
