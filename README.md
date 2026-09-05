# TF2 market arbitrage dashboard

Real-time monitoring dashboard that flags instantaneous arbitrage windows in the
backpack.tf TF2 item market — moments where a buyer's highest bid exceeds a
seller's lowest ask on the same item variant.

## Architecture

- **`worker/`** — Node.js/TypeScript background service (deploy target: Render
  free-tier worker). Holds the only WebSocket connection to
  `wss://ws.backpack.tf/events`, maintains an in-memory order book per item,
  and is the only thing that writes to Postgres — and only when it detects
  `highest_buy > lowest_sell` for an item.
- **`frontend/`** — Next.js App Router app (deploy target: Vercel free tier).
  Read-only. Queries the `deals` table and renders it with Shadcn/Tailwind.
- **`shared/`** — Types-only workspace package (`@tf2-arb/shared`) imported by
  both of the above, so the WebSocket payload shape, `DealRow`, and the
  `item_sku` builder never drift out of sync between the two services.
- **`database/`** — `schema.sql` for the Postgres `deals` table (Supabase or
  Neon free tier).

```
backpack.tf WS → worker/ (Render) → Postgres (Supabase/Neon) → frontend/ (Vercel) → browser
                       ↑___________________ shared/types.ts __________________↑
```

## Local setup

```bash
npm install                 # installs all three workspaces from the root
cp worker/.env.example worker/.env
cp frontend/.env.local.example frontend/.env.local
# fill in DATABASE_URL in both files (see each .env.example for details)

npm run worker:dev          # runs the ingestion worker locally
npm run frontend:dev        # runs the dashboard locally on localhost:3000
```

## Deployment

- **Render**: new Background Worker, root directory `worker/`, build command
  `npm install && npm run build`, start command `npm start`.
- **Vercel**: new project, root directory `frontend/`.
- **Database**: run `database/schema.sql` once against your Supabase/Neon
  instance, then set `DATABASE_URL` as an env var on both Render and Vercel.

## Status

🚧 Early scaffolding — worker and frontend are stubs. See commit history for
progress.
