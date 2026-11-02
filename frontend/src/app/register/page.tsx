"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmation: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});

    try {
      await register(form.name, form.email, form.password, form.confirmation);
      router.push("/dashboard");
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setFields(caught.fields);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Daftar
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900 sm:text-4xl">
          Mulai berdonasi dengan jejak yang jelas.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-600">
          Akun baru terdaftar sebagai donatur. Anda dapat melihat riwayat donasi
          dan status penyelesaiannya. Akun penggalang dana disediakan oleh
          pengelola platform pada MVP ini.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Buat akun donatur</h2>
          <p className="mt-1 text-sm text-stone-500">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-brand-700">
              Masuk
            </Link>
          </p>
        </div>

        {error ? <Alert>{error}</Alert> : null}

        <div>
          <label htmlFor="name" className="field-label">
            Nama lengkap
          </label>
          <input
            id="name"
            required
            minLength={2}
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            className="input"
            placeholder="Nama Anda"
          />
          {fields.name ? (
            <p className="mt-1 text-xs text-ink">{fields.name[0]}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            className="input"
            placeholder="nama@email.com"
          />
          {fields.email ? (
            <p className="mt-1 text-xs text-ink">{fields.email[0]}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              className="input"
              placeholder="Min. 8 karakter"
            />
            {fields.password ? (
              <p className="mt-1 text-xs text-ink">{fields.password[0]}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="confirmation" className="field-label">
              Ulangi password
            </label>
            <input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              required
              value={form.confirmation}
              onChange={(event) => update("confirmation", event.target.value)}
              className="input"
              placeholder="Ulangi password"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Mendaftarkan…" : "Daftar"}
        </button>
      </form>
    </div>
  );
}
