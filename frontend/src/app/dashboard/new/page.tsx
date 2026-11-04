"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert, Loading } from "@/components/ui";
import { ApiError, api, errorMessage } from "@/lib/api";
import { MCC_OPTIONS } from "@/lib/mcc";

function defaultDeadline(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function NewCampaignPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    target_amount: "5000000",
    deadline_at: defaultDeadline(),
  });
  const [mcc, setMcc] = useState<string[]>(["5912"]);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  const canCreate = user?.role === "campaigner" || user?.role === "admin";

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleMcc(code: string) {
    setMcc((current) =>
      current.includes(code)
        ? current.filter((value) => value !== code)
        : [...current, code],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});

    try {
      const response = await api.createCampaign({
        title: form.title,
        description: form.description,
        target_amount: form.target_amount,
        deadline_at: new Date(form.deadline_at).toISOString(),
        allowed_mcc_array: mcc,
      });

      router.push(`/campaigns/${response.data.slug}`);
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setFields(caught.fields);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Loading />
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="info">
          Hanya akun penggalang dana yang dapat membuat kampanye. Akun donatur
          dapat terus berdonasi dan melihat riwayatnya.
        </Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm font-medium text-stone-500 hover:text-stone-800">
        ← Dasbor
      </Link>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Kampanye baru
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">
          Jelaskan tujuan dana, lalu ajukan review.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Draf dapat disunting sampai donasi pertama diterima. Setelah diajukan,
          verifikator akan meninjau batas kategori transaksi dan kejelasan tujuan.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6 sm:p-8">
        {error ? <Alert>{error}</Alert> : null}

        <div>
          <label htmlFor="title" className="field-label">
            Judul kampanye
          </label>
          <input
            id="title"
            required
            minLength={5}
            maxLength={150}
            className="input"
            placeholder="mis. Bantu Biaya Operasi Ibu Sari"
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
          />
          {fields.title ? (
            <p className="mt-1 text-xs text-ink">{fields.title[0]}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="description" className="field-label">
            Deskripsi dan rencana penggunaan dana
          </label>
          <textarea
            id="description"
            required
            minLength={50}
            maxLength={5000}
            rows={7}
            className="input"
            placeholder="Jelaskan kebutuhan, penerima manfaat, dan jenis merchant yang akan menerima pembayaran."
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
          />
          <p className="mt-1 text-xs text-stone-500">
            Minimal 50 karakter ({form.description.length}/5000).
          </p>
          {fields.description ? (
            <p className="mt-1 text-xs text-ink">{fields.description[0]}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="target" className="field-label">
              Target dana (Rp)
            </label>
            <input
              id="target"
              required
              inputMode="numeric"
              className="input"
              value={form.target_amount}
              onChange={(event) =>
                update("target_amount", event.target.value.replace(/[^\d]/g, ""))
              }
            />
            {fields.target_amount ? (
              <p className="mt-1 text-xs text-ink">{fields.target_amount[0]}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="deadline" className="field-label">
              Tenggat kampanye
            </label>
            <input
              id="deadline"
              type="datetime-local"
              required
              className="input"
              value={form.deadline_at}
              onChange={(event) => update("deadline_at", event.target.value)}
            />
            {fields.deadline_at ? (
              <p className="mt-1 text-xs text-ink">{fields.deadline_at[0]}</p>
            ) : null}
          </div>
        </div>

        <fieldset>
          <legend className="field-label">Kategori transaksi yang diizinkan</legend>
          <p className="mb-3 text-xs text-stone-500">
            Pilih minimal satu. Pencairan hanya dapat dilakukan ke merchant
            terverifikasi dengan kategori ini.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MCC_OPTIONS.map((option) => (
              <label
                key={option.code}
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-sm transition ${
                  mcc.includes(option.code)
                    ? "border-brand-500 bg-brand-50"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-brand-700"
                  checked={mcc.includes(option.code)}
                  onChange={() => toggleMcc(option.code)}
                />
                <span>
                  <span className="block font-medium text-stone-900">
                    {option.title}
                  </span>
                  <span className="text-xs text-stone-500">
                    {option.category} · MCC {option.code}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {fields["allowed_mcc_array"] ? (
            <p className="mt-2 text-xs text-ink">
              {fields["allowed_mcc_array"][0]}
            </p>
          ) : null}
        </fieldset>

        <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-5">
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || mcc.length === 0}
            aria-busy={submitting || undefined}
          >
            {submitting ? "Menyimpan…" : "Simpan draf"}
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
