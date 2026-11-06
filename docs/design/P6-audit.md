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
| Dead-letter replay | Fixed by removing an event from a status-filtered list when replay changes its status. |
| Audit-log empty state | Search variant and clear-filter action are now shown when filters produce no rows. |
| Dashboard empty states | Receipt and disbursement empty states now provide primary actions. |
| Error mapping | `VALIDATION_ERROR` mapping wins over generic server messages. |
| Upload timeout | Receipt uploads use a 120-second timeout; normal requests remain 15 seconds. |
| Reduced motion | Feedback highlight remains statically visible instead of disappearing. |
| Search empty visual | Search variant has a dashed/sunken treatment and search icon. |
| Numeric tables | Dashboard amount cells use `TdNumeric` with right alignment and tabular numerals. |

## Verification

- `npm run lint` — passed.
- `npx tsc --noEmit --pretty false` — passed.
- Existing P6 secondary E2E evidence remains recorded in `docs/progress.md`.
- The requested P4/P5 E2E run was attempted, but could not be accepted as a
  valid suite result in this environment: the configured backend requires
  MySQL/Docker, Docker is unavailable, and the checked-in SQLite snapshot is
  older than the current migrations. The targeted run therefore reached only
  the initial feedback tests before backend-dependent tests became invalid.

## Blocker to close P6

Run the targeted P4/P5 specs and then the full E2E suite with the repository's
MySQL-backed environment (Docker Compose or an equivalent MySQL service).
Until that run is green, this audit is implementation-complete but not a
passed release gate.
