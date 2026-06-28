import Link from "next/link";
import { CloudOff } from "lucide-react";

import { FocusForgeLogo } from "@/components/brand/logo";

export default function OfflinePage() {
  return (
    <main className="app-background flex min-h-screen items-center justify-center p-6">
      <section className="surface-panel w-full max-w-lg p-6">
        <FocusForgeLogo />
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-solid)] p-4">
          <CloudOff aria-hidden="true" className="text-[var(--brand-mark)]" size={24} />
          <div>
            <h1 className="text-xl font-bold text-[var(--text-strong)]">Offline workspace</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              FocusForge can keep your cached app shell available while the network is unavailable.
            </p>
          </div>
        </div>
        <Link className="btn-primary mt-6" href="/">
          Open cached dashboard
        </Link>
      </section>
    </main>
  );
}
