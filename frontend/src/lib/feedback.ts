"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Pusat feedback mutasi (§16, UX-04). Toast adalah konfirmasi, bukan tempat
 * menjelaskan keputusan — penjelasan tetap di bawah field atau di halaman.
 * Sonner dipakai lewat helper ini saja agar durasi dan batas satu toast
 * konsisten di seluruh aplikasi.
 *
 * - Sukses: 3 detik (UX-04).
 * - Gagal: 6 detik, opsional tombol "Coba lagi" (UX-04).
 * - Satu toast maksimal: toast sebelumnya selalu ditutup lebih dulu; Toaster
 *   juga membatasi `visibleToasts={1}`.
 */

const SUCCESS_DURATION_MS = 3000;
const FAILURE_DURATION_MS = 6000;

export const FEEDBACK_FLASH_MS = 2000;

/** Konfirmasi sukses. Selalu menggantikan toast yang masih tampil. */
export function notifySuccess(message: string): string | number {
  toast.dismiss();
  return toast.success(message, { duration: SUCCESS_DURATION_MS });
}

/**
 * Pemberitahuan gagal. `retry` (opsional) merender tombol "Coba lagi" yang
 * menjalankan aksi tersebut; dipakai untuk kegagalan muat atau mutasi yang
 * aman diulang, bukan untuk kegagalan validasi (itu tetap di bawah field).
 */
export function notifyFailure(
  message: string,
  retry?: () => void,
): string | number {
  toast.dismiss();
  return toast.error(message, {
    duration: FAILURE_DURATION_MS,
    ...(retry
      ? {
          action: {
            label: "Coba lagi",
            onClick: () => {
              toast.dismiss();
              retry();
            },
          },
        }
      : {}),
  });
}

/**
 * Highlight baris/kartu yang baru berubah (prepend atau update di tempat):
 * latar sunken + garis kiri ink, memudar penuh dalam ≤2 detik
 * (`.feedback-flash` di globals.css). Kembalikan id yang sedang berkilau;
 * pemanggil menempelkan class hanya pada elemen dengan key tersebut.
 */
export function useFlash(): [string | number | null, (key: string | number) => void] {
  const [flashKey, setFlashKey] = useState<string | number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const flash = useCallback((key: string | number) => {
    if (timer.current) clearTimeout(timer.current);
    setFlashKey(key);
    timer.current = setTimeout(() => setFlashKey(null), FEEDBACK_FLASH_MS);
  }, []);

  return [flashKey, flash];
}

/** Status online/offline untuk banner global (P5). */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return online;
}
