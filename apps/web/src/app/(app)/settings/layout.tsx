"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@testpulse/ui";

const settingsLinks = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/project", label: "Project" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav aria-label="Settings navigation" className="flex gap-2 border-b border-border pb-3">
        {settingsLinks.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-muted font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
