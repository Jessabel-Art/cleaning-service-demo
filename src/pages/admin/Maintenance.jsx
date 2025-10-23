import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { runSweep, getSweepUrl } from '@/lib/sweep';

export default function MaintenancePanel() {
  const { toast } = useToast();
  const [removeSeeds, setRemoveSeeds] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [busy, setBusy] = useState(false);

  const sweepUrl = useMemo(() => getSweepUrl(), []);
  const configured = !!sweepUrl;

  async function handleRun() {
    if (!configured || busy) return;
    setBusy(true);
    try {
      const result = await runSweep({ removeSeeds, dryRun });
      toast({
        title: dryRun ? 'Sweep simulated' : 'Sweep complete',
        description: typeof result === 'object' ? JSON.stringify(result) : String(result),
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Sweep failed',
        description: String(e?.message || e),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-plum/70">
        {configured
          ? <>
              Endpoint: <code className="text-xs">{sweepUrl}</code>
            </>
          : <>
              Remote sweep not configured. Add <code>VITE_SWEEP_URL</code> to your env.
            </>}
      </p>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={removeSeeds} onChange={e => setRemoveSeeds(e.target.checked)} />
        <span>Remove test/seed bookings</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
        <span>Dry run (no destructive changes)</span>
      </label>

      <Button onClick={handleRun} disabled={!configured || busy}>
        {busy ? 'Running…' : 'Run sweep now'}
      </Button>

      {!configured && (
        <p className="text-xs text-plum/60">
          Not configured in this build. Set <code>VITE_SWEEP_URL</code> in your production env.
        </p>
      )}
    </div>
  );
}
