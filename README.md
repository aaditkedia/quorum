# Quorum

**Quorum** is a Qloo Agentic Hackathon project: a group planning app that turns shared taste into a fair itinerary using the [Qloo Taste AI API](https://hackathon.api.qloo.com), maximin fairness, and an auditable negotiation trace.

- **Demo mode** — fictional attendees and synthetic affinities (no Qloo calls).
- **Live mode** — server-side Qloo search, tags, and insights; missing affinity fields are **skipped**, not fabricated.
- **Optional LLM** — set `QUORUM_ENABLE_LLM=true` to rewrite objection lines via `@hackathon/swarm-core` (deterministic math stays authoritative).
- **Hosting** — local JSON by default; set `DATABASE_URL` for Neon Postgres (Drizzle), private `quorum_qloo_cache`, and Neon Auth for organizers. Attendees join via bearer invite links and signed HttpOnly cookies.

License: [MIT](LICENSE).

## Quick start (local)

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3103 → **Try the working demo**.

```sh
npm test
npm run typecheck
npm run build
```

## Environment variables

Copy `apps/quorum/.env.example` to `apps/quorum/.env.local`.

| Variable | Purpose |
|---|---|
| `QUORUM_SESSION_SECRET` | HMAC for attendee/organizer cookies (32+ chars; required in production without local data dir) |
| `QLOO_API_KEY` | Hackathon API key (server only) |
| `QLOO_BASE_URL` | `https://hackathon.api.qloo.com` |
| `QUORUM_ENABLE_LIVE` | `true` to allow live Qloo calls |
| `DATABASE_URL` | Neon pooled URL → enables Postgres store + Qloo response cache table |
| `DATABASE_URL_UNPOOLED` | Direct URL for `drizzle-kit push` / migrations |
| `NEON_AUTH_BASE_URL` | Neon Auth URL from the Neon console |
| `NEON_AUTH_COOKIE_SECRET` | 32+ char secret for auth cookies |
| `QUORUM_ENABLE_LLM` | `true` for optional narration |
| `QUORUM_LLM_PROVIDER` | `openai` (default), `gemini`, or `groq` |
| `QUORUM_LLM_MODEL` | Model id for the chosen provider |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `GROQ_API_KEY` | Provider key when LLM is enabled |

**Never commit Qloo responses, API keys, or cache table exports.**

## Live Qloo smoke test

After you receive a hackathon key:

```sh
export QLOO_API_KEY="your-key"
export QUORUM_ENABLE_LIVE=true
npm run smoke:qloo
```

Uses the [hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide) base URL and exercises search, tags, and insights.

## Demo script (video / judging)

```sh
npm run demo
```

1. Open the URL printed in the terminal.
2. Click **Try the working demo** → show matrix, fairness tab, timeline replay.
3. (Optional live) Create event with **Live Qloo**, join from incognito via invite link, run **Find our common ground**.

See `apps/quorum/docs/submission-checklist.md`.

## Deploy on Vercel

1. Import this repo; set **Root Directory** to `apps/quorum`.
2. Add environment variables from the table above (production `QUORUM_SESSION_SECRET`, Neon URLs, Neon Auth, Qloo key).
3. Apply SQL: run `drizzle/0000_quorum.sql` and `drizzle/0001_event_state.sql` on Neon (or `npx drizzle-kit push` from `apps/quorum` with `DATABASE_URL_UNPOOLED`).
4. Enable Neon Auth in the Neon project; set `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`.
5. Deploy. Organizers sign in at `/auth/sign-in`; attendees use invite links only.

`vercel.json` in `apps/quorum` installs from the monorepo root.

## Monorepo layout

- `apps/quorum` — Next.js app
- `packages/swarm-core` — optional LLM JSON adapter
- `packages/ui` — timeline UI
