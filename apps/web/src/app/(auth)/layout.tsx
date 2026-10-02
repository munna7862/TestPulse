import type { ReactNode } from "react";
import { AuthHeader } from "@/components/AuthHeader";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-background text-surface-foreground flex flex-col justify-between">
      {/* Auth Navigation Header */}
      <AuthHeader />

      {/* Main Content Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Auth Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-surface-muted">
        <p>© {new Date().getFullYear()} TestPulse Inc. Real-time test observability & quarantine platform.</p>
      </footer>
    </div>
  );
}
