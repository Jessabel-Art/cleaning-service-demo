Contact Model — normalization helpers

Purpose

This module centralizes phone and address normalization and display formatting so the rest of the app can treat profile and booking contact data in a single canonical shape.

File

- `src/lib/contactModel.js`

What it provides

- normalizePhone(raw: string | undefined | null): string
  - Removes non-digits and returns a digits-only string (e.g. `"(401) 555-1212"` -> `"4015551212"`).

- formatPhoneForDisplay(value: string | undefined | null): string
  - Formats a normalized phone for display. For US 10-digit numbers returns `(XXX) XXX-XXXX`. Falls back to `+{digits}` for longer values and to digits-only for other lengths.

- normalizeAddress(input: any): Address
  - Normalizes many possible address shapes into the canonical address shape with keys: `id`, `line1`, `line2`, `city`, `state`, `zip`, `nickname`, `accessInstructions`, `isDefault`.

- buildAddressSummary(addr: Partial<Address> | null | undefined): string
  - Builds a single-line summary like `"123 Main St, City ST 01234"`.

- pickDefaultAddress(addresses: any[]): Address | null
  - Returns the address marked `isDefault`, or the first normalized address if none explicitly marked.

- deriveProfileAddressFields(addresses: any[] | undefined | null): { address, addressSummary }
  - Returns an `address` object suitable for writing into `profiles/{uid}.address` and a user-friendly `addressSummary` string.

Usage examples

1) Normalize a phone before saving to Firestore:

```js
import { normalizePhone } from '@/lib/contactModel';

const normalized = normalizePhone(form.phone);
await updateProfileContact(uid, { phone: normalized });
```

2) Format a phone for display in the UI:

```js
import { formatPhoneForDisplay } from '@/lib/contactModel';

<p>{formatPhoneForDisplay(profile.phone) || '—'}</p>
```

3) Normalize a service address and derive profile address fields:

```js
import { normalizeAddress, deriveProfileAddressFields } from '@/lib/contactModel';

const normalizedAddr = normalizeAddress({ street: form.street, city: form.city, state: form.state, zip: form.zip });
const { address, addressSummary } = deriveProfileAddressFields([normalizedAddr]);
await upsertProfile(uid, { address, addressSummary });
```

Migration guidance

- There is a local migration script at `scripts/migrate-fullname-to-name.js` that copies legacy `profiles.{fullName}` to the canonical `profiles.{name}` field. Run a dry-run first, then apply.

  Dry run (PowerShell):

  ```powershell
  $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\service-account.json'
  node .\scripts\migrate-fullname-to-name.js
  ```

  Apply (PowerShell):

  ```powershell
  $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\service-account.json'
  node .\scripts\migrate-fullname-to-name.js --apply
  ```

- An admin-only Cloud Function `migrateProfiles_fullNameToName` was added to `functions/index.js` as an alternate way to migrate in-place (requires a signed-in admin ID token and deploy).

Next steps

- After running the migration (and verifying results), consider removing any remaining legacy fallbacks for `fullName` in the codebase and convert any address-writing components to call `normalizeAddress` before persisting.
- Add unit tests for the contactModel helpers to catch regressions.

Contact

If you want, I can:
- Prepare a follow-up PR replacing any remaining write sites that still write ad-hoc address/phone shapes
- Add unit tests for `contactModel` using the project's test setup
- Walk through running the migration and verifying in your Firestore console

