"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@testpulse/ui";

export type ConnectionStatus = "live" | "reconnecting" | "offline";

interface ConnectionStatusPillProps {
  status?: ConnectionStatus;
}

const statusConfig: Record<ConnectionStatus, { dot: string; label: string; tooltip: string }> = {
  live: {
    dot: "bg-status-passed",
    label: "Live",
    tooltip: "Connected to real-time test event stream",
  },
  reconnecting: {
    dot: "bg-status-flaky animate-pulse",
    label: "Reconnecting",
    tooltip: "Reconnecting to live socket gateway...",
  },
  offline: {
    dot: "bg-status-failed",
    label: "Offline",
    tooltip: "Disconnected from event stream. Retrying...",
  },
};

export function ConnectionStatusPill({ status = "live" }: ConnectionStatusPillProps) {
  const config = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground select-none cursor-help"
          >
            <span className={`h-2 w-2 rounded-full ${config.dot}`} aria-hidden="true" />
            <span>{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{config.tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
