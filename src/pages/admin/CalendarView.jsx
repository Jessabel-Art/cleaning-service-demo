import React from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import addMinutes from 'date-fns/addMinutes';
import addDays from 'date-fns/addDays';
import isBefore from 'date-fns/isBefore';
import isAfter from 'date-fns/isAfter';
import isWithinInterval from 'date-fns/isWithinInterval';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export function CalendarView() {
  const [rows, setRows] = React.useState([]);
  const [filter, setFilter] = React.useState('current'); // past | current | next30 | future
  const [view, setView] = React.useState('month');
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [selectedRange, setSelectedRange] = React.useState(null); // {start, end}
  const navigate = useNavigate();

  React.useEffect(() => {
    const qRef = query(
      collection(db, 'bookings'),
      where('status', 'in', ['pending', 'confirmed', 'declined', 'completed']),
      orderBy('scheduledAt', 'asc')
    );
    const unsub = onSnapshot(qRef, (snap) => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const events = React.useMemo(() => rows.map(r => {
    const start = r.scheduledAt?.toDate?.() ?? r.startAt?.toDate?.();
    let end = r.endAt?.toDate?.();
    if (!end && start) {
      const dur = Number(r.durationMinutes || (r.durationHours ? r.durationHours * 60 : 120));
      end = addMinutes(start, dur);
    }
    const title = `${r.serviceName || r.service || 'Service'} — ${r.contact?.name || r.name || ''}`;
    return { id: r.id, title, start, end, resource: r };
  }).filter(e => e.start && e.end), [rows]);

  const now = React.useMemo(() => new Date(), []);

  const filteredEvents = React.useMemo(() => {
    if (filter === 'past') return events.filter(e => isBefore(e.end, new Date()));
    if (filter === 'current') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = addDays(new Date(start.getFullYear(), start.getMonth() + 1, 1), -1);
      return events.filter(e => isWithinInterval(e.start, { start, end }));
    }
    if (filter === 'next30') {
      const end = addDays(now, 30);
      return events.filter(e => (isAfter(e.start, now) || e.start >= now) && isBefore(e.start, end));
    }
    if (filter === 'future') return events.filter(e => isAfter(e.start, now) || e.start >= now);
    return events;
  }, [events, filter, now]);

  const eventStyleGetter = (event) => {
    const status = event.resource?.status;
    let bg = '#fff';
    if (status === 'pending') bg = '#fde68a'; // yellow
    if (status === 'confirmed') bg = '#bbf7d0'; // green
    if (status === 'declined') bg = '#fecaca'; // red
    if (status === 'completed') bg = '#e6e6e6';
    return { style: { backgroundColor: bg, borderRadius: 6, padding: '2px 6px', color: '#111' } };
  };
  // events for sidebar based on selectedRange (or date)
  const sidebarEvents = React.useMemo(() => {
    if (!selectedRange) return [];
    const { start, end } = selectedRange;
    return filteredEvents.filter(e => {
      // overlap test: event.start < end && event.end > start
      return e.start < end && e.end > start;
    }).sort((a,b) => a.start - b.start);
  }, [filteredEvents, selectedRange]);

  const printEvent = (ev) => {
    try {
      const win = window.open('', '_blank');
      if (!win) return;
      const r = ev.resource || {};
      win.document.write(`<html><head><title>Booking ${ev.title}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}</style></head><body>`);
      win.document.write(`<h1>${ev.title}</h1>`);
      win.document.write(`<p><strong>Client:</strong> ${r.contact?.name || r.name || '—'}</p>`);
      win.document.write(`<p><strong>Service:</strong> ${r.serviceName || r.service || '—'}</p>`);
      win.document.write(`<p><strong>When:</strong> ${ev.start?.toLocaleString()} — ${ev.end?.toLocaleString()}</p>`);
      win.document.write(`<p><strong>Address:</strong> ${r.address?.line1 || '—'}</p>`);
      if (r.notes) win.document.write(`<h3>Notes</h3><pre>${String(r.notes)}</pre>`);
      win.document.write(`<p>Printed: ${new Date().toLocaleString()}</p>`);
      win.document.write('</body></html>');
      win.document.close();
      win.focus();
      win.print();
    } catch (e) {
      console.error('Print failed', e);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-plum font-medium">Range</label>
          <div className="flex gap-2">
            <button onClick={() => setFilter('past')} className={`px-3 py-1 rounded ${filter==='past' ? 'bg-plum text-white' : 'bg-white border'}`}>Past</button>
            <button onClick={() => setFilter('current')} className={`px-3 py-1 rounded ${filter==='current' ? 'bg-plum text-white' : 'bg-white border'}`}>Current Month</button>
            <button onClick={() => setFilter('next30')} className={`px-3 py-1 rounded ${filter==='next30' ? 'bg-plum text-white' : 'bg-white border'}`}>Next 30 days</button>
            <button onClick={() => setFilter('future')} className={`px-3 py-1 rounded ${filter==='future' ? 'bg-plum text-white' : 'bg-white border'}`}>All future</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button onClick={() => setView('month')} variant={view==='month' ? 'default' : 'ghost'}>Month</Button>
            <Button onClick={() => setView('week')} variant={view==='week' ? 'default' : 'ghost'}>Week</Button>
            <Button onClick={() => setView('day')} variant={view==='day' ? 'default' : 'ghost'}>Day</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
        <div style={{ height: 520 }}>
          <Calendar
            selectable
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            onView={(v) => setView(v)}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
            onSelectSlot={(slotInfo) => setSelectedRange({ start: slotInfo.start, end: slotInfo.end })}
            eventPropGetter={eventStyleGetter}
          />
        </div>

        <aside className="bg-white border rounded-lg p-3">
          <h3 className="font-semibold text-plum mb-2">Appointments</h3>
          {!selectedRange && (
            <div className="text-sm text-plum/70 mb-2">Select a date or range on the calendar to see appointments here.</div>
          )}
          {selectedRange && sidebarEvents.length === 0 && (
            <div className="text-sm text-plum/70">No appointments in the selected range.</div>
          )}
          <ul className="space-y-2">
            {sidebarEvents.map(ev => (
              <li key={ev.id} className="p-2 border rounded hover:bg-neutral-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-sm text-plum/70">{ev.start.toLocaleString()} — {ev.end.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
                    <div className="text-sm text-plum/70">{ev.resource?.contact?.name ?? '—'}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => setSelectedEvent(ev)}>Details</Button>
                    <Button size="sm" variant="ghost" onClick={() => { navigate(`/book?bookingId=${ev.id}`); }}>Reschedule</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
            </DialogHeader>
            <div className="mt-2">
              <p><b>Client:</b> {selectedEvent.resource?.contact?.name ?? selectedEvent.resource?.name ?? '—'}</p>
              <p><b>Service:</b> {selectedEvent.resource?.serviceName ?? selectedEvent.resource?.service}</p>
              <p><b>When:</b> {selectedEvent.start?.toLocaleString()} — {selectedEvent.end?.toLocaleString()}</p>
              <p><b>Amount:</b> {selectedEvent.resource?.amount ?? selectedEvent.resource?.cost ?? '—'}</p>
              <p><b>Status:</b> {selectedEvent.resource?.status}</p>
              <p><b>Address:</b> {selectedEvent.resource?.address?.line1 ?? '—'}</p>
              {selectedEvent.resource?.notes && (
                <div className="mt-3">
                  <h4 className="font-semibold">Notes</h4>
                  <pre className="whitespace-pre-wrap">{String(selectedEvent.resource.notes)}</pre>
                </div>
              )}
            </div>
            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelectedEvent(null)}>Close</Button>
                <Button onClick={() => { printEvent(selectedEvent); }} variant="outline">Print</Button>
                <Button onClick={() => { navigate(`/book?bookingId=${selectedEvent.id}`); setSelectedEvent(null); }} className="bg-plum text-white">Reschedule</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
