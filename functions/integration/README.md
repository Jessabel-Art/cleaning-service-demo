This folder contains a simple integration test scaffold that uses the Firestore emulator to verify the `enqueueBookingEmail` Cloud Function writes a `mail` document when a booking is written.

Prerequisites
- Install Firebase CLI and start the emulators for Firestore and Functions:

  firebase emulators:start --only firestore,functions

- Alternatively, run the emulators in a separate terminal and ensure the environment variables are set (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` if needed).

Run the integration script

1. Start emulators as above.
2. In another terminal, run:

  node run-integration-test.js

The script will:
- write a booking document to the emulator's `bookings` collection
- wait up to 10 seconds for a `mail` document to appear referencing the bookingId
- report success/failure

Notes
- This is a lightweight harness and not a full test runner.
- For CI, you can script emulator startup and teardown, then run the script and fail on non-zero exit code.
