import type { DealRow } from "@tf2-arb/shared";
import { WEAPON_DEFINDEX, FABRICATOR_TIER_CODE } from "./weapon-defindex";

export function formatMetal(value: number): string {
  return `${value.toFixed(2)} ref`;
}

export function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

/** Tailwind classes for a profit-% tier — the core "read the spread at a glance" signal. */
export function profitTone(pct: number): string {
  if (pct >= 20) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (pct >= 10) return "border-green-500/30 bg-green-500/10 text-green-400";
  if (pct >= 5) return "border-lime-500/30 bg-lime-500/10 text-lime-400";
  return "border-zinc-700 bg-zinc-500/10 text-zinc-400";
}

export function itemLabel(deal: DealRow): string {
  return deal.is_australium ? `Australium ${deal.item_name}` : deal.item_name;
}

// Official quality colors per https://wiki.teamfortress.com/wiki/Quality
export const QUALITY_COLORS: Record<string, string> = {
  Normal: "#B2B2B2",
  Unique: "#FFD700",
  Vintage: "#476291",
  Genuine: "#4D7455",
  Strange: "#CF6A32",
  Unusual: "#8650AC",
  Haunted: "#38F3AB",
  "Collector's": "#AA0000",
  Decorated: "#FAFAFA",
  Community: "#70B04A",
  "Self-Made": "#70B04A",
  Valve: "#A50F79",
};

export function qualityColor(qualityName: string): string {
  return QUALITY_COLORS[qualityName] ?? QUALITY_COLORS.Normal;
}

const KILLSTREAK_NAME_PREFIXES: Record<number, string> = {
  1: "Killstreak ",
  2: "Specialized Killstreak ",
  3: "Professional Killstreak ",
};

/**
 * backpack.tf's item_name bakes in prefixes for quality/killstreak/craftable
 * (e.g. "Strange Killstreak Shotgun"), but the stats page URL wants those as
 * separate path segments and the bare item name on its own. Australium has
 * no dedicated segment in this URL scheme (confirmed working examples never
 * include one), so it deliberately stays in the name rather than being
 * stripped — inferred, not directly confirmed against a real australium URL.
 *
 * Also strips a leading "The " — many TF2 cosmetics have a `proper_name`
 * schema flag that auto-prepends "The " for display only; it's not part of
 * the canonical name backpack.tf's stats page matches against (confirmed:
 * "The Ball-Kicking Boots" 404s, "Ball-Kicking Boots" works).
 *
 * A trailing "#<n>" (numbered crate/case series, e.g. "...Case #105") is
 * also stripped here — it isn't part of the name on the stats page, it's a
 * separate trailing path segment (confirmed: ".../Cosmetic Case/Tradable/
 * Non-Craftable/105", not "...Case%20%23105/...").
 *
 * Killstreak Kits and Kit Fabricators are a special case: backpack.tf
 * doesn't give each weapon its own page at all — every weapon's kit
 * collapses into one generic per-tier catalog page (e.g. "Professional
 * Killstreak Panic Attack Kit" lives under "Professional Killstreak Kit"),
 * with the specific weapon selected via a numeric defindex trailing the
 * URL (confirmed: Panic Attack Kit -> ".../3-199"-style pair for Kits,
 * ".../6526-6-1153"-style triple for Fabricators — see weapon-defindex.ts).
 * When the weapon isn't in that lookup (or it's a Fabricator tier we
 * haven't confirmed the tier code for), we fall back to the generic
 * tier-wide page rather than guessing.
 */
function statsPageItemName(deal: DealRow): { name: string; seriesNumber: string | null } {
  let name = deal.item_name;
  if (name.startsWith("Non-Craftable ")) name = name.slice("Non-Craftable ".length);
  const qualityPrefix = `${deal.quality_name} `;
  if (name.startsWith(qualityPrefix)) name = name.slice(qualityPrefix.length);
  const killstreakPrefix = KILLSTREAK_NAME_PREFIXES[deal.killstreak_tier];

  if (killstreakPrefix && name.startsWith(killstreakPrefix)) {
    if (name.endsWith(" Kit Fabricator")) {
      const weapon = name.slice(killstreakPrefix.length, -" Kit Fabricator".length);
      const defindex = WEAPON_DEFINDEX[weapon];
      const tierCode = FABRICATOR_TIER_CODE[deal.killstreak_tier];
      const seriesNumber = defindex !== undefined && tierCode !== undefined ? `${tierCode}-6-${defindex}` : null;
      return { name: `${killstreakPrefix}Fabricator`, seriesNumber };
    }
    if (name.endsWith(" Kit")) {
      const weapon = name.slice(killstreakPrefix.length, -" Kit".length);
      const defindex = WEAPON_DEFINDEX[weapon];
      const seriesNumber = defindex !== undefined ? `${deal.killstreak_tier}-${defindex}` : null;
      return { name: `${killstreakPrefix}Kit`, seriesNumber };
    }
    name = name.slice(killstreakPrefix.length);
  }
  if (name.startsWith("The ")) name = name.slice("The ".length);

  const seriesMatch = name.match(/^(.*) #(\d+)$/);
  if (seriesMatch) return { name: seriesMatch[1], seriesNumber: seriesMatch[2] };
  return { name, seriesNumber: null };
}

/**
 * Links to backpack.tf's item stats page — confirmed format (real examples):
 *   /stats/Unique/Name%20Tag/Tradable/Craftable
 *   /stats/Unusual/Shadow%20of%20Doubt/Tradable/Craftable/17  (trailing id = particle effect)
 *   /stats/Unique/Unlocked%20Winter%202016%20Cosmetic%20Case/Tradable/Non-Craftable/105  (trailing id = crate series #)
 * We don't persist the particle effect's numeric id (only its name), so
 * Unusual links omit that optional last segment — matches all listings for
 * the base item rather than the exact effect.
 */
export function bptfItemUrl(deal: DealRow): string {
  const craftable = deal.item_name.startsWith("Non-Craftable ") ? "Non-Craftable" : "Craftable";
  const quality = encodeURIComponent(deal.quality_name);
  const { name, seriesNumber } = statsPageItemName(deal);
  const item = encodeURIComponent(name);
  const base = `https://backpack.tf/stats/${quality}/${item}/Tradable/${craftable}`;
  return seriesNumber ? `${base}/${seriesNumber}` : base;
}
