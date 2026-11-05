"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldNoteId } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { api, errorMessage, type Campaign, type Donation, type PaymentInstruction } from "@/lib/api";
import { rupiah } from "@/lib/format";

const PRESETS = [50_000, 100_000, 250_000, 500_000];
const DEFAULT_AMOUNT = "100000";

function amountError(value: string): string | null {
  if (value.trim() === "") return "Nominal wajib diisi.";
  if (!/^\d+$/.test(value)) return "Nominal hanya boleh berisi angka.";
  if (Number(value) < 10_000) return "Nominal minimal Rp 10.000.";
  return null;
}

export function DonationSheet({
  campaign,
  open,
  onOpenChange,
  onSettled,
}: {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettled: (campaign: Campaign, donation: Donation) => void;
}) {
  const router = useRouter();
  const { user, ready, refreshUnreadNotifications } = useAuth();

  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [amountTouched, setAmountTouched] = useState(false);
  const [donating, setDonating] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentInstruction | null>(null);
  const [donationId, setDonationId] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [paidDonation, setPaidDonation] = useState<Donation | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const currentAmountError = amountError(amount);
  const visibleAmountError = amountTouched ? currentAmountError : null;
  const dirty =
    !paidDonation &&
    (amount !== DEFAULT_AMOUNT || payment !== null || donationError !== null);

  function resetForm() {
    setAmount(DEFAULT_AMOUNT);
    setAmountTouched(false);
    setDonationError(null);
    setPayment(null);
    setDonationId(null);
    setPaidDonation(null);
    setPaying(false);
  }

  function closeWithoutDiscard() {
    resetForm();
    setDiscardOpen(false);
    onOpenChange(false);
  }

  function requestOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }

    if (dirty) {
      setDiscardOpen(true);
      return;
    }

    onOpenChange(false);
    resetForm();
  }

  async function handleDonate(event: React.FormEvent) {
    event.preventDefault();
    setAmountTouched(true);
    setDonationError(null);

    if (currentAmountError) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!campaign) return;

    setDonating(true);
    setPaidDonation(null);

    try {
      const response = await api.createDonation(campaign.id, amount);
      setPayment(response.data.payment);
      setDonationId(response.data.donation.id);
    } catch (caught) {
      setDonationError(errorMessage(caught));
    } finally {
      setDonating(false);
    }
  }

  async function handleSimulatePayment() {
    if (!donationId) return;

    setPaying(true);
    setDonationError(null);

    try {
      const response = await api.simulateDonationPayment(donationId);
      onSettled(response.data.campaign, response.data.donation);
      setPaidDonation(response.data.donation);
      setPayment(null);
      setDonationId(null);
      await refreshUnreadNotifications();
    } catch (caught) {
      setDonationError(errorMessage(caught));
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={requestOpenChange}>
        <SheetContent
          title="Donasi sekarang"
          description={campaign.title}
          footer={
            payment || paidDonation ? null : (
              <button
                type="submit"
                form="donation-form"
                className="btn-primary w-full"
                disabled={donating || paying}
                aria-busy={donating || undefined}
              >
                {!user
                  ? "Masuk untuk berdonasi"
                  : donating
                    ? "Membuat tagihan"
                    : `Donasi ${rupiah(amount || 0)}`}
              </button>
            )
          }
        >
          <p className="text-body-sm text-ink-secondary">
            Dana masuk ke saldo terkunci kampanye setelah pembayaran
            terkonfirmasi. Biaya platform 2% dipotong sekali saat dana diterima.
          </p>

          {!ready ? (
            <p role="status" className="mt-4 text-body-sm text-ink-secondary">
              Menyiapkan formulir.
            </p>
          ) : (
            <form
              id="donation-form"
              onSubmit={handleDonate}
              className="mt-4 space-y-4"
              noValidate
            >
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={amount === String(preset)}
                    onClick={() => {
                      setAmount(String(preset));
                      setAmountTouched(true);
                    }}
                    className={`min-h-11 rounded-md border px-3 text-body-sm font-medium transition-colors ${
                      amount === String(preset)
                        ? "border-ink bg-sunken text-ink"
                        : "border-line-strong text-ink-secondary hover:border-ink hover:text-ink"
                    }`}
                  >
                    {rupiah(preset)}
                  </button>
                ))}
              </div>

              <Field
                htmlFor="donation-amount"
                label="Nominal (Rp)"
                hint="Minimal Rp 10.000. Biaya platform 2% dipotong saat dana diterima."
                error={visibleAmountError ?? undefined}
              >
                <input
                  id="donation-amount"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  value={amount}
                  aria-invalid={visibleAmountError ? true : undefined}
                  aria-describedby={
                    visibleAmountError
                      ? fieldNoteId("donation-amount")
                      : undefined
                  }
                  onBlur={() => setAmountTouched(true)}
                  onChange={(event) => {
                    setAmount(event.target.value.replace(/[^\d]/g, ""));
                    setDonationError(null);
                  }}
                  className="input numeric font-mono"
                />
              </Field>

              {donationError ? <Alert>{donationError}</Alert> : null}

              {payment ? (
                <Alert tone="success">
                  <p className="font-semibold">Instruksi pembayaran dibuat.</p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt>Virtual account</dt>
                      <dd className="font-mono">{payment.va_number}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Referensi</dt>
                      <dd className="font-mono">{payment.payment_ref}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs">
                    Pembayaran diperiksa lewat webhook provider. Status donasi
                    berubah menjadi &ldquo;Berhasil&rdquo; setelah konfirmasi
                    diterima.
                  </p>
                  {payment.provider === "fake" ? (
                    <Button
                      type="button"
                      size="cta"
                      className="mt-3"
                      loading={paying}
                      onClick={handleSimulatePayment}
                    >
                      {paying
                        ? "Memproses pembayaran"
                        : "Simulasikan pembayaran (demo)"}
                    </Button>
                  ) : null}
                </Alert>
              ) : null}

              {paidDonation ? (
                <Alert tone="success">
                  <p className="font-semibold">Pembayaran berhasil.</p>
                  <p className="mt-1 text-xs">
                    Dana masuk ke saldo terkunci kampanye. Saldo sekarang{" "}
                    {rupiah(campaign.current_amount)}.
                  </p>
                  <Link
                    href="/notifications"
                    className="mt-2 inline-block text-xs font-semibold underline"
                    onClick={() => onOpenChange(false)}
                  >
                    Lihat notifikasi
                  </Link>
                </Alert>
              ) : null}

              {!user ? (
                <p className="text-center text-xs text-ink-muted">
                  Belum punya akun?{" "}
                  <Link href="/register" className="font-semibold text-ink underline">
                    Daftar
                  </Link>
                </p>
              ) : null}
            </form>
          )}

          {paidDonation ? (
            <button
              type="button"
              className="btn-secondary mt-4 w-full"
              onClick={closeWithoutDiscard}
            >
              Selesai
            </button>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Buang perubahan donasi?</AlertDialogTitle>
          <AlertDialogDescription>
            Nominal atau instruksi pembayaran yang sedang Anda lihat akan hilang.
            Lanjutkan hanya jika Anda memang ingin menutup formulir ini.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" size="sm">
                Tetap di sini
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="primary" size="sm" onClick={closeWithoutDiscard}>
                Buang perubahan
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
