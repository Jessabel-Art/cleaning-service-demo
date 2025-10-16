# Cloud Function: sweepCompleteBookings

This function marks 'confirmed' bookings as 'completed' when the booking `endAt` is older than a grace period (default 2 hours).

Files:
- index.js - HTTP Cloud Function
- package.json - function dependencies

Deploy with Firebase CLI:

1. Install Firebase CLI and authenticate:

```powershell
npm install -g firebase-tools
firebase login
```

2. Initialize functions (if not already):

```powershell
cd functions
npm install
# if you haven't run firebase init in project root:
# firebase init functions
```

3. Deploy the function:

```powershell
# from project root
firebase deploy --only functions:sweepCompleteBookings
```

4. After deployment, set `VITE_SWEEP_URL` in your frontend environment to the HTTPS trigger URL reported by Firebase, e.g. `https://us-central1-YOUR_PROJECT.cloudfunctions.net/sweepCompleteBookings`.

You can test the function locally with the emulator or via `curl` once deployed.

Optional query params:
- graceMs (milliseconds): override the default grace period, e.g. `?graceMs=3600000` for 1 hour.
