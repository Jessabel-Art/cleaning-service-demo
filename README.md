# Cleaning Services Demo

Frontend-only cleaning business demo built with React and Vite.

This repository is intentionally static. It uses local hardcoded demo data for:

- Booking flow
- Client portal
- Admin portal
- Calendar views
- Clients
- Appointments
- Invoices
- Payment-status examples

No live backend, database, authentication provider, cloud storage, cloud functions, payment processor, map service, or external calendar API is required to run the demo.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Demo Credentials

Use the credentials shown on the login screen. They are local demo values only and do not authenticate against any external service.

## Security Notes

- Do not commit `.env` files.
- Do not commit service account files, credential JSON files, client-secret files, or platform config files.
- Keep this repo free of real production secrets, platform identifiers, private keys, and backend URLs.
- Add any future production integrations in a separate private implementation or behind a server-side boundary.

## Data Source

All demo data lives under `src/data`.
