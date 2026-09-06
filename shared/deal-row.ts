/**
 * shared/deal-row.ts
 *
 * Database row shape — mirrors database/schema.sql exactly.
 */

export interface DealRow {
  id: number;
  item_sku: string;
  item_name: string;
  quality: number;
  quality_name: string;
  is_australium: boolean;
  killstreak_tier: number;
  particle_effect: string | null;

  highest_buy_metal: number;
  highest_buy_listing_id: string;
  highest_buy_steamid: string | null;

  lowest_sell_metal: number;
  lowest_sell_listing_id: string;
  lowest_sell_steamid: string | null;

  profit_margin_metal: number;
  profit_margin_pct: number;

  last_seen_at: string;
  created_at: string;
}

export type DealUpsertInput = Omit<
  DealRow,
  "id" | "profit_margin_metal" | "profit_margin_pct" | "created_at" | "last_seen_at"
>;
