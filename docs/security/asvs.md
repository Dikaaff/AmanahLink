# ASVS L2 Subset — AmanahLink

**Status audit:** 2026-11-03  
**Scope:** Laravel API, Next.js browser client, upload boundary, and logging  
**Verdict:** subset below is implemented and backed by automated checks. This is
not a claim that the complete OWASP ASVS Level 2 has been audited.

## Checklist

| ASVS area | Control | Status | Evidence |
|---|---|---|---|
| V1 | API error responses use stable codes and do not expose exception details | ✅ | `bootstrap/app.php`; `SecurityHardeningTest` and existing API tests |
| V2 | Passwords use Laravel hashing and registration enforces confirmation + minimum length | ✅ | `User` cast; `RegisterRequest`; `AuthApiTest` |
| V2 | Login brute force and auth endpoints are rate limited | ✅ | `AuthController`; named limiters in `AppServiceProvider`; `AuthApiTest`, `SecurityHardeningTest` |
| V3 | Email verification gates sensitive actions | ✅ | `EnsureEmailIsVerified`; `AuthApiTest`, `CampaignApiTest` |
| V4 | Sanctum bearer tokens are revoked on logout and never persisted by the browser client | ✅ | `AuthController@logout`; `frontend/src/lib/api.ts`; browser token is in-memory only |
| V5 | API CORS is allowlist-based and credentials are disabled | ✅ | `config/cors.php`; CORS preflight and disallowed-origin tests |
| V7 | Security headers, no-store behavior, and request IDs are applied | ✅ | `SecurityHeaders`, `AssignRequestId`, `SecurityHeadersTest` |
| V8 | Payment webhooks use HMAC verification and route-level throttling | ✅ | `PaymentWebhookService`; `webhooks.payments` named limiter; webhook tests |
| V9 | Receipt upload validates extension, detected MIME type, and size; files use private local storage | ✅ | `StoreReceiptRequest`, `ReceiptService`; `ReceiptUploadApiTest` |
| V10 | Sensitive values are redacted from Monolog context, extra data, and common message forms | ✅ | `RedactSensitiveDataProcessor`; `RedactSensitiveDataProcessorTest` |
| V11 | Readiness exposes dependency state without exception text | ✅ | `/readyz`; `HealthCheckTest` |

## Implemented security decisions

### Browser token policy

The browser client keeps the Sanctum token in a module variable rather than
`localStorage` or `sessionStorage`. This reduces persistence and removes the
easy post-XSS storage target. The trade-off is intentional: a full page reload
requires the user to log in again. API consumers outside the browser may still
use the documented `Authorization: Bearer <token>` contract.

### CORS policy

Only origins listed in `CORS_ALLOWED_ORIGINS` are allowed. The default list is
limited to the local frontend ports used by this repository. Production must
set an explicit origin list and must not use `*` with authenticated requests.
Credentials remain disabled because the client uses bearer tokens, not cookies.

### Upload policy

Receipt uploads accept only JPEG and PNG, validate both the extension and the
detected MIME type, enforce the configured byte limit, and are stored on the
private `local` disk with generated storage names. The original filename is
not used as a storage path.

## Remaining security work

- Full ASVS L2 mapping and threat model review remain outside this subset.
- `composer audit` / `npm audit` are dependency checks, not substitutes for a
  penetration test.
- Browser E2E, accessibility, load, and deployment-secret verification remain
  tracked in `docs/progress.md`.
