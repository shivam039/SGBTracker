import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SwRegister } from "@/components/SwRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "SGB Tracker",
  description: "Sovereign Gold Bond secondary-market tracker and value ranking",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14181f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SwRegister />
        <header className="border-b" style={{ background: "var(--surface)" }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm"
                style={{ background: "var(--accent)", color: "#1a1305" }}
              >
                ⓢ
              </span>
              SGB Tracker
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/alerts">Alerts</NavLink>
              <NavLink href="/methodology">Methodology</NavLink>
              <NavLink href="/admin">Admin</NavLink>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">{children}</main>
        <footer className="border-t text-xs py-4 px-6" style={{ color: "var(--muted)" }}>
          Educational tool, not investment advice. Prices may be simulated sample data — always
          check the data-freshness banner before acting on any figure shown here.
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
    >
      {children}
    </Link>
  );
}
