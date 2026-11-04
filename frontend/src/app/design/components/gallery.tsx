"use client";

import { useState, type ReactNode } from "react";
import { Inbox, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Field, fieldNoteId } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Skeleton,
  SkeletonCampaignCard,
  SkeletonCard,
  SkeletonDetail,
  SkeletonRow,
  SkeletonStat,
  SkeletonTable,
  SkeletonText,
} from "@/components/ui/skeleton";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";

/**
 * Interactive proof for the §9.2 state matrix. Hover, focus and active cells
 * hold the real component: the reviewer produces the state with the pointer or
 * the keyboard instead of looking at a screenshot of it.
 */
function Cell({
  state,
  hint,
  children,
  wide = false,
}: {
  state: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <p className="text-label font-medium uppercase text-ink-muted">{state}</p>
      <div className="mt-2 flex min-h-14 items-center rounded-sm border border-line bg-canvas px-3 py-2">
        {children}
      </div>
      {hint ? <p className="mt-1 text-body-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function NotApplicable({ note }: { note: string }) {
  return <span className="text-body-sm text-ink-muted">{note}</span>;
}

function Matrix({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

function ComponentSection({
  code,
  name,
  rule,
  children,
}: {
  code: string;
  name: string;
  rule: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line pt-8">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-label font-medium uppercase text-ink-muted">{code}</p>
        <h2 className="text-h2 font-medium text-ink">{name}</h2>
      </div>
      <p className="mt-1 text-body-sm text-ink-secondary">{rule}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Gallery() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-12">
      <ComponentSection
        code="01"
        name="Button"
        rule="Satu aksi primer per layar. Tinggi 44 / 48 / 52. Hover adalah tinta 90%, fokus adalah cincin 2px, tekanan bergeser 1px."
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <Button>Donasi sekarang</Button>
          <Button variant="secondary">Lihat rincian</Button>
          <Button variant="ghost">Batal</Button>
          <Button size="md">Ukuran md</Button>
          <Button size="cta" className="max-w-xs">
            CTA lengket
          </Button>
        </div>
        <Matrix>
          <Cell state="Default">
            <Button>Donasi</Button>
          </Cell>
          <Cell state="Hover" hint="Arahkan kursor: tinta 90%.">
            <Button>Donasi</Button>
          </Cell>
          <Cell state="Fokus" hint="Tab: cincin 2px offset 2.">
            <Button>Donasi</Button>
          </Cell>
          <Cell state="Aktif" hint="Tekan: bergeser 1px.">
            <Button>Donasi</Button>
          </Cell>
          <Cell state="Nonaktif">
            <Button disabled>Donasi</Button>
          </Cell>
          <Cell state="Memuat">
            <Button loading>Menyimpan</Button>
          </Cell>
          <Cell state="Galat">
            <NotApplicable note="Tidak berlaku G�� tombol tidak punya keadaan galat (-�9.2)." />
          </Cell>
          <Cell state="Sekunder">
            <Button variant="secondary">Lihat rincian</Button>
          </Cell>
        </Matrix>
      </ComponentSection>

      <ComponentSection
        code="02"
        name="Input & Field"
        rule="Label selalu terlihat, pesan galat di bawah field dengan ikon, bukan toast. Batas input memakai line-strong 3,25:1."
      >
        <Matrix>
          <Cell state="Default">
            <Input placeholder="Nama merchant" />
          </Cell>
          <Cell state="Hover" hint="Tidak berubah: batas sudah terlihat.">
            <Input placeholder="Nama merchant" />
          </Cell>
          <Cell state="Fokus" hint="Tab: garis tinta + cincin 2px.">
            <Input placeholder="Nama merchant" />
          </Cell>
          <Cell state="Aktif">
            <NotApplicable note="Tidak berlaku untuk input teks." />
          </Cell>
          <Cell state="Nonaktif">
            <Input disabled value="Rp50.000" readOnly />
          </Cell>
          <Cell state="Memuat" hint="Skeleton setinggi field (44).">
            <Skeleton className="h-11 w-full" />
          </Cell>
          <Cell state="Galat" wide>
            <div className="w-full">
              <Field
                htmlFor="demo-error"
                label="Nominal"
                error="Nominal melebihi sisa batas kategori ini (Rp188.000)."
              >
                <Input
                  id="demo-error"
                  defaultValue="999999"
                  aria-invalid="true"
                  aria-describedby={fieldNoteId("demo-error")}
                />
              </Field>
            </div>
          </Cell>
          <Cell state="Dengan bantuan" wide>
            <div className="w-full">
              <Field
                htmlFor="demo-hint"
                label="Nama merchant"
                hint="Harus terdaftar dan terverifikasi."
                counter="0/60"
              >
                <Input
                  id="demo-hint"
                  placeholder="Apotek Sehat Sentosa"
                  aria-describedby={fieldNoteId("demo-hint")}
                />
              </Field>
            </div>
          </Cell>
        </Matrix>
      </ComponentSection>

      <ComponentSection
        code="03"
        name="Card"
        rule="Garis 1px, radius 10, tanpa bayangan. Hover mengubah garis, bukan mengangkat kartu."
      >
        <Matrix>
          <Cell state="Default">
            <Card className="w-full p-4">
              <p className="text-h3 font-medium">Bantuan Medis</p>
              <p className="mt-1 text-body-sm text-ink-secondary">Rp188.000 sisa</p>
            </Card>
          </Cell>
          <Cell state="Hover" hint="Garis menjadi tinta 30%.">
            <Card className="w-full p-4">
              <p className="text-h3 font-medium">Bantuan Medis</p>
              <p className="mt-1 text-body-sm text-ink-secondary">Rp188.000 sisa</p>
            </Card>
          </Cell>
          <Cell state="Fokus">
            <Card className="w-full p-4" tabIndex={0}>
              <p className="text-h3 font-medium">Kartu fokus</p>
            </Card>
          </Cell>
          <Cell state="Aktif">
            <NotApplicable note="Kartu bukan target tekan; aksi ada di dalamnya." />
          </Cell>
          <Cell state="Nonaktif">
            <Card className="w-full border-line p-4 opacity-40">
              <p className="text-h3 font-medium">Terkunci</p>
            </Card>
          </Cell>
          <Cell state="Memuat" wide>
            <div className="w-full">
              <SkeletonCard />
            </div>
          </Cell>
          <Cell state="Galat">
            <NotApplicable note="Tidak berlaku; galat tampil di dalam kartu." />
          </Cell>
        </Matrix>
      </ComponentSection>

      <ComponentSection
        code="04"
        name="Baris tabel"
        rule="Tinggi 44, garis rambut, nominal rata kanan dengan angka tabular. Mobile menumpuk baris, bukan menggeser horizontal."
      >
        <Table>
          <THead>
            <TR className="hover:bg-sunken">
              <TH>Tanggal</TH>
              <TH>Keterangan</TH>
              <TH className="text-right">Nominal</TH>
            </TR>
          </THead>
          <TBody>
            <TR>
              <TD className="font-mono">2026-11-03</TD>
              <TD>Pemakaian G�� Apotek Sehat Sentosa</TD>
              <TD align="right">G��Rp50.000</TD>
            </TR>
            <TR>
              <TD className="font-mono">2026-11-03</TD>
              <TD>Dana donasi diterima</TD>
              <TD align="right">Rp98.000</TD>
            </TR>
            <TR>
              <TD className="font-mono">2026-11-04</TD>
              <TD>Biaya platform (2%)</TD>
              <TD align="right">G��Rp1.960</TD>
            </TR>
          </TBody>
        </Table>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cell state="Hover baris" hint="Latar sunken.">
            <span className="text-body-sm">Arahkan kursor ke tabel di atas</span>
          </Cell>
          <Cell state="Fokus baris" hint="Tab ke dalam tabel.">
            <span className="text-body-sm">Cincin inset mengikuti cincin global</span>
          </Cell>
          <Cell state="Memuat">
            <SkeletonRow />
          </Cell>
          <Cell state="Nonaktif">
            <NotApplicable note="Baris tidak nonaktif; status dibawa badge." />
          </Cell>
        </div>
      </ComponentSection>

      <ComponentSection
        code="05"
        name="Badge status"
        rule="Enam nada, selalu berkata. Tidak ada badge tanpa kata, tidak ada dua badge status pada satu baris."
      >
        <div className="flex flex-wrap gap-3">
          <Badge tone="rejected" />
          <Badge tone="success" />
          <Badge tone="pending" />
          <Badge tone="draft" />
          <Badge tone="locked" />
          <Badge tone="warning" />
        </div>
        <p className="mt-3 text-body-sm text-ink-muted">
          Hover, fokus, aktif, nonaktif, memuat, dan galat tidak berlaku: badge
          bukan kontrol. Perbedaan nada dijelaskan di{" "}
          <span className="font-mono">/design/tokens</span>.
        </p>
      </ComponentSection>

      <ComponentSection
        code="06"
        name="Alert"
        rule="Empat nada dibedakan bentuk ikon dan berat teks, bukan warna. Kalimat memuat apa yang terjadi, kenapa, dan langkah berikutnya."
      >
        <div className="space-y-3">
          <Alert tone="error">
            Transaksi ini tidak bisa diproses di toko elektronik. Dana kampanye
            ini hanya bisa dipakai di apotek, rumah sakit, dan klinik. Pilih
            merchant lain, atau ajukan peninjauan bila ini keliru.
          </Alert>
          <Alert tone="warning">
            Batas kategori tersisa Rp18.000. Ajukan penambahan batas sebelum
            memindai nota berikutnya.
          </Alert>
          <Alert tone="success">
            Nota cocok dengan transaksi dan masuk ke ledger. Tidak ada tindakan
            lain yang diperlukan.
          </Alert>
          <Alert tone="info">
            Verifikasi membutuhkan waktu hingga satu hari kerja. Kamu bisa
            menutup layar ini.
          </Alert>
        </div>
      </ComponentSection>

      <ComponentSection
        code="07"
        name="Progress & Skeleton"
        rule="Satu seri, isian tinta; tidak ada gradasi warna pada ambang. Skeleton mengikuti bentuk konten dan berhenti berdenyut saat reduced-motion."
      >
        <div className="space-y-4">
          <Progress percent={62.4} label="Progres kampanye" />
          <Progress percent={0} label="Progres kampanye kosong" />
          <Progress percent={100} label="Progres kampanye penuh" />
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <SkeletonText lines={3} />
          </div>
          <SkeletonCard />
          <SkeletonCampaignCard />
          <SkeletonStat />
          <SkeletonTable rows={3} />
          <div className="sm:col-span-2">
            <SkeletonDetail />
          </div>
        </div>
      </ComponentSection>

      <ComponentSection
        code="08"
        name="Sheet, dialog, toast"
        rule="Aksi cepat memakai sheet dari bawah; keputusan berat memakai dialog yang menahan fokus. Toast hanya untuk konfirmasi ringan."
      >
        <div className="flex flex-wrap gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary">Buka sheet filter</Button>
            </SheetTrigger>
            <SheetContent
              title="Filter kampanye"
              description="Pilih kategori dan status, lalu terapkan."
              footer={
                <div className="flex gap-2">
                  <Button size="cta" onClick={() => setSheetOpen(false)}>
                    Terapkan filter
                  </Button>
                </div>
              }
            >
              <div className="space-y-4">
                <Field htmlFor="sheet-q" label="Kata kunci" hint="Nama kampanye atau penggalang.">
                  <Input id="sheet-q" placeholder="biaya operasi" />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success" label="Aktif" />
                  <Badge tone="pending" label="Menunggu" />
                  <Badge tone="locked" label="Terkunci" />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <ConfirmDialog
            trigger={
              <Button variant="secondary">Bekukan kampanye</Button>
            }
            title="Bekukan kampanye ini?"
            description={
              <>
                Pembayaran baru ditolak dan pencairan dihentikan sampai
                pembekuan dicabut. Dana yang sudah masuk tetap tercatat di
                ledger.
              </>
            }
            confirmLabel="Ya, bekukan"
            onConfirm={() => toast("Kampanye dibekukan")}
          />

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Buka dialog nominal</Button>
            </DialogTrigger>
            <DialogContent
              title="Input nominal donasi"
              description="Form singkat di desktop; daftar di belakang tetap terlihat."
              footer={
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setDialogOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={() => {
                      setDialogOpen(false);
                      toast.success("Berhasil", {
                        description: "Nominal donasi tersimpan.",
                      });
                    }}
                  >
                    Simpan nominal
                  </Button>
                </>
              }
            >
              <Field
                htmlFor="dialog-amount"
                label="Nominal"
                hint="Minimal Rp10.000."
              >
                <Input
                  id="dialog-amount"
                  inputMode="numeric"
                  defaultValue="100000"
                  className="text-right font-mono tabular-nums"
                />
              </Field>
            </DialogContent>
          </Dialog>

          <Button
            variant="secondary"
            onClick={() =>
              toast.success("Berhasil", {
                description: "Nota masuk ke antrean review.",
              })
            }
          >
            Toast sukses
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              toast.error("Gagal", {
                description: "Koneksi terputus. Dana belum terpotong.",
                duration: 6000,
                action: { label: "Coba lagi", onClick: () => undefined },
              })
            }
          >
            Toast gagal
          </Button>
        </div>
      </ComponentSection>

      <ComponentSection
        code="09"
        name="Empty"
        rule="Satu ikon 24, satu kalimat, satu aksi. Rata tengah hanya di sini, layar sukses, dan dialog konfirmasi."
      >
        <Empty
          icon={<Inbox size={24} strokeWidth={1.5} />}
          title="Belum ada nota"
          description="Nota yang kamu unggah akan tampil di sini setelah dipindai."
          action={
            <Button variant="secondary">
              <RefreshCw aria-hidden="true" size={16} strokeWidth={1.5} />
              Muat ulang
            </Button>
          }
        />
      </ComponentSection>

      <ComponentSection
        code="10"
        name="Card lengkap"
        rule="Header, isi, dan footer memakai pola 16/20. Satu aksi primer di dalam kartu."
      >
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Batas kategori</CardTitle>
            <CardDescription>
              Berlaku sampai 31 Desember 2026 untuk Apotek &amp; toko obat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-label font-medium uppercase text-ink-secondary">
              Tersedia
            </p>
            <p className="numeric mt-1 text-num-lg font-semibold">Rp188.000</p>
            <div className="mt-4">
              <Progress percent={52} label="Pemakaian batas kategori" />
            </div>
          </CardContent>
          <div className="flex items-center gap-2 border-t border-line px-5 py-4">
            <Button size="sm">Ajukan penambahan</Button>
            <Button size="sm" variant="ghost">
              Lihat riwayat
            </Button>
          </div>
        </Card>
      </ComponentSection>
    </div>
  );
}
