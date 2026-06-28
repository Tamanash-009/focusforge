"use client";

import { Download, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { readJson, writeJson } from "@/lib/safe-storage";

const DISMISS_KEY = "focusforge.install-prompt-dismissed.v1";

type AutoInstallPromptProps = {
  onMessage: (kind: "success" | "info" | "error", title: string, message: string) => void;
};

export function AutoInstallPrompt({ onMessage }: AutoInstallPromptProps) {
  const { canInstall, install, isInstalled } = usePwaInstall();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!canInstall || isInstalled || readJson(DISMISS_KEY, false)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsOpen(true);
    }, 1400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [canInstall, isInstalled]);

  async function handleInstall() {
    const result = await install();

    if (result === "accepted") {
      onMessage("success", "Install started", "FocusForge is being added to this device.");
      setIsOpen(false);
    } else if (result === "dismissed") {
      onMessage("info", "Install dismissed", "You can install FocusForge later from Settings.");
      writeJson(DISMISS_KEY, true);
      setIsOpen(false);
    } else {
      onMessage("info", "Install not ready", "Your browser will enable install after PWA criteria are met.");
    }
  }

  function dismiss() {
    writeJson(DISMISS_KEY, true);
    setIsOpen(false);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="install-popover" role="dialog" aria-modal="true" aria-labelledby="install-prompt-title">
      <div className="install-popover-card">
        <button className="icon-button ml-auto h-8 w-8" type="button" aria-label="Dismiss install prompt" onClick={dismiss}>
          <X aria-hidden="true" size={15} />
        </button>
        <div className="icon-surface install-popover-icon">
          <Sparkles aria-hidden="true" size={20} />
        </div>
        <h2 id="install-prompt-title" className="mt-4 text-xl font-black text-[var(--text-strong)]">
          Install FocusForge
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Add the app to your device for a faster launch, focus shortcut, planner shortcut, and offline fallback.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button className="btn-primary" type="button" onClick={handleInstall}>
            <Download aria-hidden="true" size={17} />
            Install app
          </button>
          <button className="btn-secondary" type="button" onClick={dismiss}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
