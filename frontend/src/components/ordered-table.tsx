import type { ReactNode } from "react";
import { Thead, Tr, Td, TdNumeric } from "@/components/ui/table";

export interface OrderedTableColumn {
  key: string;
  label: ReactNode;
  cell: (record: unknown) => ReactNode;
  align?: "left" | "right" | "center";
}

export function OrderedTableHeadRow({ head }: { head: ReactNode }) {
  return <Thead className="bg-sunken">{head}</Thead>;
}

export function OrderedTableRow({ children }: { children: ReactNode }) {
  return <Tr>{children}</Tr>;
}

export function OrderedTableCell({
  align = "left",
  numeric = false,
  children,
}: {
  align?: "left" | "right" | "center";
  numeric?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {numeric
        ? <TdNumeric className={align === "left" ? "text-left" : undefined}>{children}</TdNumeric>
        : <Td align={align}>{children}</Td>}
    </>
  );
}
