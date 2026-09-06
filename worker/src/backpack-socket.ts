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
// backpack.tf's feed is a constant firehose across all of TF2 — total
// silence this long means the connection has gone dead without ever
// sending a close frame (observed: TCP stays ESTABLISHED, no errors, no
// messages), so `ws`'s "close" event never fires and we'd sit there
// forever. Force-close and reconnect instead of waiting for one.
const IDLE_TIMEOUT_MS = 90_000;
const IDLE_CHECK_INTERVAL_MS = 15_000;

export function connectBackpackSocket(
  url: string,
  onMessage: (message: BackpackTfSocketMessage) => void
): void {
  let backoffMs = 1_000;

  function connect(): void {
    const ws = new WebSocket(url, undefined, {
      headers: { "batch-test": "true" },
    });

    let lastMessageAt = Date.now();
    const idleCheck = setInterval(() => {
      if (Date.now() - lastMessageAt > IDLE_TIMEOUT_MS) {
        console.warn(
          `[worker] websocket idle for over ${IDLE_TIMEOUT_MS}ms, terminating stale connection`
        );
        ws.terminate();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    ws.on("open", () => {
      console.log("[worker] websocket connected");
      backoffMs = 1_000; // reset backoff on a clean connect
      lastMessageAt = Date.now();
    });

    ws.on("message", (raw) => {
      lastMessageAt = Date.now();
      // JSON.parse hands back `any` — this is genuinely untrusted external
      // input, so the raw shape is only assumed to have an `event` string;
      // everything past that is validated below before we trust it as a
      // BackpackTfSocketMessage.
      let events: Array<{ event: string; payload: unknown }>;
      try {
        events = JSON.parse(raw.toString());
      } catch (err) {
        console.error("[worker] failed to parse socket message", err);
        return;
      }

      for (const event of events) {
        if (event.event === "listing-update" || event.event === "listing-delete") {
          onMessage(event as BackpackTfSocketMessage);
        } else {
          console.warn("[worker] unhandled socket event", event.event, event.payload);
        }
      }
    });

    ws.on("unexpected-response", (_req, res) => {
      console.error(
        `[worker] websocket handshake rejected: HTTP ${res.statusCode}`,
        res.headers
      );
    });

    ws.on("close", (code, reason) => {
      clearInterval(idleCheck);
      console.warn(
        `[worker] websocket closed (code ${code}, reason "${reason.toString() || "none"}"), reconnecting in ${backoffMs}ms`
      );
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
