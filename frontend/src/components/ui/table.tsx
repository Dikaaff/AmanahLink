import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Table (§9.1, §7.3). Kolom tetap lebar, angka tabular, garis 1px sebagai
 * pemisah. Ponsel: kartu bertumpuk (tidak ada scroll horizontal).
 */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-body", className)} {...props} />
    </div>
  );
}

export function Thead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-sunken text-left font-medium uppercase", className)} {...props} />;
}

export function Tbody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors", className)} {...props} />;
}

export function Th({
  className,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-line px-3 py-2 text-label font-label text-ink-secondary",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  className,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableDataCellElement>) {
  return (
    <td
      className={cn(
        "border-b border-line px-3 py-2 text-body text-ink-secondary",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function ThNumeric({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableHeaderCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-line px-3 py-2 text-right font-label text-ink-secondary",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TdNumeric({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableDataCellElement>) {
  return (
    <td
      className={cn(
        "border-b border-line px-3 py-2 text-right font-mono tabular-nums text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function Number({ value, className }: { value: ReactNode; className?: string }) {
  return <span className={cn("font-mono tabular-nums", className)}>{value}</span>;
}

export function Action({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("font-mono text-right text-body text-ink-secondary", className)}>{children}</td>;
}

export const THead = Thead;
export const TBody = Tbody;
export const TR = Tr;
export const TH = Th;
export const TD = Td;
