import type { BackpackTFItem } from "./types/backpack-events";

/**
 * The fields that make two TF2 items "the same tradable variant" for
 * arbitrage purposes. Two listings only compete against each other (i.e.
 * can form a bid/ask spread) if their identities match exactly.
 */
export interface ItemIdentity {
  defindex: number;
  qualityId: number;
  craftable: boolean;
  australium: boolean;
  killstreakTier: number;
  /** Unusual effect id, or null if not Unusual */
  particleId: number | null;
}

/**
 * Extracts a normalized identity from a raw backpack.tf item payload.
 * Throws if the item is missing the minimum fields needed to identify it
 * (this should be rare, but we never want a malformed item silently
 * merging into the wrong SKU bucket).
 */
export function getItemIdentity(item: BackpackTFItem): ItemIdentity {
  if (item.defindex === undefined) {
    throw new Error(`Listing item ${item.id} is missing defindex`);
  }
  if (item.quality === undefined) {
    throw new Error(`Listing item ${item.id} is missing quality`);
  }

  return {
    defindex: item.defindex,
    qualityId: item.quality.id,
    craftable: item.craftable ?? true,
    australium: item.australium ?? false,
    killstreakTier: item.killstreakTier ?? 0,
    particleId: item.particle?.id ?? null,
  };
}

/**
 * Builds a stable, human-inspectable primary key string for the `deals`
 * table from an item identity. Same shape as the classic TF2 "SKU" format,
 * extended with the fields this project cares about.
 *
 * Example: "5021-6-1-0-0-0" -> Tour of Duty Ticket, Unique, craftable,
 * not australium, no killstreak, no unusual effect.
 */
export function buildSkuKey(identity: ItemIdentity): string {
  return [
    identity.defindex,
    identity.qualityId,
    identity.craftable ? 1 : 0,
    identity.australium ? 1 : 0,
    identity.killstreakTier,
    identity.particleId ?? 0,
  ].join("-");
}
