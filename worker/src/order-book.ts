/**
 * worker/src/order-book.ts
 *
 * Tracks every active listing per item SKU, split by intent (buy/sell).
 *
 * Why not just track "current best buy" and "current best sell"?
 * Because backpack.tf's `listing-delete` event only tells you a listing ID
 * was removed — not the item it belonged to, and not what the new best
 * price is. If you only remembered the winner, deleting it would leave you
 * with no fallback. Keeping the full per-SKU set (small in practice — most
 * items have at most dozens of active listings) lets us always recompute
 * the correct best-of after any single listing changes or disappears.
 */

import type { NormalizedListing } from "@tf2-arb/shared";

interface ListingLocation {
  sku: string;
  intent: "buy" | "sell";
}

export class OrderBook {
  private buys = new Map<string, Map<string, NormalizedListing>>();
  private sells = new Map<string, Map<string, NormalizedListing>>();
  private listingIndex = new Map<string, ListingLocation>();

  /** Adds or replaces a listing. Safe to call repeatedly for the same listingId. */
  upsertListing(listing: NormalizedListing): void {
    this.removeListing(listing.listingId);

    const book = listing.intent === "buy" ? this.buys : this.sells;
    let bySku = book.get(listing.itemSku);
    if (!bySku) {
      bySku = new Map();
      book.set(listing.itemSku, bySku);
    }
    bySku.set(listing.listingId, listing);
    this.listingIndex.set(listing.listingId, {
      sku: listing.itemSku,
      intent: listing.intent,
    });
  }

  /** Removes a listing by ID. Returns the affected SKU so the caller can
   *  re-evaluate it, or null if the listing wasn't tracked. */
  removeListing(listingId: string): string | null {
    const location = this.listingIndex.get(listingId);
    if (!location) return null;

    const book = location.intent === "buy" ? this.buys : this.sells;
    book.get(location.sku)?.delete(listingId);
    this.listingIndex.delete(listingId);
    return location.sku;
  }

  getBestBuy(sku: string): NormalizedListing | null {
    return this.pickBest(this.buys.get(sku), (a, b) => a.priceMetal > b.priceMetal);
  }

  getBestSell(sku: string): NormalizedListing | null {
    return this.pickBest(this.sells.get(sku), (a, b) => a.priceMetal < b.priceMetal);
  }

  /**
   * Removes listings we haven't received a fresh event for in `maxAgeMs`.
   *
   * backpack.tf only fires listing-update on creation, a price change, or
   * an intent change — a plain "bump" refresh does NOT re-trigger it. So a
   * listing that's silently removed (its bot goes offline, it expires,
   * etc.) can linger here forever with no listing-delete ever arriving.
   * Polling the REST API to reconcile against ground truth is off the
   * table (zero-polling guardrail), so this TTL is the only backstop —
   * accepting the tradeoff that a listing which is still genuinely live
   * but has gone this long without any activity also gets dropped.
   *
   * Returns the affected SKUs so the caller can re-reconcile them.
   */
  pruneStale(maxAgeMs: number): string[] {
    const cutoff = Date.now() - maxAgeMs;
    const affectedSkus = new Set<string>();

    for (const [listingId, location] of this.listingIndex) {
      const book = location.intent === "buy" ? this.buys : this.sells;
      const listing = book.get(location.sku)?.get(listingId);
      if (listing && listing.lastSeenAt < cutoff) {
        this.removeListing(listingId);
        affectedSkus.add(location.sku);
      }
    }

    return [...affectedSkus];
  }

  private pickBest(
    bySku: Map<string, NormalizedListing> | undefined,
    isBetter: (a: NormalizedListing, b: NormalizedListing) => boolean
  ): NormalizedListing | null {
    if (!bySku || bySku.size === 0) return null;
    let best: NormalizedListing | null = null;
    for (const listing of bySku.values()) {
      if (!best || isBetter(listing, best)) best = listing;
    }
    return best;
  }
}
