"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppPage } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ScreenHeader } from "@/components/screen-header";
import { SectionTabs } from "@/components/section-tabs";
import { Alert } from "@/components/ui/alert";
import { Disclosure } from "@/components/ui/disclosure";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  api,
  errorMessage,
  type Campaign,
  type Disbursement,
  type MerchantQr,
  type MerchantScanResult,
} from "@/lib/api";
import { rupiah } from "@/lib/format";
import { mccTitle } from "@/lib/mcc";
import { DANA_TABS } from "@/lib/sections";

const DISBURSABLE = ["active", "funded"];

type BarcodeDetectorResult = { rawValue: string };

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

/**
 * The BarcodeDetector API is not in every browser and is not part of the
 * TypeScript DOM lib yet, so it is looked up at runtime and kept narrow.
 */
function barcodeDetectorConstructor(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") return null;

  const candidate = (
    window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;

  return typeof candidate === "function" ? candidate : null;
}

export default function MerchantScanPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const canUse = user?.role === "campaigner" || user?.role === "admin";

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [demoMerchants, setDemoMerchants] = useState<MerchantQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sheetLoaded, setSheetLoaded] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const [campaignId, setCampaignId] = useState("");
  const [amount, setAmount] = useState("50000");
  const [qrText, setQrText] = useState("");

  const [checking, setChecking] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<MerchantScanResult | null>(null);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paid, setPaid] = useState<Disbursement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [copiedMerchantId, setCopiedMerchantId] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user || !canUse) return;

    let cancelled = false;

    async function load() {
      try {
        const mine = await api.myCampaigns();

        if (cancelled) return;

        const disbursable = mine.data.filter((campaign) =>
          DISBURSABLE.includes(campaign.status),
        );

        setCampaigns(disbursable);
        setCampaignId((current) =>
          current !== "" ? current : (disbursable[0] ? String(disbursable[0].id) : ""),
        );
        setLoadError(null);
      } catch (caught) {
        if (!cancelled) setLoadError(errorMessage(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [ready, user, canUse]);

  /**
   * Poll the camera frames while the preview is on. Detection is best effort:
   * any failure just means the campaigner can paste the payload instead.
   */
  useEffect(() => {
    if (!cameraActive) return;

    const video = videoRef.current;
    const stream = streamRef.current;
    const Detector = barcodeDetectorConstructor();

    if (!video || !stream || !Detector) return;

    video.srcObject = stream;
    void video.play().catch(() => undefined);

    const detector = new Detector({ formats: ["qr_code"] });
    let stopped = false;
    let timer = window.setTimeout(tick, 400);

    async function tick() {
      if (stopped) return;

      try {
        const codes = await detector.detect(video as HTMLVideoElement);
        const value = codes[0]?.rawValue;

        if (value) {
          stopped = true;
          setQrText(value);
          setResult(null);
          setScanError(null);
          setPaid(null);
          setCameraActive(false);

          return;
        }
      } catch {
        // A dropped frame is not fatal; try the next one.
      }

      if (!stopped) timer = window.setTimeout(tick, 400);
    }

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [cameraActive]);

  /**
   * Release the camera as soon as the preview is closed or the page unmounts.
   */
  useEffect(() => {
    if (cameraActive) return;

    const stream = streamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [cameraActive]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    },
    [],
  );

  function resetCheck() {
    setResult(null);
    setScanError(null);
    setPayError(null);
  }

  async function startCamera() {
    setCameraError(null);

    if (!barcodeDetectorConstructor()) {
      setCameraError(
        "Browser ini tidak menyediakan pemindai QR (BarcodeDetector). Tempel kode QR secara manual.",
      );

      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError(
        "Kamera tidak dapat diakses. Beri izin kamera, atau tempel kode QR secara manual.",
      );
    }
  }

  async function handleCheck(event: React.FormEvent) {
    event.preventDefault();
    setChecking(true);
    setScanError(null);
    setResult(null);
    setPayError(null);

    try {
      const response = await api.scanMerchant({
        campaign_id: Number(campaignId),
        amount,
        qr: qrText.trim(),
      });

      setResult(response.data);
    } catch (caught) {
      setScanError(errorMessage(caught));
    } finally {
      setChecking(false);
    }
  }

  async function handleDisburse() {
    if (!result?.allowed) return;

    setPaying(true);
    setPayError(null);

    try {
      const response = await api.disburse({
        campaign_id: Number(campaignId),
        merchant_id: result.merchant.id,
        amount,
      });

      setPaid(response.data);
      setResult(null);
      setQrText("");
    } catch (caught) {
      setPayError(errorMessage(caught));
    } finally {
      setPaying(false);
    }
  }

  async function copyPayload(entry: MerchantQr) {
    try {
      await navigator.clipboard.writeText(entry.qr.payload);
      setCopiedMerchantId(entry.merchant.id);
      window.setTimeout(() => setCopiedMerchantId(null), 2000);
    } catch {
      setScanError(
        "Clipboard diblokir browser. Salin teks kode QR di kartu merchant secara manual.",
      );
    }
  }

  async function loadQrSheet() {
    setSheetLoading(true);
    setSheetError(null);

    try {
      const response = await api.merchantQrSheet();
      setDemoMerchants(response.data);
      setSheetLoaded(true);
    } catch (caught) {
      setSheetError(errorMessage(caught));
    } finally {
      setSheetLoading(false);
    }
  }

  if (!ready || (canUse && loading)) {
    return (
      <AppPage narrow>
        <p className="text-body-sm text-ink-secondary">Memuat data merchant…</p>
      </AppPage>
    );
  }

  if (!user) return null;

  if (!canUse) {
    return (
      <AppPage narrow>
        <Alert tone="info">
          Pindai QR merchant hanya untuk akun penggalang dana dan administrator.
        </Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </AppPage>
    );
  }

  return (
    <AppPage narrow>
      <ScreenHeader
        eyebrow="Dana"
        title="Pindai QR merchant"
        description="Periksa apakah merchant ini boleh menerima dana kampanye sebelum uang keluar."
        className="!items-start"
      />

      <SectionTabs label="Menu dana" items={DANA_TABS} />

      {loadError ? <Alert tone="error">{loadError}</Alert> : null}

      {paid ? (
        <Alert tone="success" title="Pembayaran ke merchant tercatat">
          {rupiah(paid.amount)} dibayarkan ke{" "}
          {paid.merchant?.name ?? "merchant"}. Status{" "}
          {paid.status_label.toLowerCase()}, referensi{" "}
          <span className="font-mono">{paid.reference_id}</span>. Dua entri
          ledger sudah ditulis dan tidak dapat dibatalkan.
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <form onSubmit={handleCheck} className="card space-y-5 p-6">
        <div>
          <label htmlFor="scan-campaign" className="field-label">
            Kampanye
          </label>
          <select
            id="scan-campaign"
            required
            className="input"
            value={campaignId}
            onChange={(event) => {
              setCampaignId(event.target.value);
              resetCheck();
            }}
          >
            <option value="">Pilih kampanye</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
          {campaigns.length === 0 ? (
            <p className="mt-1 text-body-sm text-ink-secondary">
              Belum ada kampanye aktif yang bisa dipakai untuk belanja.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="scan-amount" className="field-label">
            Nominal yang dibayarkan (Rp)
          </label>
          <input
            id="scan-amount"
            required
            inputMode="numeric"
            className="input"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value.replace(/[^\d]/g, ""));
              resetCheck();
            }}
          />
        </div>

        <div className="rounded-md border border-line bg-sunken p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                Pindai dengan kamera
              </p>
              <p className="text-xs text-ink-secondary">
                Arahkan kamera ke QR merchant, atau tempel kodenya di bawah.
              </p>
            </div>
            {cameraActive ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCameraActive(false)}
              >
                Hentikan kamera
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void startCamera()}
              >
                Nyalakan kamera
              </button>
            )}
          </div>

          {cameraActive ? (
            <video
              ref={videoRef}
              muted
              playsInline
              aria-label="Pratinjau kamera pemindai QR"
              className="mt-3 aspect-video w-full rounded-sm bg-black object-cover"
            />
          ) : null}

          {cameraError ? (
            <p className="mt-2 text-xs text-ink-secondary">{cameraError}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="scan-qr" className="field-label">
            Kode QR merchant
          </label>
          <textarea
            id="scan-qr"
            required
            className="input min-h-24 font-mono text-xs"
            placeholder="AMANAH:MERCHANT:2:5912:…"
            value={qrText}
            onChange={(event) => {
              setQrText(event.target.value);
              resetCheck();
            }}
          />
        </div>

        {scanError ? <Alert tone="error">{scanError}</Alert> : null}

        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          <button
            type="submit"
            className="btn-primary"
            disabled={checking || qrText.trim() === "" || campaignId === ""}
            aria-busy={checking || undefined}
          >
            {checking ? "Memeriksa…" : "Periksa kelayakan"}
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Batal
          </Link>
        </div>
      </form>

      <div className="lg:sticky lg:top-6">
      {result ? (
        <section className="card space-y-4 p-5">
          <div>
            <p className="text-label font-medium uppercase text-ink-secondary">
              Hasil pemeriksaan
            </p>
            <h2 className="mt-1 text-h2 font-semibold text-ink">
              {result.merchant.name}
            </h2>
            <p className="mt-1 text-body-sm text-ink-secondary">
              MCC {result.merchant.mcc} ·{" "}
              {result.merchant.mcc_title ?? "kategori tidak diketahui"}
              {result.merchant.city ? ` · ${result.merchant.city}` : ""}
            </p>
          </div>

          {result.allowed ? (
            <>
              <Alert tone="success" title="Merchant cocok dengan kampanye">
                Kategori merchant sesuai dengan kampanye ini. Dana tersedia dan
                sisa limit ada di bawah.
              </Alert>

              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="field-label">Sisa limit harian</dt>
                  <dd className="text-ink">
                    {rupiah(result.remaining_today)}
                  </dd>
                </div>
                <div>
                  <dt className="field-label">Sisa limit bulanan</dt>
                  <dd className="text-ink">
                    {rupiah(result.remaining_month)}
                  </dd>
                </div>
                <div>
                  <dt className="field-label">Dana tersedia</dt>
                  <dd className="text-ink">
                    {rupiah(result.ledger_balance)}
                  </dd>
                </div>
              </dl>

              <Disclosure summary="Detail pemeriksaan" className="border-t border-line">
                <dl className="space-y-2 text-body-sm text-ink-secondary">
                  <div className="flex justify-between gap-3">
                    <dt>Kode MCC</dt>
                    <dd className="font-mono text-ink">{result.mcc}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Kategori diizinkan</dt>
                    <dd className="text-right text-ink">
                      {result.allowed_mcc?.length
                        ? result.allowed_mcc.map(mccTitle).join(", ")
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </Disclosure>

              {payError ? <Alert tone="error">{payError}</Alert> : null}

              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <ConfirmDialog
                  trigger={
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={paying}
                    >
                      {paying ? "Memproses…" : `Otorisasi ${rupiah(amount)}`}
                    </button>
                  }
                  title="Otorisasi pembayaran sekarang?"
                  description={`${rupiah(amount)} akan dicatat permanen di ledger kampanye dan diteruskan ke ${result.merchant.name}. Pembayaran tidak dapat dibatalkan setelah dikirim; klik ganda dicegah oleh Idempotency-Key.`}
                  confirmLabel="Ya, otorisasi"
                  onConfirm={() => void handleDisburse()}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setResult(null)}
                >
                  Batal
                </button>
              </div>
            </>
          ) : (
            <Alert
              tone="error"
              title={
                result.code === "MCC_NOT_ALLOWED"
                  ? "Kategori merchant tidak diizinkan"
                  : "Pembayaran akan ditolak"
              }
            >
              {result.message}
              {result.allowed_mcc?.length
                ? ` Kategori yang diizinkan kampanye: ${result.allowed_mcc.map(mccTitle).join(", ")}.`
                : ""}
              {result.details
                ? ` Sisa limit ${
                    result.details.scope === "daily" ? "harian" : "bulanan"
                  }: ${rupiah(result.details.remaining)}.`
                : ""}
            </Alert>
          )}
        </section>
      ) : (
        <div className="card p-5">
          <p className="text-label font-medium uppercase text-ink-secondary">
            Hasil pemeriksaan
          </p>
          <p className="mt-2 text-body-sm text-ink-secondary">
            Pilih kampanye, isi nominal, lalu pindai atau tempel kode QR merchant.
            Kelayakan muncul di sini sebelum dana bergerak.
          </p>
        </div>
      )}
      </div>
      </div>

      <Disclosure
        summary="QR merchant untuk demo"
        open
        className="rounded-md border border-line px-5 py-1"
      >
        <p className="text-body-sm text-ink-secondary">
          QR terbitan sistem dari registry merchant (id, MCC, tanda tangan HMAC).
          QR lama tidak berlaku bila kategori atau status merchant berubah.
        </p>

        {!sheetLoaded ? (
          <div>
            <p className="text-body-sm text-ink-secondary">
              Daftar QR dimuat saat dibutuhkan supaya halaman pindai tetap
              ringan.
            </p>
            {sheetError ? (
              <p className="mt-2 text-xs text-ink-secondary">{sheetError}</p>
            ) : null}
            <button
              type="button"
              className="btn-secondary mt-3"
              disabled={sheetLoading}
              aria-busy={sheetLoading || undefined}
              onClick={() => void loadQrSheet()}
            >
              {sheetLoading ? "Memuat QR…" : "Tampilkan QR merchant"}
            </button>
          </div>
        ) : demoMerchants.length === 0 ? (
          <p className="text-body-sm text-ink-secondary">
            Belum ada merchant terverifikasi di registry.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {demoMerchants.map((entry) => (
              <li
                key={entry.merchant.id}
                className="rounded-md border border-line p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {entry.merchant.name}
                    </p>
                    <p className="text-xs text-ink-secondary">
                      MCC {entry.merchant.mcc} ·{" "}
                      {entry.merchant.mcc_title ?? "tanpa kategori"}
                    </p>
                  </div>
                  {/* A data URI SVG cannot go through next/image optimisation. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.qr.image}
                    alt={`QR merchant ${entry.merchant.name}`}
                    width={96}
                    height={96}
                    className="h-24 w-24"
                  />
                </div>

                <p className="mt-3 break-all font-mono text-[11px] leading-relaxed text-ink-muted">
                  {entry.qr.payload}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void copyPayload(entry)}
                  >
                    {copiedMerchantId === entry.merchant.id
                      ? "Tersalin"
                      : "Salin kode"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setQrText(entry.qr.payload);
                      setResult(null);
                      setScanError(null);
                      setPaid(null);
                    }}
                  >
                    Pakai kode
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Disclosure>
    </AppPage>
  );
}
