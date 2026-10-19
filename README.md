# WDP301-Team-3

## Local Configuration

The backend reads its environment from `backend/.env`. Copy the keys in
[`backend/.env.example`](backend/.env.example) into that file and set a MongoDB
connection string, a long random `JWT_SECRET`, and working SMTP credentials.
The SMTP account must be permitted to send mail from `SMTP_FROM`. Port `465`
uses implicit TLS; other ports use STARTTLS through Nodemailer.
Customer avatar uploads require `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
and `CLOUDINARY_API_SECRET`. Without these settings the upload endpoint returns
an error and leaves the current avatar unchanged.

Install and run the existing applications from their package directories:

```powershell
cd backend
npm install
npm run dev
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

## Account APIs

- `POST /api/auth/register`, `/verify-email`, `/resend-verification`
- `POST /api/auth/login`, `/forgot-password`, `/verify-reset-otp`, `/reset-password`
- `GET /api/users/me` (all authenticated roles), `PUT /api/users/me` (Customer only)
- `POST/DELETE /api/users/me/avatar` (Customer only)
- `POST /api/users/me/email-change` and `/api/users/me/email-change/verify`
  (Customer-only OTP verification; email remains unchanged until verified)
- `PUT /api/users/me/change-password` (all authenticated roles)
- Payment Methods are informational UI only; no payment-method API or payment
  processing is available in this phase.

Registration and password-reset OTPs expire after five minutes. Reset-password
completion requires the short-lived token returned by `/verify-reset-otp`.
Customer registration returns HTTP 202 with `verificationRequired: true` and no
JWT. The account remains unverified until `POST /api/auth/verify-email` succeeds;
unverified customers cannot log in or use authenticated APIs. Verification
success returns to Login. Existing verified customers and partner approval
flows keep their current behavior.

Both registration and password reset allow five OTP guesses per code, a
60-second resend cooldown, and at most five sends per hour per account and
purpose. Resending invalidates the previous code; reset tokens are single-use
and expire after ten minutes. Mail-delivery errors are reported to the UI.
Legacy payment-method fields in existing profiles are not read or written by
the Profile UI.

## Manual Account Test

1. Register a customer using a deliverable email address.
2. Confirm the verification email arrives, then enter its six-digit code.
3. Log in; verify an unverified account is rejected with `EMAIL_NOT_VERIFIED`.
4. Start Forgot password, enter the account email, and submit the reset OTP.
5. Choose a new password and return to Login.
6. Log in with the new password.
7. Open Profile for each role; confirm only Customer sees personal information
   and Payment Methods, while all roles see Security & Password.
8. As Customer, update name, phone, and address; upload an image under 5 MB.
9. Confirm Payment Methods shows an empty state and has no write actions.
10. Change the password using the current password for each role.
11. Try profile update/avatar APIs without a token and as a non-Customer; expect
    `401` and `403` respectively. Try changing `role_id` or `status`; expect
    rejection and confirm the account remains unchanged.

To test resend/expiry behavior, wait more than five minutes before submitting
an OTP, or request a new code and confirm the previously issued code is rejected.

## Customer Trip Management

The existing navigation opens `/my-trips`; `Xem chi tiết` opens
`/my-trips/:id`. Both reuse the authenticated `GET /api/bookings` and
`GET /api/bookings/:id` endpoints, scoped to the current active Customer.
Booking responses now include each line's facility image and service type.

- **Sắp tới:** `CONFIRMED` bookings with a service/check-in date today or later
  in Vietnam. A past date never changes a booking to completed.
- **Đã hoàn thành:** only the backend's explicit `COMPLETED` status.
- **Đã hủy:** only `CANCELLED` bookings.
- Pending-payment bookings remain accessible in the **Sắp tới** view. Past
  confirmed, undated, refunded and other bookings remain accessible under
  `Các đơn khác` in that same view. **Đã hoàn thành** and **Đã hủy** display only
  bookings matching their respective status.
  The **Sắp tới** badge includes both upcoming confirmed and pending-payment
  bookings; `Các đơn khác` is counted separately from upcoming trips.
- Details show recorded dates, room/ticket quantities, customer information,
  totals and payment transactions. Existing payment and cancellation controls
  are preserved.
- Usage QR images encode the existing backend `qr_code` locally using `qrcode`;
  no new usage token is issued. Only confirmed, unused lines expose a token.
  Payment VietQR remains in the existing separate payment section.
- `In / Lưu PDF biên nhận` prints only the Booking Receipt. Choose the browser's
  **Save as PDF** destination to download it; this is not a tax invoice.

Current data limits are preserved: the list API returns the latest 100 bookings;
older bookings remain reachable by their detail URL. Guest counts are not stored
in the current booking models, so the UI shows recorded room/ticket quantities.
Missing images use a placeholder, and missing recorded fields are identified as
unavailable rather than fabricated. Marking a trip `COMPLETED` remains the
responsibility of the existing backend workflow.

Run the focused automated checks from the project root:

```powershell
node frontend/test/trip-management.test.js
node backend/test/customer-trip-management.test.js
node backend/test/ticket-orders.test.js
node backend/test/ticket-selection.test.js
```

Optional browser regression checks use intercepted API fixtures without touching
the database. Build and run `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5178`
inside `frontend`, then in another PowerShell terminal at the project root:

```powershell
npm install --prefix "$env:TEMP\travelio-trip-qa" --no-save --ignore-scripts playwright-core jsqr
$env:TRIP_QA_MODULES = "$env:TEMP\travelio-trip-qa\node_modules"
node frontend/test/trip-management.browser.cjs
```

The browser check uses installed Chrome on Windows; override `TRIP_QA_CHROME`
or `TRIP_QA_URL` when needed. It checks tabs, pending access, loading/empty/error
states, mobile layout, selected details, QR decoding and visibility, receipt
printing/PDF, unavailable bookings and the anonymous login redirect. Screenshots
and a sample receipt PDF are written to the system temporary directory.
