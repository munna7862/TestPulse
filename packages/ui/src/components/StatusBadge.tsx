import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, MinusCircle, ShieldAlert, XCircle } from "lucide-react";
import { cn } from "../lib/utils";

export type TestStatus = "passed" | "failed" | "skipped" | "flaky" | "quarantined" | "running";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: TestStatus;
  showIcon?: boolean;
  label?: string;
  size?: "sm" | "md";
}

const statusConfigs: Record<
  TestStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; style: string }
> = {
  passed: {
    label: "Passed",
    icon: CheckCircle2,
    style: "bg-status-passed-bg text-status-passed border-status-passed-border",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    style: "bg-status-failed-bg text-status-failed border-status-failed-border",
  },
  skipped: {
    label: "Skipped",
    icon: MinusCircle,
    style: "bg-status-skipped-bg text-status-skipped border-status-skipped-border",
  },
  flaky: {
    label: "Flaky",
    icon: AlertTriangle,
    style: "bg-status-flaky-bg text-status-flaky border-status-flaky-border",
  },
  quarantined: {
    label: "Quarantined",
    icon: ShieldAlert,
    style: "bg-status-quarantined-bg text-status-quarantined border-status-quarantined-border",
  },
  running: {
    label: "Running",
    icon: Loader2,
    style: "bg-status-running-bg text-status-running border-status-running-border",
  },
};

export function StatusBadge({ status, showIcon = true, label, size = "md", className, ...props }: StatusBadgeProps) {
  const config = statusConfigs[status];
  const Icon = config.icon;
  const isSpinning = status === "running";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium select-none capitalize",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs",
        config.style,
        className,
      )}
      {...props}
    >
      {showIcon && <Icon className={cn("h-3.5 w-3.5 shrink-0", isSpinning && "animate-spin")} aria-hidden="true" />}
      <span>{label ?? config.label}</span>
    </span>
  );
}
