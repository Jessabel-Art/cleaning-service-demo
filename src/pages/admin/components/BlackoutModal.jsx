// src/pages/admin/components/BlackoutModal.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export default function BlackoutModal({
  open,
  onOpenChange,
  onSave,
  initialValue,
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;

    if (initialValue) {
      setStartDate(initialValue.startDate || "");
      setEndDate(initialValue.endDate || "");
      setStartTime(initialValue.startTime || "");
      setEndTime(initialValue.endTime || "");
      setAllDay(initialValue.allDay ?? true);
      setReason(initialValue.reason || "");
    } else {
      setStartDate("");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setAllDay(true);
      setReason("");
    }
  }, [open, initialValue]);

  const handleSave = () => {
    if (!startDate) return;

    onSave?.({
      startDate,
      endDate: endDate || startDate,
      startTime: allDay ? null : startTime || "00:00",
      endTime: allDay ? null : endTime || "23:59",
      allDay,
      reason: reason.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          sm:max-w-lg
          w-[95%]
          bg-white
          text-plum
          border border-plum/15
          shadow-2xl
          rounded-2xl
          p-4 sm:p-5 md:p-6
          max-h-[90vh]
          overflow-y-auto
        "
      >
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-semibold text-[#431039]">
            Block time on calendar
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-xs text-[#6C3A63]">
            Prevent clients from booking during this date or time range.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-xs font-medium text-[#431039] mb-1 sm:mb-1">
                Start date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#431039] mb-1 sm:mb-1">
                End date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={allDay}
              onCheckedChange={(v) => setAllDay(!!v)}
              id="blackout-all-day"
            />
            <label
              htmlFor="blackout-all-day"
              className="text-xs sm:text-xs text-[#431039]"
            >
              All day
            </label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-xs font-medium text-[#431039] mb-1 sm:mb-1">
                  Start time
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#431039] mb-1 sm:mb-1">
                  End time
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#431039] mb-1 sm:mb-1">
              Reason (optional)
            </label>
            <textarea
              rows={3}
              className="w-full text-xs sm:text-sm rounded-md border border-gray-200 px-2.5 py-2 sm:px-3 sm:py-2 focus:outline-none focus:ring-2 focus:ring-[#B34A87]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vacation, blocked for deep clean, personal appointment…"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 sm:mt-5 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-[#E2A82B] text-[#431039] hover:bg-[#F0BA3E] w-full sm:w-auto"
            onClick={handleSave}
            disabled={!startDate}
          >
            Save blackout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
