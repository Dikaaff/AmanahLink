"use client";

import { useEffect, useState } from "react";
import { Check, Info, Loader2, TriangleAlert } from "lucide-react";
import { Toaster as SonnerToaster, toast } from "sonner";

/**
 * Toasts are confirmations, never the only place a decision is explained.
 * Mobile sits above the bottom nav; desktop sits top-right. One toast at a
 * time, so a new confirmation replaces the previous one instead of stacking.
 */
export function Toaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const pending = sessionStorage.getItem("amanahlink:pending-toast");
    if (!pending) return;

    sessionStorage.removeItem("amanahlink:pending-toast");
    try {
      const payload = JSON.parse(pending) as { type?: string; message?: string };
      if (payload.type === "error" && payload.message) {
        toast.error(payload.message, { duration: 6000 });
      }
    } catch {
      sessionStorage.removeItem("amanahlink:pending-toast");
    }
  }, []);

  return (
    <SonnerToaster
      theme="light"
      position={isMobile ? "bottom-center" : "top-right"}
      offset={isMobile ? 80 : 16}
      duration={3000}
      gap={8}
      visibleToasts={1}
      expand={false}
      icons={{
        success: <Check aria-hidden="true" size={16} strokeWidth={2.4} />,
        error: <Info aria-hidden="true" size={16} strokeWidth={2} />,
        info: <Info aria-hidden="true" size={16} strokeWidth={2} />,
        warning: <TriangleAlert aria-hidden="true" size={16} strokeWidth={2} />,
        loading: (
          <Loader2
            aria-hidden="true"
            size={16}
            strokeWidth={2}
            className="animate-spin motion-reduce:animate-none"
          />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "rounded-sm! border! border-line-strong! bg-surface! font-sans! text-ink! shadow-none! gap-2!",
          success: "border-ink!",
          error: "border-line-strong!",
          title: "text-[12px]! font-semibold! leading-snug! text-ink!",
          description:
            "text-[10.5px]! leading-snug! text-ink-secondary!",
          actionButton:
            "h-8! rounded-sm! border! border-line-strong! bg-canvas! px-3! text-[10.5px]! font-medium! text-ink!",
          icon: "shrink-0!",
        },
      }}
    />
  );
}
