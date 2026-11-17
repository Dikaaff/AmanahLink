import Image from "next/image";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import type { Campaign } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * One cover ratio everywhere (P9): 16:10 on cards, wider on the detail hero.
 * Photos are grayscale so the Paper & Ink palette still carries the hierarchy;
 * the image carries context, not color meaning.
 */
export function CampaignCover({
  campaign,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  className,
  children,
}: {
  campaign: Campaign;
  priority?: boolean;
  sizes?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[16/10] overflow-hidden bg-sunken",
        className,
      )}
    >
      {campaign.cover_image_url ? (
        <Image
          src={campaign.cover_image_url}
          alt={`Foto kampanye ${campaign.title}`}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover grayscale contrast-[1.04] transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-sunken p-5 text-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent 14px)",
            }}
          />
          <span className="relative inline-flex size-9 items-center justify-center rounded-sm border border-line-strong bg-canvas text-ink-secondary">
            <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.6} />
          </span>
          <span className="relative max-w-[14rem] text-label font-medium uppercase text-ink-muted">
            Foto kampanye belum tersedia
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

/** Chip overlays shared by cards and the detail hero. */
export function CoverChips({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
      {left}
      {right}
    </div>
  );
}

export function CoverChip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-auto inline-flex min-h-7 items-center rounded-full border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink">
      {children}
    </span>
  );
}
