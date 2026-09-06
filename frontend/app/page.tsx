import { getTopDeals } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatMetal,
  formatRelativeTime,
  profitTone,
  itemLabel,
  qualityColor,
  bptfItemUrl,
} from "@/lib/tf2-display";

// This dashboard reflects live order-book state — never statically cache it.
export const dynamic = "force-dynamic";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const deals = await getTopDeals(50);

  const best = deals[0] ?? null;
  const avgProfitPct =
    deals.length > 0
      ? deals.reduce((sum, d) => sum + Number(d.profit_margin_pct), 0) / deals.length
      : 0;
  const lastUpdated = deals.reduce<string | null>((latest, d) => {
    if (!latest || new Date(d.last_seen_at) > new Date(latest)) return d.last_seen_at;
    return latest;
  }, null);

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-50">
            TF2 ARBITRAGE
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Live spreads across backpack.tf buy/sell orders
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {lastUpdated ? `Updated ${formatRelativeTime(lastUpdated)}` : "No data"}
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-md bg-zinc-950 ring-zinc-800">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs tracking-wider text-zinc-500 uppercase">
              Best Opportunity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {best ? (
              <>
                <CardTitle className="truncate text-base text-zinc-50">
                  <a
                    href={bptfItemUrl(best)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {itemLabel(best)}
                  </a>
                </CardTitle>
                <p
                  className={cn(
                    "mt-2 inline-block rounded border px-1.5 py-0.5 font-mono text-sm font-semibold tabular-nums",
                    profitTone(Number(best.profit_margin_pct))
                  )}
                >
                  +{formatMetal(Number(best.profit_margin_metal))} · {Number(best.profit_margin_pct).toFixed(1)}%
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">No data</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md bg-zinc-950 ring-zinc-800">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs tracking-wider text-zinc-500 uppercase">
              Active Opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="font-mono text-2xl tabular-nums text-zinc-50">
              {deals.length}
            </CardTitle>
          </CardContent>
        </Card>

        <Card className="rounded-md bg-zinc-950 ring-zinc-800">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs tracking-wider text-zinc-500 uppercase">
              Average Profit %
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="font-mono text-2xl tabular-nums text-zinc-50">
              {avgProfitPct.toFixed(1)}%
            </CardTitle>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-md border border-zinc-800 bg-zinc-950">
        {deals.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            No profitable opportunities right now.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-xs tracking-wider text-zinc-500 uppercase">
                  Item
                </TableHead>
                <TableHead className="text-right text-xs tracking-wider text-zinc-500 uppercase">
                  Highest Buy
                </TableHead>
                <TableHead className="text-right text-xs tracking-wider text-zinc-500 uppercase">
                  Lowest Sell
                </TableHead>
                <TableHead className="text-right text-xs tracking-wider text-zinc-500 uppercase">
                  Profit
                </TableHead>
                <TableHead className="text-right text-xs tracking-wider text-zinc-500 uppercase">
                  Profit %
                </TableHead>
                <TableHead className="text-right text-xs tracking-wider text-zinc-500 uppercase">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.item_sku} className="border-zinc-900 hover:bg-zinc-900/50">
                  <TableCell>
                    <div className="flex flex-col gap-1 whitespace-normal">
                      <a
                        href={bptfItemUrl(deal)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zinc-100 hover:underline"
                      >
                        {itemLabel(deal)}
                      </a>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{ borderColor: qualityColor(deal.quality_name), color: qualityColor(deal.quality_name) }}
                        >
                          {deal.quality_name}
                        </Badge>
                        {deal.killstreak_tier > 0 && (
                          <Badge variant="outline" className="border-orange-800 text-[10px] text-orange-400">
                            KS{deal.killstreak_tier}
                          </Badge>
                        )}
                        {deal.particle_effect && (
                          <Badge variant="outline" className="border-purple-800 text-[10px] text-purple-400">
                            {deal.particle_effect}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-zinc-300">
                    {formatMetal(Number(deal.highest_buy_metal))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-zinc-300">
                    {formatMetal(Number(deal.lowest_sell_metal))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-zinc-100">
                    {formatMetal(Number(deal.profit_margin_metal))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={cn("font-mono tabular-nums", profitTone(Number(deal.profit_margin_pct)))}
                    >
                      {Number(deal.profit_margin_pct).toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-zinc-500">
                    {formatRelativeTime(deal.last_seen_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}
