import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = { title: "Round Table", description: "Weighted multi-agent idea generator" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="warroom">
      <body className="min-h-screen">
        <nav className="flex items-center gap-4 border-b px-4 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
          <a href="/run" className="font-semibold">Round Table</a>
          <a href="/runs">History</a>
          <a href="/runs/compare">Compare</a>
          <a href="/agents">Seats</a>
          <a href="/profile">Profile</a>
          <a href="/settings">Settings</a>
        </nav>
        <main className="mx-auto max-w-[1200px] p-4"><Providers>{children}</Providers></main>
      </body>
    </html>
  );
}
