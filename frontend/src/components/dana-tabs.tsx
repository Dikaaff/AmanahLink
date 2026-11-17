"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SectionTabs } from "@/components/section-tabs";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { DANA_TABS } from "@/lib/sections";

/**
 * The Nota tab carries the number of payments still waiting for proof, so the
 * obligation is visible from Belanja without opening another screen. A failed
 * count only removes the badge; it never blocks the page.
 */
export function DanaTabs() {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!ready || !user) return;

    let cancelled = false;

    api
      .receiptPendingCount()
      .then((response) => {
        if (!cancelled) setPending(response.data.pending);
      })
      .catch(() => {
        if (!cancelled) setPending(0);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, pathname]);

  return (
    <SectionTabs
      label="Menu dana"
      items={DANA_TABS.map((tab) =>
        tab.href === "/dashboard/nota" && pending > 0
          ? { ...tab, badge: pending }
          : tab,
      )}
    />
  );
}
