// src/pages/admin/components/FabNewBooking.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function FabNewBooking({ onClick, label = "New booking" }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-5 md:bottom-8 md:right-8 rounded-full shadow-lg shadow-[rgba(67,16,57,0.25)] bg-[#E2A82B] text-[#431039] hover:bg-[#F0BA3E] px-4 py-2 flex items-center gap-2 z-30"
    >
      <Plus className="w-4 h-4" />
      <span className="text-sm font-semibold">{label}</span>
    </Button>
  );
}
