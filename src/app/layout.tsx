import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Lumina — HD to 4K HDR Photo Lab",
  description:
    "Upload as many photos as you want and upscale them from 1080p HD to cinematic 4K HDR with local-contrast grading.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${fraunces.variable} bg-ink antialiased`}>{children}</body>
    </html>
  );
}
