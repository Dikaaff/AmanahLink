"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sheet keeps the list behind the form visible. Mobile always rises from the
 * bottom; on desktop the same component becomes a centered dialog, while
 * `side="right"` becomes a reference panel for long forms.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex flex-col gap-1 pr-12", className)} {...props} />;
}

export function SheetFooter({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-h2 font-medium text-ink", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-body-sm text-ink-secondary", className)}
      {...props}
    />
  );
}

interface SheetContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: "bottom" | "right";
  title?: string;
  description?: string;
  footer?: ReactNode;
}

const BOTTOM_POSITION =
  "inset-x-0 bottom-0 h-[90dvh] rounded-t-lg border-t md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[85vh] md:w-[520px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border";

const RIGHT_POSITION =
  "inset-x-0 bottom-0 h-[90dvh] rounded-t-lg border-t md:inset-y-0 md:left-auto md:right-0 md:bottom-0 md:h-dvh md:w-[480px] md:max-w-[90vw] md:translate-x-0 md:translate-y-0 md:rounded-none md:rounded-l-lg md:border-l md:border-t-0";

export function SheetContent({
  side = "bottom",
  title,
  description,
  footer,
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col border-line bg-surface shadow-sheet",
          side === "right" ? RIGHT_POSITION : BOTTOM_POSITION,
          className,
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        {...props}
      >
        <div className="flex justify-center pt-2 md:hidden">
          <span
            aria-hidden="true"
            className="h-1 w-10 rounded-full bg-line-strong"
          />
        </div>

        {title ? (
          <div className="px-5 pb-3 pt-3">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              {description ? (
                <SheetDescription>{description}</SheetDescription>
              ) : (
                <SheetDescription className="sr-only">{title}</SheetDescription>
              )}
            </SheetHeader>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-5 py-4">
          {children}
        </div>

        {footer ? <SheetFooter>{footer}</SheetFooter> : null}

        <DialogPrimitive.Close
          className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-sm text-ink-secondary transition-colors hover:bg-sunken hover:text-ink"
          aria-label="Tutup"
        >
          <X aria-hidden="true" size={20} strokeWidth={1.5} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
