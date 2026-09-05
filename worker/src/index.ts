import "dotenv/config";
import type {
  BackpackTfListingEvent,
  BackpackTfListingDeleteEvent,
  BackpackTfSocketMessage,
  NormalizedListing,
} from "@tf2-arb/shared";
import { buildItemSku } from "@tf2-arb/shared";
import { connectBackpackSocket } from "./backpack-socket";
import { OrderBook } from "./order-book";
import { convertToMetal } from "./key-price";
import { DealsRepository } from "./db";

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
    quality: payload.item.quality,
    qualityName: payload.item.quality_name,
    isAustralium: payload.item.australium,
    killstreakTier: payload.item.killstreak_tier,
    particleEffect: payload.item.particle?.name ?? null,
    priceMetal,
  };
}

async function reconcileSku(
  sku: string,
  orderBook: OrderBook,
  deals: DealsRepository
): Promise<void> {
  const bestBuy = orderBook.getBestBuy(sku);
  const bestSell = orderBook.getBestSell(sku);

  const isProfitable =
    bestBuy !== null && bestSell !== null && bestBuy.priceMetal > bestSell.priceMetal;

  if (!isProfitable || !bestBuy || !bestSell) {
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
    highest_buy_metal: bestBuy.priceMetal,
    highest_buy_listing_id: bestBuy.listingId,
    highest_buy_steamid: bestBuy.steamId,
    lowest_sell_metal: bestSell.priceMetal,
    lowest_sell_listing_id: bestSell.listingId,
    lowest_sell_steamid: bestSell.steamId,
  });
}

async function main(): Promise<void> {
  const databaseUrl = assertEnv("DATABASE_URL");
  const wsUrl = process.env.BACKPACK_TF_WS_URL ?? "wss://ws.backpack.tf/events";

  const orderBook = new OrderBook();
  const deals = new DealsRepository(databaseUrl);

  console.log("[worker] booting");
  console.log(`[worker] will connect to ${wsUrl}`);

  connectBackpackSocket(wsUrl, (message: BackpackTfSocketMessage) => {
    void handleMessage(message, orderBook, deals);
  });

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
    const payload = message.payload as BackpackTfListingEvent;
    const priceMetal = convertToMetal(payload.currencies, orderBook);
    if (priceMetal === null) return; // can't price yet (USD-only, or no key rate discovered)

    const listing = normalizeListing(payload, priceMetal);
    orderBook.upsertListing(listing);
    await reconcileSku(listing.itemSku, orderBook, deals);
    return;
  }

  if (message.event === "listing-delete") {
    const payload = message.payload as BackpackTfListingDeleteEvent;
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
