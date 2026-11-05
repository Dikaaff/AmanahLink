"use client";

import { useState, type ReactNode } from "react";
import { DiscardChangesDialog } from "@/components/ui/discard-changes-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface FormOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  dirty: boolean;
  onDiscard?: () => void;
  footer?: ReactNode;
  closeLabel?: string;
  children: ReactNode;
}

export function FormOverlay({
  open,
  onOpenChange,
  title,
  description,
  dirty,
  onDiscard,
  footer,
  closeLabel = "Tutup",
  children,
}: FormOverlayProps) {
  const [discardOpen, setDiscardOpen] = useState(false);

  function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && dirty) {
      setDiscardOpen(true);
      return;
    }

    onOpenChange(nextOpen);
  }

  function discardChanges() {
    setDiscardOpen(false);
    onDiscard?.();
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={requestOpenChange}>
        <SheetContent
          title={title}
          description={description}
          footer={
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => requestOpenChange(false)}
              >
                {closeLabel}
              </button>
              {footer}
            </>
          }
        >
          {children}
        </SheetContent>
      </Sheet>
      <DiscardChangesDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onDiscard={discardChanges}
      />
    </>
  );
}
