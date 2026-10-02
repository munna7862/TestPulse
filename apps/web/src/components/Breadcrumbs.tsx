"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-muted-foreground">
      <Link href="/runs" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>
      {segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const formattedTitle = segment.replace(/-/g, " ");

        return (
          <React.Fragment key={path}>
            <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" aria-hidden="true" />
            {isLast ? (
              <span className="font-medium text-foreground capitalize" aria-current="page">
                {formattedTitle}
              </span>
            ) : (
              <Link href={path} className="hover:text-foreground capitalize transition-colors">
                {formattedTitle}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
