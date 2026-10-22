# Quorum

Give every taste a seat at the table. A group organizer creates an event, attendees join through a private link without an account, and persona/scout/negotiator/planner stages choose a complete plan using maximin fairness with a Borda tiebreak.

**Current artifact: working local prototype.** Synthetic mode is fully functional and explicitly labeled. Every fictional name, affinity and taste profile is hand-authored; no Qloo response dataset is committed. Live integration is implemented but **not credential-tested**. No hosted deployment or Neon organizer authentication is configured.

## Local setup

From the monorepo root:

```sh
npm install
npm run dev --workspace=@hackathon/quorum
```

Open http://127.0.0.1:3103 and click **Try the working demo**. Four fictional people and a complete plan are saved locally. Inspect their favorites, the happiness matrix, and the saved negotiation replay. **Create an event** exercises the blank organizer → invite → join → plan flow. Open its invite in an incognito browser to test an independent attendee. New or changed attendee favorites invalidate the old plan, and the organizer regenerates it. Resubmitting an unchanged profile preserves the plan. Returning attendees resume their saved event from the private invitation; “Edit my taste” updates their own profile. Both organizer and attendee views refresh while idle.

```sh
npm run typecheck --workspace=@hackathon/quorum
node --import tsx --test apps/quorum/tests/*.test.ts
npm run build --workspace=@hackathon/quorum
```

Copy `.env.example` to `.env.local` only when configuring optional integrations. Development generates a random signing secret in the ignored local data directory. Production requires a `QUORUM_SESSION_SECRET` of at least 32 random characters. `QUORUM_DATA_DIR` defaults to `.data/quorum`; writes use a process queue, temporary file and atomic rename. Restarting the same process directory preserves events. Eight attendees and 100 local events cap this prototype. Live trips are limited to seven attendees so a cold run stays within the 60-request budget; synthetic trips support eight.

## Evidence and fairness

The live scout merges every persona's candidate list with equal integer reciprocal-rank points, canonicalizes IDs and uses a stable ID tiebreak before the eight-candidate cap per category. Reordering attendees cannot change that pool. The algorithm exhaustively compares plans with two distinct dining candidates, one activity, one playlist artist and (for trips) one destination. It averages selected scores for each person, then maximizes the lowest personal mean. Equal minima use summed within-category Borda points with average ranks for tied scores. Final ties use stable sorted entity IDs. The comparison plan maximizes group mean; equal means choose the highest minimum, then stable IDs. A single underlying venue cannot occupy both dining and activity slots. A missing score never becomes zero; incomplete candidates are excluded and insufficient evidence stops the run.

The displayed “happiness” is a label for taste affinity evidence. It is not measured personal happiness. Budget is stored as a brief, and the app does not verify prices, accessibility, hours, distances or availability. Dinner currently uses the same complete social-plan slots; a simpler dinner-only itinerary is future work. Rationales and objection rounds use deterministic templates; **no LLM or autonomous negotiation is claimed**. The timeline replays stored historical steps and the protected polling endpoint returns those records; it is not a simulated live run.

## Qloo adapter

`src/lib/qloo.ts` is server-only. Enable live use only after adding the assigned `QLOO_API_KEY` and setting `QUORUM_ENABLE_LIVE=true`. Calls use `X-Api-Key`, never browser variables or query-string credentials. Only Qloo's hackathon and standard HTTPS hosts are allowed. No API call runs on the initial page or in synthetic mode. Live attendees select results from `/search`; each selection carries a signed 15-minute proof bound to the event. Join verifies that proof, stores only its canonical server-returned name/type/ID, and rejects duplicate IDs after case normalization. Expired selections must be searched again. Persona candidates come from `/v2/insights`, scout constraints from `/v2/tags`, and each shared pool is rescored for each attendee with `filter.results.entities`.

The runtime uses GET query strings, bounded result counts, 10-second timeouts, no automatic retries, an in-memory private 15-minute response cache capped at 300 entries, and a per-process 60-request/minute budget. It does not claim distributed rate limiting. The live parser accepts the documented entity envelope and requires a numeric `query.affinity` between 0 and 1 for the complete matrix. The primary examples do not guarantee this field for every request; if the assigned credential returns a different measurement, the run blocks visibly until the contract is verified. No rank-derived or synthetic affinity substitutes are used.

Primary docs checked October 19, 2026:

- [Qloo Entity Search](https://github.com/qloo/docs-public/blob/main/reference/get-search.md): `query`, `types`, `take`.
- [Qloo Tags](https://github.com/qloo/docs-public/blob/main/reference/get-tags.md): `filter.query`, `take`.
- [Qloo Insights Deep Dive](https://github.com/qloo/docs-public/blob/main/reference/insights-api-deep-dive.md): `filter.type`, comma-separated `signal.interests.entities`, `filter.results.entities`, place location filters.
- [Qloo recommendation response](https://github.com/qloo/docs-public/blob/main/reference/basic-insights-use-case.md): `results.entities`, `entity_id`, `name`, `subtype` and optional metadata. This is a shape reference only; its records are not copied into the repository.

## Security and production path

Invite links have 256 random bits and act as bearer capabilities. Anyone with a link can join that event; share them privately. Browser sessions are HMAC-signed, expiring, HttpOnly, SameSite=Lax and Secure in production. Attendee tokens are bound to the event ID and role, and cannot generate a plan. Only an organizer cookie can access the private join link and trigger negotiation. Event reads and trace reads require event access. Browser writes reject foreign origins, payloads are bounded, and React renders user text as text. Attendees can see other members' chosen favorites and the group matrix; the invite intentionally describes a group taste-sharing flow. Local data is not encrypted at rest. There is no identity recovery, invite rotation, deletion UI, distributed abuse control or production account flow yet.

The local JSON adapter is for a single persistent Node process. **It will not provide durable storage on ephemeral Vercel functions.** Migrate to Neon before hosting. `drizzle/0000_quorum.sql` documents events, attendees, favorites, plans, scores, traces and a private Qloo cache. The `.ts.example` files isolate the optional production integration. Drizzle and Neon Auth are now installed at the monorepo root, but these examples are scaffolding, not a connected database. See root STATUS.md for the current Neon Auth beta's upstream UI peer conflicts.

For hosted organizer identity, install the current Neon Auth SDK, follow its current Next.js server guide, expose its catch-all route, and replace local organizer cookie issuance with a verified server session. Store the stable Neon user ID as `organizer_user_id`; check ownership on every event mutation. Keep account-free attendee HMAC cookies. Apply migrations with the direct Neon URL and use a pooled runtime URL. Add tenant isolation tests, private cache persistence, per-user/global request limits, deletion and rotating invitations before public hosting. These changes require integration verification; no external account has been created.

## Product and submission

Audience: student organizers, teams and friend groups. Business hypothesis: a per-event planning fee plus a B2B agency tier; no price, revenue or partnership is asserted. The core distinction is explicit per-person taste evidence and an auditable fairness rule. Follow [the architecture](docs/architecture.md) and [submission checklist](docs/submission-checklist.md). The monorepo MIT license covers this app; AI coding assistance should be disclosed in submission materials.

## Quality verification

The targeted suite covers fairness and deterministic comparison ties, duplicate-person/candidate rejection, distinct venues, attendee-order-independent candidate pools, signed favorite provenance, session role/event isolation, unchanged membership preserving saved plans, full-group updates, malformed JSON and chunked byte caps. The create-event dialog uses native modal focus management and displays API failures inside the dialog. Searches and refreshes abort stale requests; failed background refreshes visibly warn that the displayed event may be stale. Group sharing is disclosed before joining, and the affinity table exposes row/column headers and a text caption. Browser and central production-build results are recorded by the monorepo integration checks.
