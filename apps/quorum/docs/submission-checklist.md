# Qloo Agentic Hackathon — Quorum submission checklist

Deadline: **Oct 30, 2026, 11:45 PM ET**. Live judging: **Nov 5, 2026**.

## Repository

- [ ] Public GitHub repo with **MIT** license in root `LICENSE`
- [ ] README setup, env table, and honest demo vs live labeling
- [ ] No Qloo response payloads, cache dumps, or API keys in git history

## Qloo integration (judging focus)

- [ ] `QLOO_API_KEY` issued for `https://hackathon.api.qloo.com`
- [ ] `npm run smoke:qloo` passes locally with live env vars
- [ ] One recorded live event: search favorites → plan with real affinity matrix
- [ ] Document any affinity field gaps; app skips unscored entities instead of blocking

## Hosted demo (required)

- [ ] Vercel (or equivalent) HTTPS URL in Devpost
- [ ] Neon: run `drizzle/0000_quorum.sql` + `0001_event_state.sql`
- [ ] `DATABASE_URL` + `QUORUM_SESSION_SECRET` on Vercel
- [ ] Neon Auth: organizers at `/auth/sign-in`; attendees via invite links only
- [ ] `QLOO_*` and LLM keys only in host env — never client bundles

## Optional wow factor

- [ ] `QUORUM_ENABLE_LLM=true` with provider key for objection narration
- [ ] 2–5 min video: demo → live Qloo plan → fairness matrix → trace replay

## Devpost copy (honest)

- State that affinity is **taste-fit evidence**, not measured happiness
- State that plans are **proposals** — no bookings sent
- Credit Qloo Taste AI API as the taste layer

## Pre-judging dry run (Nov 5)

- [ ] Fresh invite link, 3–4 attendees, live plan under 60 req/min budget
- [ ] Organizer signed in; matrix and timeline load on mobile width
