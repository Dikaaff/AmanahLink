export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

let accessToken: string | null = null;

export type UserRole = "donor" | "campaigner" | "verifier" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  role_label: string;
  email_verified_at: string | null;
  created_at: string | null;
}

export interface Campaign {
  id: number;
  title: string;
  slug: string;
  description: string;
  status: string;
  status_label: string;
  target_amount: string;
  current_amount: string;
  progress_percent: number;
  allowed_mcc: string[];
  deadline_at: string | null;
  funded_at: string | null;
  frozen_at?: string | null;
  freeze_reason?: string | null;
  reviewed_at: string | null;
  rejection_reason?: string | null;
  is_accepting_donations: boolean;
  campaigner?: { id: number; name: string };
  created_at: string | null;
}

export interface Donation {
  id: number;
  amount: string;
  status: string;
  status_label: string;
  payment_ref?: string;
  campaign?: { id: number; title: string; slug: string };
  expires_at: string | null;
  settled_at: string | null;
  created_at: string | null;
}

export interface PaymentInstruction {
  provider: string;
  payment_ref: string;
  payment_url: string;
  va_number: string;
  expires_at: string;
}

export interface Disbursement {
  id: number;
  reference_id: string;
  amount: string;
  status: string;
  status_label: string;
  mcc_used: string | null;
  campaign?: { id: number; title: string; slug: string };
  merchant?: { id: number; name: string };
  receipt?: {
    id: number;
    status: string;
    status_label: string;
    confidence: string | null;
    rejection_reason: string | null;
    reviewed_at: string | null;
    created_at: string | null;
  } | null;
  created_at: string | null;
}

export interface Receipt {
  id: number;
  transaction_id: number;
  status: string;
  status_label: string;
  confidence: number | null;
  ocr: Record<string, unknown> | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  transaction?: {
    id: number;
    amount: string;
    status: string;
    status_label: string;
    campaign: { id: number; title: string } | null;
  };
}

export interface DisbursementSimulation {
  allowed: boolean;
  code: string | null;
  message: string;
  mcc?: string;
  allowed_mcc?: string[];
  ledger_balance?: string;
  remaining_today?: string;
  remaining_month?: string;
  limit_expires_at?: string | null;
  details?: { scope: "daily" | "monthly"; remaining: string } | null;
}

export interface DisbursementLimit {
  campaign_id: number;
  daily_limit: string;
  monthly_limit: string;
  used_today: string;
  used_this_month: string;
  daily_window: string | null;
  monthly_window: string | null;
  expires_at: string | null;
}

export interface Merchant {
  id: number;
  name: string;
  mcc: string;
  mcc_title?: string | null;
  category?: string | null;
  city: string | null;
  status: string;
  status_label: string;
  mid?: string;
  verified_at?: string | null;
}

export interface AuditLog {
  id: number;
  actor_id: number | null;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string | null;
}

export interface WebhookEvent {
  id: number;
  provider: string;
  external_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  next_attempt_at: string | null;
  dead_lettered_at: string | null;
  processed_at: string | null;
  created_at: string | null;
}

export interface Dashboard {
  window_hours: number;
  donations_settled_total: string;
  disbursements_captured_total: string;
  refunds_total: string;
  ledger_campaign_balance: string;
  campaign_cache_balance: string;
  ledger_mismatch_count: number;
  ocr_queue_depth: number;
  receipts_needs_review: number;
  authorize_p95_ms: number | null;
  authorize_sample_count: number;
}

export interface PageMeta {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  next_cursor?: string | null;
  prev_cursor?: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta?: PageMeta & { unread_count?: number };
  links?: Record<string, string | null>;
}

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string): void {
  accessToken = token;
}

export function clearToken(): void {
  accessToken = null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/**
 * Batas waktu satu permintaan (P5). Di luar batas ini permintaan dianggap
 * gagal dengan kode TIMEOUT, bukan menggantung tanpa feedback.
 */
const REQUEST_TIMEOUT_MS = 15000;
const UPLOAD_REQUEST_TIMEOUT_MS = 120000;

async function request<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = authenticated ? getToken() : null;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.any(
        [init.signal, AbortSignal.timeout(timeoutMs)].filter(
          (signal): signal is AbortSignal => Boolean(signal),
        ),
      ),
    });
  } catch (caught) {
    if (caught instanceof ApiError) throw caught;
    // fetch melempar saat offline atau saat batas waktu tercapai.
    const timedOut = caught instanceof DOMException && caught.name === "TimeoutError";
    throw new ApiError(
      0,
      timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      timedOut
        ? "Waktu tunggu habis. Periksa koneksi lalu coba lagi."
        : "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; details?: { fields?: Record<string, string[]> } } }
    | null;

  if (!response.ok) {
    if (authenticated && response.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("amanahlink:unauthorized"));
      }
    }

    throw new ApiError(
      response.status,
      body?.error?.code ?? "HTTP_ERROR",
      body?.error?.message ?? "Permintaan gagal diproses.",
      body?.error?.details?.fields ?? {},
    );
  }

  return body as T;
}

function json(body: unknown, method = "POST"): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const api = {
  login: (email: string, password: string) =>
    request<{ data: { user: User; token: string } }>(
      "/auth/login",
      json({ email, password }),
      false,
    ),

  register: (name: string, email: string, password: string, passwordConfirmation: string) =>
    request<{ data: { user: User; token: string } }>(
      "/auth/register",
      json({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      }),
      false,
    ),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: () => request<{ data: User }>("/auth/me"),

  resendVerification: () =>
    request<{ data: User; message?: string }>("/auth/email/resend", {
      method: "POST",
    }),

  campaigns: (query: { page?: number; q?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.q?.trim()) params.set("q", query.q.trim());
    return request<Paginated<Campaign>>(`/campaigns?${params.toString()}`);
  },

  campaign: (slug: string) => request<{ data: Campaign }>(`/campaigns/${slug}`),

  myCampaigns: (page = 1) =>
    request<Paginated<Campaign>>(`/campaigns/mine?page=${page}`),

  reviewQueue: (status = "", page = 1) => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    return request<Paginated<Campaign>>(`/campaigns/review-queue?${params.toString()}`);
  },

  createCampaign: (body: {
    title: string;
    description: string;
    target_amount: string;
    deadline_at: string;
    allowed_mcc_array: string[];
  }) => request<{ data: Campaign }>("/campaigns", json(body)),

  updateCampaign: (
    id: number,
    body: {
      title: string;
      description: string;
      target_amount: string;
      deadline_at: string;
      allowed_mcc_array: string[];
    },
  ) => request<{ data: Campaign }>(`/campaigns/${id}`, json(body, "PUT")),

  submitCampaign: (id: number) =>
    request<{ data: Campaign }>(`/campaigns/${id}/submit`, { method: "POST" }),

  reviewCampaign: (
    id: number,
    decision: "approve" | "reject",
    rejectionReason?: string,
  ) =>
    request<{ data: Campaign }>(`/campaigns/${id}/review`, {
      ...json({
        decision,
        ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
      }),
    }),

  freezeCampaign: (id: number, reason: string) =>
    request<{ data: Campaign }>(`/campaigns/${id}/freeze`, json({ reason })),

  unfreezeCampaign: (id: number) =>
    request<{ data: Campaign }>(`/campaigns/${id}/unfreeze`, { method: "POST" }),

  closeCampaign: (id: number) =>
    request<{
      data: Campaign;
      refund: { donor_count: number; total: string };
    }>(`/campaigns/${id}/close`, { method: "POST" }),

  donations: (page = 1) =>
    request<Paginated<Donation>>(`/donations?page=${page}`),

  notifications: (filters: { unread?: boolean; cursor?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.unread) params.set("unread", "1");
    if (filters.cursor) params.set("cursor", filters.cursor);
    return request<Paginated<AppNotification>>(`/notifications?${params.toString()}`);
  },

  markNotificationRead: (id: string) =>
    request<AppNotification>(`/notifications/${id}/read`, {
      method: "POST",
    }),

  markAllNotificationsRead: () =>
    request<{ data: { marked: number; unread_count: number } }>(
      "/notifications/read-all",
      { method: "POST" },
    ),

  createDonation: (campaignId: number, amount: string) =>
    request<{ data: { donation: Donation; payment: PaymentInstruction } }>(
      "/donations",
      { ...json({ campaign_id: campaignId, amount }), headers: { "Idempotency-Key": crypto.randomUUID() } },
    ),

  simulateDonationPayment: (donationId: number) =>
    request<{ data: { donation: Donation; campaign: Campaign } }>(
      `/donations/${donationId}/simulate-payment`,
      { method: "POST" },
    ),

  disburse: (body: { campaign_id: number; merchant_id: number; amount: string }) =>
    request<{ data: Disbursement }>("/disbursements", {
      ...json(body),
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),

  simulateDisbursement: (body: {
    campaign_id: number;
    merchant_id: number;
    amount: string;
  }) =>
    request<{ data: DisbursementSimulation }>("/disbursements/simulate", json(body)),

  disbursements: (page = 1, campaignId?: number) => {
    const params = new URLSearchParams({ page: String(page) });
    if (campaignId) params.set("campaign_id", String(campaignId));
    return request<Paginated<Disbursement>>(`/disbursements?${params.toString()}`);
  },

  merchants: (query: { mcc?: string; q?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.mcc) params.set("mcc", query.mcc);
    if (query.q?.trim()) params.set("q", query.q.trim());
    return request<Paginated<Merchant>>(`/merchants?${params.toString()}`);
  },

  disbursementLimit: (campaignId: number) =>
    request<{ data: DisbursementLimit | null }>(
      `/campaigns/${campaignId}/disbursement-limit`,
    ),

  upsertDisbursementLimit: (
    campaignId: number,
    body: { daily_limit: string; monthly_limit: string; expires_at: string },
  ) =>
    request<{ data: DisbursementLimit }>(
      `/campaigns/${campaignId}/disbursement-limit`,
      { method: "PUT", body: JSON.stringify(body) },
    ),

  uploadReceipt: (transactionId: number, file: File) => {
    const body = new FormData();
    body.append("file", file);

    return request<{ data: Receipt }>(
      `/disbursements/${transactionId}/receipts`,
      { method: "POST", body },
      true,
      UPLOAD_REQUEST_TIMEOUT_MS,
    );
  },

  receipts: (status = "needs_review", page = 1) =>
    request<Paginated<Receipt>>(
      `/receipts?status=${encodeURIComponent(status)}&page=${page}`,
    ),

  myReceipts: (page = 1) => request<Paginated<Receipt>>(`/receipts?page=${page}`),

  reviewReceipt: (
    id: number,
    decision: "approve" | "reject",
    rejectionReason?: string,
  ) =>
    request<{ data: Receipt }>(`/receipts/${id}/review`, {
      ...json({
        decision,
        ...(rejectionReason ? { rejection_reason: rejectionReason } : {}),
      }),
    }),

  dashboard: () => request<{ data: Dashboard }>("/admin/dashboard"),

  webhookEvents: (filters: { status?: string; provider?: string; cursor?: string }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return request<Paginated<WebhookEvent>>(
      `/admin/webhook-events?${params.toString()}`,
    );
  },

  replayWebhook: (id: number) =>
    request<{ data: WebhookEvent }>(`/admin/webhook-events/${id}/replay`, {
      method: "POST",
    }),

  auditLogs: (filters: {
    actor_id?: string;
    action?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return request<Paginated<AuditLog>>(`/audit-logs?${params.toString()}`);
  },
};

/**
 * Pemetaan terpusat kode error (§9 Katalog Error Code) ke pesan manusiawi.
 * Pesan server dipakai bila tersedia dan bukan pesan generik.
 */
const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Periksa kembali isian yang ditandai.",
  UNAUTHENTICATED: "Sesi Anda sudah berakhir. Silakan masuk kembali.",
  INVALID_SIGNATURE: "Tanda tangan webhook tidak sah. Permintaan ditolak.",
  EMAIL_UNVERIFIED:
    "Verifikasi email Anda terlebih dahulu sebelum melakukan aksi ini.",
  FORBIDDEN_ROLE: "Peran Anda tidak memiliki akses untuk aksi ini.",
  MCC_NOT_ALLOWED:
    "Kategori transaksi merchant tidak diizinkan oleh kampanye ini.",
  INSUFFICIENT_FUNDS: "Saldo kampanye tidak mencukupi untuk pencairan ini.",
  LIMIT_EXCEEDED: "Batas harian atau bulanan pencairan terlampaui.",
  LIMIT_EXPIRED: "Masa berlaku limit pencairan sudah lewat.",
  CAMPAIGN_NOT_ACTIVE: "Kampanye tidak dalam status aktif atau funded.",
  CAMPAIGN_LOCKED: "Kampanye tidak dapat diedit setelah donasi pertama settle.",
  CONFLICT_STATE: "Perubahan status tidak sah untuk keadaan saat ini.",
  DUPLICATE_REQUEST:
    "Permintaan yang sama masih diproses. Tunggu sebentar lalu coba lagi.",
  IDEMPOTENCY_MISMATCH: "Permintaan ulang dengan isi berbeda. Muat ulang halaman.",
  OCR_LOW_CONFIDENCE:
    "Nota tidak dapat dibaca otomatis. Masukkan detail transaksi secara manual.",
  RATE_LIMITED: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
  NOT_FOUND: "Data tidak ditemukan atau sudah dihapus.",
  UPSTREAM_TIMEOUT:
    "Penyedia pembayaran tidak merespons. Coba lagi beberapa saat.",
  INTERNAL_ERROR: "Terjadi kesalahan di server. Coba lagi beberapa saat.",
  TIMEOUT: "Waktu tunggu habis. Periksa koneksi lalu coba lagi.",
  NETWORK_ERROR: "Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.",
};

const GENERIC_SERVER_MESSAGES = new Set([
  "Permintaan gagal diproses.",
  "Data yang dikirim tidak valid.",
]);

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.message && !GENERIC_SERVER_MESSAGES.has(error.message)) {
      return error.message;
    }
    if (error.code in ERROR_MESSAGES) return ERROR_MESSAGES[error.code];
    return error.message || "Permintaan gagal diproses.";
  }
  return ERROR_MESSAGES.NETWORK_ERROR;
}
