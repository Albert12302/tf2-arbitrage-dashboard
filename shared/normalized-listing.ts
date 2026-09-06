/**
 * shared/normalized-listing.ts
 *
 * Normalized in-memory representations (worker-internal, pre-DB).
 */

import type { BackpackTfCurrencies } from "./backpack-payload";

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
  /** Metal-equivalent price at the moment this listing's event arrived — good
   *  enough to rank same-side listings against each other, but NOT safe to
   *  compare across buy vs. sell (see reconcileSku in the worker for why). */
  priceMetal: number;
  /** Raw currencies, kept alongside priceMetal so the worker can re-convert
   *  buy and sell through the same key-rate snapshot at comparison time. */
  currencies: BackpackTfCurrencies;
  /** Epoch ms when the worker last received an event for this listing —
   *  used to prune listings that went silent without a listing-delete. */
  lastSeenAt: number;
}

export interface OrderBookSide {
  bestBuy: NormalizedListing | null;
  bestSell: NormalizedListing | null;
}
