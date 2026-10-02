"use client";

import Link from "next/link";
import { ThemeToggle } from "@testpulse/ui";
import { useTheme } from "../providers/ThemeProvider";

export function AuthHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-bold text-lg text-surface-foreground hover:opacity-90 transition-opacity"
      >
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm font-black text-sm tracking-wider">
          TP
        </div>
        <span>TestPulse</span>
      </Link>
      <ThemeToggle theme={theme} setTheme={setTheme} />
    </header>
  );
}
