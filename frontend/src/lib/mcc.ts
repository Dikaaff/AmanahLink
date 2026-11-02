/**
 * Mirrors the active rows of `MccCodeSeeder`. The backend remains the source of
 * truth: an unknown/blocked code is rejected with a 422 on submit.
 */
export interface MccOption {
  code: string;
  title: string;
  category: string;
}

export const MCC_OPTIONS: MccOption[] = [
  { code: "5912", title: "Apotek dan Toko Obat", category: "Kesehatan" },
  { code: "8062", title: "Rumah Sakit", category: "Kesehatan" },
  { code: "8011", title: "Praktik Dokter", category: "Kesehatan" },
  { code: "0742", title: "Klinik Hewan", category: "Kesehatan" },
  { code: "5411", title: "Minimarket dan Supermarket", category: "Kebutuhan Harian" },
  { code: "8211", title: "Sekolah dan Lembaga Pendidikan", category: "Pendidikan" },
  { code: "8220", title: "Perguruan Tinggi", category: "Pendidikan" },
];

export function mccTitle(code: string): string {
  return MCC_OPTIONS.find((option) => option.code === code)?.title ?? code;
}
