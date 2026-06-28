"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { FocusForgeLogo } from "@/components/brand/logo";
import { logError } from "@/lib/logger";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("app.error", error);
  }, [error]);

  return (
    <main className="app-background flex min-h-screen items-center justify-center p-6">
      <section className="surface-panel w-full max-w-lg p-6">
        <FocusForgeLogo />
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4">
          <AlertCircle aria-hidden="true" className="text-[var(--danger-text)]" size={22} />
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-strong)]">FocusForge hit a recoverable error.</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Your local study data is preserved. Retry the view or refresh the app shell.
            </p>
          </div>
        </div>
        <button className="btn-primary mt-6" type="button" onClick={reset}>
          <RefreshCw aria-hidden="true" size={17} />
          Retry
        </button>
      </section>
    </main>
  );
}
