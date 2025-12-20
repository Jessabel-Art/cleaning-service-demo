// src/pages/admin/components/AdminDiagnostics.jsx
// Reusable admin access diagnostics panel for debugging authorization issues
import React from "react";
import { getApp } from "firebase/app";

export function AdminDiagnostics({ user, isAdmin, allowlistInfo, authReason, className = "", isDev = false }) {
  const [projectId, setProjectId] = React.useState("(unknown)");
  const checks = allowlistInfo?.checks || {};

  React.useEffect(() => {
    try {
      const app = getApp();
      setProjectId(app.options.projectId || "(unknown)");
    } catch {
      setProjectId("(error)");
    }
  }, []);

  // In production, show limited info only; in dev, show everything
  const showFullDiagnostics = isDev;

  return (
    <div className={`p-6 m-4 rounded-lg border-2 border-dashed border-plum/40 bg-white shadow-lg text-sm text-plum space-y-3 max-w-2xl ${className}`}>
      <div className="font-bold text-lg text-plum border-b border-plum/20 pb-2">
        🔐 Admin Access Diagnostics
      </div>
      
      {showFullDiagnostics && (
        <div className="space-y-2">
          <div className="font-semibold text-plum/80">Firebase Project</div>
          <div className="pl-3 space-y-1 text-xs">
            <div><span className="font-medium">Project ID:</span> <span className="font-mono">{projectId}</span></div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="font-semibold text-plum/80">Firebase Auth</div>
        <div className="pl-3 space-y-1 text-xs">
          <div><span className="font-medium">UID:</span> <span className="font-mono break-all">{user?.uid || "(none)"}</span></div>
          <div><span className="font-medium">Email:</span> {user?.email || "(none)"}</div>
          {showFullDiagnostics && (
            <div><span className="font-medium">Email verified:</span> {user?.emailVerified ? "✓ Yes" : "✗ No"}</div>
          )}
        </div>
      </div>

      {showFullDiagnostics && (
        <>
          <div className="space-y-2">
            <div className="font-semibold text-plum/80">Allowlist Check (dev fallback)</div>
            <div className="pl-3 space-y-1 text-xs">
              <div>
                <span className="font-medium">Email match:</span>{" "}
                {checks.allowlistEmail ? (
                  <span className="text-green-700 font-bold">✓ Yes</span>
                ) : (
                  <span className="text-red-700 font-bold">✗ No</span>
                )}
              </div>
              <div>
                <span className="font-medium">UID match:</span>{" "}
                {checks.allowlistUid ? (
                  <span className="text-green-700 font-bold">✓ Yes</span>
                ) : (
                  <span className="text-red-700 font-bold">✗ No</span>
                )}
              </div>
              <div className="mt-2">
                <span className="font-medium">Email allowlist:</span>
                <div className="pl-2 text-plum/70 font-mono text-[11px]">
                  {(allowlistInfo?.emailAllowlist || []).join(", ") || "(empty)"}
                </div>
              </div>
              <div className="mt-2">
                <span className="font-medium">UID allowlist:</span>
                <div className="pl-2 text-plum/70 font-mono text-[11px] break-all">
                  {(allowlistInfo?.uidAllowlist || []).join(", ") || "(empty)"}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-plum/80">Firestore Signals</div>
            <div className="pl-3 space-y-1 text-xs">
              <div>
                <span className="font-medium">admins/{"{uid}"} active:</span>{" "}
                {allowlistInfo?.adminDocFetched ? (
                  <span className="text-green-700 font-bold">✓ Yes</span>
                ) : allowlistInfo?.adminDocFetched === false && allowlistInfo?.adminDocFetched !== undefined ? (
                  <span className="text-red-700 font-bold">✗ No</span>
                ) : (
                  <span className="text-gray-600">⊘ Skipped</span>
                )}
              </div>
              <div>
                <span className="font-medium">profile role admin/owner:</span>{" "}
                {allowlistInfo?.profileFetched ? (
                  <span className="text-green-700 font-bold">✓ Yes</span>
                ) : allowlistInfo?.profileFetched === false && allowlistInfo?.profileFetched !== undefined ? (
                  <span className="text-red-700 font-bold">✗ No</span>
                ) : (
                  <span className="text-gray-600">⊘ Skipped</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <div className="font-semibold text-plum/80">Authorization Result</div>
        <div className="pl-3 space-y-1 text-xs">
          <div>
            <span className="font-medium">Admin access:</span>{" "}
            {isAdmin ? (
              <span className="text-green-700 font-bold">✓ GRANTED</span>
            ) : (
              <span className="text-red-700 font-bold">✗ DENIED</span>
            )}
          </div>
          <div className="text-plum/60 italic mt-1">
            {authReason || "Authorization reason unavailable"}
          </div>
          {showFullDiagnostics && (
            <div className="text-plum/60">
              <span className="font-medium">Checked at:</span> {allowlistInfo?.checkedAt || "(pending)"}
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-plum/20 text-xs text-plum/60">
        {showFullDiagnostics ? (
          <>💡 Full diagnostics shown in dev mode</>
        ) : (
          <>💡 Limited diagnostics shown (add <code className="bg-plum/10 px-1 rounded">?debug=1</code> for admins)</>
        )}
      </div>
    </div>
  );
}
