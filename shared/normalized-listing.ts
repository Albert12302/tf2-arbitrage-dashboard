/**
 * shared/normalized-listing.ts
 *
 * Normalized in-memory representations (worker-internal, pre-DB).
 */

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
