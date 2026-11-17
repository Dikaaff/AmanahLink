import type { SectionTabItem } from "@/components/section-tabs";

/** Sibling screens reached from one sidebar entry, in task order. */
export const DANA_TABS: SectionTabItem[] = [
  { href: "/dashboard/pencairan", label: "Belanja" },
  { href: "/dashboard/nota", label: "Nota" },
];

export const REVIEW_TABS: SectionTabItem[] = [
  { href: "/admin/campaigns", label: "Kampanye" },
  { href: "/admin/receipts", label: "Nota" },
  { href: "/admin/pencairan", label: "Pembayaran" },
  { href: "/admin/audit-logs", label: "Audit log" },
];

/** Disbursement oversight is admin-only; verifiers do not get the tab. */
export function reviewTabs(role?: string): SectionTabItem[] {
  return role === "admin"
    ? REVIEW_TABS
    : REVIEW_TABS.filter((tab) => tab.href !== "/admin/pencairan");
}

export const OPS_TABS: SectionTabItem[] = [
  { href: "/admin", label: "Tugas", exact: true },
  { href: "/admin/webhooks", label: "Webhook & DLQ" },
];
