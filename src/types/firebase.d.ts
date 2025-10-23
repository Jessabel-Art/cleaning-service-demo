declare module '@/lib/firebase' {
  import type { Auth } from 'firebase/auth';
  import type { Firestore } from 'firebase/firestore';
  export const auth: Auth;
  export const db: Firestore;
  export default { auth, db };
}
