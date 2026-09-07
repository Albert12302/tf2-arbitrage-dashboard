# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A real-time dashboard that flags TF2 item arbitrage windows on backpack.tf —
moments where the highest live buy order for an item variant exceeds the
lowest live sell order for the same variant. npm-workspaces monorepo with
three packages: `worker/` (ingestion), `frontend/` (dashboard), `shared/`
(types both depend on). See `README.md` for the full local-setup walkthrough
and deployment targets (Render for the worker, Vercel for the frontend,
Supabase/Neon Postgres for the database).

## Commands

Run from the repo root unless noted — this is an npm workspaces monorepo, so
`npm install` at the root installs all three packages and the `postinstall`
hook builds `shared` automatically.

```bash
npm install                          # installs all workspaces, builds shared
npm run worker:dev                   # worker, live-reloading (tsx watch)
npm run frontend:dev                 # frontend on http://localhost:3000
npm run typecheck                    # typecheck worker + frontend (what CI runs)
```

Per-package build/start (needed before running a package's compiled output,
e.g. to mirror what Render/Vercel do):

```bash
npm run build --workspace=shared     # must run before worker/frontend build if shared changed
npm run build --workspace=worker && npm start --workspace=worker
npm run build --workspace=frontend && npm start --workspace=frontend
```

There is no test suite and no lint script in this repo — CI
(`.github/workflows/ci.yml`) only runs `npm run typecheck`. Don't add a
testing/linting setup unless asked.

## Architecture

```
backpack.tf WS → worker/ (Render) → Postgres (Supabase/Neon) → frontend/ (Vercel) → browser
                       ↑___________________ shared/ types __________________↑
```

- **`worker/`** holds the *only* connection to `wss://ws.backpack.tf/events`
  and the *only* code path that writes to Postgres. `frontend/` is read-only
  by convention (not DB-enforced, but every query in `frontend/lib/db.ts`
  should stay a `SELECT`; the deployment README recommends a DB role that
  can't write at all).
- **`shared/`** (`@tf2-arb/shared`) is the single source of truth for the
  WebSocket payload shape, the `DealRow` shape, and `buildItemSku()` — the
  deterministic string that identifies one item "flavor" (name + quality +
  killstreak tier + australium + particle effect + paint/sheen/killstreaker).
  Both other packages import from here so the two services can't drift out
  of sync on what a row/event looks like. Rebuild it (`npm run build
  --workspace=shared`) after changing anything here, since worker/frontend
  consume its compiled `dist/`, not the source directly.
- **Worker internals** (`worker/src/`):
  - `backpack-socket.ts` — thin `ws` wrapper with capped exponential-backoff
    reconnect. Also force-closes and reconnects on 90s of total silence,
    because a dead connection here doesn't reliably fire a `close` event.
  - `order-book.ts` — in-memory `OrderBook` keeping every active listing per
    SKU split by buy/sell intent (not just the current best), because a
    `listing-delete` event only gives an ID, not the item — you need the
    full set to recompute the new best after a removal. Also owns
    `pruneStale()`, a TTL-based backstop for listings whose bot went offline
    without ever sending a delete event.
  - `key-price.ts` — derives the live metal-per-key rate from the same
    WebSocket stream (best metal-priced key sell listing) instead of
    polling a currency API, to stay within the zero-polling guardrail below.
  - `db.ts` (`DealsRepository`) — the only code that writes `deals` rows.
    Only UPSERTs when `highest_buy_metal > lowest_sell_metal`; deletes the
    row otherwise. Tracks which SKUs currently have a row in-process to
    avoid redundant DELETEs.
  - `index.ts` — wires the above together; `reconcileSku()` re-converts both
    the best buy and best sell through the *same* key-rate snapshot at
    write time, since pricing each side at its own event time (which can be
    hours apart) can manufacture a phantom spread purely from rate drift.
- **Frontend internals** (`frontend/`): App Router, one server component
  (`app/page.tsx`, `export const dynamic = "force-dynamic"` — this is live
  data, never statically cache it) rendering stat cards + a client-side
  sortable/paginated table (`components/deals-table.tsx`). `lib/tf2-display.ts`
  builds working backpack.tf item-stats-page links from a `DealRow` — this
  logic is fiddly (quality-name vs. particle-effect-name prefixes, War Paint
  case double-line names, Killstreak Kit/Fabricator catalog-page collapsing,
  numbered crate series) and every rule in there is backed by a confirmed
  real URL noted in the comments; read those comments before touching it.
  Read `frontend/AGENTS.md` before writing any frontend code — this repo
  pins a Next.js version with breaking API/convention changes from what
  training data assumes.

## Engineering guardrails (why the code looks the way it does)

This project is built to run entirely on free-tier infrastructure, which
shapes several decisions that otherwise look unusual:

- **No HTTP polling, anywhere.** Listings come from the backpack.tf
  WebSocket only; the key exchange rate is derived from that same stream
  (see `key-price.ts`) rather than a separate polled currency API.
- **Database write throttling.** The WebSocket fires constantly; the worker
  only writes when a SKU's best buy/sell crosses into (or out of)
  profitability — never on every event. Keep this in mind before adding new
  writes: an unconditional write per event would defeat the point.
- **Zero paid add-ons.** No Redis or other paid infra — an in-memory `Map`
  based order book (`OrderBook`) is deliberate, not a placeholder for a
  future cache layer.
- **Explicit typing.** No lazy `any` for the WebSocket payload or DB row
  shapes — those live in `shared/` precisely so both packages share one
  real interface.
- **Secrets only via `process.env`**, never hardcoded — see `worker/.env.example`
  and `frontend/.env.local.example` for what each package needs.
