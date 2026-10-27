# Admin Business Performance Overview

Available on Admin Home (`/admin`) and **Business performance** (`/admin/analytics`). Existing user management, partner approvals, roles, and Revenue & Commission pages remain available.

## Project audit and implementation choices

- Frontend: React 19, React Router, Tailwind, centralized Axios API client. The existing installed Recharts 3 library supplies all charts; no dependencies were added.
- Admin integration follows `PortalLayout`, `PageHeader`, permission routes and `portalNav`. The portal now stacks its navigation above the content on small screens.
- Backend: Express routes return `{ success: true, data }`. JWT middleware reloads the account and role; `requirePermission` reloads current permissions on each request.
- `Booking.created_at` defines booking cohorts. Actual booking states are `PENDING`, `CONFIRMED`, `CANCELLED`, `REFUNDED`, `COMPLETED`; the service obtains this catalog from the Mongoose schema.
- `Payment.payment_date` defines payment cohorts. Actual payment states are `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`. `transaction_id` already has a unique database index.
- There are no separate Hotel, Refund or Commission ledger models. Hotels/attractions are `Facility` records; rooms/tickets are `Service` records. Ownership resolves through direct `BookingDetail.facility_id` / `service_id`, or legacy `inventory_id` → `ServiceInventory` → `Service` → `Facility.vendor_id`.
- Commission uses `BookingDetail.commission_rate` snapshots, falling back to current `Facility.commission_rate` with a data-quality warning. `commission_amount` is not used as proof of fee collection.
- Shared `revenuePeriod`, the revenue aggregation pipeline, ownership lookup, integer allocation and `calculateBookingRevenue` are reused. Existing revenue/export behavior is preserved.
- Indexes were added on booking creation date and payment status/date to support analytics range queries. Existing deployments should provision these indexes if automatic Mongoose index creation is disabled.

## API and access

```http
GET /api/admin/analytics?from=2026-10-01&to=2026-10-27&interval=daily
Authorization: Bearer <token>
```

One response supplies all four analytics groups, so every KPI and chart uses the same applied filters:

| Response field | Contents |
| --- | --- |
| `period`, `previous_period`, `comparison_days` | Current range, immediately preceding equal-duration range, inclusive day count |
| `summary` | Seven metrics with `current`, `previous`, `growth_percent`, `growth_state` |
| `trends` | Zero-filled daily/monthly/yearly points for gross payments, net payments, commission and booking counts |
| `distribution` | Booking counts per actual booking status |
| `top_partners` | Up to five partners, allocated booking value and distinct booking count |
| `quality` | Payment/allocation issue counts and issue codes |
| `definitions`, `limitations` | Calculation basis and unsupported interpretations, also shown in the UI |

Access requires an active authenticated **ADMIN**, or a **MANAGER** explicitly granted `analytics.view`. Customers and partner roles cannot access platform analytics even if accidentally assigned that permission. ADMIN receives the new permission with existing stored permission lists; other roles do not gain it by default. The permission appears under Platform Business Operations in Roles and access.

Dates use the existing `Asia/Ho_Chi_Minh` convention: inclusive local midnight on `from`, exclusive local midnight after `to`. Default is the last 30 days including today. Invalid dates, reversed ranges, intervals outside `daily|monthly|yearly`, ranges longer than 3,660 days, and more than 400 chart buckets return HTTP 400. Mixed currency data returns HTTP 422 rather than inventing conversion rates.

The existing `/api/admin/revenue` and `/api/admin/revenue/export` endpoints remain unchanged. Analytics reads the database; it does not call payment gateways, create statistics fixtures or modify operational records.

## KPI formulas

| KPI | Formula and basis |
| --- | --- |
| Total successful payment volume | Sum of distinct successful receipt amounts (`SUCCESS` plus receipts now `REFUNDED`) whose original payment dates are in the period. Pending and failed attempts are excluded. |
| Net payment volume | Successful volume minus full refunds recorded as `Payment.status = REFUNDED` for those receipts. A booking refund status or approved refund request alone never reduces net payments. |
| Platform commission | Same cumulative, booking-capped calculation as Revenue & Commission. Retained receipts are allocated over all booking lines, then multiplied by each line's commission rate. Each receipt gets only the increase in cumulative commission, including history before both reporting periods. |
| Total bookings | Count of booking documents created in the period, regardless of payment count or status. |
| Completed bookings | Count of that creation cohort currently `COMPLETED`. This is not a count by completion date; that timestamp is not available consistently. |
| Booking cancellation rate | `CANCELLED / total bookings × 100%`. `REFUNDED` remains its own distribution category. No bookings produces `null` / “Chưa xác định”. |
| Active partners | Distinct partner owners with at least one `CONFIRMED`/`COMPLETED` booking created in the period, whose accounts are currently ACTIVE and APPROVED (or eligible legacy accounts). Both periods use the same current eligibility. |

For commission, the retained payment base is capped at `Booking.final_amount`. Line weights are `quantity × unit_price`, with cumulative allocation and ties-to-even whole-VND rounding as in the existing revenue module. Distinct bank receipts remain distinct payments; retry records with the same transaction ID count once. Counting booking documents separately prevents installments from inflating booking KPIs.

All monetary calculations use BigInt and decimal strings in API results. Missing/unsupported money or commission data propagates as `null` instead of silently becoming zero. Charts use numeric coordinates; cards, money tooltips and the partner table retain exact monetary strings.

The previous comparison period immediately precedes the selected period and has the same number of local calendar days. Growth is `(current − previous) / previous × 100%`, rounded to two decimals. Both zero gives 0%; previous zero with positive current gives `growth_state = new` and no invented infinite percentage. Unknown current/previous gives `unavailable`. Cancellation-rate growth compares the displayed rates; decreasing cancellation is colored favorably.

## Charts and filters

1. Successful payment volume: line chart by original payment date.
2. Platform commission: line chart by original payment date; unknown values leave gaps.
3. Booking growth: bar chart by booking creation date.
4. Booking status distribution: donut chart with counts/percentages for the selected creation cohort.
5. Top five partners: horizontal bar chart and exact-value table. Ranking uses allocated `final_amount` from CONFIRMED/COMPLETED bookings created in the range, independently of payment count. Mixed-partner discounts are allocated across all lines before grouping by owner. Each booking counts once per owner.

Presets: last 7 days, last 30 days, rolling last 6 months, rolling last 12 months, custom dates. Month presets clamp to the corresponding calendar day when necessary and include today. Default grouping is daily through 90 days, monthly through 730 days, yearly beyond that; users can change it within the bucket limit.

Preset selection applies immediately. Editing custom dates or grouping requires Apply. Applied dates/grouping persist in URL parameters `analytics_from`, `analytics_to`, `analytics_interval` and survive reloads. Loading hides prior-period cards/charts; aborted or late responses cannot overwrite the latest filters. Empty, error/retry and data-quality states are included.

## Files

Created:

- `backend/src/services/adminAnalytics.service.js`
- `backend/test/admin-analytics.test.js`
- `backend/test/admin-analytics-browser.cjs`
- `frontend/src/components/AdminBusinessOverview.jsx`
- `frontend/src/hooks/useAdminAnalytics.js`
- `frontend/src/pages/admin/AdminAnalyticsPage.jsx`
- `frontend/src/utils/adminAnalytics.js`
- `frontend/test/admin-analytics.test.js`
- `docs/admin-business-analytics.md`

Modified:

- `backend/src/configs/permissions.js`
- `backend/src/models/Booking.js`
- `backend/src/models/Payment.js`
- `backend/src/routes/admin.routes.js`
- `backend/src/services/revenue.service.js`
- `backend/src/services/revenueCalculation.js`
- `frontend/src/app/routes/AppRoutes.jsx`
- `frontend/src/app/routes/PermissionRoute.jsx`
- `frontend/src/pages/admin/AdminHomePage.jsx`
- `frontend/src/pages/admin/PortalLayout.jsx`
- `frontend/src/services/api/adminApi.js`
- `frontend/src/utils/portalNav.js`

The pre-existing modification to `backend/package-lock.json` was left intact.

## Verification

Executed against this implementation:

```powershell
# backend/
node --test test/admin-analytics.test.js test/admin-revenue.test.js test/partner-approval.test.js test/partner-applications.test.js test/vendor-routes.test.js test/sales-statistics.test.js

# frontend/
npm.cmd test
npm.cmd run build
npm.cmd run lint -- src/components/AdminBusinessOverview.jsx src/hooks/useAdminAnalytics.js src/utils/adminAnalytics.js src/pages/admin/AdminAnalyticsPage.jsx src/pages/admin/AdminHomePage.jsx src/pages/admin/PortalLayout.jsx src/app/routes/PermissionRoute.jsx src/app/routes/AppRoutes.jsx src/utils/portalNav.js src/services/api/adminApi.js test/admin-analytics.test.js
```

Results: **73/73 backend tests passed**, including 14 analytics tests/subtests; **12/12 frontend tests passed**, including three new analytics utility tests. No tests skipped. Frontend build passed and changed frontend files passed lint. `git diff --check` passed.

Backend coverage includes actual isolated MongoDB aggregates, all seven KPI calculations, comparison and zero denominators, exact large-money growth, Vietnam date boundaries, daily/monthly/yearly consistency, empty data, actual payment refunds vs booking-only refunds, unsupported partial refunds, installment allocation, unique transaction enforcement, multi-partner and legacy ownership, top-five ordering, current eligibility and authentication/role/permission revocation/locks. Reused revenue/export and partner approval tests also passed.

Headless Chrome verified all five charts, shared filters and presets, aggregation changes, URL reload, stale-response protection, loading/error/retry/empty states, Admin Home integration and a 390px mobile layout without page/main horizontal overflow. Test fixtures lived only in temporary databases; payment gateway behavior in existing tests uses test clients. No operating database or real bank transaction was changed or validated.

## Remaining limitations

- `Payment.REFUNDED` is the only supported full-refund record. There is no refund ledger, amount/date for partial refunds, or proof of bank settlement; net volumes apply the current recorded refund state to the original payment cohort.
- Commission is calculated revenue, not a separately reconciled fee receipt. Existing warnings for missing rates, current-rate fallback, cancelled paid bookings and refund mismatches are preserved.
- No historical partner/account/ownership/status snapshots exist. Active-partner comparisons describe activity under current eligibility, and completed/cancelled counts use current status for booking creation cohorts.
- Analytics uses bounded chart buckets and database cursors, but has not been load-tested against production-scale history. Multiple queries read current database state rather than a transactionally frozen snapshot during concurrent writes.
- Vite still reports a bundle larger than 500 kB; this warning already existed before the feature. No new library was installed.
