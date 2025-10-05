// src/pages/OwnerDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

import {
  Calendar,
  CheckCircle,
  XCircle,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  Mail,
  Search,
  Download,
  ClipboardCopy,
  Info,
  Plus,
  Check,
  ShieldCheck,
} from 'lucide-react';

import { db, auth } from '@/lib/firebase';
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
import { SERVICES } from '@/data/services';

const BRAND = import.meta.env.VITE_BRAND_NAME || 'Sanchez Services';
const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL || 'sanchezservices24@yahoo.com';
const OWNER_UID = import.meta.env.VITE_OWNER_UID || ''; // used for guard

/* ---------- tiny helpers ---------- */

function useDebouncedValue(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}
function formatMoney(n) {
  try { return Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' }); }
  catch { return `$${Number(n || 0).toFixed(2)}`; }
}
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isToday(d) { return sameDay(new Date(), d); }
function isWithinNextDays(d, days = 7) {
  const now = new Date(); const end = new Date(); end.setDate(now.getDate() + days);
  const s = new Date(now); s.setHours(0,0,0,0); const e = new Date(end); e.setHours(23,59,59,999);
  return d >= s && d <= e;
}
function statusChipClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'requested') return 'bg-amber-100 text-amber-800';
  if (s === 'confirmed') return 'bg-green-100 text-green-800';
  if (s === 'declined')  return 'bg-rose-100 text-rose-800';
  if (s === 'completed') return 'bg-plum/10 text-plum';
  return 'bg-plum/10 text-plum';
}
function copyToClipboard(text, toast) {
  if (!text) return;
  navigator.clipboard?.writeText(text)
    .then(() => toast?.({ title: 'Copied', description: text }))
    .catch(() => toast?.({ title: 'Could not copy', variant: 'destructive' }));
}
function minutesFromDurationText(str) {
  if (!str) return 120;
  const m = String(str).match(/(\d+(\.\d+)?)\s*([hH]|hour)/);
  if (m) return Math.round(parseFloat(m[1]) * 60);
  const onlyNum = String(str).match(/^(\d{2,3})$/);
  if (onlyNum) return parseInt(onlyNum[1], 10);
  const r = String(str).match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (r) return Math.round(((parseFloat(r[1]) + parseFloat(r[2])) / 2) * 60);
  return 120;
}
function composeLocalDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  const d = new Date(dateStr); d.setHours(h || 0, m || 0, 0, 0); return d;
}

/* ---------- small pieces ---------- */

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center text-sm">
      <Icon className="h-4 w-4 mr-2 text-gold" />
      <span className="text-plum/80">{label}: </span>
      <span className="ml-1 font-medium text-plum">{value}</span>
    </div>
  );
}
const PortalModal = ({ open, onClose, children }) => {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative z-[130] w-full max-w-4xl max-h-[85vh] overflow-auto rounded-2xl border border-plum/10 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onClose} className="absolute top-3 right-3 text-plum/70 hover:text-plum" aria-label="Close">×</button>
          {children}
        </div>
      </div>
    </div>, document.body
  );
};

/* ---------- main ---------- */

export default function OwnerDashboard() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'today';
  const initialQuery = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [queryText, setQueryText] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(queryText, 300);

  const [requested, setRequested] = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  const [declined,  setDeclined]  = useState([]);

  const [loadingRequested, setLoadingRequested] = useState(true);
  const [loadingConfirmed, setLoadingConfirmed] = useState(true);
  const [loadingDeclined,  setLoadingDeclined]  = useState(true);

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [manualOpen, setManualOpen] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    address: '', zip: '',
    serviceSlug: '', serviceName: '',
    durationMinutes: 120, cost: '', paid: '0',
    frequency: 'one-time',
    date: '', time: '',
    status: 'confirmed',
    notes: '',
    emailClient: true,
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // live queries
  useEffect(() => {
    const base = collection(db, 'bookings');

    const unsubReq = onSnapshot(
      query(base, where('status', '==', 'requested'), orderBy('startAt', 'asc')),
      (snap) => { setRequested(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoadingRequested(false); },
      () => setLoadingRequested(false)
    );
    const unsubConf = onSnapshot(
      query(base, where('status', '==', 'confirmed'), orderBy('startAt', 'asc')),
      (snap) => { setConfirmed(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoadingConfirmed(false); },
      () => setLoadingConfirmed(false)
    );
    const unsubDec = onSnapshot(
      query(base, where('status', '==', 'declined'), orderBy('startAt', 'desc')),
      (snap) => { setDeclined(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoadingDeclined(false); },
      () => setLoadingDeclined(false)
    );

    return () => { unsubReq(); unsubConf(); unsubDec(); };
  }, []);

  // sync URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', activeTab);
    if (debouncedQuery) next.set('q', debouncedQuery); else next.delete('q');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedQuery]);

  // email helper
  async function sendEmail({ to, subject, html, text }) {
    try {
      await addDoc(collection(db, 'mail'), { to: Array.isArray(to) ? to : [to], message: { subject, html, text } });
    } catch (e) {
      console.error('Email enqueue failed:', e);
    }
  }

  const approve = async (b) => {
    try {
      await updateDoc(doc(db, 'bookings', b.id), { status: 'confirmed', updatedAt: serverTimestamp() });
      toast({ title: 'Booking confirmed' });
      const start = b.startAt?.toDate ? b.startAt.toDate() : null;
      const dateStr = start ? start.toLocaleDateString() : 'TBD';
      const timeStr = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

      const subject = `${BRAND}: Your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ''} is confirmed`;
      const bodyText = `Hi ${b.contact?.name || ''},\n\nGreat news! Your ${b.serviceName || 'cleaning'} is confirmed for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.\nBooking ID: ${b.id}\n\nThanks,\n${BRAND}`;
      const bodyHtml = `<p>Hi ${b.contact?.name || ''},</p><p>Great news! Your <strong>${b.serviceName || 'cleaning'}</strong> is confirmed for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p><p><strong>Booking ID:</strong> ${b.id}</p><p>Thanks,<br/>${BRAND}</p>`;
      if (b.contact?.email) await sendEmail({ to: [b.contact.email, OWNER_EMAIL], subject, html: bodyHtml, text: bodyText });
    } catch (e) {
      toast({ title: 'Error confirming', description: `${e?.code || ''} ${e?.message || e}`, variant: 'destructive' });
    }
  };
  const decline = async (b) => {
    try {
      await updateDoc(doc(db, 'bookings', b.id), { status: 'declined', updatedAt: serverTimestamp() });
      toast({ title: 'Booking declined' });
      const start = b.startAt?.toDate ? b.startAt.toDate() : null;
      const dateStr = start ? start.toLocaleDateString() : 'TBD';
      const timeStr = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

      const subject = `${BRAND}: Your booking request could not be scheduled`;
      const bodyText = `Hi ${b.contact?.name || ''},\n\nWe’re sorry, but we can’t schedule your ${b.serviceName || 'cleaning'} on ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.\nPlease reply to this email and we’ll find another time that works.\n\nBooking ID: ${b.id}\n\nThanks,\n${BRAND}`;
      const bodyHtml = `<p>Hi ${b.contact?.name || ''},</p><p>We’re sorry, but we can’t schedule your <strong>${b.serviceName || 'cleaning'}</strong> on <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p><p>Please reply to this email and we’ll find another time that works.</p><p><strong>Booking ID:</strong> ${b.id}</p><p>Thanks,<br/>${BRAND}</p>`;
      if (b.contact?.email) await sendEmail({ to: [b.contact.email, OWNER_EMAIL], subject, html: bodyHtml, text: bodyText });
    } catch (e) {
      toast({ title: 'Error declining', description: `${e?.code || ''} ${e?.message || e}`, variant: 'destructive' });
    }
  };

  /* ---------- filtering / counts / revenue ---------- */

  const qLower = debouncedQuery.trim().toLowerCase();
  const filterByQuery = useCallback(
    (arr) => {
      if (!qLower) return arr;
      return arr.filter((b) => {
        const id = `CI-${b.id?.slice(0, 5) || ''}`.toLowerCase();
        const name = (b.contact?.name || '').toLowerCase();
        const email = (b.contact?.email || '').toLowerCase();
        const phone = (b.contact?.phone || '').toLowerCase();
        const addr = `${b.address?.line1 || ''} ${b.address?.zip || ''}`.toLowerCase();
        const svc = (b.serviceName || b.serviceSlug || '').toLowerCase();
        return id.includes(qLower) || name.includes(qLower) || email.includes(qLower) || phone.includes(qLower) || addr.includes(qLower) || svc.includes(qLower);
      });
    }, [qLower]
  );

  const todayConfirmed = useMemo(
    () => confirmed.filter((b) => { const start = b.startAt?.toDate ? b.startAt.toDate() : null; return start && isToday(start); }),
    [confirmed]
  );

  const visibleRequested = filterByQuery(requested);
  const visibleConfirmed = filterByQuery(confirmed);
  const visibleDeclined  = filterByQuery(declined);
  const visibleToday     = filterByQuery(todayConfirmed);

  const requestedCount = requested.length;
  const confirmedCount = confirmed.length;
  const declinedCount  = declined.length;

  const revenueToday = useMemo(() => todayConfirmed.reduce((sum, b) => sum + Number(b.cost || 0), 0), [todayConfirmed]);
  const revenueNext7 = useMemo(() => confirmed.reduce((sum, b) => {
    const start = b.startAt?.toDate ? b.startAt.toDate() : null;
    if (start && isWithinNextDays(start, 7)) return sum + Number(b.cost || 0);
    return sum;
  }, 0), [confirmed]);

  /* ---------- selection & export ---------- */

  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllInView = (rows) => setSelectedIds(new Set(rows.map((r) => r.id)));

  const exportCSV = (rows) => {
    if (!rows.length) { toast({ title: 'Nothing to export', description: 'Try widening your filters.', variant: 'destructive' }); return; }
    const header = ['bookingId','status','service','date','startAt','endAt','durationMinutes','total','paid','name','email','phone','address','zip','frequency','notes'];
    const csv = [ header.join(','), ...rows.map((b) => {
      const start = b.startAt?.toDate ? b.startAt.toDate() : null;
      const end   = b.endAt?.toDate   ? b.endAt.toDate()   : null;
      return [
        b.id,
        b.status,
        `"${(b.serviceName || b.serviceSlug || '').replaceAll('"','""')}"`,
        start ? start.toLocaleDateString() : '',
        start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '',
        end   ? end.toLocaleTimeString([],   { hour: 'numeric', minute: '2-digit' }) : '',
        b.durationMinutes || '',
        b.cost || '',
        b.paid || '',
        `"${(b.contact?.name || '').replaceAll('"','""')}"`,
        b.contact?.email || '',
        b.contact?.phone || '',
        `"${(b.address?.line1 || '').replaceAll('"','""')}"`,
        b.address?.zip || '',
        b.frequency || '',
        `"${(b.notes || '').replaceAll('"','""')}"`,
      ].join(',');
    })].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `bookings-${activeTab}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- UI bits ---------- */

  const ListSkeleton = ({ rows = 3 }) => (
    <div className="space-y-4">{Array.from({ length: rows }).map((_, i) => (<div key={i} className="rounded-2xl border border-plum/10 p-5 animate-pulse bg-white/90 shadow-sm" />))}</div>
  );
  const ZeroState = ({ message }) => (
    <Card className="bg-white/90 border-plum/10">
      <CardContent className="p-10 text-center">
        <div className="inline-flex items-center gap-2 text-plum/80"><Info className="w-5 h-5 text-gold" /><span>{message}</span></div>
      </CardContent>
    </Card>
  );

  const RequestCard = ({ b, showActions = false, selected, onToggle }) => {
    const start = b.startAt?.toDate ? b.startAt.toDate() : null;
    const end   = b.endAt?.toDate   ? b.endAt.toDate()   : null;
    const dateStr = start ? start.toLocaleDateString() : 'TBD';
    const timeStr = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    const durationHrs = (b.durationMinutes || 120) / 60;

    return (
      <Card className={`border-plum/10 shadow-sm bg-white/95 ${selected ? 'ring-2 ring-gold/60' : ''}`}>
        <CardHeader className="flex items-start justify-between gap-2 pb-3">
          <div className="flex items-center gap-3">
            <input aria-label="select booking" type="checkbox" checked={selected} onChange={() => onToggle?.(b.id)} className="h-4 w-4 accent-[--gold-500] rounded" />
            <div>
              <CardTitle className="text-plum flex items-center gap-2">
                {b.serviceName || b.serviceSlug}
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusChipClass(b.status)}`}>{b.status}</span>
              </CardTitle>
              <p className="text-xs text-plum/60 mt-1">ID: {b.id}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-plum font-semibold">{formatMoney(b.cost)}</div>
            <div className="text-xs text-plum/60">{b.frequency || 'one-time'}</div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Row icon={Calendar} label="Date" value={`${dateStr}${timeStr ? ` at ${timeStr}` : ''}`} />
            <Row icon={Clock} label="Duration" value={`~${durationHrs} hrs`} />
            {b.address?.line1 && <Row icon={MapPin} label="Address" value={`${b.address.line1} ${b.address.zip || ''}`} />}
            {'paid' in b && <Row icon={DollarSign} label="Paid" value={formatMoney(b.paid || 0)} />}
          </div>

          {(b.contact?.name || b.contact?.email || b.contact?.phone) && (
            <div className="rounded-lg bg-plum/5 p-3 text-sm flex flex-wrap items-center gap-4">
              <div className="text-plum/80"><span className="font-medium">Client:</span> {b.contact?.name || '—'}</div>
              <div className="text-plum/80 flex items-center gap-1">
                <span className="font-medium">Email:</span> {b.contact?.email || '—'}
                {!!b.contact?.email && <button type="button" className="ml-1 text-gold hover:text-gold/80" onClick={() => copyToClipboard(b.contact.email, toast)} title="Copy email"><ClipboardCopy className="w-4 h-4" /></button>}
              </div>
              <div className="text-plum/80 flex items-center gap-1">
                <span className="font-medium">Phone:</span> {b.contact?.phone || '—'}
                {!!b.contact?.phone && <button type="button" className="ml-1 text-gold hover:text-gold/80" onClick={() => copyToClipboard(b.contact.phone, toast)} title="Copy phone"><ClipboardCopy className="w-4 h-4" /></button>}
              </div>
            </div>
          )}

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

          {showActions && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" className="bg-green-600 hover:bg-green-700 text-white rounded-full" onClick={() => approve(b)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button type="button" variant="destructive" className="rounded-full" onClick={() => decline(b)}>
                <XCircle className="h-4 w-4 mr-1" /> Decline
              </Button>
              {!!b.contact?.email && (
                <a href={`mailto:${b.contact.email}?subject=${encodeURIComponent(`${BRAND} — Your booking`)}`} className="inline-flex items-center gap-1 text-plum/80 hover:text-plum font-medium">
                  <Mail className="w-4 h-4" /> Email client
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /* ---------- sticky toolbar ---------- */

  const stickyBar = (
    <div className="sticky top-16 z-40 -mx-4 px-4 md:mx-0 md:px-0">
      <div className="rounded-2xl border border-plum/10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 shadow-sm">
        <div className="p-3 md:p-4 grid grid-cols-1 xl:grid-cols-[1fr,560px] gap-3 items-center">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-rose-50 px-3 py-1.5 text-plum text-sm">
              <DollarSign className="w-4 h-4 text-gold" /><span className="font-medium">Today:</span><span className="font-bold">{formatMoney(revenueToday)}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-rose-50 px-3 py-1.5 text-plum text-sm">
              <DollarSign className="w-4 h-4 text-gold" /><span className="font-medium">Next 7 days:</span><span className="font-bold">{formatMoney(revenueNext7)}</span>
            </div>
            <div className="hidden md:flex items-center gap-4 text-sm text-plum/80 pl-1">
              <span>Requested <span className="font-semibold">{requestedCount}</span></span>
              <span>Confirmed <span className="font-semibold">{confirmedCount}</span></span>
              <span>Declined <span className="font-semibold">{declinedCount}</span></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plum/50" />
              <Input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Search name, email, ID, address..." className="pl-9 bg-white" aria-label="Search bookings" />
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => {
                const rows = activeTab === 'today' ? visibleToday : activeTab === 'requested' ? visibleRequested : activeTab === 'confirmed' ? visibleConfirmed : visibleDeclined;
                selectAllInView(rows);
              }}>Select all in view</Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={clearSelection}>Clear selection</Button>
              <Button type="button" className="rounded-full bg-gold hover:bg-gold/90 text-white" onClick={() => {
                const rowsByTab = activeTab === 'today' ? visibleToday : activeTab === 'requested' ? visibleRequested : activeTab === 'confirmed' ? visibleConfirmed : visibleDeclined;
                const rows = rowsByTab.filter((r) => (selectedIds.size ? selectedIds.has(r.id) : true));
                exportCSV(rows);
              }}>
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
              <Button type="button" className="rounded-full bg-plum text-white hover:bg-plum/90" onClick={() => setManualOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> New booking
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------- template choice ---------- */

  const chooseTemplate = (slug) => {
    const svc = SERVICES.find((s) => s.slug === slug);
    if (!svc) return;
    setSelectedTemplate(slug);
    setForm((prev) => ({
      ...prev,
      serviceSlug: svc.slug,
      serviceName: svc.title,
      durationMinutes: minutesFromDurationText(svc.duration),
      cost: String(svc.priceFrom || ''),
    }));
    toast({ title: 'Template applied', description: svc.title });
  };
  const clearTemplate = () => setSelectedTemplate('');
  const resetManualForm = () => {
    setForm({
      name: '', email: '', phone: '',
      address: '', zip: '',
      serviceSlug: '', serviceName: '',
      durationMinutes: 120, cost: '', paid: '0',
      frequency: 'one-time',
      date: '', time: '',
      status: 'confirmed',
      notes: '',
      emailClient: true,
    });
    setSelectedTemplate('');
  };

  /* ---------- create booking (FIXED) ---------- */

  const createManualBooking = async () => {
    // 1) Owner auth guard with clear message
    const u = auth.currentUser;
    if (!u) {
      toast({ title: 'Sign in required', description: 'Please sign in as the owner to create bookings.', variant: 'destructive' });
      return;
    }
    if (OWNER_UID && u.uid !== OWNER_UID) {
      toast({ title: 'Owner permission required', description: 'This action is restricted to the owner account.', variant: 'destructive' });
      return;
    }

    try {
      const {
        name, email, phone, address, zip,
        serviceSlug, serviceName, durationMinutes,
        cost, paid, frequency, date, time,
        status, notes, emailClient,
      } = form;

      if (!serviceName && !serviceSlug) {
        toast({ title: 'Pick a service', description: 'Choose a template or enter a name.', variant: 'destructive' });
        return;
      }
      if (!date || !time) {
        toast({ title: 'Choose date & time', variant: 'destructive' });
        return;
      }
      if (!name) {
        toast({ title: 'Client name required', variant: 'destructive' });
        return;
      }

      const start = composeLocalDateTime(date, time);
      if (!start || isNaN(start.getTime())) {
        toast({ title: 'Invalid date/time', variant: 'destructive' });
        return;
      }
      const durMin = Math.max(30, parseInt(String(durationMinutes), 10) || 120);
      const end = new Date(start.getTime() + durMin * 60000);

      const payload = {
        status: status || 'confirmed',
        serviceSlug: serviceSlug || '',
        serviceName: serviceName || serviceSlug || 'Cleaning',
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(end),
        dateKey: start.toISOString().slice(0, 10),
        durationMinutes: durMin,
        cost: Number(cost || 0),
        paid: Number(paid || 0),
        frequency: frequency || 'one-time',
        notes: notes || '',
        contact: {
          name: name || '',
          email: email || '',
          emailLower: (email || '').toLowerCase(),
          phone: phone || '',
        },
        address: { line1: address || '', zip: zip || '' },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: u.uid,
        createdVia: 'owner_manual',
      };

      setSavingManual(true);

      // 2) Create
      const ref = await addDoc(collection(db, 'bookings'), payload);

      // 3) Optimistically add to UI so it appears instantly
      const optimistic = { id: ref.id, ...payload };
      if ((status || 'confirmed') === 'confirmed') {
        setConfirmed((prev) => [...prev, optimistic].sort((a, b) => (a.startAt.seconds || 0) - (b.startAt.seconds || 0)));
        setActiveTab('confirmed');
      } else {
        setRequested((prev) => [...prev, optimistic].sort((a, b) => (a.startAt.seconds || 0) - (b.startAt.seconds || 0)));
        setActiveTab('requested');
      }

      // 4) Email confirmation (optional)
      if (email && emailClient) {
        const dateStr = start.toLocaleDateString();
        const timeStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        let subject, bodyText, bodyHtml;

        if ((status || 'confirmed') === 'confirmed') {
          subject = `${BRAND}: Your booking on ${dateStr} at ${timeStr} is confirmed`;
          bodyText = `Hi ${name},\n\nGreat news! Your ${payload.serviceName} is confirmed for ${dateStr} at ${timeStr}.\nBooking ID: ${ref.id}\n\nThanks,\n${BRAND}`;
          bodyHtml = `<p>Hi ${name},</p><p>Great news! Your <strong>${payload.serviceName}</strong> is confirmed for <strong>${dateStr} at ${timeStr}</strong>.</p><p><strong>Booking ID:</strong> ${ref.id}</p><p>Thanks,<br/>${BRAND}</p>`;
        } else {
          subject = `${BRAND}: We received your booking request`;
          bodyText = `Hi ${name},\n\nWe received your ${payload.serviceName} request for ${dateStr} at ${timeStr}. We'll confirm shortly.\nBooking ID: ${ref.id}\n\nThanks,\n${BRAND}`;
          bodyHtml = `<p>Hi ${name},</p><p>We received your <strong>${payload.serviceName}</strong> request for <strong>${dateStr} at ${timeStr}</strong>. We'll confirm shortly.</p><p><strong>Booking ID:</strong> ${ref.id}</p><p>Thanks,<br/>${BRAND}</p>`;
        }
        await sendEmail({ to: [email, OWNER_EMAIL], subject, html: bodyHtml, text: bodyText });
      }

      // 5) Close & reset
      toast({ title: 'Booking created', description: `Saved as ${payload.status}.` });
      setManualOpen(false);
      resetManualForm();
    } catch (e) {
      // FULL error in toast so you know exactly what's wrong
      toast({ title: 'Could not create booking', description: `${e?.code || ''} ${e?.message || e}`, variant: 'destructive' });
      console.error('createManualBooking error:', e);
    } finally {
      setSavingManual(false);
    }
  };

  /* ---------- render ---------- */

  const loadingAny = loadingRequested || loadingConfirmed || loadingDeclined;
  const visibleByTab =
    activeTab === 'today' ? visibleToday :
    activeTab === 'requested' ? visibleRequested :
    activeTab === 'confirmed' ? visibleConfirmed : visibleDeclined;

  return (
    <div className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div className="mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-bold text-plum">Owner Dashboard</h1>
          <p className="text-plum/70 mt-1">
            Approve or decline booking requests. Reschedule, export, and track revenue. <Mail className="inline h-4 w-4 ml-1 text-gold" />
          </p>
        </motion.div>

        {stickyBar}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="bg-plum/5 rounded-full p-1 grid grid-cols-4">
            <TabsTrigger value="today" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
              Today <span className="ml-2 inline-block min-w-6 text-center rounded-full bg-white text-plum/80 px-1 text-xs">{visibleToday.length}</span>
            </TabsTrigger>
            <TabsTrigger value="requested" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
              Requested <span className="ml-2 inline-block min-w-6 text-center rounded-full bg-white text-plum/80 px-1 text-xs">{visibleRequested.length}</span>
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
              Confirmed <span className="ml-2 inline-block min-w-6 text-center rounded-full bg-white text-plum/80 px-1 text-xs">{visibleConfirmed.length}</span>
            </TabsTrigger>
            <TabsTrigger value="declined" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
              Declined <span className="ml-2 inline-block min-w-6 text-center rounded-full bg-white text-plum/80 px-1 text-xs">{visibleDeclined.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6 space-y-5">
            {loadingAny ? <ListSkeleton rows={3} /> :
              visibleToday.length ? visibleToday.map((b) => (
                <RequestCard key={b.id} b={b} selected={selectedIds.has(b.id)} onToggle={toggleSelect} />
              )) : <ZeroState message="No confirmed bookings today." />}
          </TabsContent>

          <TabsContent value="requested" className="mt-6 space-y-5">
            {loadingAny ? <ListSkeleton rows={3} /> :
              visibleRequested.length ? visibleRequested.map((b) => (
                <RequestCard key={b.id} b={b} showActions selected={selectedIds.has(b.id)} onToggle={toggleSelect} />
              )) : <ZeroState message="No requested bookings." />}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-6 space-y-5">
            {loadingAny ? <ListSkeleton rows={3} /> :
              visibleConfirmed.length ? visibleConfirmed.map((b) => (
                <RequestCard key={b.id} b={b} selected={selectedIds.has(b.id)} onToggle={toggleSelect} />
              )) : <ZeroState message="No confirmed bookings yet." />}
          </TabsContent>

          <TabsContent value="declined" className="mt-6 space-y-5">
            {loadingAny ? <ListSkeleton rows={3} /> :
              visibleDeclined.length ? visibleDeclined.map((b) => (
                <RequestCard key={b.id} b={b} selected={selectedIds.has(b.id)} onToggle={toggleSelect} />
              )) : <ZeroState message="No declined bookings." />}
          </TabsContent>
        </Tabs>
      </div>

      {/* Manual Booking Modal */}
      <PortalModal open={manualOpen} onClose={() => setManualOpen(false)}>
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-plum">New Booking</h2>
              <p className="text-sm text-plum/70 mt-1">Create a manual job for phone-in customers.</p>
            </div>
            {/* Owner status pill */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${auth.currentUser && (!OWNER_UID || auth.currentUser.uid === OWNER_UID) ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
              <ShieldCheck className="w-4 h-4" />
              {auth.currentUser ? ( (!OWNER_UID || auth.currentUser.uid === OWNER_UID) ? 'Owner signed in' : 'Not owner') : 'Not signed in'}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-plum font-medium">Client name</label>
                  <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white mt-1" placeholder="Full name" />
                </div>
                <div>
                  <label className="text-sm text-plum font-medium">Phone</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-white mt-1" placeholder="(401) 555-1234" />
                </div>
                <div>
                  <label className="text-sm text-plum font-medium">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white mt-1" placeholder="client@example.com" />
                </div>
                <div className="flex items-center gap-2 mt-6 sm:mt-[26px]">
                  <input id="emailClient" type="checkbox" checked={form.emailClient} onChange={(e) => setForm({ ...form, emailClient: e.target.checked })} className="h-4 w-4 accent-[--gold-500]" />
                  <label htmlFor="emailClient" className="text-sm text-plum/80">Email client a confirmation</label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-sm text-plum font-medium">Address</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-white mt-1" placeholder="123 Main St" />
                </div>
                <div>
                  <label className="text-sm text-plum font-medium">ZIP</label>
                  <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="bg-white mt-1" placeholder="02903" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="text-sm text-plum font-medium">Service</label>
                  <Input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} className="bg-white mt-1" placeholder="Residential Cleaning" />
                  {selectedTemplate && (
                    <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 text-plum px-2.5 py-1 text-xs">
                      <Check className="w-3.5 h-3.5 text-gold" />
                      <span className="font-medium">
                        Template applied: {SERVICES.find(s => s.slug === selectedTemplate)?.title || selectedTemplate}
                      </span>
                      <button type="button" onClick={clearTemplate} className="text-plum/70 hover:text-plum" title="Clear template">×</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-plum font-medium">Duration (minutes)</label>
                  <Input type="number" min={30} step={15} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className="bg-white mt-1" placeholder="120" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-plum font-medium">Total</label>
                  <Input type="number" min={0} step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="bg-white mt-1" placeholder="200" />
                </div>
                <div>
                  <label className="text-sm text-plum font-medium">Paid</label>
                  <Input type="number" min={0} step="0.01" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} className="bg-white mt-1" placeholder="0" />
                </div>
                <div>
                  <label className="text-sm text-plum font-medium">Frequency</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="mt-1 w-full border border-plum/20 rounded-xl px-3 py-2 bg-white">
                    <option value="one-time">One-time</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-plum font-medium">Date</label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-white mt-1" />
                </div>
                <div>
                  <label className="text-sm text-plum font-medium">Time</label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="bg-white mt-1" />
                </div>
                <div>
                  <label className="text-sm text-plum font-medium">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full border border-plum/20 rounded-xl px-3 py-2 bg-white">
                    <option value="confirmed">Confirmed</option>
                    <option value="requested">Requested</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-plum font-medium">Notes</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-white mt-1" rows={3} placeholder="Entry / parking / pets / special instructions…" />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button type="button" className="rounded-full bg-plum text-white hover:bg-plum/90" onClick={createManualBooking} disabled={savingManual}>
                  {savingManual ? 'Saving…' : 'Create booking'}
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={resetManualForm} disabled={savingManual}>Clear form</Button>
              </div>
            </div>

            {/* Templates */}
            <div>
              <div className="rounded-2xl border border-gold/20 bg-rose-50/60 p-4">
                <div className="text-plum font-semibold mb-2">Service templates</div>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {SERVICES.map((s) => {
                    const isActive = selectedTemplate === s.slug;
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => chooseTemplate(s.slug)}
                        className={[
                          'w-full text-left rounded-xl border transition p-3 relative',
                          isActive ? 'border-gold/60 bg-gold/10 ring-2 ring-gold/40' : 'border-gold/20 bg-white hover:bg-gold/5'
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-2">
                          {isActive
                            ? <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold/90"><Check className="w-3 h-3 text-white" /></span>
                            : <span className="mt-0.5 inline-block w-5 h-5 rounded-full border border-gold/30 bg-white" />}
                          <div>
                            <div className="font-medium text-plum">{s.title}</div>
                            <div className="text-xs text-plum/70">
                              {s.duration ? `Duration: ${s.duration}` : ''}{s.duration && ' · '}
                              {s.priceFrom ? `From ${formatMoney(s.priceFrom)}` : ''}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-plum/70 mt-3">Clicking a template will prefill service name, duration, and an estimated total.</p>
              </div>
            </div>
          </div>
        </div>
      </PortalModal>
    </div>
  );
}
