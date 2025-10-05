// src/pages/ConfirmationPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Sparkles, Home, DollarSign, Info } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import CalendarExportButtons from '@/components/calendar/CalendarExportButtons';
import { buildGoogleCalendarUrl, buildICS, downloadICSFile } from '@/utils/calendar';

// Minimal payment info (keep in sync with ClientPortalPage)
const PAYMENT_INFO = {
  depositAmount: 50,
  cash: true,
  cashApp: '$Sterlingsterls', 
  zelle: '401-658-6708, use my name Sterling Sanchez in Zelle',
  notes: 'Please include your full name in the payment note.',
};

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const bookingId = search.get('bookingId');

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Derive presentable fields from Firestore doc
  const present = useMemo(() => {
    if (!booking) return null;

    const startAt = booking.startAt?.toDate ? booking.startAt.toDate() : null;
    const durationHrs =
      Number(booking.estimate?.durationHours) ||
      Number(booking.estimate?.duration) ||
      2;
    const endAt = startAt
      ? new Date(startAt.getTime() + durationHrs * 60 * 60 * 1000)
      : null;

    const dateStr = startAt ? startAt.toLocaleDateString() : 'TBD';
    const timeStr = startAt
      ? startAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';

    const status = booking.status || 'requested';
    const serviceName = booking.serviceName || booking.serviceSlug || 'Residential Cleaning';
    const total = Number(booking.cost || 0);
    const paid = Number(booking.paid || 0);
    const notes = booking.notes || '';
    const address =
      booking.address?.line1 ||
      booking.address?.full ||
      booking.address ||
      '';

    return {
      dateStr,
      timeStr,
      status,
      serviceName,
      total,
      paid,
      startAt,
      endAt,
      duration: durationHrs,
      notes,
      address,
    };
  }, [booking]);

  useEffect(() => {
    // Clear any legacy localStorage state (from pre-Firebase flow)
    try {
      localStorage.removeItem('bookingDetails');
    } catch (_) {}

    if (!bookingId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    (async () => {
      try {
        const ref = doc(db, 'bookings', bookingId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          setBooking({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error('Failed to load booking:', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="py-20 px-4 bg-white flex items-center justify-center min-h-[60vh]">
        <p className="text-plum/70">Loading your confirmation…</p>
      </div>
    );
  }

  if (notFound || !present) {
    return (
      <div className="py-20 px-4 bg-white flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg w-full text-center p-8">
          <CardTitle className="text-2xl text-plum mb-2">We couldn’t find that booking</CardTitle>
          <p className="text-plum/70 mb-6">
            The link may be invalid or expired. If you already submitted a request, you’ll see it in your client portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-gold text-white hover:bg-gold/90 rounded-full">
              <Link to="/portal">Go to Client Portal</Link>
            </Button>
            <Button asChild variant="outline" className="border-gold text-gold hover:bg-gold/10 rounded-full">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Homepage
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-20 px-4 bg-white flex items-center justify-center min-h-[70vh]">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="text-center shadow-lg">
          <CardHeader className="pt-8">
            <CheckCircle className="mx-auto h-20 w-20 text-green-500" />
            <CardTitle className="text-3xl md:text-4xl font-bold text-plum mt-4">
              Booking Received!
            </CardTitle>
            <p className="text-plum/80 text-lg">
              Thanks—your request was submitted and is currently <strong>{present.status}</strong>.
            </p>
          </CardHeader>

          <CardContent className="space-y-6 text-left p-8">
            <h3 className="text-xl font-semibold text-plum border-b border-gold/50 pb-2 mb-4">
              Your Booking Details
            </h3>

            <div className="space-y-3 text-plum/90">
              <Row icon={Sparkles} label="Service" value={present.serviceName} />
              <Row
                icon={Calendar}
                label="Date"
                value={`${present.dateStr}${present.timeStr ? ` at ${present.timeStr}` : ''}`}
              />
              <Row icon={DollarSign} label="Total" value={`$${present.total.toFixed(2)}`} />
              {present.paid > 0 && (
                <Row icon={DollarSign} label="Amount Recorded" value={`$${present.paid.toFixed(2)}`} />
              )}
              <div className="text-sm text-plum/70 mt-2">
                Booking ID: <span className="font-medium">{booking.id}</span>
              </div>
            </div>

            {/* ✅ Add-to-calendar section */}
            <div className="pt-4">
              <CalendarExportButtons
                title={`${present.serviceName} — Sanchez Services`}
                start={present.startAt}
                end={present.endAt}
                details={`Booking ID: ${booking.id}\nNotes: ${present.notes}`}
                location={present.address}
                uid={booking.id}
                fileName={`sanchez-${booking.id}.ics`}
              />
            </div>

            {/* Payment instructions */}
            <div className="mt-6 space-y-3">
              <h4 className="font-semibold text-plum">Payment Instructions</h4>
              <div className="rounded-lg bg-plum/5 p-4 text-sm text-plum/80">
                <Info className="inline-block w-4 h-4 mr-1 text-gold" />
                A <strong>${PAYMENT_INFO.depositAmount} non-refundable deposit</strong> is required to hold your slot.
                Since we don’t accept payments on the website, please use one of the methods below and include your
                <strong> full name and booking ID</strong> in the payment note.
              </div>

              {PAYMENT_INFO.cash && (
                <PayRow
                  icon={DollarSign}
                  title="Cash"
                  text="Cash is accepted at time of service. Deposits can be sent via Cash App or Zelle."
                />
              )}
              <PayRow
                icon={DollarSign}
                title="Cash App"
                text={
                  <>
                    Send to <span className="font-semibold">{PAYMENT_INFO.cashApp}</span> and include your name & booking ID.
                  </>
                }
              />
              <PayRow
                icon={DollarSign}
                title="Zelle"
                text={
                  <>
                    Send to <span className="font-semibold">{PAYMENT_INFO.zelle}</span> and include your name & booking ID.
                  </>
                }
              />
            </div>

            <p className="text-center text-sm text-plum/70 pt-2">
              You’ll receive an email once the business confirms or declines your request. You can also
              check status anytime in your client portal.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                <Link to="/portal">Go to Client Portal</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-gold text-gold hover:bg-gold/10 hover:text-gold rounded-full"
              >
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Homepage
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex justify-between items-center">
    <span className="font-medium flex items-center">
      <Icon className="h-5 w-5 mr-2 text-gold" />
      {label}:
    </span>
    <span className="font-semibold">{value}</span>
  </div>
);

const PayRow = ({ icon: Icon, title, text }) => (
  <div className="rounded-xl border border-gold/20 bg-white p-4 flex items-start gap-3">
    <Icon className="w-5 h-5 text-gold mt-0.5" />
    <div>
      <p className="text-plum font-medium">{title}</p>
      <p className="text-sm text-plum/70">{text}</p>
    </div>
  </div>
);

export default ConfirmationPage;
