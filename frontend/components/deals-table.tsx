"use client";

import { useMemo, useState } from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import type { DealRow } from "@tf2-arb/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatMetal,
  formatRelativeTime,
  profitTone,
  itemLabel,
  qualityBadgeClass,
  bptfItemUrl,
} from "@/lib/tf2-display";

const PAGE_SIZES = [10, 25, 50] as const;

type SortKey = "highest_buy_metal" | "lowest_sell_metal" | "profit_margin_metal" | "profit_margin_pct";
type SortState = { key: SortKey; dir: "asc" | "desc" };

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <TableHead className="text-right text-xs tracking-wider text-muted-foreground uppercase">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
      >
        {label}
        {active ? (
          sort.dir === "desc" ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />
        ) : (
          <ChevronsUpDown className="size-4 text-muted-foreground/70" />
        )}
      </button>
    </TableHead>
  );
}

export function DealsTable({ deals, now }: { deals: DealRow[]; now: number }) {
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: "profit_margin_metal", dir: "desc" });

  const sortedDeals = useMemo(() => {
    const sorted = [...deals].sort((a, b) => {
      const diff = Number(a[sort.key]) - Number(b[sort.key]);
      return sort.dir === "asc" ? diff : -diff;
    });
    return sorted;
  }, [deals, sort]);

  function handleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
    setPage(1);
  }

  if (deals.length === 0) {
    return (
      <section className="rounded-md border border-border bg-card">
        <div className="p-10 text-center text-sm text-muted-foreground">
          No profitable opportunities right now.
        </div>
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(deals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = sortedDeals.slice(start, start + pageSize);
  const atFirstPage = currentPage <= 1;
  const atLastPage = currentPage >= totalPages;

  return (
    <section className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs tracking-wider text-muted-foreground uppercase">
              Item
            </TableHead>
            <SortableHead label="Highest Buy" sortKey="highest_buy_metal" sort={sort} onSort={handleSort} />
            <SortableHead label="Lowest Sell" sortKey="lowest_sell_metal" sort={sort} onSort={handleSort} />
            <SortableHead label="Profit" sortKey="profit_margin_metal" sort={sort} onSort={handleSort} />
            <SortableHead label="Profit %" sortKey="profit_margin_pct" sort={sort} onSort={handleSort} />
            <TableHead className="text-right text-xs tracking-wider text-muted-foreground uppercase">
              Updated
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((deal) => (
            <TableRow key={deal.item_sku}>
              <TableCell>
                <div className="flex flex-col gap-1 whitespace-normal">
                  <a
                    href={bptfItemUrl(deal)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground hover:underline"
                  >
                    {itemLabel(deal)}
                  </a>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", qualityBadgeClass(deal.quality_name))}
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
              <TableCell className="text-right font-mono tabular-nums text-foreground/80">
                {formatMetal(Number(deal.highest_buy_metal))}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-foreground/80">
                {formatMetal(Number(deal.lowest_sell_metal))}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-foreground">
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
              <TableCell className="text-right text-xs text-muted-foreground">
                {formatRelativeTime(deal.last_seen_at, now)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-3 py-2.5 sm:flex-row">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="mr-1 tracking-wider uppercase">Rows</span>
          {PAGE_SIZES.map((size) => (
            <Button
              key={size}
              type="button"
              variant={size === pageSize ? "secondary" : "ghost"}
              size="xs"
              className="font-mono tabular-nums"
              onClick={() => {
                setPageSize(size);
                setPage(1);
              }}
            >
              {size}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            {start + 1}–{Math.min(start + pageSize, deals.length)} of {deals.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="bg-muted text-foreground hover:bg-muted/70"
              aria-label="First page"
              disabled={atFirstPage}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="bg-muted text-foreground hover:bg-muted/70"
              aria-label="Previous page"
              disabled={atFirstPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="bg-muted text-foreground hover:bg-muted/70"
              aria-label="Next page"
              disabled={atLastPage}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="bg-muted text-foreground hover:bg-muted/70"
              aria-label="Last page"
              disabled={atLastPage}
              onClick={() => setPage(totalPages)}
            >
              <ChevronsRight className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
