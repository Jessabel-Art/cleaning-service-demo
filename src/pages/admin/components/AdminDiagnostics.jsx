import React from "react";

export function AdminDiagnostics({
  user,
  isAdmin,
  authReason,
  className = "",
}) {
  return (
    <div className={`p-6 m-4 rounded-lg border-2 border-dashed border-plum/40 bg-white shadow-lg text-sm text-plum space-y-3 max-w-2xl ${className}`}>
      <div className="font-bold text-lg text-plum border-b border-plum/20 pb-2">
        Demo Admin Access Diagnostics
      </div>
      <div className="space-y-1 text-xs">
        <div>
          <span className="font-medium">User:</span>{" "}
          {user?.username || user?.email || "(none)"}
        </div>
        <div>
          <span className="font-medium">Role:</span>{" "}
          {user?.demoRole || "(none)"}
        </div>
        <div>
          <span className="font-medium">Admin access:</span>{" "}
          {isAdmin ? (
            <span className="text-green-700 font-bold">Granted</span>
          ) : (
            <span className="text-red-700 font-bold">Denied</span>
          )}
        </div>
        <div className="text-plum/60 italic">
          {authReason || "No authorization reason available"}
        </div>
      </div>
    </div>
  );
}
