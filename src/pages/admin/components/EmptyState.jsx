// src/pages/admin/components/EmptyState.jsx
import React from "react";
import { Button } from "@/components/ui/button";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-10 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#EEF5FB] mb-4">
        {Icon ? (
          <Icon className="w-7 h-7 text-gold" />
        ) : (
          <span className="text-2xl">✨</span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-plum">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-gray-500 max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          size="sm"
          className="mt-4 bg-gold text-white hover:bg-gold/90"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
