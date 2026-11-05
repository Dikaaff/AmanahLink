"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Alert } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFields({});

    try {
      const user = await login(email, password);
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
          Masuk
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
          Lanjutkan memantau dana yang Anda percayakan.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-secondary">
          Donatur dapat melihat riwayat donasi. Penggalang dana dapat mengajukan
          kampanye dan mencairkan dana ke merchant terverifikasi. Verifikator dan
          admin memakai akun yang disediakan pengelola.
        </p>
        <div className="mt-6 rounded-md border border-line bg-white/70 p-4 text-sm text-ink-secondary">
          <p className="font-semibold text-ink">Akun demo seeder</p>
          <p className="mt-1 font-mono text-xs">
            Donatur &middot; siti@amanahlink.test / password
          </p>
          <p className="font-mono text-xs">
            Penggalang &middot; budi@amanahlink.test / password
          </p>
          <p className="font-mono text-xs">
            Admin &middot; admin@amanahlink.test / password
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-semibold text-ink">Masuk ke akun</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-ink">
              Daftar sebagai donatur
            </Link>
          </p>
        </div>

        {error ? <Alert>{error}</Alert> : null}

        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            placeholder="nama@email.com"
          />
          {fields.email ? (
            <p className="mt-1 text-xs text-ink">{fields.email[0]}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            placeholder="••••••••"
          />
          {fields.password ? (
            <p className="mt-1 text-xs text-ink">{fields.password[0]}</p>
          ) : null}
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting}
          aria-busy={submitting || undefined}
        >
          {submitting ? "Memeriksa…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
