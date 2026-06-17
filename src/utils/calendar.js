// src/utils/calendar.js

// --- Helpers ---------------------------------------------------------------

// Format a Date to ICS-friendly UTC "YYYYMMDDTHHMMSSZ"
function toICSDateUTC(date) {
  if (!date) throw new Error('Date is required');
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

// Escape text for ICS fields (commas/semicolons/newlines)
function icsEscape(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Fold long lines per RFC 5545 (75 octets max; continue with CRLF + space).
 * This simple implementation uses 75 characters which is fine for ASCII.
 */
function foldLine(line, limit = 75) {
  if (!line || line.length <= limit) return line;
  const parts = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + limit);
    parts.push(i === 0 ? chunk : ' ' + chunk); // continuation lines start with a single space
    i += limit;
  }
  return parts.join('\r\n');
}

function foldICSLines(lines) {
  return lines.map((l) => foldLine(l)).join('\r\n');
}

// --- Public API ------------------------------------------------------------

/**
 * Build an .ics file string that imports to Apple/Outlook/etc.
 * Includes line folding for better compatibility (esp. older Outlook).
 */
export function buildICS({ title, start, end, details, location, uid }) {
  if (!start || !end) throw new Error('Start and end dates are required');
  const dtStart = toICSDateUTC(start);
  const dtEnd = toICSDateUTC(end);
  const dtStamp = toICSDateUTC(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//CleanPro Demo//Calendar Export//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${icsEscape(uid || `${Date.now()}@cleanprodemo.local`)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscape(title || 'Cleaning Appointment')}`,
    `DESCRIPTION:${icsEscape(details || '')}`,
    `LOCATION:${icsEscape(location || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return foldICSLines(lines);
}

/**
 * Trigger a browser download of an .ics string.
 */
export function downloadICSFile(icsString, filename = 'event.ics') {
  const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Optional default export if you prefer importing as an object
export default { buildICS, downloadICSFile };
