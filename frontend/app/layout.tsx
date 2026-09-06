import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Merriweather } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-merriweather" });

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
    <html
      lang="en"
      className={cn("dark font-sans", inter.variable, jetbrainsMono.variable, merriweather.variable)}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
