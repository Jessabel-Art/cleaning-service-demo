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
import { Home, Sparkles, Truck, Building, Clock, ChevronRight, Tag, Info } from 'lucide-react';
import { format, isSunday } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Firestore
import { db, auth } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, Timestamp, query, where, onSnapshot } from 'firebase/firestore';

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

const OPERATING_RULES = { SUN_CLOSED: true, SAT_LATEST: '01:00 PM' };

const selectTriggerClass =
  'bg-white text-plum border border-plum/30 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus:border-gold/60';
const selectContentClass = 'bg-white border border-plum/20 text-plum shadow-xl';
const selectItemClass = 'focus:bg-gold/10 focus:text-plum cursor-pointer';

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
    return TIME_OPTIONS.filter((t) => {
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

export default function BookingPage() {
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
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...next, date: next.date ? next.date.toISOString() : null })
      );
      return next;
    });
  };
  const handleAddonToggle = (addonId) => {
    const newAddons = form.addons.includes(addonId)
      ? form.addons.filter((id) => id !== addonId)
      : [...form.addons, addonId];
    handleFormChange('addons', newAddons);
  };

  // Prefill from current user once
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    setForm((prev) => {
      const next = { ...prev };
      if (!next.name && u.displayName) next.name = u.displayName;
      if (!next.email && u.email) next.email = u.email;
      if (!next.phone && u.phoneNumber) next.phone = u.phoneNumber;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateEstimate = useCallback(() => {
    let base = 0,
      sizeCost = 0,
      conditionMultiplier = 1,
      petsCost = 0,
      addonsCost = 0,
      frequencyDiscount = 0,
      duration = 0;

    if (form.service === 'office-cleaning') {
      base = 0;
      sizeCost = form.sqft * 0.12;
      duration = form.sqft / 500;
    } else {
      base = 80;
      sizeCost = form.bedrooms * 20 + form.bathrooms * 25;
      duration = form.bedrooms * 0.5 + form.bathrooms * 0.5 + 1;
    }

    if (form.service === 'deep-clean') {
      base *= 1.5;
      duration *= 1.5;
    }
    if (form.service === 'move-in-move-out') {
      base *= 1.8;
      duration *= 1.8;
    }

    if (form.condition === 'light') conditionMultiplier = 0.9;
    if (form.condition === 'heavy') {
      conditionMultiplier = 1.25;
      duration *= 1.2;
    }

    if (form.pets === 'yes') {
      petsCost = 15;
      duration += 0.25;
    }

    form.addons.forEach((addonId) => {
      const addon = addons.find((a) => a.id === addonId);
      if (addon) {
        addonsCost += addon.price;
        duration += 0.5;
      }
    });

    const subtotalBeforeCondition = base + sizeCost + petsCost + addonsCost;
    const conditionAdjustedTotal = subtotalBeforeCondition * conditionMultiplier;

    const freq = frequencies.find((f) => f.id === form.frequency);
    if (freq && (form.service === 'residential-cleaning' || form.service === 'deep-clean')) {
      frequencyDiscount = conditionAdjustedTotal * freq.discount;
    }

    const afterFreq = conditionAdjustedTotal - frequencyDiscount;
    const promoDiscount = promoApplied && form.promoCode?.toUpperCase() === 'CLEAN10' ? afterFreq * 0.1 : 0;
    const total = Math.max(0, afterFreq - promoDiscount);

    setEstimate({
      base,
      sizeCost,
      conditionCost: conditionAdjustedTotal - subtotalBeforeCondition,
      petsCost,
      addonsCost,
      subtotal: conditionAdjustedTotal,
      discount: frequencyDiscount,
      promoDiscount,
      total,
      duration: Math.round(duration * 2) / 2,
    });
  }, [form, promoApplied]);

  useEffect(() => {
    calculateEstimate();
  }, [calculateEstimate]);

  // Availability for selected day
  useEffect(() => {
    handleFormChange('time', '');
    if (!form.date || (OPERATING_RULES.SUN_CLOSED && isSunday(form.date))) {
      setConfirmedForDay([]);
      return;
    }

    setLoadingDay(true);
    const dateKey = format(form.date, 'yyyy-MM-dd');
    const q = query(collection(db, 'bookings'), where('dateKey', '==', dateKey), where('status', '==', 'confirmed'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setConfirmedForDay(rows);
        setLoadingDay(false);
      },
      () => setLoadingDay(false)
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date]);

  const disabledTimes = useMemo(() => {
    if (!form.date) return new Set();
    if (OPERATING_RULES.SUN_CLOSED && isSunday(form.date)) return new Set(getTimeOptionsForDate(form.date));
    if (confirmedForDay.length >= DAILY_CAPACITY) return new Set(getTimeOptionsForDate(form.date));

    const blocked = new Set();
    const allowedOptions = getTimeOptionsForDate(form.date);
    allowedOptions.forEach((opt) => {
      const slotStart = combineDateAndTime(form.date, opt);
      if (!slotStart) return;
      const hours = Number.isFinite(estimate.duration) && estimate.duration > 0 ? estimate.duration : 2;
      const slotEnd = new Date(slotStart.getTime() + hours * 60 * 60 * 1000);
      const overlapCount = confirmedForDay.reduce((acc, b) => {
        const s = b.startAt?.toDate ? b.startAt.toDate() : null;
        const e = b.endAt?.toDate ? b.endAt.toDate() : s ? new Date(s.getTime() + (b.durationMinutes || 120) * 60000) : null;
        return s && e && overlaps(slotStart, slotEnd, s, e) ? acc + 1 : acc;
      }, 0);
      if (overlapCount >= SLOT_CAPACITY) blocked.add(opt);
    });
    return blocked;
  }, [form.date, confirmedForDay, estimate.duration]);

  const validateForm = useCallback(() => {
    const next = {};
    const required = ['name', 'email', 'phone', 'address', 'zip', 'date', 'time'];
    required.forEach((k) => {
      if (!form[k] || (typeof form[k] === 'string' && !form[k].trim())) next[k] = 'Required';
    });
    if (!form.agreePolicy) next.agreePolicy = 'You must agree to the estimate and deposit policy.';
    if (form.date && OPERATING_RULES.SUN_CLOSED && isSunday(form.date)) next.date = 'We are closed on Sundays.';
    if (form.date && form.time) {
      const allowed = getTimeOptionsForDate(form.date);
      if (!allowed.includes(form.time)) next.time = 'This time is not available on the selected day.';
      else if (disabledTimes.has(form.time)) next.time = 'This time is already booked.';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email.';
    if (form.phone && !/^[0-9\-+() ]{7,}$/.test(form.phone)) next.phone = 'Enter a valid phone.';
    if (form.zip && !/^\d{5}(-\d{4})?$/.test(form.zip)) next.zip = 'Enter a valid ZIP.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, disabledTimes]);

  const handleProceedToCheckout = async () => {
    if (isSubmitting) return;
    const ok = validateForm();
    if (!ok) {
      toast({ variant: 'destructive', title: 'Please fix the highlighted fields', description: 'We need a few details to lock in your booking.' });
      return;
    }
    if (!auth.currentUser) {
      toast({ variant: 'destructive', title: 'Please sign in', description: 'Create an account or log in to complete your booking.' });
      navigate('/auth', { replace: true, state: { from: '/book' } });
      return;
    }
    if (confirmedForDay.length >= DAILY_CAPACITY) {
      toast({ variant: 'destructive', title: 'Day fully booked', description: 'Please pick another date.' });
      return;
    }
    if (disabledTimes.has(form.time)) {
      toast({ variant: 'destructive', title: 'Time no longer available', description: 'Choose another time slot.' });
      return;
    }

    const serviceMeta = services.find((s) => s.id === form.service);
    const startDate = combineDateAndTime(form.date, form.time);
    if (!startDate) {
      toast({ variant: 'destructive', title: 'Pick a valid date and time', description: 'Please select both date and time.' });
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
      promoCode: promoApplied ? form.promoCode || null : null,
      agreePolicy: form.agreePolicy,
    };

    try {
      setIsSubmitting(true);
      const ref = await addDoc(collection(db, 'bookings'), payload);
      navigate(`/confirm?bookingId=${ref.id}`);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not submit booking', description: String(err?.message || err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (estimateLiveRef.current) {
      estimateLiveRef.current.textContent = `Estimated total ${estimate.total.toFixed(2)} dollars, duration approximately ${estimate.duration} hours.`;
    }
  }, [estimate.total, estimate.duration]);

  const timeOptionsForDay = form.date ? getTimeOptionsForDate(form.date) : TIME_OPTIONS;

  return (
    <TooltipProvider>
      <div className="py-12 md:py-20 px-4 bg-[#FADADD]">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-plum mb-4">Book Your Cleaning Service</h1>
            <p className="text-lg text-plum/80">Get an instant estimate and schedule your appointment in minutes.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* LEFT COLUMN — Service & Property */}
            <div className="space-y-6 lg:col-span-2">
              {/* Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-plum">
                    <Sparkles className="h-5 w-5" /> Service
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s) => (
                    <Button
                      key={s.id}
                      variant={form.service === s.id ? 'default' : 'outline'}
                      className={form.service === s.id ? 'bg-gold text-white' : 'border-plum/30 text-plum'}
                      onClick={() => handleFormChange('service', s.id)}
                    >
                      <s.icon className="h-4 w-4 mr-2" />
                      {s.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Property Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-plum">
                    <Home className="h-5 w-5" /> Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Property Type</Label>
                      <Select value={form.propertyType} onValueChange={(v) => handleFormChange('propertyType', v)}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          {['house', 'apartment', 'condo', 'townhouse', 'office'].map((p) => (
                            <SelectItem key={p} value={p} className={selectItemClass}>
                              {p[0].toUpperCase() + p.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {form.sizeMode === 'sqft' ? (
                      <div>
                        <Label>Square Feet</Label>
                        <Input
                          type="number"
                          min={200}
                          step={50}
                          value={form.sqft}
                          onChange={(e) => handleFormChange('sqft', Number(e.target.value))}
                          className="bg-white"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label>Bedrooms</Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.bedrooms}
                            onChange={(e) => handleFormChange('bedrooms', Number(e.target.value))}
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label>Bathrooms</Label>
                          <Input
                            type="number"
                            min={1}
                            step={0.5}
                            value={form.bathrooms}
                            onChange={(e) => handleFormChange('bathrooms', Number(e.target.value))}
                            className="bg-white"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Size Mode</Label>
                      <Select value={form.sizeMode} onValueChange={(v) => handleFormChange('sizeMode', v)}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          <SelectItem value="bed-bath" className={selectItemClass}>Bed/Bath</SelectItem>
                          <SelectItem value="sqft" className={selectItemClass}>Square Feet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Home Condition</Label>
                      <Select value={form.condition} onValueChange={(v) => handleFormChange('condition', v)}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          <SelectItem value="light" className={selectItemClass}>Light</SelectItem>
                          <SelectItem value="standard" className={selectItemClass}>Standard</SelectItem>
                          <SelectItem value="heavy" className={selectItemClass}>Heavy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Pets?</Label>
                      <Select value={form.pets} onValueChange={(v) => handleFormChange('pets', v)}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          <SelectItem value="no" className={selectItemClass}>No</SelectItem>
                          <SelectItem value="yes" className={selectItemClass}>Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add-ons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-plum">
                    <Tag className="h-5 w-5" /> Add-ons
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {addons.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 p-3 border rounded-md bg-white cursor-pointer">
                      <Checkbox checked={form.addons.includes(a.id)} onCheckedChange={() => handleAddonToggle(a.id)} />
                      <span className="text-plum">{a.name} <span className="text-plum/60">(${a.price})</span></span>
                    </label>
                  ))}
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-plum">
                    <Clock className="h-5 w-5" /> Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Label className="mb-2 block">Pick a date</Label>
                    <Calendar
                      mode="single"
                      selected={form.date}
                      onSelect={(d) => handleFormChange('date', d || null)}
                      className="rounded-md border bg-white"
                      disabled={(d) => (OPERATING_RULES.SUN_CLOSED && d.getDay() === 0)}
                    />
                    {errors.date && <p className="text-rose-600 text-sm mt-2">{errors.date}</p>}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="mb-1 block">Time</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {timeOptionsForDay.map((t) => {
                          const disabled = disabledTimes.has(t);
                          return (
                            <Button
                              key={t}
                              type="button"
                              variant={form.time === t ? 'default' : 'outline'}
                              disabled={disabled || loadingDay}
                              className={
                                form.time === t
                                  ? 'bg-gold text-white'
                                  : `border-plum/30 text-plum ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`
                              }
                              onClick={() => !disabled && handleFormChange('time', t)}
                            >
                              {t}
                            </Button>
                          );
                        })}
                      </div>
                      {errors.time && <p className="text-rose-600 text-sm mt-2">{errors.time}</p>}
                      {loadingDay && <p className="text-plum/70 text-sm mt-2">Checking availability…</p>}
                    </div>

                    <div>
                      <Label className="mb-1 block">Frequency</Label>
                      <RadioGroup
                        className="grid grid-cols-2 gap-2"
                        value={form.frequency}
                        onValueChange={(v) => handleFormChange('frequency', v)}
                      >
                        {frequencies.map((f) => (
                          <label
                            key={f.id}
                            className={`border rounded-md p-2 flex items-center gap-2 bg-white cursor-pointer ${
                              form.frequency === f.id ? 'border-gold' : 'border-plum/30'
                            }`}
                          >
                            <RadioGroupItem value={f.id} />
                            <span className="text-plum">{f.name}{f.discount ? ` (-${Math.round(f.discount*100)}%)` : ''}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact & Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-plum">
                    <Info className="h-5 w-5" /> Contact & Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input value={form.name} onChange={(e) => handleFormChange('name', e.target.value)} className="bg-white" />
                      {errors.name && <p className="text-rose-600 text-sm mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={form.email} onChange={(e) => handleFormChange('email', e.target.value)} className="bg-white" />
                      {errors.email && <p className="text-rose-600 text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={form.phone} onChange={(e) => handleFormChange('phone', e.target.value)} className="bg-white" />
                      {errors.phone && <p className="text-rose-600 text-sm mt-1">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      <Input value={form.address} onChange={(e) => handleFormChange('address', e.target.value)} className="bg-white" />
                      {errors.address && <p className="text-rose-600 text-sm mt-1">{errors.address}</p>}
                    </div>
                    <div>
                      <Label>ZIP</Label>
                      <Input value={form.zip} onChange={(e) => handleFormChange('zip', e.target.value)} className="bg-white" />
                      {errors.zip && <p className="text-rose-600 text-sm mt-1">{errors.zip}</p>}
                    </div>
                  </div>

                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea rows={4} value={form.notes} onChange={(e) => handleFormChange('notes', e.target.value)} className="bg-white" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.agreePolicy} onCheckedChange={(v) => handleFormChange('agreePolicy', Boolean(v))} />
                    <span className="text-sm text-plum">
                      I agree to the estimate and understand a $50 non-refundable deposit is required to confirm.
                    </span>
                  </div>
                  {errors.agreePolicy && <p className="text-rose-600 text-sm">{errors.agreePolicy}</p>}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleProceedToCheckout} disabled={isSubmitting} className="bg-gold text-white hover:bg-gold/90">
                    {isSubmitting ? 'Submitting…' : 'Confirm & Continue'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* RIGHT COLUMN — Estimate */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-plum">Your Estimate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-plum/80">
                    <span>Base</span><span>${estimate.base.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-plum/80">
                    <span>Size</span><span>${estimate.sizeCost.toFixed(2)}</span>
                  </div>
                  {estimate.conditionCost !== 0 && (
                    <div className="flex justify-between text-plum/80">
                      <span>Condition</span><span>${estimate.conditionCost.toFixed(2)}</span>
                    </div>
                  )}
                  {estimate.petsCost > 0 && (
                    <div className="flex justify-between text-plum/80">
                      <span>Pets</span><span>${estimate.petsCost.toFixed(2)}</span>
                    </div>
                  )}
                  {estimate.addonsCost > 0 && (
                    <div className="flex justify-between text-plum/80">
                      <span>Add-ons</span><span>${estimate.addonsCost.toFixed(2)}</span>
                    </div>
                  )}
                  {estimate.discount > 0 && (
                    <div className="flex justify-between text-plum/80">
                      <span>Frequency Discount</span><span>- ${estimate.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {estimate.promoDiscount > 0 && (
                    <div className="flex justify-between text-plum/80">
                      <span>Promo</span><span>- ${estimate.promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="my-2 border-plum/20" />
                  <div className="flex justify-between text-plum font-semibold text-lg">
                    <span>Total</span><span>${estimate.total.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-plum/70" aria-live="polite" ref={estimateLiveRef} />
                  <div className="text-sm text-plum/70">Estimated duration: ~{estimate.duration} hrs</div>

                  <div className="pt-3">
                    <Label className="mb-1 block">Promo code</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="CLEAN10"
                        value={form.promoCode}
                        onChange={(e) => handleFormChange('promoCode', e.target.value)}
                        className="bg-white"
                      />
                      <Button
                        type="button"
                        variant={promoApplied ? 'outline' : 'default'}
                        className={promoApplied ? 'border-plum/30 text-plum' : 'bg-gold text-white hover:bg-gold/90'}
                        onClick={() => setPromoApplied((v) => !v)}
                      >
                        {promoApplied ? 'Remove' : 'Apply'}
                      </Button>
                    </div>
                    <p className="text-xs text-plum/60 mt-1">Use CLEAN10 for 10% off eligible services.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
