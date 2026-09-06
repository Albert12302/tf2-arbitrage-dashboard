import type { DealRow } from "@tf2-arb/shared";
import { WEAPON_DEFINDEX, FABRICATOR_TIER_CODE } from "./weapon-defindex";
import { UNUSUAL_EFFECT_ID } from "./unusual-effect-id";

export function formatMetal(value: number): string {
  return `${value.toFixed(2)} ref`;
}

// `now` is a required, explicit reference point (not Date.now() internally) so a
// value computed during SSR and hydrated into a Client Component (DealsTable)
// reproduces the exact same string on both sides — otherwise the client would
// recompute against a later Date.now() and React would throw a hydration
// mismatch error the moment a second boundary ticks over between the two.
export function formatRelativeTime(iso: string, now: number): string {
  const diffSec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
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

// Tailwind's build-time scanner only picks up class names it can see as literal
// text, so these can't be derived from QUALITY_COLORS via template strings — an
// inline style="" attribute would work at runtime but can never satisfy a
// nonce-based CSP (nonces only cover <style> elements, not the style attribute).
// Keep in sync with QUALITY_COLORS above if TF2 ever adds a quality.
//
// Six of these twelve official colors measure well below WCAG's 4.5:1 text
// contrast minimum against this app's dark background (#090a0b) — they were
// designed for Valve's own UI, not this one. Those six are lightened here
// (same hue, raised HSL lightness, computed to land at ~7:1 against #090a0b
// for extra margin at this badge's 10px size) so the quality is still
// instantly recognizable by color but actually readable:
//   Vintage #476291->#849BC3 (3.23->7.04)  Genuine #4D7455->#77A580 (3.72->7.06)
//   Strange #CF6A32->#D88658 (5.44->7.05)  Unusual #8650AC->#B08CC9 (3.54->7.02)
//   Collector's #AA0000->#FF6868 (2.56->7.01)  Valve #A50F79->#F165C8 (2.78->7.02)
// The other six (Normal/Unique/Haunted/Decorated/Community/Self-Made) already
// clear 7:1+ unmodified.
const QUALITY_BADGE_CLASSES: Record<string, string> = {
  Normal: "border-[#B2B2B2] text-[#B2B2B2]",
  Unique: "border-[#FFD700] text-[#FFD700]",
  Vintage: "border-[#849BC3] text-[#849BC3]",
  Genuine: "border-[#77A580] text-[#77A580]",
  Strange: "border-[#D88658] text-[#D88658]",
  Unusual: "border-[#B08CC9] text-[#B08CC9]",
  Haunted: "border-[#38F3AB] text-[#38F3AB]",
  "Collector's": "border-[#FF6868] text-[#FF6868]",
  Decorated: "border-[#FAFAFA] text-[#FAFAFA]",
  Community: "border-[#70B04A] text-[#70B04A]",
  "Self-Made": "border-[#70B04A] text-[#70B04A]",
  Valve: "border-[#F165C8] text-[#F165C8]",
};

export function qualityBadgeClass(qualityName: string): string {
  return QUALITY_BADGE_CLASSES[qualityName] ?? QUALITY_BADGE_CLASSES.Normal;
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

  // Weapon cases holding a War Paint skin have a genuinely two-line name in
  // TF2's own item schema — e.g. "'Pattern' War Paint\nGrade Keyless Case
  // #114" — and backpack.tf's stats-page URL expects that literal newline
  // (%0A), not a collapsed space (confirmed against a real working URL:
  // ".../War%20Paint%0ACivilian%20Grade%20Keyless%20Case/.../114"). Normalize
  // deterministically here rather than trust that whitespace survives the
  // websocket/JSON round-trip from backpack.tf unchanged.
  const warPaintMatch = name.match(/^(.*War Paint)\s+(\S[\s\S]*)$/);
  if (warPaintMatch) name = `${warPaintMatch[1]}\n${warPaintMatch[2]}`;

  // [\s\S] instead of "." — "." never matches a newline, so without this the
  // regex silently fails to match at all for the two-line names above, and
  // the trailing "#114" never gets split into its own path segment.
  const seriesMatch = name.match(/^([\s\S]*) #(\d+)$/);
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
 *
 * Decorated Weapons (War Paint skins) have the same gap for a different id:
 * their real stats URL takes a trailing paint-kit id (e.g. ".../Mannana
 * Peeled%20%7C%20Minigun%20(Well-Worn)/Tradable/Craftable/703"), which we
 * don't capture either — item.paint.id is only folded into item_sku for
 * matching, never persisted to the deals table. Confirmed by loading the
 * no-suffix link directly: it resolves to a real page (no 404), just without
 * that pattern narrowed down — same tradeoff as the Unusual case above.
 */
export function bptfItemUrl(deal: DealRow): string {
  const craftable = deal.item_name.startsWith("Non-Craftable ") ? "Non-Craftable" : "Craftable";
  const quality = encodeURIComponent(deal.quality_name);
  const { name, seriesNumber } = statsPageItemName(deal);
  const item = encodeURIComponent(name);
  const base = `https://backpack.tf/stats/${quality}/${item}/Tradable/${craftable}`;

  // Only ~86% of effect names map to exactly one id (see unusual-effect-id.ts
  // for why the rest are deliberately omitted) — a lookup miss here just
  // falls through to the safe base link, not a wrong one.
  const effectId = deal.particle_effect ? UNUSUAL_EFFECT_ID[deal.particle_effect] : undefined;
  const trailingId = seriesNumber ?? (effectId !== undefined ? String(effectId) : null);
  return trailingId ? `${base}/${trailingId}` : base;
}
