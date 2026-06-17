// src/components/calendar/CalendarExportButtons.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Download } from 'lucide-react';
import { buildGoogleCalendarUrl, buildICS, downloadICSFile } from '@/utils/calendar';

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

  const googleUrl = buildGoogleCalendarUrl({ title, start, end, details, location });
  const handleDownload = () => {
    const ics = buildICS({ title, start, end, details, location, uid });
    downloadICSFile(ics, fileName);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button asChild size={size} className="bg-gold hover:bg-gold/90 text-white rounded-full">
        <a href={googleUrl} target="_blank" rel="noopener noreferrer">
          <Calendar className="h-4 w-4 mr-1" />
          Add to Google Calendar
        </a>
      </Button>
      <Button
        size={size}
        variant="outline"
        className="border-gold text-gold hover:bg-gold/10 hover:text-gold rounded-full"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4 mr-1" />
        Download .ics (Apple/Outlook)
      </Button>
    </div>
  );
}
