"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert, Loading, Progress, StatusBadge } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api, errorMessage, type Campaign } from "@/lib/api";
import { dateOnly, rupiah } from "@/lib/format";
import { MCC_OPTIONS, mccTitle } from "@/lib/mcc";

interface CampaignForm {
  title: string;
  description: string;
  target_amount: string;
  deadline_at: string;
  allowed_mcc_array: string[];
}

type FieldErrors = Record<string, string[]>;

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - timezoneOffset * 60_000);

  return local.toISOString().slice(0, 16);
}

function fromCampaign(campaign: Campaign): CampaignForm {
  return {
    title: campaign.title,
    description: campaign.description,
    target_amount: campaign.target_amount.replace(/\.00$/, ""),
    deadline_at: toDateTimeLocal(campaign.deadline_at),
    allowed_mcc_array: campaign.allowed_mcc,
  };
}

function validateForm(form: CampaignForm): FieldErrors {
  const errors: FieldErrors = {};

  if (form.title.trim().length < 5) {
    errors.title = ["Judul minimal 5 karakter."];
  }

  if (form.description.trim().length < 50) {
    errors.description = ["Deskripsi minimal 50 karakter agar tujuan dana jelas."];
  }

  if (!form.target_amount || Number(form.target_amount) < 10_000) {
    errors.target_amount = ["Target minimal Rp 10.000."];
  }

  if (!form.deadline_at || new Date(form.deadline_at).getTime() <= Date.now()) {
    errors.deadline_at = ["Tenggat harus berada di masa depan."];
  }

  if (form.allowed_mcc_array.length === 0) {
    errors.allowed_mcc_array = ["Pilih minimal satu kategori transaksi."];
  }

  return errors;
}

function firstError(errors: FieldErrors, key: string): string | null {
  return errors[key]?.[0] ?? null;
}

export function CampaignEditor({
  campaign,
  onSaved,
}: {
  campaign: Campaign;
  onSaved: (updated: Campaign) => void;
}) {
  const [form, setForm] = useState<CampaignForm>(() => fromCampaign(campaign));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateField<Key extends keyof CampaignForm>(key: Key, value: CampaignForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: [] }));
    setError(null);
    setNotice(null);
  }

  function toggleMcc(code: string) {
    const next = form.allowed_mcc_array.includes(code)
      ? form.allowed_mcc_array.filter((value) => value !== code)
      : [...form.allowed_mcc_array, code];

    updateField("allowed_mcc_array", next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const localErrors = validateForm(form);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setError("Periksa beberapa bagian sebelum menyimpan perubahan.");
      setNotice(null);
      return;
    }

    setSaving(true);
    setErrors({});
    setError(null);
    setNotice(null);

    try {
      const response = await api.updateCampaign(campaign.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        target_amount: form.target_amount,
        deadline_at: new Date(form.deadline_at).toISOString(),
        allowed_mcc_array: form.allowed_mcc_array,
      });

      onSaved(response.data);
      setNotice("Perubahan tersimpan. Draf tetap berada di ruang kerja kampanye.");
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setErrors(caught.fields);
    } finally {
      setSaving(false);
    }
  }

  const previewTitle = form.title.trim() || "Judul kampanye Anda";
  const previewDescription =
    form.description.trim() || "Deskripsi singkat tentang kebutuhan dan penggunaan dana.";
  const previewAmount = form.target_amount || "0";

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
      <div className="space-y-6">
        {error ? <Alert>{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        {campaign.rejection_reason ? (
          <Alert tone="warning">
            <span className="font-semibold">Catatan verifikator:</span>{" "}
            {campaign.rejection_reason}
          </Alert>
        ) : null}

        {campaign.status !== "draft" ? (
          <Alert tone="info">
            Kampanye sedang berstatus <strong>{campaign.status_label.toLowerCase()}</strong>.
            Perubahan akan ditolak jika sudah memiliki donasi yang settled.
          </Alert>
        ) : null}

        <Card>
          <CardHeader className="border-b border-stone-100 px-6 py-5">
            <CardTitle>Identitas kampanye</CardTitle>
            <CardDescription>
              Buat tujuan dana mudah dipahami dalam satu tarikan napas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label htmlFor="edit-title" className="field-label">
                Judul kampanye
              </label>
              <input
                id="edit-title"
                required
                minLength={5}
                maxLength={150}
                className="input"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                aria-invalid={Boolean(firstError(errors, "title"))}
              />
              <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                <p className={firstError(errors, "title") ? "text-rose-700" : "text-stone-500"}>
                  {firstError(errors, "title") ?? "Gunakan judul yang spesifik dan manusiawi."}
                </p>
                <span className="shrink-0 text-stone-400">{form.title.length}/150</span>
              </div>
            </div>

            <div>
              <label htmlFor="edit-description" className="field-label">
                Deskripsi dan rencana penggunaan dana
              </label>
              <Textarea
                id="edit-description"
                required
                minLength={50}
                maxLength={5000}
                rows={8}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                aria-invalid={Boolean(firstError(errors, "description"))}
                placeholder="Jelaskan kebutuhan, penerima manfaat, dan jenis merchant yang akan menerima pembayaran."
              />
              <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                <p
                  className={
                    firstError(errors, "description") ? "text-rose-700" : "text-stone-500"
                  }
                >
                  {firstError(errors, "description") ?? "Minimal 50 karakter."}
                </p>
                <span className="shrink-0 text-stone-400">{form.description.length}/5000</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-stone-100 px-6 py-5">
            <CardTitle>Target dan tenggat</CardTitle>
            <CardDescription>
              Angka ini menjadi acuan transparansi bagi donatur.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-target" className="field-label">
                Target dana (Rp)
              </label>
              <input
                id="edit-target"
                required
                inputMode="numeric"
                className="input"
                value={form.target_amount}
                onChange={(event) =>
                  updateField("target_amount", event.target.value.replace(/[^\d]/g, ""))
                }
                aria-invalid={Boolean(firstError(errors, "target_amount"))}
              />
              <p className="mt-1 text-xs text-rose-700">{firstError(errors, "target_amount")}</p>
            </div>

            <div>
              <label htmlFor="edit-deadline" className="field-label">
                Tenggat kampanye
              </label>
              <input
                id="edit-deadline"
                type="datetime-local"
                required
                className="input"
                value={form.deadline_at}
                onChange={(event) => updateField("deadline_at", event.target.value)}
                aria-invalid={Boolean(firstError(errors, "deadline_at"))}
              />
              <p className="mt-1 text-xs text-rose-700">{firstError(errors, "deadline_at")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-stone-100 px-6 py-5">
            <CardTitle>Batas penggunaan dana</CardTitle>
            <CardDescription>
              Pencairan hanya dapat dilakukan ke merchant terverifikasi dengan kategori terpilih.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset>
              <legend className="sr-only">Kategori transaksi yang diizinkan</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {MCC_OPTIONS.map((option) => {
                  const selected = form.allowed_mcc_array.includes(option.code);

                  return (
                    <label
                      key={option.code}
                      className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                        selected
                          ? "border-brand-500 bg-brand-50"
                          : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-brand-700"
                        checked={selected}
                        onChange={() => toggleMcc(option.code)}
                      />
                      <span>
                        <span className="block font-medium text-stone-900">{option.title}</span>
                        <span className="text-xs text-stone-500">
                          {option.category} · MCC {option.code}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-rose-700">
                {firstError(errors, "allowed_mcc_array")}
              </p>
            </fieldset>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3 border-t border-stone-200/80 pt-2">
          <ShimmerButton type="submit" disabled={saving || form.allowed_mcc_array.length === 0}>
            {saving ? "Menyimpan…" : "Simpan perubahan"}
          </ShimmerButton>
          <Link href="/dashboard" className="btn-secondary">
            Batal
          </Link>
          <span className="text-xs text-stone-500">Perubahan dicatat dalam audit log.</span>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <div className="border-b border-stone-100 bg-sand-100/70 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                  Live preview
                </p>
                <p className="mt-1 text-xs text-stone-500">Tampilan donatur setelah disimpan</p>
              </div>
              <Badge>Pratinjau</Badge>
            </div>
          </div>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={campaign.status} label={campaign.status_label} />
              <span className="text-xs text-stone-500">{dateOnly(form.deadline_at)}</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-stone-900">
              {previewTitle}
            </h2>
            <p className="mt-3 line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-stone-600">
              {previewDescription}
            </p>
            <div className="mt-6 rounded-xl bg-brand-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Target dana</p>
              <p className="mt-1 text-2xl font-semibold text-brand-900">{rupiah(previewAmount)}</p>
              <div className="mt-3">
                <Progress percent={campaign.progress_percent} />
              </div>
              <p className="mt-2 text-xs text-brand-700">
                {rupiah(campaign.current_amount)} sudah terkumpul
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {form.allowed_mcc_array.length > 0 ? (
                form.allowed_mcc_array.map((code) => (
                  <Badge key={code}>{mccTitle(code)}</Badge>
                ))
              ) : (
                <span className="text-xs text-stone-400">Belum ada kategori dipilih</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-stone-900 text-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold">Checklist sebelum simpan</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-stone-300">
              <li>• Tujuan dana dapat dipahami tanpa konteks tambahan.</li>
              <li>• Target dan tenggat sesuai kebutuhan nyata.</li>
              <li>• Kategori merchant tidak melebihi kebutuhan kampanye.</li>
            </ul>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

export function CampaignEditorLoading() {
  return <Loading label="Menyiapkan ruang edit kampanye…" />;
}
