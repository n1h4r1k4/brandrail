import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });
const mono = JetBrains_Mono({ variable: "--font-jbmono", subsets: ["latin"], weight: ["500"] });

export const metadata: Metadata = {
  title: "Brandrail: guardrails, not gatekeepers",
  description:
    "Pre-publication brand governance: every flag cites an approved rule or fact, every fix keeps the creator's intent, and people make the final call.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
