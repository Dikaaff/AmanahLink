"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toast (§9.1): top of the screen, never covering the sticky CTA, no oversized
 * icon. Used for confirmations only — decisions that matter use a dialog.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      offset={16}
      duration={4000}
      icons={{ success: null, error: null, info: null, warning: null }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-sm !border !border-line !bg-surface !text-ink !shadow-none !font-sans",
          title: "!text-body-sm !font-medium",
          description: "!text-body-sm !text-ink-secondary",
        },
      }}
    />
  );
}
