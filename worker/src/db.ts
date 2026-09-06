/**
 * worker/src/db.ts
 *
 * Thin wrapper around the `deals` table. Two rules enforced here:
 *   1. We only ever write a row when highest_buy_metal > lowest_sell_metal
 *      (the schema's CHECK constraint would reject it otherwise anyway —
 *      this is a second line of defense so we don't waste a round trip).
 *   2. We track which SKUs currently have a row in-process, so a SKU that
 *      was never profitable doesn't trigger a wasted DELETE on every
 *      non-qualifying event. This keeps write volume down per the
 *      project's database-write-throttling guardrail.
 */

import { Pool } from "pg";
import type { DealUpsertInput } from "@tf2-arb/shared";

export class DealsRepository {
  private pool: Pool;
  private presentSkus = new Set<string>();

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
      max: 3, // free-tier Postgres instances cap connections low
    });
  }

  /** Seeds presentSkus from the DB's actual current rows. Must be called
   *  once after construction — without it, a fresh process (after any
   *  restart) starts believing no rows exist, so deleteIfPresent silently
   *  skips real rows left over from before the restart and they never
   *  get cleaned up once they stop being profitable. */
  async init(): Promise<void> {
    const result = await this.pool.query<{ item_sku: string }>("SELECT item_sku FROM deals");
    for (const row of result.rows) {
      this.presentSkus.add(row.item_sku);
    }
  }

  async upsert(deal: DealUpsertInput): Promise<void> {
    if (deal.highest_buy_metal <= deal.lowest_sell_metal) {
      // Not actually profitable — caller should have called delete() instead.
      return;
    }

    await this.pool.query(
      `INSERT INTO deals (
         item_sku, item_name, quality, quality_name, is_australium,
         killstreak_tier, particle_effect,
         highest_buy_metal, highest_buy_listing_id, highest_buy_steamid,
         lowest_sell_metal, lowest_sell_listing_id, lowest_sell_steamid
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (item_sku) DO UPDATE SET
         highest_buy_metal = EXCLUDED.highest_buy_metal,
         highest_buy_listing_id = EXCLUDED.highest_buy_listing_id,
         highest_buy_steamid = EXCLUDED.highest_buy_steamid,
         lowest_sell_metal = EXCLUDED.lowest_sell_metal,
         lowest_sell_listing_id = EXCLUDED.lowest_sell_listing_id,
         lowest_sell_steamid = EXCLUDED.lowest_sell_steamid`,
      [
        deal.item_sku,
        deal.item_name,
        deal.quality,
        deal.quality_name,
        deal.is_australium,
        deal.killstreak_tier,
        deal.particle_effect,
        deal.highest_buy_metal,
        deal.highest_buy_listing_id,
        deal.highest_buy_steamid,
        deal.lowest_sell_metal,
        deal.lowest_sell_listing_id,
        deal.lowest_sell_steamid,
      ]
    );
    this.presentSkus.add(deal.item_sku);
  }

  /** No-ops if this SKU doesn't currently have a row — avoids a wasted query. */
  async deleteIfPresent(itemSku: string): Promise<void> {
    if (!this.presentSkus.has(itemSku)) return;
    await this.pool.query(`DELETE FROM deals WHERE item_sku = $1`, [itemSku]);
    this.presentSkus.delete(itemSku);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
