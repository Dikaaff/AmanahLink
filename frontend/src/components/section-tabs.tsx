"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SectionTabItem = {
  href: string;
  label: string;
  /** Only match this exact route (used for section index pages). */
  exact?: boolean;
};

/**
 * Secondary navigation for sibling screens inside one sidebar destination.
 * One row of text tabs, swipeable on mobile, so adding a screen does not add
 * another permanent navigation entry.
 */
export function SectionTabs({
  label,
  items,
  className,
}: {
  label: string;
  items: SectionTabItem[];
  className?: string;
}) {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label={label}
      className={cn("-mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0", className)}
    >
      <ul className="flex gap-1">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center px-3 text-body-sm font-medium transition-colors",
                  active ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-0.5 bg-ink"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
