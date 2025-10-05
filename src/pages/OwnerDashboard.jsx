// src/pages/OwnerDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  Calendar, CheckCircle, XCircle, MapPin, DollarSign, Clock, Sparkles, Mail, Search, Download, CalendarClock, RefreshCw
} from 'lucide-react';

import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  where,
  serverTimestamp,
  addDoc,
  Timestamp,
} from 'firebase/firestore';

import CalendarExportButtons from '@/components/calendar/CalendarExportButtons';

const BRAND = import.meta.env.VITE_BRAND_NAME || 'Sanchez Services';
const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || 'sanchezservices24@yahoo.com';

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center text-sm">
      <Icon className="h-4 w-4 mr-2 text-gold" />
      <span className="text-plum/80">{label}: </span>
      <span className="ml-1 font-medium text-plum">{value}</span>
    </div>
  );
}

export default function OwnerDashboard() {
  const { toast } = useToast();

  // live data
  const [requested, setRequested] = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  const [declined, setDeclined] = useState([]);

  // ui state
  const [queryText, setQueryText] = useState('');
  const [tab, setTab] = useState('today');
  const [selected, setSelected] = useState(() => new Set()); // selected booking ids for bulk

  const todayKey = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

  // Live queries
  useEffect(() => {
    const base = collection(db, 'bookings');

    const unsubReq = onSnapshot(
      query(base, where('status', '==', 'requested'), orderBy('startAt', 'asc')),
      (snap) => setRequested(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubConf = onSnapshot(
      query(base, where('status', '==', 'confirmed'), orderBy('startAt', 'asc')),
      (snap) => setConfirmed(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubDec = onSnapshot(
      query(base, where('status', '==', 'declined'), orderBy('startAt', 'desc')),
      (snap) => setDeclined(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubReq(); unsubConf(); unsubDec();
    };
  }, []);

  // Email helper (works with Firebase Email extension or any mail collection processor)
  async function sendEmail({ to, subject, html, text }) {
    try {
      await addDoc(collection(db, 'mail'), {
        to: Array.isArray(to) ? to : [to],
        message: { subject, html, text },
      });
    } catch (e) {
      console.error('Email enqueue failed:', e);
    }
  }

  // ---------- Single actions ----------
  const approve = async (b) => {
    if (!window.confirm(`Confirm booking ${b.id}?`)) return;
    try {
      await updateDoc(doc(db, 'bookings', b.id), {
        status: 'confirmed',
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Booking confirmed' });

      const start = b.startAt?.toDate ? b.startAt.toDate() : null;
      const dateStr = start ? start.toLocaleDateString() : 'TBD';
      const timeStr = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

      const subject = `${BRAND}: Your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ''} is confirmed`;
      const text =
        `Hi ${b.contact?.name || ''},\n\n` +
        `Great news! Your ${b.serviceName || 'cleaning'} is confirmed for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.\n` +
        `Booking ID: ${b.id}\n\nThanks,\n${BRAND}`;
      const html =
        `<p>Hi ${b.contact?.name || ''},</p>` +
        `<p>Great news! Your <strong>${b.serviceName || 'cleaning'}</strong> is confirmed for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p>` +
        `<p><strong>Booking ID:</strong> ${b.id}</p>` +
        `<p>Thanks,<br/>${BRAND}</p>`;

      if (b.contact?.email) {
        await sendEmail({ to: [b.contact.email, OWNER_EMAIL], subject, html, text });
      }
    } catch (e) {
      toast({ title: 'Error confirming', description: String(e), variant: 'destructive' });
    }
  };

  const decline = async (b) => {
    if (!window.confirm(`Decline booking ${b.id}?`)) return;
    try {
      await updateDoc(doc(db, 'bookings', b.id), {
        status: 'declined',
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Booking declined' });

      const start = b.startAt?.toDate ? b.startAt.toDate() : null;
      const dateStr = start ? start.toLocaleDateString() : 'TBD';
      const timeStr = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

      const subject = `${BRAND}: Your booking request could not be scheduled`;
      const text =
        `Hi ${b.contact?.name || ''},\n\n` +
        `We’re sorry, but we can’t schedule your ${b.serviceName || 'cleaning'} on ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.\n` +
        `Please reply to this email and we’ll find another time that works.\n\nBooking ID: ${b.id}\n\nThanks,\n${BRAND}`;
      const html =
        `<p>Hi ${b.contact?.name || ''},</p>` +
        `<p>We’re sorry, but we can’t schedule your <strong>${b.serviceName || 'cleaning'}</strong> on <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p>` +
        `<p>Please reply to this email and we’ll find another time that works.</p>` +
        `<p><strong>Booking ID:</strong> ${b.id}</p>` +
        `<p>Thanks,<br/>${BRAND}</p>`;

      if (b.contact?.email) {
        await sendEmail({ to: [b.contact.email, OWNER_EMAIL], subject, html, text });
      }
    } catch (e) {
      toast({ title: 'Error declining', description: String(e), variant: 'destructive' });
    }
  };

  // ---------- Reschedule (per booking) ----------
  const doReschedule = async (b, dateStr, timeStr) => {
    if (!dateStr || !timeStr) {
      toast({ title: 'Pick date & time', description: 'Both are required to reschedule.', variant: 'destructive' });
      return;
    }
    const start = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(start.getTime())) {
      toast({ title: 'Invalid date/time', variant: 'destructive' });
      return;
    }
    const minutes = Number(b.durationMinutes || 120);
    const end = new Date(start.getTime() + minutes * 60000);
    const dateKey = start.toISOString().slice(0, 10);

    if (!window.confirm(`Reschedule booking ${b.id} to ${start.toLocaleString()}?`)) return;

    try {
      await updateDoc(doc(db, 'bookings', b.id), {
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(end),
        dateKey,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Booking rescheduled' });

      // email notify client + owner
      const subject = `${BRAND}: Your booking has been rescheduled`;
      const human = `${start.toLocaleDateString()} at ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      const text =
        `Hi ${b.contact?.name || ''},\n\n` +
        `Your ${b.serviceName || 'cleaning'} has been rescheduled to ${human}.\n` +
        `Booking ID: ${b.id}\n\nIf this time doesn’t work, reply to this email and we’ll adjust.\n\nThanks,\n${BRAND}`;
      const html =
        `<p>Hi ${b.contact?.name || ''},</p>` +
        `<p>Your <strong>${b.serviceName || 'cleaning'}</strong> has been <strong>rescheduled</strong> to <strong>${human}</strong>.</p>` +
        `<p><strong>Booking ID:</strong> ${b.id}</p>` +
        `<p>If this time doesn’t work, reply to this email and we’ll adjust.</p>` +
        `<p>Thanks,<br/>${BRAND}</p>`;

      if (b.contact?.email) {
        await sendEmail({ to: [b.contact.email, OWNER_EMAIL], subject, html, text });
      }
    } catch (e) {
      toast({ title: 'Error rescheduling', description: String(e), variant: 'destructive' });
    }
  };

  // ---------- Search / filter ----------
  const searchFilter = useCallback((b) => {
    const q = queryText.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      b.id,
      b.serviceName,
      b.serviceSlug,
      b.contact?.name,
      b.contact?.email,
      b.contact?.phone,
      b.address?.line1,
      b.dateKey,
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }, [queryText]);

  const requestedF = useMemo(() => requested.filter(searchFilter), [requested, searchFilter]);
  const confirmedF = useMemo(() => confirmed.filter(searchFilter), [confirmed, searchFilter]);
  const declinedF  = useMemo(() => declined.filter(searchFilter),  [declined,  searchFilter]);

  const todayConfirmed = useMemo(
    () => confirmedF.filter(b => b.dateKey === todayKey),
    [confirmedF, todayKey]
  );

  // ---------- Revenue chips (from confirmedF) ----------
  const todayRevenue = useMemo(() => {
    return todayConfirmed.reduce((sum, b) => sum + Number(b.cost || 0), 0);
  }, [todayConfirmed]);

  const weekRevenue = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    const in7 = new Date(now.getTime() + 7*86400000);
    return confirmedF.reduce((sum, b) => {
      const d = b.startAt?.toDate ? b.startAt.toDate() : null;
      if (!d) return sum;
      const dd = new Date(d); dd.setHours(0,0,0,0);
      if (dd >= now && dd <= in7) return sum + Number(b.cost || 0);
      return sum;
    }, 0);
  }, [confirmedF]);

  // ---------- Selection helpers ----------
  const isSelected = (id) => selected.has(id);
  const toggleOne = (id) => setSelected(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const clearSelection = () => setSelected(new Set());

  const selectAllIn = (rows) => setSelected(new Set(rows.map(r => r.id)));

  const selectedRequested = useMemo(() => requestedF.filter(b => selected.has(b.id)), [requestedF, selected]);
  const selectedConfirmed = useMemo(() => confirmedF.filter(b => selected.has(b.id)), [confirmedF, selected]);
  const selectedDeclined  = useMemo(() => declinedF.filter(b  => selected.has(b.id)),  [declinedF,  selected]);

  // ---------- Bulk actions ----------
  const bulkApprove = async () => {
    if (!selectedRequested.length) return;
    if (!window.confirm(`Approve ${selectedRequested.length} request(s)?`)) return;
    for (const b of selectedRequested) await approve(b);
    clearSelection();
  };

  const bulkDecline = async () => {
    if (!selectedRequested.length) return;
    if (!window.confirm(`Decline ${selectedRequested.length} request(s)?`)) return;
    for (const b of selectedRequested) await decline(b);
    clearSelection();
  };

  const exportCsv = (rows, filename = 'bookings.csv') => {
    const cols = [
      'id','status','serviceName','serviceSlug','dateKey','startAt','endAt',
      'clientName','clientEmail','clientPhone','address','zip','cost','durationMinutes','frequency','notes'
    ];
    const safe = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g,'""');
      return `"${s}"`;
    };
    const lines = [
      cols.join(',')
    ];
    for (const b of rows) {
      const start = b.startAt?.toDate ? b.startAt.toDate().toISOString() : '';
      const end   = b.endAt?.toDate ? b.endAt.toDate().toISOString() : '';
      lines.push([
        b.id,
        b.status || '',
        b.serviceName || '',
        b.serviceSlug || '',
        b.dateKey || '',
        start,
        end,
        b.contact?.name || '',
        b.contact?.email || '',
        b.contact?.phone || '',
        b.address?.line1 || '',
        b.address?.zip || '',
        Number(b.cost || 0),
        b.durationMinutes || '',
        b.frequency || '',
        b.notes || ''
      ].map(safe).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  };

  // ---------- Card component ----------
  const RequestCard = ({ b, showActions = false, showReschedule = false }) => {
    const [resOpen, setResOpen] = useState(false);
    const [rDate, setRDate] = useState('');
    const [rTime, setRTime] = useState('');

    const start = b.startAt?.toDate ? b.startAt.toDate() : null;
    const end = b.endAt?.toDate ? b.endAt.toDate() : null;

    const dateStr = start ? start.toLocaleDateString() : 'TBD';
    const timeStr = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    const durationHrs = (b.durationMinutes || 120) / 60;

    return (
      <Card className="border-plum/10 transition hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected(b.id)}
              onCheckedChange={() => toggleOne(b.id)}
              className="mt-1"
              aria-label={`Select booking ${b.id}`}
            />
            <div>
              <CardTitle className="text-plum">{b.serviceName || b.serviceSlug}</CardTitle>
              <p className="text-xs text-plum/60">ID: {b.id}</p>
            </div>
          </div>

          <span className={`px-3 py-1 text-xs font-semibold rounded-full
            ${b.status === 'requested' ? 'bg-amber-100 text-amber-800' :
              b.status === 'confirmed' ? 'bg-green-100 text-green-800' :
              'bg-rose-100 text-rose-800'}`}>
            {b.status}
          </span>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Row icon={Calendar}   label="Date"       value={`${dateStr}${timeStr ? ` at ${timeStr}` : ''}`} />
            <Row icon={Clock}      label="Duration"   value={`~${durationHrs} hrs`} />
            <Row icon={DollarSign} label="Total"      value={`$${Number(b.cost || 0).toFixed(2)}`} />
            <Row icon={Sparkles}   label="Frequency"  value={b.frequency || 'one-time'} />
            {b.address?.line1 && <Row icon={MapPin}  label="Address"    value={`${b.address.line1} ${b.address.zip || ''}`} />}
          </div>

          {b.contact?.name || b.contact?.email || b.contact?.phone ? (
            <div className="rounded-lg bg-plum/5 p-3 text-sm">
              <p className="text-plum/80"><span className="font-medium">Client:</span> {b.contact?.name || '—'}</p>
              <p className="text-plum/80"><span className="font-medium">Email:</span> {b.contact?.email || '—'}</p>
              <p className="text-plum/80"><span className="font-medium">Phone:</span> {b.contact?.phone || '—'}</p>
            </div>
          ) : null}

          {start && end && (
            <CalendarExportButtons
              title={`${b.serviceName || 'Cleaning'} — ${BRAND}`}
              start={start}
              end={end}
              details={`Booking ID: ${b.id}\nClient: ${b.contact?.name || ''}\nNotes: ${b.notes || ''}`}
              location={`${b.address?.line1 || ''} ${b.address?.zip || ''}`}
              uid={b.id}
              fileName={`sanchez-${b.id}.ics`}
              size="sm"
            />
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {showActions && (
              <>
                <Button className="bg-green-600 hover:bg-green-700 text-white rounded-full" onClick={() => approve(b)}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button variant="destructive" className="rounded-full" onClick={() => decline(b)}>
                  <XCircle className="h-4 w-4 mr-1" /> Decline
                </Button>
              </>
            )}

            {showReschedule && (
              <Button variant="outline" className="rounded-full" onClick={() => setResOpen(v => !v)}>
                <RefreshCw className="h-4 w-4 mr-1" /> {resOpen ? 'Cancel' : 'Reschedule'}
              </Button>
            )}
          </div>

          {showReschedule && resOpen && (
            <div className="rounded-xl border border-gold/30 bg-white p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-plum">New Date</label>
                  <Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="bg-white" />
                </div>
                <div>
                  <label className="text-sm text-plum">New Time</label>
                  <Input type="time" value={rTime} onChange={(e) => setRTime(e.target.value)} className="bg-white" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => doReschedule(b, rDate, rTime)} className="rounded-full">
                  <CalendarClock className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button variant="outline" onClick={() => { setRDate(''); setRTime(''); setResOpen(false); }} className="rounded-full">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ---------- Render ----------
  return (
    <div className="py-12 md:py-20 px-4 bg-[#FADADD]">
      <Helmet>
        <title>Owner Dashboard | Sanchez Services</title>
      </Helmet>

      <div className="max-w-6xl mx-auto">
        {/* Header + search + revenue chips */}
        <motion.div
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center sm:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-plum">Owner Dashboard</h1>
            <p className="text-plum/70">
              Approve or decline booking requests. Reschedule, export, and track revenue.
              <Mail className="inline h-4 w-4 ml-1 text-gold" />
            </p>
            <div className="mt-3 flex gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm border border-gold/30">
                <DollarSign className="h-4 w-4 text-gold" /> Today: <strong className="ml-1">${todayRevenue.toFixed(2)}</strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm border border-gold/30">
                <DollarSign className="h-4 w-4 text-gold" /> Next 7 days: <strong className="ml-1">${weekRevenue.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="w-full sm:w-[22rem]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-plum/50" />
              <Input
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Search name, email, ID, address…"
                className="pl-9 bg-white"
                autoComplete="off"
              />
            </div>
          </div>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="sticky top-20 z-10">
            <TabsList className="bg-plum/5 rounded-full p-1 grid grid-cols-4">
              <TabsTrigger value="today" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Today <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/70">{todayConfirmed.length}</span>
              </TabsTrigger>
              <TabsTrigger value="requested" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Requested <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/70">{requestedF.length}</span>
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Confirmed <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/70">{confirmedF.length}</span>
              </TabsTrigger>
              <TabsTrigger value="declined" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Declined <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/70">{declinedF.length}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Bulk toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const rows =
                  tab === 'requested' ? requestedF :
                  tab === 'confirmed' ? confirmedF :
                  tab === 'declined'  ? declinedF  : todayConfirmed;
                selectAllIn(rows);
              }}
              className="rounded-full"
            >
              Select all in view
            </Button>
            <Button variant="outline" onClick={clearSelection} className="rounded-full">Clear selection</Button>

            {/* Bulk-only for requested */}
            {tab === 'requested' && (
              <>
                <Button onClick={bulkApprove} disabled={!selectedRequested.length} className="rounded-full">
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve selected
                </Button>
                <Button variant="destructive" onClick={bulkDecline} disabled={!selectedRequested.length} className="rounded-full">
                  <XCircle className="h-4 w-4 mr-1" /> Decline selected
                </Button>
              </>
            )}

            {/* CSV export of current tab (selected if any, else all filtered) */}
            <Button
              variant="outline"
              onClick={() => {
                let rows = [];
                if (selected.size) {
                  const all = [...selectedRequested, ...selectedConfirmed, ...selectedDeclined];
                  rows = all.length ? all : [];
                }
                if (!rows.length) {
                  rows =
                    tab === 'requested' ? requestedF :
                    tab === 'confirmed' ? confirmedF :
                    tab === 'declined'  ? declinedF  : todayConfirmed;
                }
                const label =
                  tab === 'requested' ? 'requested' :
                  tab === 'confirmed' ? 'confirmed' :
                  tab === 'declined'  ? 'declined'  : 'today';
                exportCsv(rows, `bookings-${label}.csv`);
              }}
              className="rounded-full"
            >
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>

          <TabsContent value="today" className="mt-6 space-y-4">
            {todayConfirmed.length ? todayConfirmed.map(b => (
              <RequestCard key={b.id} b={b} showReschedule />
            )) : (
              <Card><CardContent className="p-6 text-plum/70">No confirmed bookings today.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="requested" className="mt-6 space-y-4">
            {requestedF.length ? requestedF.map(b => (
              <RequestCard key={b.id} b={b} showActions showReschedule />
            )) : (
              <Card><CardContent className="p-6 text-plum/70">No requested bookings.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-6 space-y-4">
            {confirmedF.length ? confirmedF.map(b => (
              <RequestCard key={b.id} b={b} showReschedule />
            )) : (
              <Card><CardContent className="p-6 text-plum/70">No confirmed bookings yet.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="declined" className="mt-6 space-y-4">
            {declinedF.length ? declinedF.map(b => (
              <RequestCard key={b.id} b={b} />
            )) : (
              <Card><CardContent className="p-6 text-plum/70">No declined bookings.</CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
