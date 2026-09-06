import "dotenv/config";
import type {
  BackpackTfListingEvent,
  BackpackTfSocketMessage,
  NormalizedListing,
} from "@tf2-arb/shared";
import { buildItemSku, isTrackableVariant } from "@tf2-arb/shared";
import { connectBackpackSocket } from "./backpack-socket";
import { OrderBook } from "./order-book";
import { convertToMetal } from "./key-price";
import { DealsRepository } from "./db";

// Was 8h — tightened after a stale sell listing (its bot had gone offline, no
// listing-delete ever arrived) sat in the order book long enough to produce a
// double-digit-percent phantom "opportunity" against a real, current buy order.
// Shorter TTL narrows that ghost-listing exposure window; the tradeoff is a
// genuinely live but quiet listing can now get pruned and briefly vanish from
// the table until its next event. See OrderBook.pruneStale for the full tradeoff.
const MAX_LISTING_AGE_MS = 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 15 * 60 * 1000;

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function normalizeListing(
  payload: BackpackTfListingEvent,
  priceMetal: number
): NormalizedListing {
  return {
    listingId: payload.id,
    steamId: payload.steamid,
    intent: payload.intent,
    itemSku: buildItemSku(payload.item),
    itemName: payload.item.name,
    quality: payload.item.quality.id,
    qualityName: payload.item.quality.name,
    isAustralium: payload.item.australium ?? false,
    killstreakTier: payload.item.killstreakTier ?? 0,
    particleEffect: payload.item.particle?.name ?? null,
    priceMetal,
    currencies: payload.currencies,
    lastSeenAt: Date.now(),
  };
}

async function reconcileSku(
  sku: string,
  orderBook: OrderBook,
  deals: DealsRepository
): Promise<void> {
  const bestBuy = orderBook.getBestBuy(sku);
  const bestSell = orderBook.getBestSell(sku);

  if (!bestBuy || !bestSell) {
    await deals.deleteIfPresent(sku);
    return;
  }

  // Each listing's own priceMetal was baked in whenever ITS event arrived,
  // against whatever the tracked key rate was at that instant — which can be
  // hours apart for the buy side vs. the sell side. Two listings priced
  // identically in keys (e.g. both "12.03 keys") can end up with different
  // priceMetal purely from rate drift between those two moments, which reads
  // as a profitable spread that doesn't actually exist. Re-converting both
  // sides right here, back-to-back, means they both go through the exact
  // same rate snapshot — identically-keyed listings now correctly compare
  // as equal instead of manufacturing a phantom opportunity.
  const buyMetal = convertToMetal(bestBuy.currencies, orderBook);
  const sellMetal = convertToMetal(bestSell.currencies, orderBook);
  const isProfitable = buyMetal !== null && sellMetal !== null && buyMetal > sellMetal;

  if (!isProfitable || buyMetal === null || sellMetal === null) {
    await deals.deleteIfPresent(sku);
    return;
  }

  await deals.upsert({
    item_sku: sku,
    item_name: bestBuy.itemName,
    quality: bestBuy.quality,
    quality_name: bestBuy.qualityName,
    is_australium: bestBuy.isAustralium,
    killstreak_tier: bestBuy.killstreakTier,
    particle_effect: bestBuy.particleEffect,
    highest_buy_metal: buyMetal,
    highest_buy_listing_id: bestBuy.listingId,
    highest_buy_steamid: bestBuy.steamId,
    lowest_sell_metal: sellMetal,
    lowest_sell_listing_id: bestSell.listingId,
    lowest_sell_steamid: bestSell.steamId,
  });
}

async function main(): Promise<void> {
  const databaseUrl = assertEnv("DATABASE_URL");
  const wsUrl = process.env.BACKPACK_TF_WS_URL ?? "wss://ws.backpack.tf/events";

  const orderBook = new OrderBook();
  const deals = new DealsRepository(databaseUrl);
  await deals.init();

  console.log("[worker] booting");
  console.log(`[worker] will connect to ${wsUrl}`);

  connectBackpackSocket(wsUrl, (message: BackpackTfSocketMessage) => {
    handleMessage(message, orderBook, deals).catch((err) => {
      console.error("[worker] failed to handle message", err);
    });
  });

  setInterval(() => {
    const affectedSkus = orderBook.pruneStale(MAX_LISTING_AGE_MS);
    for (const sku of affectedSkus) {
      reconcileSku(sku, orderBook, deals).catch((err) => {
        console.error("[worker] failed to reconcile after pruning stale listings", err);
      });
    }
  }, PRUNE_INTERVAL_MS);

  process.on("SIGTERM", async () => {
    console.log("[worker] shutting down");
    await deals.close();
    process.exit(0);
  });
}

async function handleMessage(
  message: BackpackTfSocketMessage,
  orderBook: OrderBook,
  deals: DealsRepository
): Promise<void> {
  if (message.event === "listing-update") {
    const payload = message.payload;
    if (!isTrackableVariant(payload.item)) return; // name tag/spells/extra strange parts — doesn't fold into item_sku

    const priceMetal = convertToMetal(payload.currencies, orderBook);
    if (priceMetal === null) return; // can't price yet (USD-only, or no key rate discovered)

    const listing = normalizeListing(payload, priceMetal);
    orderBook.upsertListing(listing);
    await reconcileSku(listing.itemSku, orderBook, deals);
    return;
  }

  if (message.event === "listing-delete") {
    const payload = message.payload;
    const affectedSku = orderBook.removeListing(payload.id);
    if (affectedSku) {
      await reconcileSku(affectedSku, orderBook, deals);
    }
  }
}

main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});
