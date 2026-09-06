/**
 * shared/backpack-payload.ts
 *
 * Raw WebSocket payload shapes, as received from backpack.tf
 * (wss://ws.backpack.tf/events).
 *
 * VERIFY BEFORE PRODUCTION USE: modeled on backpack.tf's publicly documented
 * listing structure. Confirm against a real payload capture before trusting
 * it in production — third-party API schemas drift over time.
 */

export interface BackpackTfListingUpdateMessage {
  event: "listing-update";
  payload: BackpackTfListingEvent;
}

export interface BackpackTfListingDeleteMessage {
  event: "listing-delete";
  payload: BackpackTfListingDeleteEvent;
}

// A real discriminated union: narrowing on `event` narrows `payload` too,
// so consumers don't need an `as` cast to read the right payload shape.
export type BackpackTfSocketMessage =
  | BackpackTfListingUpdateMessage
  | BackpackTfListingDeleteMessage;

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
