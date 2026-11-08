# Performance and recovery release validation

Implemented in the rolling frontend/backend bug-fix PRs. The production phone still has App Store build 47. These changes are not a claim that its local-only history has been recovered.

| Audit area | Result |
|---|---|
| Stats/history scans | Cached immutable-record dates and exercise indexes; shared volume aggregation; only top-five detailed histories; collapsed progression does no history work. |
| Recovery upload DB calls | One scoped read and one bulk insert per 50 new rows; updates use compare-and-set versions and at most four concurrent writes. |
| Hung sync | 30-second request deadline; abort on account clear; generation guards and promise identity protect subsequent account work. |
| Day cards | Stable component boundaries prevent remounting; day sorting/grouping is memoized. |
| Timer render scope | Stable actions and metadata contexts separate screen/session controls from per-second clock consumers. |
| Scroll animation | Supported header/timer opacity runs on native Animated driver. Compact timer uses measured clock/header geometry and a strict handoff. |
| Persistence | Bulk queue insertion, serialized full-history writes, unchanged-write deduplication, background flush, pre-merge snapshots retained. |
| Repeated downloads | Account-specific conditional ETag request; unchanged history returns 304. All pages/tombstones are still checked server-side so old backfills are discoverable. |
| Notifications | Native operations serialized and unchanged plans skipped; latest completion uses linear maximum. |
| Coach | Virtualized history, memoized rich completed responses, one 100-ms streaming display cadence, layout-driven scrolling, split NDJSON chunks retained. |
| Charts | At most 160 display points with endpoints and bucket extrema; no source-history deletion; repeated pointer indices do not trigger state changes. |
| Growing lists | Library, personal records, and chat use FlatList. Short seven-day and per-workout lists remain simple. |
| Startup | Network sync does not block saved workouts; feature routes load on demand. Existing suggestion indexes and lazy audio retained. |
| Backend plans/transport | Read-only live first-page EXPLAIN used activities_pkey, removed one nonmatching row, and took about 17 ms in one sample. Existing user/date/version indexes verified. No index or production data was changed. Large JSON gzip support added; NDJSON/SSE writes remain unbuffered. |

## Validation

Frontend: TypeScript and 32 tests passed. Backend: TypeScript build and 11 tests passed. Regression coverage includes years of history, partial upload failure/retry, older servers, queued deletions, concurrent edits, account cancellation, 304 fingerprints, aggregation boundaries, display extrema, ordered storage, notification deduplication, split stream chunks, and gzip round-trip integrity.

Simulator checks used disposable signed-out QA records for session selection, disabled countdown inputs, direct entry/exit and restoration of normal controls. The requested iPhone 17 Pro app was reopened and refreshed from Metro. The short empty-set page displayed one large clock after the measurement change. Automated scroll input failed at the computer-use window routing layer, so the entire short/long-page handoff matrix still needs a manual gesture check. No real workouts were marked complete by QA.

Synthetic warmed Node CPU benchmarks (median of five runs on this Mac, not Hermes/device FPS): at 10,000 workouts and four sets each, the original volume loop was about 223 ms in the baseline; the new volume aggregator was about 0.46 ms in the follow-up. At 25,000 records, original baseline was about 542 ms, new aggregator about 2 ms. Exact results and environment are in performance-results.json. Reproduce with `node scripts/benchmarkPerformance.cjs`. Cache warmth, runtime and dataset matter; do not interpret these ratios as full-screen/device speedups.

## Remaining validation and intentional limits

- Release-device frame time, peak memory, energy/battery, extended timers, and large history/chart/chat gesture profiling remain unmeasured. Synthetic CPU tests and simulator checks do not substitute for this.
- Full JSON persistence has not been migrated to SQLite. Write ordering/deduplication/bulk enqueues are implemented; a storage migration should follow measured need and a verified phone export.
- Backend still reads every history page to compute its ETag. A server change-sequence protocol is not introduced; fingerprints reduce transfers without reintroducing timestamp-only recovery gaps.
- No extra index, Redis, server scaling, auth shortcut, production deployment, store submission, phone app replacement, or cloud merge was performed.
- Preserve and inspect a workout JSON export and the account-specific pre-sync snapshot before declaring phone history recovered.

## Deployment order

Reconcile the existing backend activity schema first using its documented read-only preflight and migration. In particular verify tracking_fields and snake_case superset columns: the previously inspected production column list lacked tracking_fields. Then deploy the backend PR, verify full-history/ETag/batch conflict behavior, and build/test the frontend against it. The old backend remains compatible but cannot provide the new conditional-download optimizations.
