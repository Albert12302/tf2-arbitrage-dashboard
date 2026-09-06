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

The backpack.tf WebSocket feed is public — no API key or account needed. The
only thing you need to provide yourself is a Postgres database.

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later, and npm (bundled with Node)
- [git](https://git-scm.com/)
- A free Postgres database — [Supabase](https://supabase.com/) or
  [Neon](https://neon.tech/) both work

### 1. Clone the repo

```bash
git clone https://github.com/Albert12302/tf2-arbitrage-dashboard.git
cd tf2-arbitrage-dashboard
```

### 2. Create a free Postgres database

Using Supabase (Neon is a similar flow):

1. Sign up at [supabase.com](https://supabase.com/) and create a new project.
2. Once it's provisioned, go to **Project Settings → Database → Connection
   string** and copy the **URI** (direct connection, not the pooler).
3. In Supabase's **SQL Editor**, paste the contents of
   [`database/schema.sql`](database/schema.sql) and run it once. This creates
   the `deals` table the worker writes to and the frontend reads from.

Optional but recommended: create a second, read-only Postgres role for the
frontend to use (`CREATE ROLE ... WITH LOGIN; GRANT SELECT ON deals TO ...;`),
so the dashboard can never accidentally write to `deals`. The worker's
connection string needs write access; the frontend's doesn't.

### 3. Configure environment variables

```bash
npm install                 # installs all three workspaces from the root
cp worker/.env.example worker/.env
cp frontend/.env.local.example frontend/.env.local
```

Then edit both files:

- `worker/.env` — set `DATABASE_URL` to your Supabase/Neon connection string
  (the write-capable one). `BACKPACK_TF_WS_URL` already has a working default
  and doesn't need to change.
- `frontend/.env.local` — set `DATABASE_URL` to the same database, ideally
  using the read-only role from step 2.

### 4. Run it

In two separate terminals:

```bash
npm run worker:dev          # starts the ingestion worker
```

```bash
npm run frontend:dev        # starts the dashboard on http://localhost:3000
```

You should see `[worker] booting` and `[worker] will connect to
wss://ws.backpack.tf/events` in the worker's terminal — that means it
connected to backpack.tf and your database successfully. Open
[http://localhost:3000](http://localhost:3000) to see the dashboard; rows
appear once the worker detects a profitable buy/sell spread on some item,
which can take a few minutes depending on market activity.

### Troubleshooting

- `Missing required env var: DATABASE_URL` — the corresponding `.env`
  file is missing, in the wrong folder, or the variable name is misspelled.
- Connection errors mentioning SSL — Supabase and Neon both require SSL;
  both `worker/src/db.ts` and `frontend/lib/db.ts` already request it by
  default, so this usually means the connection string itself is wrong
  (bad host/port/password).
- Worker runs but the dashboard stays empty — normal at first. Rows only
  appear once a real buy price exceeds a real sell price for the same item
  on backpack.tf; check the worker's terminal for `[worker] fatal error` or
  repeated `failed to handle message` logs if it seems stuck.

## Deployment

- **Render**: new Background Worker, root directory `worker/`, build command
  `npm install && npm run build`, start command `npm start`.
- **Vercel**: new project, root directory `frontend/`.
- **Database**: run `database/schema.sql` once against your Supabase/Neon
  instance, then set `DATABASE_URL` as an env var on both Render and Vercel.

