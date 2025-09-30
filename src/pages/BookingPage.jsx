// src/pages/BookingPage.jsx
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

// ----- Env capacity knobs -----
const SLOT_CAPACITY = Number(import.meta.env.VITE_SLOT_CAPACITY || 1);
const DAILY_CAPACITY = Number(import.meta.env.VITE_DAILY_CAPACITY || 6);

// ----- Constants -----
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

// Fixed start-time options (12h display)
const TIME_OPTIONS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'];

// Operating hours (Sun closed; shorter Sat)
const OPERATING_RULES = {
  SUN_CLOSED: true,
  SAT_LATEST: '01:00 PM',
};

// ===== Solid, readable Select styles =====
const selectTriggerClass =
  "bg-white text-plum border border-plum/30 rounded-md " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus:border-gold/60";
const selectContentClass = "bg-white border border-plum/20 text-plum shadow-xl";
const selectItemClass = "focus:bg-gold/10 focus:text-plum cursor-pointer";

// ----- Utils -----
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
  const dow = date.getDay(); // 0 Sun, 6 Sat
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

  // Confirmed bookings for selected date (to disable time options)
  const [confirmedForDay, setConfirmedForDay] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);

  // Validation state
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

  // Pricing/estimate calculation
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

    // Apply promo AFTER frequency discount
    const afterFreq = conditionAdjustedTotal - frequencyDiscount;
    const promoDiscount = promoApplied && form.promoCode?.toUpperCase() === 'CLEAN10'
      ? afterFreq * 0.10
      : 0;

    const total = Math.max(0, afterFreq - promoDiscount);

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

  // Promo
  const handleApplyPromoCode = () => {
    const code = (form.promoCode || '').trim().toUpperCase();
    if (!code) {
      toast({ title: 'Enter a code to apply' });
      return;
    }
    if (promoApplied) {
      toast({ title: 'Promo already applied', description: 'Remove or change code to re-apply.' });
      return;
    }
    if (code === 'CLEAN10') {
      setPromoApplied(true);
      toast({ title: 'Promo Code Applied!', description: '10% off your estimate has been applied.' });
    } else {
      setPromoApplied(false);
      toast({ title: 'Invalid Promo Code', variant: 'destructive' });
    }
  };

  // Watch date → load confirmed bookings
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
    }, () => setLoadingDay(false));

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date]);

  // Disabled times from capacity + operating rules
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

  // Validation
  const validateForm = useCallback(() => {
    const next = {};
    const required = ['name', 'email', 'phone', 'address', 'zip', 'date', 'time'];
    required.forEach((k) => {
      if (!form[k] || (typeof form[k] === 'string' && !form[k].trim())) {
        next[k] = 'Required';
      }
    });

    if (!form.agreePolicy) {
      next.agreePolicy = 'You must agree to the estimate and deposit policy.';
    }

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

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Enter a valid email.';
    }
    if (form.phone && !/^[0-9\-+() ]{7,}$/.test(form.phone)) {
      next.phone = 'Enter a valid phone.';
    }
    if (form.zip && !/^\d{5}(-\d{4})?$/.test(form.zip)) {
      next.zip = 'Enter a valid ZIP.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, disabledTimes]);

  // Submit
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
      userId: auth.currentUser?.uid || null,
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
      contact: {
        name: form.name,
        email: form.email,
        phone: form.phone,
      },
      address: {
        line1: form.address,
        zip: form.zip,
      },
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

  // a11y live region
  useEffect(() => {
    if (estimateLiveRef.current) {
      estimateLiveRef.current.textContent = `Estimated total ${estimate.total.toFixed(2)} dollars, duration approximately ${estimate.duration} hours.`;
    }
  }, [estimate.total, estimate.duration]);

  return (
    <TooltipProvider>
      {/* ⬇️ changed from bg-white to match the Before & After pink */}
      <div className="py-12 md:py-20 px-4 bg-[#FADADD]">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-plum mb-4">Book Your Cleaning Service</h1>
            <p className="text-lg text-plum/80">Get an instant estimate and schedule your appointment in minutes.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
              {/* Step 1 */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Step 1: Select Your Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {services.map((service) => {
                      const selected = form.service === service.id;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleFormChange('service', service.id)}
                          className={[
                            "p-4 border-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all",
                            "bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
                            selected
                              ? "border-gold bg-gold/10"
                              : "border-plum/20 hover:border-gold/50"
                          ].join(" ")}
                          aria-pressed={selected}
                          aria-label={service.name}
                        >
                          <service.icon className="w-8 h-8 text-plum" />
                          <span className="text-sm font-medium text-center text-plum">
                            {service.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Step 2 (moved up) */}
              <Card className="bg-white">
                <CardHeader><CardTitle>Step 2: Contact & Access Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={errors.name ? 'relative' : ''}>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={e => handleFormChange('name', e.target.value)}
                        aria-invalid={!!errors.name}
                        required
                        className="bg-white"
                      />
                      {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                    </div>
                    <div className={errors.email ? 'relative' : ''}>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={e => handleFormChange('email', e.target.value)}
                        aria-invalid={!!errors.email}
                        required
                        className="bg-white"
                      />
                      {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                    </div>
                  </div>
                  <div className={errors.address ? 'relative' : ''}>
                    <Label htmlFor="address">Full Address</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={e => handleFormChange('address', e.target.value)}
                      aria-invalid={!!errors.address}
                      required
                      className="bg-white"
                    />
                    {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={errors.phone ? 'relative' : ''}>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        pattern="[0-9\-+() ]{7,}"
                        value={form.phone}
                        onChange={e => handleFormChange('phone', e.target.value)}
                        aria-invalid={!!errors.phone}
                        required
                        className="bg-white"
                      />
                      {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                    </div>
                    <div className={errors.zip ? 'relative' : ''}>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        inputMode="numeric"
                        pattern="\d{5}(-\d{4})?"
                        value={form.zip}
                        onChange={e => handleFormChange('zip', e.target.value)}
                        aria-invalid={!!errors.zip}
                        required
                        className="bg-white"
                      />
                      {errors.zip && <p className="text-xs text-red-600 mt-1">{errors.zip}</p>}
                    </div>
                  </div>
                  <div>
                    <Label>Service Frequency</Label>
                    <Select value={form.frequency} onValueChange={(v) => handleFormChange('frequency', v)}>
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClass}>
                        {frequencies.map(freq => (
                          <SelectItem key={freq.id} value={freq.id} className={selectItemClass}>
                            {freq.name} {freq.discount > 0 && `(${Math.round(freq.discount * 100)}% off)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Access Notes (gate codes, parking, etc.)</Label>
                    <Textarea id="notes" value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} className="bg-white" />
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 (Customize moved down) */}
              <Card className="bg-white">
                <CardHeader><CardTitle>Step 3: Customize Your Cleaning</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {form.service !== 'office-cleaning' ? (
                    <>
                      <div>
                        <Label>Property Type</Label>
                        <RadioGroup
                          value={form.propertyType}
                          onValueChange={(v) => handleFormChange('propertyType', v)}
                          className="flex gap-4 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="house" id="house" /><Label htmlFor="house">House</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="apartment" id="apartment" /><Label htmlFor="apartment">Apartment</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={errors.bedrooms ? 'relative' : ''}>
                          <Label htmlFor="bedrooms">Bedrooms</Label>
                          <Select value={String(form.bedrooms)} onValueChange={(v) => handleFormChange('bedrooms', Number(v))}>
                            <SelectTrigger className={selectTriggerClass} aria-invalid={!!errors.bedrooms}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                              {[...Array(9).keys()].map(i => (
                                <SelectItem key={i} value={String(i)} className={selectItemClass}>
                                  {i}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className={errors.bathrooms ? 'relative' : ''}>
                          <Label htmlFor="bathrooms">Bathrooms</Label>
                          <Select value={String(form.bathrooms)} onValueChange={(v) => handleFormChange('bathrooms', Number(v))}>
                            <SelectTrigger className={selectTriggerClass} aria-invalid={!!errors.bathrooms}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                              {[...Array(7).keys()].map(i => (
                                <SelectItem key={i} value={String(i)} className={selectItemClass}>
                                  {i}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label htmlFor="sqft">Square Feet</Label>
                      <Input
                        id="sqft"
                        type="number"
                        min={200}
                        step={50}
                        value={form.sqft}
                        onChange={(e) => handleFormChange('sqft', Number(e.target.value))}
                        className="bg-white"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Condition Level</Label>
                      <RadioGroup
                        value={form.condition}
                        onValueChange={(v) => handleFormChange('condition', v)}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2"><RadioGroupItem value="light" id="light" /><Label htmlFor="light">Light</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="standard" id="standard" /><Label htmlFor="standard">Standard</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="heavy" id="heavy" /><Label htmlFor="heavy">Heavy</Label></div>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>Pets on Site?</Label>
                      <RadioGroup
                        value={form.pets}
                        onValueChange={(v) => handleFormChange('pets', v)}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="pet-no" /><Label htmlFor="pet-no">No</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="pet-yes" /><Label htmlFor="pet-yes">Yes</Label></div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div>
                    <Label>Add-ons</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                      {addons.map(addon => (
                        <div key={addon.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={addon.id}
                            checked={form.addons.includes(addon.id)}
                            onCheckedChange={() => handleAddonToggle(addon.id)}
                          />
                          <Label htmlFor={addon.id} className="cursor-pointer">{addon.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 4 (Schedule) */}
              <Card className="bg-white">
                <CardHeader><CardTitle>Step 4: Schedule Date & Time</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className={errors.date ? 'relative' : ''}>
                    <Calendar
                      mode="single"
                      selected={form.date}
                      onSelect={(d) => handleFormChange('date', d)}
                      disabled={(date) => {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const isPast = date < today;
                        const isClosedSun = OPERATING_RULES.SUN_CLOSED && isSunday(date);
                        return isPast || isClosedSun;
                      }}
                      className="rounded-md border bg-white"
                      classNames={{
                        day_selected:
                          "bg-gold text-white hover:bg-gold hover:text-white focus:bg-gold focus:text-white",
                        day_today: "border border-gold/50",
                        nav_button: "hover:bg-gold/10",
                      }}
                    />
                    {errors.date && <p className="text-xs text-red-600 mt-2">{errors.date}</p>}
                    {loadingDay && <p className="text-xs text-plum/60 mt-2">Checking availability…</p>}
                  </div>

                  <div>
                    <Tooltip>
                      <TooltipTrigger className="w-full text-left"><Label>Available Times</Label></TooltipTrigger>
                      <TooltipContent><p>Select a time that works best for you.</p></TooltipContent>
                    </Tooltip>
                    <p className="text-sm text-plum/70 mb-2">
                      On {form.date ? format(form.date, 'PPP') : 'your selected date'}
                    </p>
                    <RadioGroup
                      value={form.time}
                      onValueChange={(v) => handleFormChange('time', v)}
                      className="grid grid-cols-2 gap-2"
                    >
                      {getTimeOptionsForDate(form.date).length === 0 && (
                        <div className="col-span-2 text-sm text-plum/70">
                          {form.date ? 'No slots available on this day.' : 'Pick a date to see times.'}
                        </div>
                      )}

                      {getTimeOptionsForDate(form.date).map((time) => {
                        const disabled = disabledTimes.has(time);
                        const timeId = `time-${time.replace(/[^a-zA-Z0-9]/g, '')}`;
                        const selected = form.time === time;
                        return (
                          <div key={time}>
                            <RadioGroupItem
                              value={time}
                              id={timeId}
                              className="peer sr-only"
                              disabled={disabled}
                            />
                            <Label
                              htmlFor={timeId}
                              className={[
                                "block p-3 border-2 rounded-lg text-center transition bg-white cursor-pointer",
                                disabled
                                  ? "opacity-50 pointer-events-none line-through"
                                  : selected
                                  ? "border-gold bg-gold/10 ring-2 ring-gold/30"
                                  : "border-plum/20 hover:border-gold/50"
                              ].join(" ")}
                              aria-pressed={selected}
                              aria-current={selected ? "true" : undefined}
                              title={disabled ? 'This time is unavailable' : 'Select this time'}
                            >
                              {time}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                    {errors.time && <p className="text-xs text-red-600 mt-2">{errors.time}</p>}
                    {form.date && disabledTimes.size > 0 && <div />}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 sticky top-24">
              <Card className="bg-white">
                <CardHeader><CardTitle className="text-plum">Your Estimate</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(estimate).map(([key, value]) => {
                    const labels = { base: 'Base Service', sizeCost: 'Size', petsCost: 'Pet Fee', addonsCost: 'Add-ons', conditionCost: 'Condition' };
                    if (value > 0 && labels[key]) {
                      return (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-plum/80">{labels[key]}</span>
                          <span>${value.toFixed(2)}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                  <div className="border-t border-gold/30 my-2 pt-2 space-y-2">
                    {estimate.discount > 0 && (
                      <div className="flex justify-between text-sm font-semibold text-green-700">
                        <span className="flex items-center">
                          <Tag className="h-4 w-4 mr-1" />
                          Frequency Discount
                        </span>
                        <span>−${estimate.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {estimate.promoDiscount > 0 && (
                      <div className="flex justify-between text-sm font-semibold text-green-700">
                        <span className="flex items-center">
                          <Tag className="h-4 w-4 mr-1" />
                          Promo (CLEAN10)
                        </span>
                        <span>−${estimate.promoDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-plum mt-1">
                      <span className="flex items-center text-lg">
                        <Clock className="h-5 w-5 mr-2 text-gold" />
                        Est. Duration
                      </span>
                      <span>~{estimate.duration} hours</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold text-plum">
                      <span>Total</span>
                      <span>${estimate.total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-plum/70 pt-2 flex items-start gap-1">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>Final price may adjust on site after walkthrough.</span>
                  </div>
                  <div className="sr-only" aria-live="polite" ref={estimateLiveRef} />
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input
                      type="text"
                      placeholder="Promo Code"
                      value={form.promoCode}
                      onChange={e => {
                        handleFormChange('promoCode', e.target.value);
                        if (promoApplied) setPromoApplied(false);
                      }}
                      className="bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyPromoCode}
                      className="border-gold text-gold hover:bg-gold/10 hover:text-gold"
                      disabled={!form.promoCode?.trim() || promoApplied}
                    >
                      {promoApplied ? 'Applied' : 'Apply'}
                    </Button>
                  </div>

                  {/* ⚖️ Disclaimer before the button */}
                  <div className="rounded-xl border border-gold/30 bg-rose-50 p-4 -mt-1">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-gold mt-0.5" />
                      <div className="text-sm text-plum/80">
                        <p className="font-semibold text-plum">Important: estimates are not final quotes.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>The online total is an estimate. Final pricing is confirmed after we physically see the property and walk through the scope.</li>
                          <li>A <span className="font-semibold">$50 non-refundable deposit</span> is required to hold your appointment. It is applied to your final balance at service.</li>
                          <li><span className="font-semibold">Timing:</span> once we confirm your date and time, the deposit is due within 24 hours or the slot may be released.</li>
                          <li><span className="font-semibold">Rescheduling:</span> one reschedule is allowed with at least 48 hours notice. The deposit transfers to the new date.</li>
                          <li><span className="font-semibold">Cancellations and no-shows:</span> canceling within 48 hours of the appointment or not being present at the scheduled time forfeits the deposit.</li>
                          <li>If the size or condition differs from what was submitted, the price and duration will be adjusted on site before work begins.</li>
                        </ul>
                        <label className="mt-3 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.agreePolicy}
                            onChange={(e) => handleFormChange('agreePolicy', e.target.checked)}
                            className="h-4 w-4 rounded border-plum/30 accent-[--gold-500]"
                          />
                          <span>I understand and agree to the estimate and deposit policy.</span>
                        </label>
                        {errors.agreePolicy && <p className="text-xs text-red-600 mt-1">{errors.agreePolicy}</p>}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleProceedToCheckout}
                    size="lg"
                    className="w-full bg-gold hover:bg-gold/90 text-white rounded-full disabled:opacity-60"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting…' : <>Proceed to Checkout <ChevronRight className="h-5 w-5 ml-2" /></>}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default BookingPage;
