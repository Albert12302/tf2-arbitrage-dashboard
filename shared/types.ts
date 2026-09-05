/**
 * shared/types.ts
 *
 * Single source of truth for data shapes shared between:
 *   - The Node.js/TypeScript ingestion worker (writes)
 *   - The Next.js frontend (reads only, via Supabase/Neon client)
 *
 * VERIFY BEFORE PRODUCTION USE: the BackpackTfListingEvent shape below is
 * modeled on backpack.tf's publicly documented listing structure. Confirm
 * against a real payload capture from wss://ws.backpack.tf/events before
 * trusting it in production — third-party API schemas drift over time.
 */

// ============================================================================
// 1. Raw WebSocket payload (as received from backpack.tf)
// ============================================================================

export interface BackpackTfSocketMessage {
  event: "listing-update" | "listing-delete";
  payload: BackpackTfListingEvent | BackpackTfListingDeleteEvent;
}

export interface BackpackTfListingEvent {
  id: string;
  steamid: string;
  appid: 440;
  currencies: BackpackTfCurrencies;
  intent: "buy" | "sell";
  item: BackpackTfItem;
  count?: number;
  userAgent?: {
    client: string;
    lastPulse: number;
  };
  listedAt: number;
  bumpedAt: number;
}

export interface BackpackTfListingDeleteEvent {
  id: string;
  steamid: string;
}

export interface BackpackTfCurrencies {
  keys?: number;
  metal?: number;
}

export interface BackpackTfItem {
  name: string;
  quality: number;
  quality_name: string;
  killstreak_tier: number;
  australium: boolean;
  particle?: {
    id: number;
    name: string;
  };
  craftable: boolean;
  tradable: boolean;
}

// ============================================================================
// 2. Normalized in-memory representations (worker-internal, pre-DB)
// ============================================================================

export interface NormalizedListing {
  listingId: string;
  steamId: string;
  intent: "buy" | "sell";
  itemSku: string;
  itemName: string;
  quality: number;
  qualityName: string;
  isAustralium: boolean;
  killstreakTier: number;
  particleEffect: string | null;
  priceMetal: number;
}

export interface OrderBookSide {
  bestBuy: NormalizedListing | null;
  bestSell: NormalizedListing | null;
}

// ============================================================================
// 3. Database row shape (mirrors database/schema.sql exactly)
// ============================================================================

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

// ============================================================================
// 4. Helper: deterministic item_sku builder
// ============================================================================

export function buildItemSku(item: BackpackTfItem): string {
  const parts = [
    item.name,
    `q${item.quality}`,
    item.australium ? "aus" : "std",
    `ks${item.killstreak_tier}`,
    item.particle ? `pe${item.particle.id}` : "pe0",
    item.craftable ? "craft" : "nocraft",
  ];
  return parts.join("::");
}
