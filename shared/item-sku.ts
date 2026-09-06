/**
 * shared/item-sku.ts
 *
 * Deterministic item_sku builder.
 */

import type { BackpackTfItem } from "./backpack-payload";

export function buildItemSku(item: BackpackTfItem): string {
  const parts = [
    item.name,
    `q${item.quality.id}`,
    item.australium ? "aus" : "std",
    `ks${item.killstreakTier ?? 0}`,
    item.particle ? `pe${item.particle.id}` : "pe0",
    item.craftable ? "craft" : "nocraft",
    item.paint ? `pt${item.paint.id}` : "pt0",
    item.sheen ? `sh${item.sheen.id}` : "sh0",
    item.killstreaker ? `kr${item.killstreaker.id}` : "kr0",
  ];
  return parts.join("::");
}
