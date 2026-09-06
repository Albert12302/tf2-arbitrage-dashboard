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

export interface BackpackTfItemQuality {
  id: number;
  name: string;
  color?: string;
}

export interface BackpackTfItem {
  name: string;
  quality: BackpackTfItemQuality;
  // Omitted entirely by the live socket when not killstreak/australium,
  // rather than sent as an explicit 0/false — always read through a
  // `?? 0` / `?? false` default, never assume presence. Note: camelCase
  // on the wire, unlike most other item fields (confirmed via a live
  // payload capture — the docs/assumed snake_case shape was wrong here).
  killstreakTier?: number;
  australium?: boolean;
  particle?: {
    id: number;
    name: string;
  };
  craftable: boolean;
  tradable: boolean;

  // Value-affecting customizations. paint/sheen/killstreaker each have a
  // small enumerable set of values, so they're folded straight into
  // item_sku (see buildItemSku) — a Team Spirit item only ever matches
  // another Team Spirit item. spells/customName/extra strange parts don't
  // fold in as cleanly (spells stack in combinations, name tags are
  // freeform text) so listings carrying those are excluded from tracking
  // entirely instead (see isTrackableVariant).
  paint?: { id: number; name: string; color?: string }; // confirmed via live capture
  sheen?: { id: number; name: string }; // confirmed via live capture
  killstreaker?: { id: number; name: string }; // confirmed via live capture
  customName?: string; // name tag applied — confirmed via live capture
  killEaters?: unknown[]; // >1 entry means a Strange Part is attached beyond the item's own built-in counter
  spells?: unknown[]; // Halloween Spells — confirmed via live capture
}

/**
 * False for a listing carrying a customization that doesn't fold cleanly
 * into item_sku — a name tag (freeform text), Halloween Spells (they
 * stack in combinations), or an attached Strange Part beyond the item's
 * own built-in counter. Paint/sheen/killstreaker are NOT excluded here;
 * they're folded into the SKU itself so matching variants still compare
 * correctly against each other.
 */
export function isTrackableVariant(item: BackpackTfItem): boolean {
  if (item.customName) return false;
  if (item.spells && item.spells.length > 0) return false;
  if (item.killEaters && item.killEaters.length > 1) return false;
  return true;
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
  /** Epoch ms when the worker last received an event for this listing —
   *  used to prune listings that went silent without a listing-delete. */
  lastSeenAt: number;
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
    `q${item.quality.id}`,
    item.australium ? "aus" : "std",
    `ks${item.killstreakTier ?? 0}`,
    item.particle ? `pe${item.particle.id}` : "pe0",
    item.craftable ? "craft" : "nocraft",
    item.paint ? `pt${item.paint.id}` : "pt0",
    item.sheen ? `sh${item.sheen.id}` : "sh0",
    item.killstreaker ? `kr${item.killstreaker.id}` : "kr0",
  ];
  return parts.join("::");
}
