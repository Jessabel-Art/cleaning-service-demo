// src/pages/admin/MaintenanceView.jsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { auth } from '@/lib/firebase';
import { getApp } from 'firebase/app';

const ENV_SWEEP_URL = import.meta.env.VITE_SWEEP_URL || null;
const REQUIRE_AUTH = (import.meta.env.VITE_SWEEP_REQUIRE_AUTH ?? 'true') !== 'false';

export function MaintenanceView() {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const [removeTestBookings, setRemoveTestBookings] = React.useState(true);
  const [dryRun, setDryRun] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Build a reliable fallback endpoint when ENV not provided
  const endpoint = React.useMemo(() => {
    if (ENV_SWEEP_URL) return ENV_SWEEP_URL;
    try {
      const app = getApp();
      const projectId = app?.options?.projectId;
      if (projectId) {
        return `https://us-central1-${projectId}.cloudfunctions.net/sweepCompleteBookings`;
      }
    } catch {}
    return null;
  }, []);

  const runSweep = async () => {
    if (!endpoint) {
      toast({
        title: 'Sweep unavailable',
        description: 'Could not determine the sweep endpoint. Provide VITE_SWEEP_URL or ensure Firebase config has a projectId.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setBusy(true);

      let idToken;
      if (REQUIRE_AUTH) {
        const u = auth.currentUser;
        if (!u) {
          toast({
            title: 'Sign in required',
            description: 'Please sign in as an admin to run the sweep.',
            variant: 'destructive',
          });
          setBusy(false);
          return;
        }
        idToken = await u.getIdToken();
      }

      const body = { removeTestBookings, dryRun };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let json = {};
      try { json = text ? JSON.parse(text) : {}; } catch { /* plain text */ }

      if (!res.ok) {
        const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
        setResult({ ok: false, status: res.status, error: msg });
        toast({ title: 'Sweep failed', description: msg, variant: 'destructive' });
        return;
      }

      const updated = json?.updated ?? json?.completedMarked ?? 0;
      setResult({ ok: true, updated, raw: json });
      toast({ title: 'Sweep completed', description: `${updated} records updated.` });
    } catch (e) {
      const msg = e?.message || String(e);
      setResult({ ok: false, error: msg });
      toast({ title: 'Sweep failed', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run sweep (auto-complete & cleanup)</CardTitle>
      </CardHeader>

      <CardContent>
        <p className="mb-3">
          Mark past-end confirmed bookings as completed, remove test/seed bookings, and tidy up orphaned sessions.
        </p>

        {/* Subtle endpoint note; no dev-ish wording */}
        {endpoint && (
          <p className="text-sm text-muted mb-3">
            Endpoint: <code className="text-xs">{endpoint}</code>
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={removeTestBookings}
                onCheckedChange={(v) => setRemoveTestBookings(!!v)}
              />
              <span className="text-sm">Remove test/seed bookings</span>
            </label>

            <label className="flex items-center gap-2">
              <Checkbox checked={dryRun} onCheckedChange={(v) => setDryRun(!!v)} />
              <span className="text-sm">Dry run (no destructive changes)</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={busy}
                  className="bg-plum text-white"
                >
                  {busy ? 'Running…' : 'Run sweep now'}
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <h3 className="text-lg font-semibold">Confirm sweep</h3>
                </DialogHeader>

                <div className="mt-2">
                  <p>This action will:</p>
                  <ul className="list-disc ml-5 mt-2 text-sm">
                    <li>Mark past-end confirmed bookings as completed.</li>
                    <li>
                      {removeTestBookings
                        ? 'Remove test/seed bookings.'
                        : 'Keep test/seed bookings intact.'}
                    </li>
                    <li>
                      {dryRun
                        ? 'Simulate the run (no destructive changes).'
                        : 'Perform cleanup changes.'}
                    </li>
                  </ul>
                </div>

                <DialogFooter>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        setConfirmOpen(false);
                        await runSweep();
                      }}
                      className="bg-plum text-white"
                    >
                      Confirm and run
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {!endpoint && (
              <div className="text-sm text-muted">
                Using project-based default. You can also set <code>VITE_SWEEP_URL</code>.
              </div>
            )}
          </div>
        </div>

        {result && (
          <div
            className={`mt-4 p-3 rounded ${
              result.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {result.ok ? (
              <div>
                Sweep completed — {result.updated ?? '0'} records updated.
              </div>
            ) : (
              <div>
                Failed: {result.status ? `HTTP ${result.status}` : ''}{' '}
                {result.error || ''}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
