"use client";

import { useEffect } from "react";

import { logError } from "@/lib/logger";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const canRegister = window.location.protocol === "https:" || window.location.hostname === "localhost";

    if (!canRegister) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        logError("service-worker.register", error);
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register);
    }

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
