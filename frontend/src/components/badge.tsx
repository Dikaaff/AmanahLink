import {
  AlertTriangle,
  Check,
  CircleDashed,
  Clock,
  Lock,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Status without color (§5.2). Every badge always carries a word; the icon
 * shape, the line style, the fill and the weight are the extra layers. No
 * status may be distinguished by tone alone.
 */
export type BadgeTone =
  | "rejected"
  | "success"
  | "pending"
  | "draft"
  | "locked"
  | "warning";

type ToneSpec = {
  word: string;
  Icon: LucideIcon;
  /** Border style + tone: the line layer. */
  line: string;
  /** Fill and text: the "hitam penuh / putih bergaris" layer. */
  fill: string;
  weight: string;
  /** Icon stroke width is a shape layer, not decoration. */
  strokeWidth?: number;
};

const TONES: Record<BadgeTone, ToneSpec> = {
  rejected: {
    word: "Ditolak",
    Icon: XCircle,
    line: "border-solid border-ink",
    fill: "bg-ink text-inverse",
    weight: "font-semibold",
  },
  success: {
    word: "Berhasil",
    Icon: Check,
    line: "border-solid border-ink",
    fill: "bg-canvas text-ink",
    weight: "font-medium",
    strokeWidth: 2.5,
  },
  pending: {
    word: "Menunggu",
    Icon: Clock,
    line: "border-solid border-ink",
    fill: "bg-canvas text-ink",
    weight: "font-medium",
  },
  draft: {
    word: "Draf",
    Icon: CircleDashed,
    line: "border-dashed border-line-strong",
    fill: "bg-canvas text-ink-secondary",
    weight: "font-medium",
  },
  locked: {
    word: "Terkunci",
    Icon: Lock,
    line: "border-transparent",
    fill: "bg-sunken text-ink-secondary",
    weight: "font-medium",
  },
  warning: {
    word: "Hampir habis",
    Icon: AlertTriangle,
    line: "border-solid border-ink",
    fill: "bg-canvas text-ink",
    weight: "font-semibold",
  },
};

/**
 * Internal backend status → one of the six semantic tones (DD-07). Unknown
 * statuses fall back to `pending`: never invent a badge the design system does
 * not define.
 */
const STATUS_TONE: Record<string, BadgeTone> = {
  // Failures and reversals.
  rejected: "rejected",
  failed: "rejected",
  refunded: "rejected",
  disputed: "rejected",
  // Completed.
  active: "success",
  funded: "success",
  settled: "success",
  verified: "success",
  approved: "success",
  reconciled: "success",
  auto_matched: "success",
  // In flight.
  pending: "pending",
  pending_review: "pending",
  initiated: "pending",
  uploaded: "pending",
  extracting: "pending",
  needs_review: "pending",
  receipt_pending: "pending",
  requested: "pending",
  captured: "pending",
  authorized: "pending",
  mcc_validated: "pending",
  // Not yet a real record, or no longer usable.
  draft: "draft",
  frozen: "locked",
  expired: "locked",
  closed: "locked",
};

export function badgeToneForStatus(status: string): BadgeTone {
  return STATUS_TONE[status] ?? "pending";
}

export function Badge({
  tone,
  label,
}: {
  tone: BadgeTone;
  /** Override the wording only when the tone alone would be wrong; one word. */
  label?: string;
}) {
  const spec = TONES[tone];
  const { Icon } = spec;

  return (
    <span
      data-tone={tone}
      className={`inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 text-label font-medium uppercase tracking-[0.08em] ${spec.line} ${spec.fill} ${spec.weight}`}
    >
      <Icon
        aria-hidden="true"
        size={16}
        strokeWidth={spec.strokeWidth ?? 1.5}
      />
      {label ?? spec.word}
    </span>
  );
}

export const BADGE_TONES = Object.keys(TONES) as BadgeTone[];

export function badgeSpec(tone: BadgeTone) {
  const spec = TONES[tone];
  return {
    word: spec.word,
    icon: spec.Icon.displayName ?? spec.Icon.name ?? "icon",
    line: spec.line,
    fill: spec.fill,
    weight: spec.weight,
    strokeWidth: spec.strokeWidth ?? 1.5,
  };
}
