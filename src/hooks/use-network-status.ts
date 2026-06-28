"use client";

import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsOnline(window.navigator.onLine);
    }, 0);

    function updateOnline() {
      setIsOnline(true);
    }

    function updateOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOffline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOffline);
      window.clearTimeout(timeout);
    };
  }, []);

  return isOnline;
}
