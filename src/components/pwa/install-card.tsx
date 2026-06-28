"use client";

import { BadgeCheck, CloudOff, Download, Route, Smartphone } from "lucide-react";

import { usePwaInstall } from "@/hooks/use-pwa-install";

type InstallCardProps = {
  onMessage: (kind: "success" | "info" | "error", title: string, message: string) => void;
};

export function InstallCard({ onMessage }: InstallCardProps) {
  const { canInstall, install, isInstalled } = usePwaInstall();

  async function handleInstall() {
    const result = await install();

    if (result === "accepted") {
      onMessage("success", "Install started", "FocusForge is being added to this device.");
    } else if (result === "dismissed") {
      onMessage("info", "Install dismissed", "You can install FocusForge later from the browser menu.");
    } else {
      onMessage("info", "Install unavailable", "This browser will show install when PWA criteria are met.");
    }
  }

  return (
    <section className="surface-panel p-5">
      <div className="flex items-start gap-3">
        <div className="icon-surface">
          <Smartphone aria-hidden="true" size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">App mode</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {isInstalled ? "Installed on this device." : "Install FocusForge for a native study workflow."}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-2">
          <BadgeCheck aria-hidden="true" size={15} className="text-[var(--brand-mark)]" />
          Home screen launch
        </span>
        <span className="inline-flex items-center gap-2">
          <Route aria-hidden="true" size={15} className="text-[var(--brand-blue)]" />
          Focus and planner shortcuts
        </span>
        <span className="inline-flex items-center gap-2">
          <CloudOff aria-hidden="true" size={15} className="text-[var(--brand-pink)]" />
          Offline fallback shell
        </span>
      </div>
      <button className="btn-secondary mt-4 w-full" type="button" onClick={handleInstall} disabled={isInstalled}>
        <Download aria-hidden="true" size={16} />
        {isInstalled ? "Installed" : canInstall ? "Install FocusForge" : "Check install"}
      </button>
    </section>
  );
}
