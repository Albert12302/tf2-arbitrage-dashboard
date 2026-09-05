import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-black text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
