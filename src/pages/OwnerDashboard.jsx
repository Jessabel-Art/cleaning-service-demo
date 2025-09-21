// src/pages/OwnerDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, CheckCircle, XCircle, MapPin, DollarSign, Clock, Sparkles, Mail } from 'lucide-react';

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
  const [requested, setRequested] = useState([]);
  const [confirmed, setConfirmed] = useState([]);
  const [declined, setDeclined] = useState([]);

  const todayKey = new Date().toISOString().slice(0,10); // yyyy-mm-dd

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

  // --- Email helper (Firebase Email Extension expects docs in /mail) ---
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

  const approve = async (b) => {
    try {
      await updateDoc(doc(db, 'bookings', b.id), {
        status: 'confirmed',
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Booking confirmed' });

      // Email client (and CC owner)
      const start = b.startAt?.toDate ? b.startAt.toDate() : null;
      const dateStr = start ? start.toLocaleDateString() : 'TBD';
      const timeStr = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

      const subject = `${BRAND}: Your booking on ${dateStr}${timeStr ? ` at ${timeStr}` : ''} is confirmed`;
      const bodyText =
        `Hi ${b.contact?.name || ''},\n\n` +
        `Great news! Your ${b.serviceName || 'cleaning'} is confirmed for ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.\n` +
        `Booking ID: ${b.id}\n\nThanks,\n${BRAND}`;
      const bodyHtml =
        `<p>Hi ${b.contact?.name || ''},</p>` +
        `<p>Great news! Your <strong>${b.serviceName || 'cleaning'}</strong> is confirmed for <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p>` +
        `<p><strong>Booking ID:</strong> ${b.id}</p>` +
        `<p>Thanks,<br/>${BRAND}</p>`;

      if (b.contact?.email) {
        await sendEmail({ to: [b.contact.email, OWNER_EMAIL], subject, html: bodyHtml, text: bodyText });
      }
    } catch (e) {
      toast({ title: 'Error confirming', description: String(e), variant: 'destructive' });
    }
  };

  const decline = async (b) => {
    try {
      await updateDoc(doc(db, 'bookings', b.id), {
        status: 'declined',
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Booking declined' });

      // Email client (and CC owner)
      const start = b.startAt?.toDate ? b.startAt.toDate() : null;
      const dateStr = start ? start.toLocaleDateString() : 'TBD';
      const timeStr = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

      const subject = `${BRAND}: Your booking request could not be scheduled`;
      const bodyText =
        `Hi ${b.contact?.name || ''},\n\n` +
        `We’re sorry, but we can’t schedule your ${b.serviceName || 'cleaning'} on ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.\n` +
        `Please reply to this email and we’ll find another time that works.\n\n` +
        `Booking ID: ${b.id}\n\nThanks,\n${BRAND}`;
      const bodyHtml =
        `<p>Hi ${b.contact?.name || ''},</p>` +
        `<p>We’re sorry, but we can’t schedule your <strong>${b.serviceName || 'cleaning'}</strong> on <strong>${dateStr}${timeStr ? ` at ${timeStr}` : ''}</strong>.</p>` +
        `<p>Please reply to this email and we’ll find another time that works.</p>` +
        `<p><strong>Booking ID:</strong> ${b.id}</p>` +
        `<p>Thanks,<br/>${BRAND}</p>`;

      if (b.contact?.email) {
        await sendEmail({ to: [b.contact.email, OWNER_EMAIL], subject, html: bodyHtml, text: bodyText });
      }
    } catch (e) {
      toast({ title: 'Error declining', description: String(e), variant: 'destructive' });
    }
  };

  const RequestCard = ({ b, showActions = false }) => {
    const start = b.startAt?.toDate ? b.startAt.toDate() : null;
    const end = b.endAt?.toDate ? b.endAt.toDate() : null;

    const dateStr = start ? start.toLocaleDateString() : 'TBD';
    const timeStr = start ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    const durationHrs = (b.durationMinutes || 120) / 60;

    return (
      <Card className="border-plum/10">
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="text-plum">{b.serviceName || b.serviceSlug}</CardTitle>
            <p className="text-xs text-plum/60">ID: {b.id}</p>
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
            <Row icon={Calendar} label="Date" value={`${dateStr}${timeStr ? ` at ${timeStr}` : ''}`} />
            <Row icon={Clock} label="Duration" value={`~${durationHrs} hrs`} />
            <Row icon={DollarSign} label="Total" value={`$${Number(b.cost || 0).toFixed(2)}`} />
            <Row icon={Sparkles} label="Frequency" value={b.frequency || 'one-time'} />
            {b.address?.line1 && <Row icon={MapPin} label="Address" value={`${b.address.line1} ${b.address.zip || ''}`} />}
          </div>

          {b.contact?.name || b.contact?.email || b.contact?.phone ? (
            <div className="rounded-lg bg-plum/5 p-3 text-sm">
              <p className="text-plum/80">
                <span className="font-medium">Client:</span> {b.contact?.name || '—'}
              </p>
              <p className="text-plum/80">
                <span className="font-medium">Email:</span> {b.contact?.email || '—'}
              </p>
              <p className="text-plum/80">
                <span className="font-medium">Phone:</span> {b.contact?.phone || '—'}
              </p>
            </div>
          ) : null}

          {/* Calendar export for owner */}
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
            <div className="flex gap-2 pt-2">
              <Button className="bg-green-600 hover:bg-green-700 text-white rounded-full" onClick={() => approve(b)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button variant="destructive" className="rounded-full" onClick={() => decline(b)}>
                <XCircle className="h-4 w-4 mr-1" /> Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const todayConfirmed = useMemo(
    () => confirmed.filter(b => b.dateKey === todayKey),
    [confirmed, todayKey]
  );

  return (
    <div className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl md:text-5xl font-bold text-plum">Owner Dashboard</h1>
          <p className="text-plum/70">Approve or decline booking requests. Export confirmed jobs to your calendar. <Mail className="inline h-4 w-4 ml-1 text-gold" /></p>
        </motion.div>

        <Tabs defaultValue="today">
          <TabsList className="bg-plum/5 rounded-full p-1 grid grid-cols-4">
            <TabsTrigger value="today" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">Today</TabsTrigger>
            <TabsTrigger value="requested" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">Requested</TabsTrigger>
            <TabsTrigger value="confirmed" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">Confirmed</TabsTrigger>
            <TabsTrigger value="declined" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">Declined</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6 space-y-4">
            {todayConfirmed.length ? todayConfirmed.map(b => (
              <RequestCard key={b.id} b={b} />
            )) : (
              <Card><CardContent className="p-6 text-plum/70">No confirmed bookings today.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="requested" className="mt-6 space-y-4">
            {requested.length ? requested.map(b => (
              <RequestCard key={b.id} b={b} showActions />
            )) : (
              <Card><CardContent className="p-6 text-plum/70">No requested bookings.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-6 space-y-4">
            {confirmed.length ? confirmed.map(b => (
              <RequestCard key={b.id} b={b} />
            )) : (
              <Card><CardContent className="p-6 text-plum/70">No confirmed bookings yet.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="declined" className="mt-6 space-y-4">
            {declined.length ? declined.map(b => (
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
