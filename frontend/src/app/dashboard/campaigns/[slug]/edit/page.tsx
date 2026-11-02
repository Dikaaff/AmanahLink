"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  CampaignEditor,
  CampaignEditorLoading,
} from "@/components/campaign-editor";
import { Alert } from "@/components/ui";
import { api, errorMessage, type Campaign } from "@/lib/api";

export default function EditCampaignPage() {
  const { user, ready } = useAuth();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "campaigner" && user.role !== "admin") return;

    let cancelled = false;

    api
      .campaign(params.slug)
      .then((response) => {
        if (!cancelled) setCampaign(response.data);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.slug, ready, router, user]);

  const canEdit = user?.role === "campaigner" || user?.role === "admin";

  if (!ready || (canEdit && loading)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <CampaignEditorLoading />
      </div>
    );
  }

  if (!user) return null;

  if (user.role !== "campaigner" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert tone="info">Hanya penggalang dana dan admin yang dapat mengedit kampanye.</Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Alert>{error ?? "Kampanye tidak ditemukan atau tidak dapat diedit."}</Alert>
        <Link href="/dashboard" className="btn-secondary mt-5">
          Kembali ke dasbor
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm font-medium text-stone-500 hover:text-stone-800">
        ← Kembali ke dasbor
      </Link>

      <header className="mt-5 mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Ruang kerja kampanye
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900 sm:text-4xl">
          Perbarui kampanye dengan tenang.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-base">
          Rapikan cerita, target, dan batas penggunaan dana sebelum kampanye dibaca
          oleh donatur. Perubahan disimpan sebagai satu catatan audit yang utuh.
        </p>
      </header>

      <CampaignEditor campaign={campaign} onSaved={setCampaign} />
    </div>
  );
}
