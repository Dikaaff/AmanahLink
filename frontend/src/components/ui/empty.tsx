import type { ReactNode } from "react";

/**
 * Empty (§12 L27). 3 varian: daftar kosong, pencarian kosong, aksi.
 */
export function Empty({
  icon,
  title,
  description,
  action,
  variant = "default",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "search" | "action";
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-sm border border-line bg-canvas px-6 py-12 text-center ${
        variant === "action" ? "border-dashed" : ""
      }`}
    >
      {icon ? <div className="mb-3">{icon}</div> : null}
      <h3 className="text-h3 font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-body-sm text-ink-secondary">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
