import "dotenv/config";

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function main(): void {
  const databaseUrl = assertEnv("DATABASE_URL");
  const wsUrl = process.env.BACKPACK_TF_WS_URL ?? "wss://ws.backpack.tf/events";

  console.log("[worker] booting");
  console.log(`[worker] will connect to ${wsUrl}`);
  console.log(`[worker] database configured: ${databaseUrl ? "yes" : "no"}`);

  // TODO: ws-listener.ts — open the backpack.tf socket
  // TODO: orderbook.ts   — track best bid/ask per item_sku in memory
  // TODO: db-upsert.ts   — throttled UPSERT when bid > ask
}

main();
