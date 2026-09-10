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
  killEaters?: unknown[]; // the item's own built-in kill counter (e.g. every Strange weapon's base "Kills" tracker) — normal, not excluded
  // A Strange Part actually attached (Kills, Dominations, Damage Dealt, ...)
  // is a SEPARATE field from killEaters, not extra killEaters entries — this
  // reverses an earlier assumption in this file (">1 killEaters entry")
  // that never actually matched a real payload. NOT YET CONFIRMED VIA OUR
  // OWN LIVE CAPTURE (reasoned from a third-party reverse-engineered
  // schema) — re-verify against a real payload capture before trusting
  // further, per the file-level warning above.
  strangeParts?: unknown[];
  spells?: unknown[]; // Halloween Spells — confirmed via live capture
}

/**
 * False for a listing carrying a customization that doesn't fold cleanly
 * into item_sku — a name tag (freeform text), Halloween Spells (they
 * stack in combinations), or an attached Strange Part (any combination of
 * Kills/Dominations/Damage Dealt/etc, each independently priced — see
 * strangeParts on BackpackTfItem). Paint/sheen/killstreaker are NOT
 * excluded here; they're folded into the SKU itself so matching variants
 * still compare correctly against each other. The item's own built-in
 * kill counter (killEaters) is NOT excluded — every Strange item has one
 * and it's already captured by quality alone.
 */
export function isTrackableVariant(item: BackpackTfItem): boolean {
  if (item.customName) return false;
  if (item.spells && item.spells.length > 0) return false;
  if (item.strangeParts && item.strangeParts.length > 0) return false;
  return true;
}

/**
 * False for a BUY listing on a killstreak-tier weapon (Killstreak /
 * Specialized Killstreak / Professional Killstreak). Buy orders on these
 * are routinely posted well above anything the market will actually pay —
 * vanity/troll listings rather than real intent to buy — and because
 * killstreakTier folds into item_sku, an inflated killstreak buy order can
 * only ever get compared against a same-tier sell, manufacturing a
 * "profit opportunity" on the dashboard that isn't real. Sell-side
 * killstreak listings are unaffected and still tracked normally.
 */
export function isTrackableBuyOrder(item: BackpackTfItem, intent: "buy" | "sell"): boolean {
  if (intent === "buy" && (item.killstreakTier ?? 0) > 0) return false;
  return true;
}
