import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { BookOpen, MessageSquareHeart } from "lucide-react";
import { FEEDBACK_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#10151b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-line bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
              <BookOpen className="size-5 text-accent" aria-hidden />
              {SITE_NAME}
            </Link>
            <Link href="/leader" className="text-sm font-medium text-muted hover:text-ink">
              For leaders
            </Link>
          </div>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="grid justify-items-center gap-3 border-t border-line px-4 py-8 text-center text-sm text-muted">
          <p>Everyone is welcome. Come as you are.</p>
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-4 font-medium text-ink hover:border-accent/50 hover:bg-accent-soft"
          >
            <MessageSquareHeart className="size-4 text-accent" aria-hidden />
            Have feedback? Tell us
          </a>
        </footer>
        {/* Cookieless page-view counts; only active on Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
