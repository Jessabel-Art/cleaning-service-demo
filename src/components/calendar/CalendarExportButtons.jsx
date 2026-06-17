// src/components/calendar/CalendarExportButtons.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { buildICS, downloadICSFile } from '@/utils/calendar';

export default function CalendarExportButtons({
  title = 'Cleaning Appointment',
  start,
  end,
  details,
  location,
  uid,
  fileName = 'cleanpro-booking.ics',
  size = 'sm',
}) {
  if (!start || !end) return null;

  const handleDownload = () => {
    const ics = buildICS({ title, start, end, details, location, uid });
    downloadICSFile(ics, fileName);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button
        size={size}
        className="bg-gold hover:bg-gold/90 text-white rounded-full"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4 mr-1" />
        Download calendar file
      </Button>
    </div>
  );
}
