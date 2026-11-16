import type { SectionTabItem } from "@/components/section-tabs";

/** Sibling screens reached from one sidebar entry, in task order. */
export const DANA_TABS: SectionTabItem[] = [
  { href: "/dashboard/pencairan", label: "Cairkan" },
  { href: "/dashboard/pindai", label: "Pindai QR" },
  { href: "/dashboard/nota", label: "Nota" },
  { href: "/dashboard/simulasi", label: "Simulasi" },
];

export const REVIEW_TABS: SectionTabItem[] = [
  { href: "/admin/campaigns", label: "Kampanye" },
  { href: "/admin/receipts", label: "Nota" },
  { href: "/admin/audit-logs", label: "Audit log" },
];

export const OPS_TABS: SectionTabItem[] = [
  { href: "/admin", label: "Kesehatan", exact: true },
  { href: "/admin/webhooks", label: "Webhook & DLQ" },
];
