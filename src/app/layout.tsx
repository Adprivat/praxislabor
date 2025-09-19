import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import { auth } from "@/auth";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Praxislabor Zeiterfassung",
  description: "Arbeitszeiten schnell erfassen und auswerten.",
};

interface NavigationLink {
  href: string;
  label: string;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await auth();
  const displayName = session?.user?.name || session?.user?.email || undefined;
  const role = session?.user?.role;

  const navigation: NavigationLink[] = [];

  if (role === "MANAGER" || role === "ADMIN") {
    navigation.push({ href: "/management/overview", label: "Auswertungen" });
    navigation.push({ href: "/management/team", label: "Team" });
  }

  if (role === "ADMIN") {
    navigation.push({ href: "/admin/catalog", label: "Katalog" });
  }

  navigation.push({ href: "/profile", label: "Profil" });

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-100 antialiased`}
      >
        {session?.user ? (
          <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
              <Link
                href="/"
                className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
              >
                Praxislabor
              </Link>
              <div className="flex items-center gap-4">
                {displayName ? (
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    Angemeldet als {displayName}
                  </span>
                ) : null}
                <nav className="flex items-center gap-2">
                  {navigation.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="rounded-full border border-white/15 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </header>
        ) : null}
        {children}
      </body>
    </html>
  );
}
