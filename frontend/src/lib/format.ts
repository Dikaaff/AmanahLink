export function rupiah(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);

  if (Number.isNaN(numeric)) {
    return "Rp 0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function compactRupiah(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);

  if (numeric >= 1_000_000_000) {
    return `Rp ${(numeric / 1_000_000_000).toFixed(1).replace(".0", "")} M`;
  }

  if (numeric >= 1_000_000) {
    return `Rp ${(numeric / 1_000_000).toFixed(1).replace(".0", "")} jt`;
  }

  if (numeric >= 1_000) {
    return `Rp ${Math.round(numeric / 1_000)} rb`;
  }

  return rupiah(numeric);
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function dateOnly(value: string | null | undefined): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(
    new Date(value),
  );
}

export function daysLeft(value: string | null | undefined): string {
  if (!value) return "—";

  const diff = new Date(value).getTime() - Date.now();
  const days = Math.ceil(diff / 86_400_000);

  if (days < 0) return "Tenggat lewat";
  if (days === 0) return "Berakhir hari ini";

  return `${days} hari lagi`;
}
