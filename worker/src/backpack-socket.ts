/**
 * worker/src/backpack-socket.ts
 *
 * Thin wrapper over `ws` for wss://ws.backpack.tf/events. The backpack.tf
 * docs explicitly warn the socket may restart for maintenance at any time,
 * so we reconnect with capped exponential backoff rather than crashing the
 * worker (Render's free worker tier has no auto-restart-on-crash guarantee
 * you can rely on for a tight loop like this).
 */

import WebSocket from "ws";
import type { BackpackTfSocketMessage } from "@tf2-arb/shared";

const MAX_BACKOFF_MS = 30_000;

export function connectBackpackSocket(
  url: string,
  onMessage: (message: BackpackTfSocketMessage) => void
): void {
  let backoffMs = 1_000;

  function connect(): void {
    const ws = new WebSocket(url, undefined, {
      headers: { "batch-test": "true" },
    });

    ws.on("open", () => {
      console.log("[worker] websocket connected");
      backoffMs = 1_000; // reset backoff on a clean connect
    });

    ws.on("message", (raw) => {
      let events: BackpackTfSocketMessage[];
      try {
        events = JSON.parse(raw.toString());
      } catch (err) {
        console.error("[worker] failed to parse socket message", err);
        return;
      }

      for (const event of events) {
        if (event.event === "listing-update" || event.event === "listing-delete") {
          onMessage(event);
        }
        // buffer-limit-exceeded / client-limit-exceeded events are ignored
        // for now — see backpack.tf docs if you need to surface these.
      }
    });

    ws.on("close", () => {
      console.warn(`[worker] websocket closed, reconnecting in ${backoffMs}ms`);
      setTimeout(connect, backoffMs);
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    });

    ws.on("error", (err) => {
      console.error("[worker] websocket error", err);
      ws.close();
    });
  }

  connect();
}
