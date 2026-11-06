# P6 Audit — Frontend resilience and secondary surfaces

## Scope

This audit covers the P4/P5 feedback surfaces and the P6 dashboard secondary
surfaces listed in `docs/progress.md`: session expiry, notification mutations,
filtered lists, empty states, numeric table alignment, request timeouts,
reduced-motion feedback, and scroll-linked dashboard actions.

## Implementation status

| Area | Result |
|---|---|
| Session-expiry toast | Fixed by persisting the pending error toast across the redirect to `/login`. |
| Notification rollback | Fixed by restoring both the notification result and the unread count. |
| Unread filter mutation | Fixed by removing a notification from the filtered list after it is marked read. |
| Mark-all-read | In unread-only mode, marks rows read, removes them from the list, and refreshes the nav badge. |
| Dead-letter replay | Fixed by removing an event from a status-filtered list when replay changes its status and only decrementing `meta.total` when a row actually leaves the filter. |
| Audit-log empty state | Search variant and clear-filter action are now shown when filters produce no rows; clearing also shows the loading state. |
| Dashboard empty states | Receipt and disbursement empty states now provide primary actions. |
| Empty-list payload guard | Dashboard normalizes missing/non-array paginated rows so an empty state renders instead of crashing. |
| Scroll-linked dashboard actions | Receipts and disbursements anchors use `scroll-mt-20` so the sticky nav does not cover the target section. |
| Error mapping | `VALIDATION_ERROR` mapping wins over generic server messages. |
| Upload timeout | Receipt uploads use a 120-second timeout; normal requests remain 15 seconds. |
| Reduced motion | Feedback highlight remains statically visible instead of disappearing. |
| Search empty visual | Search variant has a dashed/sunken treatment and search icon. |
| Numeric tables | Campaign, receipt, disbursement, and donation amount columns use `TdNumeric` and right-aligned headers with tabular numerals. |

## Verification

- `npm run lint` — passed.
- `npx tsc --noEmit --pretty false` — passed.
- `npm run e2e:mock -- feedback-p4.spec.ts states-p5.spec.ts` — **14 passed**.
  This run starts only Next.js; every API request is mocked, so it proves the
  P4/P5 browser behavior without the Laravel/MySQL backend.
- Existing P6 secondary E2E evidence remains recorded in `docs/progress.md`.
- The full backend-dependent E2E suite still requires MySQL/Docker. Docker is
  unavailable, and the checked-in SQLite snapshot is older than the current
  migrations, so the full suite cannot be accepted in this environment.

## Blocker to close P6

Run the full E2E suite with the repository's MySQL-backed environment
(Docker Compose or an equivalent MySQL service). The mock-only P4/P5 suite is
green; until the backend-dependent suite is green, this audit remains
implementation-complete but not a passed release gate.
