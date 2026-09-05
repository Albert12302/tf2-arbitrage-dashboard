import type { Metadata } from "next";
// Next.js processes this global stylesheet; TypeScript has no CSS module declaration here.
// @ts-expect-error -- global CSS is supported by Next.js at build time.
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "TF2 Arbitrage Dashboard",
  description: "Real-time arbitrage windows across the backpack.tf market",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" className={cn("font-sans")}>
      <body className="bg-black text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
