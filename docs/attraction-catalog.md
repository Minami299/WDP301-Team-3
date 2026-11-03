# Attraction catalog curation — 2026-11-03

Homepage and search read MongoDB through `GET /api/facilities`; the catalog is not a frontend mock.

## Applied changes

- Deleted 14 confirmed test facilities with no external references and their unused service/image/amenity/inventory children: two `abc`, five `Travelio Tours Pending QA`, four `Customer Upgrade Pending QA`, one `Vendor Long Email QA`, one `Other Orders Test`, and one `Travelio Sapa - kiểm thử đăng ký`.
- Hid six confirmed test/seed facilities (`INACTIVE`): the seed Sun World facility, two `Cơ sở kiểm thử hạng vé`, one `MVP Orders Test`, one `abc`, and one `Tour Hội An Test`. These have orders, financial records, an application or audit references; no linked records were deleted.
- Added five informational facilities, five corresponding services and five licensed photographs. No accounts, emails, stock, sellable ticket types, orders or payments were created.
- Unknown prices remain `null` and render as “Liên hệ”. New items display “Chỉ giới thiệu”; they have no invented ratings, instant-confirmation promises or QR badges.
- Direct and scheduled booking quotes reject informational listings. The existing order creation flow uses these same quote guards. Availability returns no sale options.

## Sources

Names, addresses and descriptions were checked on 2026-11-03. Address wording follows the current official sources; no ticket prices, opening hours or inclusions are imported as sales promises.

| Point | Official / authority sources | Licensed photo |
| --- | --- | --- |
| Sun World Ba Na Hills | [Sun World guide](https://sunworld.vn/banahills/cam-nang-du-lich/cam-nang-du-lich-ba-na-hills), [contact](https://sunworld.vn/vi/banahills/lien-he) | [Supanut Arunoprayote, CC BY 4.0](https://commons.wikimedia.org/wiki/File:Golden_Bridge,_Da_Nang_(I).jpg) |
| Danh thắng Ngũ Hành Sơn | [Management board](https://nguhanhson.org/) | [Chrismiceli, CC0](https://commons.wikimedia.org/wiki/File:Marble_Mountains.jpg) |
| Bảo tàng Điêu khắc Chăm Đà Nẵng | [Da Nang city tourism authority](https://danangfantasticity.com/en/overview-da-nang-museum-of-cham-sculpture) | [Arabsalam, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Chammuseum.JPG) |
| Phố cổ Hội An | [Heritage center](https://www.hoianworldheritage.org.vn/vi.hwh), [sites](https://www.hoianworldheritage.org.vn/vi/news/Diem-tham-quan.hwh) | [Christophe95, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Japanese_bridge_Hoi_An.jpg) |
| Khu đền tháp Mỹ Sơn | [Official management website](https://mysonsanctuary.com.vn/) | [Marc Heiden / Gorilla Jones, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:My_Son,_Vietnam,_2007.jpg) |

The museum's identity, address and official website `https://chammuseum.vn/` were corroborated by the city tourism authority. The museum website itself timed out during retrieval. The similarly named `chammuseum.danang.vn` identifies itself as a travel company and was not used as the museum authority.

Photo credits, source URLs, license URLs and resizing/cropping disclosures are stored in `backend/public/catalog/credits.json` and each facility's `image_credit`. Each photo retains its own license. Files are served locally at `/api/catalog-images/`, avoiding unstable third-party hotlinks. Photo credit/license links appear on each public detail page. At the user's request, provider website buttons and information-source links are no longer shown in the sales interface; verification sources remain in the database and this document.

## Records preserved

| Collection | Before | After |
| --- | --- | --- |
| users | 46 | 46 |
| bookings | 61 | 61 |
| booking_details | 58 | 58 |
| payments | 23 | 23 |
| payouts | 1 | 1 |
| payout_details | 2 | 2 |
| reviews | 6 | 6 |

Three older facilities were not classified as test without sufficient evidence: `Sunworld Banahills` (ACTIVE), `Sapa Discovery Tours` (INACTIVE), and `Banahills` (PENDING). Their accounts, descriptions, prices and history were not altered or newly endorsed.

## Repeatability and recovery

- Preview: `node backend/scripts/curate-attractions.cjs` (read-only).
- Apply: `node backend/scripts/curate-attractions.cjs --apply`. Catalog entries upsert by `catalog_key`, and existing catalog rows are excluded from test classification.
- Per-facility BSON EJSON backups and the complete report, including IDs and related-record counts, are in `backend/.catalog-backups/2026-11-03T03-48-14-302Z/` (gitignored).
- To recover a deleted item, parse its EJSON snapshot and restore its original `_id` documents to the named collections in a transaction, after checking for ID conflicts. Hidden-item snapshots retain the original status. Do not recover by rerunning the destructive demo seed.
- The demo seed and identified fixture-creation scripts now require a dedicated database ending in `_test`, `_demo` or `_qa`; they refuse the current application database. Their API must also connect to that same isolated database.

## Verification

The preservation counts above describe the initial cleanup. Following a later explicit request, five internal operator accounts and editable ticket drafts were provisioned as described below.

- Frontend production build passed; 18 targeted backend tests passed, including schema validation, direct/scheduled checkout rejection, conservative test classification and seed isolation.
- Real API: five informational points, `null` prices, locally served JPEG images, no available sale options.
- Chrome with the real application database at initial curation: homepage and attraction search after reload; all five detail pages, photos, sources and license links; no checkout controls or booking/payment requests for informational listings. Accommodation photos still load.
- Authenticated real quote endpoint: all five informational services return HTTP 409, including a forged legacy ticket ID. No orders are created by this read-only quote check.
- All 20 removed/hidden test-facility detail URLs return HTTP 404.

## Internal operator accounts and ticket drafts

- Provisioning script: `node backend/scripts/prepare-catalog-vendors.cjs`. It uses the existing `ACTIVITY_VENDOR` role and refuses to overwrite an existing account or attach a facility already owned by someone else. Existing provisioned accounts and passwords are preserved on rerun.
- Five logins use the reserved `travelio.internal.test` namespace. They are internal application identifiers, not real provider mailboxes. Display names start with “Nội bộ”; `account_kind` is `INTERNAL`, email verification remains false, and partner approval is not fabricated. No invitation or verification email is sent.
- Private credentials and pre-change snapshots are in `backend/.internal-credentials/` (gitignored). Passwords are randomly generated; the database stores bcrypt hashes. No passwords are in the source manifest or this document.
- Each account manages one of the five existing catalog facilities. Each service now has a name, category `ATTRACTION`, location, unit `TICKET`, description, photo uploaded through the existing Cloudinary uploader, and two ticket types with prices, descriptions and conditions. The optional duration and age fields remain null where the source does not define those values; height, residency and student conditions are expressed in the conditions field rather than invented age limits.
- Ten ticket types remain `INACTIVE`; the facility stays informational. Seven daily `ALL_DAY` preparation rows per type have `total_qty = available_qty = 0`. These rows record zero allocation on Travelio and do not claim that the actual attractions have no capacity or guarantee opening hours.
- Reference prices and their primary source URLs are in `backend/src/seeds/catalog-ticket-drafts.json`. The older Mỹ Sơn source explicitly dates from 2019 and needs reconfirmation; no current sales price, refund policy or actual stock is invented.
- Provider/sales website links have been removed from the public page. Draft ticket types are displayed internally on the site, marked as reference prices and not for sale. Photo attribution links remain for license compliance.
- The existing inventory migration helper now exposes its index-only upgrade, replacing the obsolete `service_id,target_date,time_slot` unique key only after the key including `ticket_type_id` exists. This permits multiple types on the same day/slot without backfilling or modifying historical inventory or orders.
- Catalog curation preserves facilities that have since been assigned an operator; rerunning it does not clear ownership or overwrite ticket configuration.
- API checks passed: all five logins, account ownership, saving the complete existing ticket form, photos, zero-allocation rows, and rejection of cross-account ticket edits. Ticket checkout remains blocked until the real sales configuration is established.

## Vendor tickets and existing checkout (subsequent update)

- The five catalog services now use the normal attraction ticket selector. Saving a configured informational ticket through the existing vendor create/edit endpoints changes its facility to `BOOKABLE` and clears that service's `informational_only` flag in the same transaction. This publishes the configuration, without activating inactive ticket types or changing inventory.
- Applied to the existing five services through authenticated `PUT /api/vendor/tickets/:id`, preserving IDs, prices, conditions, type status and stock. Pre-save API snapshots: `backend/.catalog-backups/2026-11-03T04-28-37-756Z-vendor-publication/`. At this step the Bà Nà adult row on 2026-11-03 already had an allocation of 10; this allocation was retained. All ten types were still `INACTIVE`; other rows had zero allocation.
- The public list now includes vendor ticket types and derives their active status for catalog badges. Home and search show configured reference prices and “Chưa mở bán” while all types are inactive. They do not claim instant confirmation or QR issuance. Detail pages retain photo attribution and show no invented rating when there are no reviews.
- Availability includes the inactive catalog types for display. The selector only enables quantities after a successful availability response for the current date, and only for active types with available stock. Empty/error/stale responses no longer fall back to purchasing from raw facility data. Existing direct tickets are selectable only when the availability API explicitly reports that they do not require schedules.
- Reuses the existing `CheckoutPage` → `bookingApi.create` → `/my-trips/:id` → `PayosPayment` flow. The existing payment service confirms the order and issues usage QR codes only after PayOS reports payment. Vendor order ownership, history and accounting keep using the same booking records; no new checkout/payment endpoint is introduced.
- Validation: 31 targeted backend tests, five frontend tests and production build passed. `catalog-vendor-payment.test.js` uses an isolated MongoDB replica set and a fake PayOS client to verify publication, inactive/zero-stock rejection, inventory deductions, pending orders, idempotent payment confirmation, QR issuance after payment and vendor ownership. No real bank transfer was performed. Run the integration test with `MONGOD_BINARY` pointing to the installed `mongod.exe`.
- Chrome with the actual application database: all five operator logins, populated vendor forms and inventory screens; all five public detail selectors expose the vendor's two types, correct photos and attribution, with inactive quantities disabled. Home and attraction search retained their images and reference prices after reload; search cards navigate to the normal selector; accommodation images still load. No runtime exceptions or live booking/payment requests occurred. Screenshots are under `%TEMP%/travelio-vendor-ticket-flow-verification/`.
- The additional pre-existing `vendor-mongo.test.js` suite exceeded its 60-second deadline and its isolated processes were stopped. It is not counted as passed; the focused catalog/payment integration and the 30 other targeted backend tests passed.
