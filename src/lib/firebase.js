import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// Optional: point to emulator in dev only (port 5001 is Firebase default)
if (location.hostname === "localhost") {
  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
  } catch {
    // avoid crash if called twice in hot-reload
  }
}

export { app, auth, db, functions }; // ⬅️ export it
