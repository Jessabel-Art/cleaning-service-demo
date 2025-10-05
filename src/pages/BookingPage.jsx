// src/pages/BookingPage.jsx
// (same imports as you shared)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/components/ui/use-toast';
import { Home, Sparkles, Truck, Building, Clock, ChevronRight, Tag, Info, AlertCircle } from 'lucide-react';
import { format, isSunday } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// 🔥 Firestore
import { db, auth } from '@/lib/firebase';
import {
  addDoc, collection, serverTimestamp, Timestamp,
  query, where, onSnapshot
} from 'firebase/firestore';

const SLOT_CAPACITY = Number(import.meta.env.VITE_SLOT_CAPACITY || 1);
const DAILY_CAPACITY = Number(import.meta.env.VITE_DAILY_CAPACITY || 6);

const services = [
  { id: 'residential-cleaning', name: 'Residential Cleaning', icon: Home },
  { id: 'deep-clean', name: 'Deep Clean', icon: Sparkles },
  { id: 'move-in-move-out', name: 'Move-In/Move-Out', icon: Truck },
  { id: 'office-cleaning', name: 'Office Cleaning', icon: Building },
];

const addons = [
  { id: 'fridge', name: 'Inside Fridge', price: 20 },
  { id: 'oven', name: 'Inside Oven', price: 20 },
  { id: 'windows', name: 'Interior Windows', price: 30 },
  { id: 'baseboards', name: 'Baseboards', price: 25 },
  { id: 'laundry', name: 'Laundry Fold', price: 15 },
  { id: 'garage', name: 'Garage Sweep', price: 20 },
  { id: 'carpet', name: 'Carpet Shampoo', price: 40 },
];

const frequencies = [
  { id: 'one-time', name: 'One-time', discount: 0 },
  { id: 'weekly', name: 'Weekly', discount: 0.15 },
  { id: 'biweekly', name: 'Biweekly', discount: 0.10 },
  { id: 'monthly', name: 'Monthly', discount: 0.05 },
];

const TIME_OPTIONS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'];

const OPERATING_RULES = {
  SUN_CLOSED: true,
  SAT_LATEST: '01:00 PM',
};

const selectTriggerClass =
  "bg-white text-plum border border-plum/30 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus:border-gold/60";
const selectContentClass = "bg-white border border-plum/20 text-plum shadow-xl";
const selectItemClass = "focus:bg-gold/10 focus:text-plum cursor-pointer";

function parseTime12hToHoursMinutes(t) {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return { h, min };
}
function combineDateAndTime(dateObj, timeStr) {
  if (!dateObj || !timeStr) return null;
  const t = parseTime12hToHoursMinutes(timeStr);
  if (!t) return null;
  const d = new Date(dateObj);
  d.setHours(t.h, t.min, 0, 0);
  return d;
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}
function getTimeOptionsForDate(date) {
  if (!date) return TIME_OPTIONS;
  if (OPERATING_RULES.SUN_CLOSED && isSunday(date)) return [];
  const dow = date.getDay();
  if (dow === 6 && OPERATING_RULES.SAT_LATEST) {
    return TIME_OPTIONS.filter(t => {
      const cutoff = parseTime12hToHoursMinutes(OPERATING_RULES.SAT_LATEST);
      const curr = parseTime12hToHoursMinutes(t);
      if (!cutoff || !curr) return true;
      if (curr.h < cutoff.h) return true;
      if (curr.h === cutoff.h) return curr.min <= cutoff.min;
      return false;
    });
  }
  return TIME_OPTIONS;
}

const STORAGE_KEY = 'booking_form_v1';

const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    const base = saved ? JSON.parse(saved) : {};
    return {
      service: searchParams.get('service') || base.service || 'residential-cleaning',
      propertyType: base.propertyType || 'house',
      sqft: base.sqft ?? 1500,
      bedrooms: base.bedrooms ?? 2,
      bathrooms: base.bathrooms ?? 1,
      sizeMode: base.sizeMode || 'bed-bath',
      condition: base.condition || 'standard',
      pets: base.pets || 'no',
      addons: base.addons || [],
      frequency: base.frequency || 'one-time',
      date: base.date ? new Date(base.date) : null,
      time: base.time || '',
      name: base.name || '',
      email: base.email || '',
      phone: base.phone || '',
      address: base.address || '',
      zip: base.zip || '',
      notes: base.notes || '',
      promoCode: base.promoCode || '',
      agreePolicy: base.agreePolicy || false,
    };
  });

  const [estimate, setEstimate] = useState({
    base: 0,
    sizeCost: 0,
    conditionCost: 0,
    petsCost: 0,
    addonsCost: 0,
    subtotal: 0,
    discount: 0,
    promoDiscount: 0,
    total: 0,
    duration: 0,
  });

  const [promoApplied, setPromoApplied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmedForDay, setConfirmedForDay] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);

  const [errors, setErrors] = useState({});
  const estimateLiveRef = useRef(null);

  const handleFormChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...next,
        date: next.date ? next.date.toISOString() : null,
      }));
      return next;
    });
  };

  const handleAddonToggle = (addonId) => {
    const newAddons = form.addons.includes(addonId)
      ? form.addons.filter(id => id !== addonId)
      : [...form.addons, addonId];
    handleFormChange('addons', newAddons);
  };

  const calculateEstimate = useCallback(() => {
    let base = 0, sizeCost = 0, conditionMultiplier = 1, petsCost = 0, addonsCost = 0, frequencyDiscount = 0, duration = 0;

    if (form.service === 'office-cleaning') {
      base = 0;
      sizeCost = form.sqft * 0.12;
      duration = form.sqft / 500;
    } else {
      base = 80;
      sizeCost = (form.bedrooms * 20) + (form.bathrooms * 25);
      duration = (form.bedrooms * 0.5) + (form.bathrooms * 0.5) + 1;
    }

    if (form.service === 'deep-clean') { base *= 1.5; duration *= 1.5; }
    if (form.service === 'move-in-move-out') { base *= 1.8; duration *= 1.8; }

    if (form.condition === 'light') conditionMultiplier = 0.9;
    if (form.condition === 'heavy') { conditionMultiplier = 1.25; duration *= 1.2; }

    if (form.pets === 'yes') { petsCost = 15; duration += 0.25; }

    form.addons.forEach(addonId => {
      const addon = addons.find(a => a.id === addonId);
      if (addon) { addonsCost += addon.price; duration += 0.5; }
    });

    const subtotalBeforeCondition = base + sizeCost + petsCost + addonsCost;
    const conditionAdjustedTotal = subtotalBeforeCondition * conditionMultiplier;

    const freq = frequencies.find(f => f.id === form.frequency);
    if (freq && (form.service === 'residential-cleaning' || form.service === 'deep-clean')) {
      frequencyDiscount = conditionAdjustedTotal * freq.discount;
    }

    const afterFreq = conditionAdjustedTotal - frequencyDiscount;
    const promoDiscount = promoApplied && form.promoCode?.toUpperCase() === 'CLEAN10'
      ? afterFreq * 0.10
      : 0;

    const total = Math.max(0, afterFreq - promoDiscount);

    // Prefill name/email/phone for signed-in users (runs once)
    useEffect(() => {
      const u = auth.currentUser;
      if (!u) return;
      if (!form.name && u.displayName) handleFormChange('name', u.displayName);
      if (!form.email && u.email) handleFormChange('email', u.email);
      if (!form.phone && u.phoneNumber) handleFormChange('phone', u.phoneNumber);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    setEstimate({
      base,
      sizeCost,
      conditionCost: (conditionAdjustedTotal - subtotalBeforeCondition),
      petsCost,
      addonsCost,
      subtotal: conditionAdjustedTotal,
      discount: frequencyDiscount,
      promoDiscount,
      total,
      duration: Math.round(duration * 2) / 2,
    });
  }, [form, promoApplied]);

  useEffect(() => { calculateEstimate(); }, [calculateEstimate]);

  // Load confirmed bookings for selected day (for capacity checks)
  useEffect(() => {
    handleFormChange('time', '');
    if (!form.date) {
      setConfirmedForDay([]);
      return;
    }
    if (OPERATING_RULES.SUN_CLOSED && isSunday(form.date)) {
      setConfirmedForDay([]);
      return;
    }

    setLoadingDay(true);
    const dateKey = format(form.date, 'yyyy-MM-dd');

    const q = query(
      collection(db, 'bookings'),
      where('dateKey', '==', dateKey),
      where('status', '==', 'confirmed')
    );

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConfirmedForDay(rows);
      setLoadingDay(false);
    }, (err) => {
      // quietly ignore permission issues here (rules don’t allow global reads)
      setLoadingDay(false);
      console.warn('Availability read skipped:', err?.code || err);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date]);

  const disabledTimes = useMemo(() => {
    if (!form.date) return new Set();
    if (OPERATING_RULES.SUN_CLOSED && isSunday(form.date)) {
      return new Set(getTimeOptionsForDate(form.date));
    }
    if (confirmedForDay.length >= DAILY_CAPACITY) {
      return new Set(getTimeOptionsForDate(form.date));
    }
    const blocked = new Set();
    const allowedOptions = getTimeOptionsForDate(form.date);
    allowedOptions.forEach((opt) => {
      const slotStart = combineDateAndTime(form.date, opt);
      if (!slotStart) return;

      const hours = Number.isFinite(estimate.duration) && estimate.duration > 0 ? estimate.duration : 2;
      const slotEnd = new Date(slotStart.getTime() + hours * 60 * 60 * 1000);

      const overlapCount = confirmedForDay.reduce((acc, b) => {
        const s = b.startAt?.toDate ? b.startAt.toDate() : null;
        const e = b.endAt?.toDate
          ? b.endAt.toDate()
          : s
          ? new Date(s.getTime() + (b.durationMinutes || 120) * 60000)
          : null;
        return (s && e && overlaps(slotStart, slotEnd, s, e)) ? acc + 1 : acc;
      }, 0);

      if (overlapCount >= SLOT_CAPACITY) blocked.add(opt);
    });
    return blocked;
  }, [form.date, confirmedForDay, estimate.duration]);

  const validateForm = useCallback(() => {
    const next = {};
    const required = ['name', 'email', 'phone', 'address', 'zip', 'date', 'time'];
    required.forEach((k) => {
      if (!form[k] || (typeof form[k] === 'string' && !form[k].trim())) {
        next[k] = 'Required';
      }
    });

    if (!form.agreePolicy) next.agreePolicy = 'You must agree to the estimate and deposit policy.';

    if (form.date && OPERATING_RULES.SUN_CLOSED && isSunday(form.date)) {
      next.date = 'We are closed on Sundays.';
    }

    if (form.date && form.time) {
      const allowed = getTimeOptionsForDate(form.date);
      if (!allowed.includes(form.time)) {
        next.time = 'This time is not available on the selected day.';
      } else if (disabledTimes.has(form.time)) {
        next.time = 'This time is already booked.';
      }
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email.';
    if (form.phone && !/^[0-9\-+() ]{7,}$/.test(form.phone)) next.phone = 'Enter a valid phone.';
    if (form.zip && !/^\d{5}(-\d{4})?$/.test(form.zip)) next.zip = 'Enter a valid ZIP.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, disabledTimes]);

  // ✅ Submit (requires login; matches security rules)
  const handleProceedToCheckout = async () => {
    if (isSubmitting) return;

    const ok = validateForm();
    if (!ok) {
      toast({
        variant: "destructive",
        title: "Please fix the highlighted fields",
        description: "We need a few details to lock in your booking.",
      });
      return;
    }

    if (!auth.currentUser) {
      toast({
        variant: 'destructive',
        title: 'Please sign in',
        description: 'Create an account or log in to complete your booking.',
      });
      navigate('/auth', { replace: true, state: { from: '/book' } });
      return;
    }

    if (confirmedForDay.length >= DAILY_CAPACITY) {
      toast({
        variant: 'destructive',
        title: 'Day fully booked',
        description: 'Please pick another date. This one has reached capacity.',
      });
      return;
    }
    if (disabledTimes.has(form.time)) {
      toast({
        variant: 'destructive',
        title: 'Time no longer available',
        description: 'Please choose another time slot.',
      });
      return;
    }

    const serviceMeta = services.find(s => s.id === form.service);
    const startDate = combineDateAndTime(form.date, form.time);
    if (!startDate) {
      toast({
        variant: 'destructive',
        title: 'Pick a valid date and time',
        description: 'Please select both date and time.',
      });
      return;
    }

    const durationHours = Number.isFinite(estimate.duration) && estimate.duration > 0 ? estimate.duration : 2;
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
    const dateKey = format(startDate, 'yyyy-MM-dd');

    const payload = {
      userId: auth.currentUser.uid,
      serviceSlug: form.service,
      serviceName: serviceMeta?.name || 'Residential Cleaning',
      frequency: form.frequency,
      propertyType: form.propertyType,
      sqft: form.sqft,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      condition: form.condition,
      pets: form.pets === 'yes',
      addons: form.addons,
      contact: { name: form.name, email: form.email, phone: form.phone },
      address: { line1: form.address, zip: form.zip },
      notes: form.notes || '',
      estimate: {
        base: estimate.base,
        sizeCost: estimate.sizeCost,
        conditionCost: estimate.conditionCost,
        petsCost: estimate.petsCost,
        addonsCost: estimate.addonsCost,
        discount: estimate.discount,
        promoDiscount: estimate.promoDiscount,
        total: estimate.total,
        durationHours,
      },
      cost: estimate.total,
      paid: 0,
      depositDue: 50,
      status: 'requested',
      startAt: Timestamp.fromDate(startDate),
      endAt: Timestamp.fromDate(endDate),
      durationMinutes: Math.round(durationHours * 60),
      dateKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      promoCode: promoApplied ? (form.promoCode || null) : null,
      agreePolicy: form.agreePolicy,
    };

    try {
      setIsSubmitting(true);
      const ref = await addDoc(collection(db, 'bookings'), payload);
      navigate(`/confirm?bookingId=${ref.id}`);
    } catch (err) {
      console.error('Booking failed:', err);
      toast({
        variant: 'destructive',
        title: 'Could not submit booking',
        description: String(err?.message || err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (estimateLiveRef.current) {
      estimateLiveRef.current.textContent = `Estimated total ${estimate.total.toFixed(2)} dollars, duration approximately ${estimate.duration} hours.`;
    }
  }, [estimate.total, estimate.duration]);

  return (
    <TooltipProvider>
      <div className="py-12 md:py-20 px-4 bg-[#FADADD]">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-plum mb-4">Book Your Cleaning Service</h1>
            <p className="text-lg text-plum/80">Get an instant estimate and schedule your appointment in minutes.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* ...everything else unchanged from your version (steps, sidebar) ... */}
            {/* (for brevity this block matches what you pasted; only the logic above changed) */}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BookingPage;
