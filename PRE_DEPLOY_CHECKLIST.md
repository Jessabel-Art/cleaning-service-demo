# Pre-Deploy Checklist

## Deployment Scope

- [ ] Use Firebase project `sanchez-services-11fd0`.
- [ ] Deploy Functions and Firestore rules/indexes only.
- [ ] Confirm Firebase Hosting is intentionally excluded; `firebase.json` has no `hosting` configuration.
- [ ] Run installs and deployment with Node 20. The Functions runtime is declared as Node 20 in `functions/package.json`.

## Required Functions Configuration

- [ ] Set `stripe.secret_key`.
- [ ] Set `stripe.frontend_url` to the production frontend origin.
- [ ] After deploying `stripeWebhook`, create or update the Stripe webhook endpoint to its deployed HTTPS URL.
- [ ] Set `stripe.signing_secret` to the signing secret issued for that webhook endpoint.

## Functions Environment Values

- [ ] Set `ADMIN_NOTIFICATION_EMAILS` for booking notification recipients.
- [ ] Optionally set `ADMIN_EMAILS` and/or `ADMIN_UIDS` as backend admin allowlists.
- [ ] Confirm capacity/payment defaults or override them as needed:
  - `SLOT_CAPACITY` defaults to `1`.
  - `DAILY_CAPACITY` defaults to `6`.
  - `REQUIRED_DEPOSIT_AMOUNT` defaults to `50`.
  - `PENDING_PAYMENT_TTL_MINUTES` defaults to `30`.
  - `PENDING_PAYMENT_SWEEP_BATCH` defaults to `200`.
  - `WEBHOOK_RECOVERY_MIN_AGE_MINUTES` defaults to `10`.
  - `WEBHOOK_RECOVERY_BATCH` defaults to `50`.

## Admin Access

- [ ] Before using admin routes, seed at least one authorized Firestore record:
  - `admins/{uid}` with `active: true`, or
  - `profiles/{uid}` with `role: "admin"` or `role: "owner"`.
- [ ] Do not rely only on Functions `ADMIN_EMAILS` or `ADMIN_UIDS`; Firestore rules require an admin/profile record for browser admin access.

## Verification And Deploy

- [ ] `npm.cmd ci`
- [ ] `npm.cmd --prefix functions ci`
- [ ] `npm.cmd test -- --run`
- [ ] `npm.cmd --prefix functions test`
- [ ] `npm.cmd run build`
- [ ] `node --check functions/index.js`
- [ ] `npx.cmd firebase-tools deploy --only functions,firestore --project sanchez-services-11fd0`

