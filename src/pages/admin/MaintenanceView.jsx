// src/pages/admin/MaintenanceView.jsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { runSweep, getSweepUrl } from '@/lib/sweep';

export function MaintenanceView() {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const [removeTestBookings, setRemoveTestBookings] = React.useState(true);
  const [dryRun, setDryRun] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const SWEEP_URL = getSweepUrl();

  const runSweepHandler = async () => {
    try {
      setBusy(true);
      const res = await runSweep({ removeSeeds: removeTestBookings, dryRun });
      const updated = res?.updated || res?.count || 0;
      setResult({ ok: true, updated });
      toast({ title: `Sweep completed`, description: `${updated} records updated or cleaned.` });
    } catch (e) {
      console.error('Sweep error:', e);
      setResult({ ok: false, error: e.message });
      toast({
        title: 'Sweep failed',
        description: e.message,
        variant: 'destructive',
      });
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
          This will mark past-end confirmed bookings as completed, remove test/seed bookings, and clean orphaned sessions where applicable.
        </p>

        {SWEEP_URL ? (
          <p className="text-sm text-muted mb-3">
            Endpoint: <code className="text-xs">{SWEEP_URL}</code>
          </p>
        ) : (
          <p className="text-sm text-muted mb-3">
            Remote sweep not configured. Add <code>VITE_SWEEP_URL</code> to your <code>.env</code> or configure a remote sweep endpoint.
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
                  disabled={!SWEEP_URL || busy}
                  className="bg-plum text-white"
                  title={!SWEEP_URL ? 'VITE_SWEEP_URL not configured' : ''}
                >
                  {busy ? 'Running…' : 'Run sweep now'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <h3 className="text-lg font-semibold">Confirm sweep</h3>
                </DialogHeader>
                <div className="mt-2">
                  <p>Are you sure you want to run the maintenance sweep?</p>
                  <ul className="list-disc ml-5 mt-2 text-sm">
                    <li>Marks past-end confirmed bookings as completed.</li>
                    <li>
                      {removeTestBookings
                        ? 'Will remove test/seed bookings.'
                        : 'Will not remove test/seed bookings.'}
                    </li>
                    <li>
                      {dryRun
                        ? 'This is a dry run — no destructive changes will be made.'
                        : 'This run may perform destructive cleanup.'}
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
                        await runSweepHandler();
                      }}
                      className="bg-plum text-white"
                    >
                      Confirm and run
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {!SWEEP_URL && (
              <div className="text-sm text-muted">
                Not configured in dev. Add VITE_SWEEP_URL in .env.
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
                Sweep completed — {result.updated ?? '0'} records updated or cleaned.
              </div>
            ) : (
              <div>Failed: {result.error || 'Unknown error'}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
