"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sheet (§9.1, §11): filters and quick actions open from the bottom, full
 * width on mobile, 90% at 390, centered dialog from 768. Height never exceeds
 * 90% so the screen behind stays visible. Closing always has a button — no
 * gesture-only dismissal — and focus returns to the trigger.
 */
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
      <Dialog.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-lg border-t border-line bg-surface shadow-sheet",
          "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[520px] md:max-h-[85vh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border",
          className,
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-2 md:hidden">
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-line-strong" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
          <div className="min-w-0">
            <Dialog.Title className="text-h2 font-medium text-ink">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-body-sm text-ink-secondary">
                {description}
              </Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">{title}</Dialog.Description>
            )}
          </div>
          <Dialog.Close
            className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-secondary hover:bg-sunken hover:text-ink"
            aria-label="Tutup"
          >
            <X aria-hidden="true" size={20} strokeWidth={1.5} />
          </Dialog.Close>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-5 py-4">
          {children}
        </div>

        {footer ? (
          <div className="border-t border-line px-5 py-4">{footer}</div>
        ) : null}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
