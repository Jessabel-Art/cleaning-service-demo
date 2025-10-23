// src/lib/sweep.ts
import { auth } from '@/lib/firebase';

const SWEEP_URL = (import.meta.env.VITE_SWEEP_URL as string) || '';
const REQUIRE_AUTH = (import.meta.env.VITE_SWEEP_REQUIRE_AUTH ?? 'true') !== 'false';

export function getSweepUrl() {
  return SWEEP_URL;
}

export async function runSweep(opts: { removeSeeds: boolean; dryRun: boolean }) {
  if (!SWEEP_URL) throw new Error('Sweep URL not configured');

  let idToken: string | undefined;
  if (REQUIRE_AUTH) {
    const u = auth.currentUser;
    if (!u) throw new Error('Please sign in as admin to run the sweep.');
    idToken = await u.getIdToken();
  }

  const res = await fetch(SWEEP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      removeTestBookings: !!opts.removeSeeds, // renamed to match Cloud Function
      dryRun: !!opts.dryRun,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    try {
      const j = JSON.parse(text);
      throw new Error(j.error || j.message || text);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}
