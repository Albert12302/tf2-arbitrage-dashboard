import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />;
}

const SKELETON_ROWS = 8;

export default function Loading(): React.ReactElement {
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
          Loading...
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {["Best Opportunity", "Active Opportunities", "Average Profit %"].map((label) => (
          <Card key={label} className="rounded-md">
            <CardHeader className="pb-0">
              <span className="text-xs tracking-wider text-muted-foreground uppercase">{label}</span>
            </CardHeader>
            <CardContent>
              <Shimmer className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs tracking-wider text-muted-foreground uppercase">Item</TableHead>
              <TableHead className="text-right text-xs tracking-wider text-muted-foreground uppercase">Highest Buy</TableHead>
              <TableHead className="text-right text-xs tracking-wider text-muted-foreground uppercase">Lowest Sell</TableHead>
              <TableHead className="text-right text-xs tracking-wider text-muted-foreground uppercase">Profit</TableHead>
              <TableHead className="text-right text-xs tracking-wider text-muted-foreground uppercase">Profit %</TableHead>
              <TableHead className="text-right text-xs tracking-wider text-muted-foreground uppercase">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <Shimmer className="h-4 w-40" />
                    <Shimmer className="h-4 w-16" />
                  </div>
                </TableCell>
                <TableCell className="text-right"><Shimmer className="ml-auto h-4 w-16" /></TableCell>
                <TableCell className="text-right"><Shimmer className="ml-auto h-4 w-16" /></TableCell>
                <TableCell className="text-right"><Shimmer className="ml-auto h-4 w-14" /></TableCell>
                <TableCell className="text-right"><Shimmer className="ml-auto h-4 w-12" /></TableCell>
                <TableCell className="text-right"><Shimmer className="ml-auto h-4 w-12" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
