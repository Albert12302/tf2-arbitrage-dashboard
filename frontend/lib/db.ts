import { Pool } from "pg";
import type { DealRow } from "@tf2-arb/shared";

let pool: Pool | null = null;

/** Lazily instantiate a single shared pg Pool for the lifetime of the server. */
function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Missing required env var: DATABASE_URL");
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/**
 * Fetches current arbitrage opportunities, most profitable first.
 * Read-only by convention — this frontend never writes to `deals`.
 */
export async function getTopDeals(limit = 50): Promise<DealRow[]> {
  const { rows } = await getPool().query<DealRow>(
    "SELECT * FROM deals ORDER BY profit_margin_metal DESC LIMIT $1",
    [limit]
  );
  return rows;
}
