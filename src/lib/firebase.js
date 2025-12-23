import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions"; // ⬅️ NEW

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔹 NEW: Functions instance
const functions = getFunctions(app);

// Firestore emulator: only connect if explicitly enabled via env flag
const useFirestoreEmulator = import.meta.env.VITE_USE_FIRESTORE_EMULATOR === "true";
const firestoreEmulatorHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || "localhost";
const firestoreEmulatorPort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);

// Functions emulator: only use on localhost in browser (for cloud function testing)
if (typeof location !== 'undefined' && location.hostname === "localhost") {
  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
  } catch {
    // avoid crash if called twice in hot-reload
  }
}

// Firestore emulator: only when explicitly enabled
if (useFirestoreEmulator) {
  try {
    connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort);
    if (import.meta.env.DEV) {
      console.info(
        `🔥 Firestore Emulator enabled: ${firestoreEmulatorHost}:${firestoreEmulatorPort}`
      );
    }
  } catch {
    // avoid crash if called twice in hot-reload
  }
}

export { app, auth, db, functions }; // ⬅️ export it
