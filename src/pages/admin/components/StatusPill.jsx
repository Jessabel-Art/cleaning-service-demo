// src/pages/admin/components/StatusPill.jsx
import React from "react";

const STATUS_STYLES = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-800 border border-amber-200",
  },
  confirmed: {
    label: "Confirmed",
    className:
      "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  completed: {
    label: "Completed",
    className:
      "bg-sky-50 text-sky-800 border border-sky-200",
  },
  declined: {
    label: "Declined",
    className:
      "bg-rose-50 text-rose-800 border border-rose-200",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-slate-50 text-slate-700 border border-slate-200",
  },
};

export default function StatusPill({ status }) {
  if (!status) return null;

  const key = String(status).toLowerCase();
  const style = STATUS_STYLES[key] || {
    label: status,
    className:
      "bg-slate-50 text-slate-700 border border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}
