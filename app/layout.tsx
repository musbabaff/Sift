import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Link from 'next/link';

import { NavTabs } from "@/components/nav-tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageProvider } from "@/components/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { CorpusMeta } from "@/components/corpus-meta";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Sift — AI News Intelligence",
  description: "Sift the signal from the noise. Multilingual semantic + keyword hybrid news intelligence search.",
  icons: {
    icon: "/icon.svg",
  },
};

// SiftMark Shared Logo Icon
function SiftMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="sift-mark">
      <g stroke="currentColor" strokeLinecap="round">
        <line x1="6" y1="9" x2="26" y2="9" strokeWidth="2.4" />
        <line x1="6" y1="14" x2="26" y2="14" strokeWidth="1.8" />
        <line x1="6" y1="19" x2="26" y2="19" strokeWidth="1.3" />
        <line x1="6" y1="24" x2="26" y2="24" strokeWidth="0.8" />
      </g>
      <circle cx="22" cy="28" r="2" fill="var(--accent)" />
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {/* Premium Top Navigation Header */}
          <header className="topnav">
            <div className="topnav-inner">
              <Link href="/" className="brand">
                <SiftMark />
                <span className="brand-name">Sift</span>
              </Link>
              <NavTabs />
              <div className="topnav-right">
                <CorpusMeta />
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Core Page Render */}
          <div className="page flex-1 flex flex-col">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
