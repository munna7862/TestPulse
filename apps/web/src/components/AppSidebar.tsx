"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, AlertTriangle, BarChart3, Component, PlayCircle, Settings, ShieldAlert, X } from "lucide-react";
import { cn, IconButton } from "@testpulse/ui";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  {
    title: "Test Runs",
    href: "/runs",
    icon: PlayCircle,
  },
  {
    title: "Flaky Tests",
    href: "/flaky",
    icon: AlertTriangle,
    badge: "3",
  },
  {
    title: "Quarantine",
    href: "/quarantine",
    icon: ShieldAlert,
    badge: "1",
  },
  {
    title: "Leaderboards",
    href: "/leaderboards",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const devNavItems: NavItem[] = [
  {
    title: "UI Catalog",
    href: "/dev/ui",
    icon: Component,
  },
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ mobileOpen = false, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2">
          <Link href="/runs" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <span>TestPulse</span>
          </Link>
          {onMobileClose && (
            <IconButton size="sm" variant="ghost" aria-label="Close menu" onClick={onMobileClose} className="md:hidden">
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>

        {/* Navigation Section */}
        <nav aria-label="Main Navigation" className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold select-none",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-muted/80",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Dev / Design System Section */}
        <div className="pt-4 border-t border-border">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Development</p>
          <nav aria-label="Developer Navigation" className="space-y-1">
            {devNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Plan quota summary footer */}
      <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span className="font-semibold text-foreground">Free Tier</span>
          <span>1 / 3 projects</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: "33%" }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">7 days data retention</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card shrink-0">{sidebarContent}</aside>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative z-50 flex w-72 max-w-full flex-col bg-card shadow-xl">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
