// src/pages/admin/components/StatCard.jsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const TONES = {
  default: {
    bg: "bg-white",
    border: "border-[#F1D8E8]",
    label: "text-[#6C3A63]",
    value: "text-[#431039]",
    accentDot: "bg-[#E2A82B]",
  },
  success: {
    bg: "bg-[#F0FDF4]",
    border: "border-[#BBF7D0]",
    label: "text-[#166534]",
    value: "text-[#14532D]",
    accentDot: "bg-[#22C55E]",
  },
  warning: {
    bg: "bg-[#FFFBEB]",
    border: "border-[#FDE68A]",
    label: "text-[#854D0E]",
    value: "text-[#78350F]",
    accentDot: "bg-[#FACC15]",
  },
  info: {
    bg: "bg-[#EEF2FF]",
    border: "border-[#C7D2FE]",
    label: "text-[#3730A3]",
    value: "text-[#312E81]",
    accentDot: "bg-[#6366F1]",
  },
};

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}) {
  const t = TONES[tone] || TONES.default;

  return (
    <Card
      className={`${t.bg} ${t.border} border rounded-2xl shadow-[0_8px_20px_rgba(67,16,57,0.03)]`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${t.accentDot}`} />
          <CardTitle className={`text-xs font-medium tracking-wide ${t.label}`}>
            {label}
          </CardTitle>
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center shadow-inner">
            <Icon className="w-4 h-4 text-[#B34A87]" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${t.value}`}>{value}</div>
        {hint && (
          <p className="mt-1 text-xs text-gray-500 truncate" title={hint}>
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
