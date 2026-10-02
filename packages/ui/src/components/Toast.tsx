import * as React from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "../lib/utils";

export type ToastVariant = "info" | "success" | "warning" | "destructive";

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  title?: string;
  description?: string;
  onClose?: () => void;
}

const toastVariants: Record<ToastVariant, { icon: React.ComponentType<{ className?: string }>; style: string }> = {
  info: { icon: Info, style: "border-status-running-border bg-status-running-bg text-status-running" },
  success: { icon: CheckCircle2, style: "border-status-passed-border bg-status-passed-bg text-status-passed" },
  warning: { icon: AlertCircle, style: "border-status-flaky-border bg-status-flaky-bg text-status-flaky" },
  destructive: { icon: XCircle, style: "border-status-failed-border bg-status-failed-bg text-status-failed" },
};

export function Toast({ variant = "info", title, description, onClose, className, ...props }: ToastProps) {
  const { icon: Icon, style } = toastVariants[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-md transition-all select-none",
        style,
        className,
      )}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 space-y-1">
        {title && <p className="font-medium text-sm leading-none">{title}</p>}
        {description && <p className="text-xs opacity-90 leading-relaxed">{description}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="rounded-sm opacity-70 hover:opacity-100 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
