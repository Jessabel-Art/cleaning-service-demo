// src/pages/admin/MaintenanceView.jsx
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,            // 🔹 add this
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { auth } from "@/lib/firebase";
import { getApp } from "firebase/app";
import { AlertTriangle } from "lucide-react";

const ENV_SWEEP_URL = import.meta.env.VITE_SWEEP_URL || null;
const REQUIRE_AUTH =
  (import.meta.env.VITE_SWEEP_REQUIRE_AUTH ?? "true") !== "false";

// Try to pull an array of modified bookings from whatever
// shape the Cloud Function returns.
function extractLogsFromResponse(json) {
  if (!json || typeof json !== "object") return [];

  const candidates = [
    json.modifiedBookings,
    json.updatedBookings,
    json.bookings,
    json.records,
    json.logs,
    json.log,
    json.details,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

export default function MaintenanceView() {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const [removeTestBookings, setRemoveTestBookings] = React.useState(true);
  const [dryRun, setDryRun] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // simple in-memory log of what the sweep reports
  const [logEntries, setLogEntries] = React.useState([]);

  // Build a reliable fallback endpoint when ENV not provided
  const endpoint = React.useMemo(() => {
    if (ENV_SWEEP_URL) return ENV_SWEEP_URL;
    try {
      const app = getApp();
      const projectId = app?.options?.projectId;
      if (projectId) {
        return `https://us-central1-${projectId}.cloudfunctions.net/sweepCompleteBookings`;
      }
    } catch {
      // ignore – will fall back to null
    }
    return null;
  }, []);

  const runSweep = async () => {
    if (!endpoint) {
      toast({
        title: "Sweep unavailable",
        description:
          "Could not determine the sweep endpoint. Provide VITE_SWEEP_URL or ensure Firebase config has a projectId.",
        variant: "destructive",
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
            title: "Sign in required",
            description: "Please sign in as an admin to run the sweep.",
            variant: "destructive",
          });
          setBusy(false);
          return;
        }
        idToken = await u.getIdToken();
      }

      const body = { removeTestBookings, dryRun };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        // plain text response; leave json as {}
      }

      if (!res.ok) {
        const msg =
          json?.error || json?.message || text || `HTTP ${res.status}`;
        setResult({ ok: false, status: res.status, error: msg });
        toast({
          title: "Sweep failed",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      const updated = json?.updated ?? json?.completedMarked ?? 0;

      setResult({ ok: true, updated, raw: json });

      // Try to capture per-booking changes into log history
      const logs = extractLogsFromResponse(json);
      if (logs.length) {
        const timestamp = new Date().toISOString();
        setLogEntries((prev) => [
          ...logs.map((entry) => ({ timestamp, entry })),
          ...prev,
        ]);
      }

      toast({
        title: "Sweep completed",
        description: `${updated} records updated.`,
      });
    } catch (e) {
      const msg = e?.message || String(e);
      setResult({ ok: false, error: msg });
      toast({
        title: "Sweep failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto">
      <Card className="bg-white border-[#F1D8E8] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[#431039]">
            Run sweep (auto-complete &amp; cleanup)
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Irreversible-action warning banner */}
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm flex gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">
                Careful — some changes can’t be undone.
              </p>
              <p className="mt-1 text-[13px]">
                When <span className="font-semibold">Dry run</span> is turned
                off, bookings may be permanently marked completed or removed
                (for test/seed records). Make sure your settings are correct
                before running the sweep.
              </p>
            </div>
          </div>

          <p className="mb-3 text-sm text-muted-foreground">
            Mark past-end confirmed bookings as completed, remove test/seed
            bookings, and tidy up orphaned sessions.
          </p>

          {endpoint && (
            <p className="text-sm text-muted-foreground mb-3">
              Endpoint: <code className="text-xs">{endpoint}</code>
            </p>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={removeTestBookings}
                  onCheckedChange={(v) => setRemoveTestBookings(!!v)}
                />
                <span>Remove test/seed bookings</span>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={dryRun}
                  onCheckedChange={(v) => setDryRun(!!v)}
                />
                <span>Dry run (no destructive changes)</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={busy}
                    className="bg-plum text-white"
                  >
                    {busy ? "Running…" : "Run sweep now"}
                  </Button>
                </DialogTrigger>

                <DialogContent
                  className="
                    sm:max-w-lg
                    w-[95%]
                    bg-white
                    border border-plum/15
                    shadow-2xl
                    rounded-2xl
                    p-6
                  "
                >
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-[#431039]">
                      Confirm sweep
                    </DialogTitle>
                  </DialogHeader>

                  <div className="mt-2 text-sm text-[#431039]">
                    <p>This action will:</p>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>
                        Mark past-end confirmed bookings as completed.
                      </li>
                      <li>
                        {removeTestBookings
                          ? "Remove test/seed bookings."
                          : "Keep test/seed bookings intact."}
                      </li>
                      <li>
                        {dryRun
                          ? "Simulate the run (no destructive changes)."
                          : "Apply cleanup changes to the live data."}
                      </li>
                    </ul>
                    {!dryRun && (
                      <p className="mt-3 text-amber-700 text-xs">
                        Once applied, these changes cannot be automatically
                        rolled back.
                      </p>
                    )}
                  </div>

                  <DialogFooter className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmOpen(false)}
                    >
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
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {!endpoint && (
                <div className="text-sm text-muted-foreground">
                  Using project-based default. You can also set{" "}
                  <code>VITE_SWEEP_URL</code>.
                </div>
              )}
            </div>
          </div>

          {/* Result summary */}
          {result && (
            <div
              className={`mt-4 p-3 rounded text-sm ${
                result.ok
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {result.ok ? (
                <div>
                  Sweep completed — {result.updated ?? "0"} records updated.
                </div>
              ) : (
                <div>
                  Failed: {result.status ? `HTTP ${result.status}` : ""}{" "}
                  {result.error || ""}
                </div>
              )}
            </div>
          )}

          {/* Log history panel */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[#431039] mb-2">
              Log history
            </h3>
            <div className="rounded-xl border border-[#F1D8E8] bg-[#FFFCFE] max-h-64 overflow-y-auto text-xs text-[#431039]">
              {logEntries.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-gray-500">
                  No sweep runs have reported individual booking changes yet.
                  When the sweep returns a list of modified bookings, they’ll
                  appear here.
                </div>
              ) : (
                <ul className="divide-y divide-[#F1D8E8]">
                  {logEntries.map(({ timestamp, entry }, idx) => {
                    const id =
                      entry?.id ||
                      entry?.bookingId ||
                      entry?.ref ||
                      `Entry ${logEntries.length - idx}`;

                    const beforeStatus =
                      entry?.beforeStatus || entry?.fromStatus;
                    const afterStatus =
                      entry?.afterStatus || entry?.toStatus || entry?.status;

                    return (
                      <li key={idx} className="px-3 py-2">
                        <div className="flex justify-between gap-2 mb-1">
                          <span className="font-medium">{id}</span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] leading-snug">
                          {beforeStatus || afterStatus ? (
                            <span>
                              Status{" "}
                              {beforeStatus
                                ? `${beforeStatus} → ${afterStatus || "?"}`
                                : afterStatus}
                            </span>
                          ) : (
                            <code className="block whitespace-pre-wrap">
                              {JSON.stringify(entry, null, 2)}
                            </code>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
