/**
 * worker/src/key-price.ts
 *
 * schema.sql's design notes say prices are normalized to a metal equivalent
 * "in the worker, where you have the current key exchange rate in memory."
 * Rather than polling IGetCurrencies/v1 (an extra API key + scheduled HTTP
 * call — against the zero-polling spirit of this project), we derive the
 * key price for free from the same WebSocket stream: Mann Co. Supply Crate
 * Keys are themselves listed for sale in pure metal all the time. We just
 * read the current best (lowest) metal-priced sell listing for keys out of
 * the same OrderBook we're already maintaining.
 */

import type { BackpackTfCurrencies, BackpackTfItem } from "@tf2-arb/shared";
import { buildItemSku } from "@tf2-arb/shared";
import type { OrderBook } from "./order-book";

const KEY_ITEM: BackpackTfItem = {
  name: "Mann Co. Supply Crate Key",
  quality: 6,
  quality_name: "Unique",
  killstreak_tier: 0,
  australium: false,
  craftable: true,
  tradable: true,
};

export const KEY_SKU = buildItemSku(KEY_ITEM);

/**
 * Converts a listing's currencies into a single metal-equivalent number.
 * Returns null if the listing can't be priced yet — either because it's
 * priced in keys and we haven't seen a metal-priced key listing yet, or
 * because it's a USD-only listing (e.g. from marketplace.tf) with no
 * metal/keys currency to work from at all.
 */
export function convertToMetal(
  currencies: BackpackTfCurrencies,
  orderBook: OrderBook,
): number | null {
  const metal = currencies.metal ?? 0;
  const keys = currencies.keys ?? 0;

  if (keys === 0 && metal === 0) {
    // No metal/keys currency at all — likely a USD-only listing. Skip it;
    // we intentionally don't poll for a USD conversion rate.
    return null;
  }

  if (keys === 0) return metal;

  const keyReference = orderBook.getBestSell(KEY_SKU);
  if (!keyReference) return null; // no key price discovered yet — try again later

  return metal + keys * keyReference.priceMetal;
}
