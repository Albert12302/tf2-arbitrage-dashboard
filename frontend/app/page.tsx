import { getTopDeals } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DealsTable } from "@/components/deals-table";
import { cn } from "@/lib/utils";
import {
  formatMetal,
  formatRelativeTime,
  profitTone,
  itemLabel,
  bptfItemUrl,
} from "@/lib/tf2-display";

// This dashboard reflects live order-book state — never statically cache it.
export const dynamic = "force-dynamic";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const deals = await getTopDeals(50);
  const now = Date.now();

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
      <header className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            TF2 ARBITRAGE
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Live spreads across backpack.tf buy/sell orders
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {lastUpdated ? `Updated ${formatRelativeTime(lastUpdated, now)}` : "No data"}
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-md">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs tracking-wider text-muted-foreground uppercase">
              Best Opportunity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {best ? (
              <>
                <CardTitle className="truncate text-base text-foreground">
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
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs tracking-wider text-muted-foreground uppercase">
              Active Opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              {deals.length}
            </CardTitle>
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader className="pb-0">
            <CardDescription className="text-xs tracking-wider text-muted-foreground uppercase">
              Average Profit %
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              {avgProfitPct.toFixed(1)}%
            </CardTitle>
          </CardContent>
        </Card>
      </section>

      <DealsTable deals={deals} now={now} />
    </main>
  );
}
