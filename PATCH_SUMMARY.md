PR-style patch summary

Files changed:

- src/lib/db.js
  - Purpose: Normalize addresses stored in top-level `addresses/{uid}` documents using `contactModel.normalizeAddress`. Store canonical fields `line1`, `line2`, `city`, `state`, `zip`, `nickname`, `accessInstructions`, `isDefault`. Preserve timestamps and merge behavior.

- src/pages/ClientPortalPage.jsx
  - Purpose: Fix validation to use canonical address field `line1` (was `street`) after normalizeAddress is used for address creation/editing in the client portal.

Why these changes:

- Standardize address shape across the codebase (profiles, users' subcollection addresses, top-level addresses) to the canonical `contactModel` shape.
- Avoid mismatches and display/validation bugs caused by legacy field names like `street`.

Testing notes:

1. Build the app locally and verify no compile errors:

```powershell
npm run build
```

2. In the client portal, add/edit an address and verify the add/edit flow succeeds and the resulting document in Firestore contains `line1`/`line2`/`city`/`state`/`zip` fields.

3. Verify admin views that read addresses still function (they read and format via `contactModel.buildAddressSummary`).

How to make a branch and prepare a PR locally:

```powershell
git checkout -b feat/canonical-contact-sweep
git add src/lib/db.js src/pages/ClientPortalPage.jsx PATCH_SUMMARY.md
git commit -m "feat: normalize address writes to canonical contactModel; fix client portal validation"
git push -u origin feat/canonical-contact-sweep
```

Next steps I can take (choose one):
- Continue an automated sweep to find and patch remaining ad-hoc address/phone write sites (I will search for setDoc/addDoc/updateDoc patterns that include legacy fields and produce patches). 
- Prepare a single PR with all remaining safe replacements and add unit tests for `contactModel`.
- Stop here and let you review the current changes.

If you want me to continue, say "Please continue sweep" and I will run the next pass to find additional write sites and produce PR-style patches for them.
