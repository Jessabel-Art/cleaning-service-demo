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
import { Home, Sparkles, Truck, Building, Clock, ChevronRight, Tag, Info, Loader2 } from 'lucide-react';
import { format, isSunday } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ADD_ONS,
  ESTIMATE_RULES,
  FREQUENCIES,
  SERVICES,
  getFrequencyById,
  getServiceBySlug,
} from '@/data/services';

// 🔥 local data
import { normalizePhone } from '@/lib/contactModel';
import { createDemoBookingFromForm, savePendingDemoBooking } from '@/data/demoRuntime';

// ----- Constants -----
const SERVICE_ICONS = { Home, Sparkles, Truck, Building };
const services = SERVICES.map((service) => ({
  id: service.slug,
  name: service.bookingName,
  icon: SERVICE_ICONS[service.icon] || Home,
}));

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

const addons = ADD_ONS.map((addon) => ({ ...addon, name: addon.label }));
const frequencies = FREQUENCIES;

// Fixed start-time options (12h display)
const TIME_OPTIONS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'];

// Operating hours (Sun closed; shorter Sat)
const OPERATING_RULES = {
  SUN_CLOSED: true,
  SAT_LATEST: '01:00 PM',
};

// ===== Solid, readable Select styles =====
const selectTriggerClass =
  'bg-white text-plum border border-plum/30 rounded-md ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus:border-gold/60';
const selectContentClass = 'bg-white border border-plum/20 text-plum shadow-xl';
const selectItemClass = 'focus:bg-gold/10 focus:text-plum cursor-pointer';

// ----- Utils -----
// Shared helper: 24h Date -> "hh:mm AM/PM"
function timeOptionFromDate(dateObj) {
  if (!dateObj) return '';
  const h24 = dateObj.getHours();
  const m = dateObj.getMinutes();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  const hh = String(h12).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm} ${ampm}`;
}

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
function getTimeOptionsForDate(date) {
  if (!date) return TIME_OPTIONS;
  if (OPERATING_RULES.SUN_CLOSED && isSunday(date)) return [];
  const dow = date.getDay(); // 0 Sun, 6 Sat
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

// --- conflict helpers (same-day preflight) ---
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const STORAGE_KEY = 'booking_form_v1';

const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const bookingId = searchParams.get('bookingId');
  const [isEditing, setIsEditing] = useState(Boolean(bookingId));
  const [loadedBooking, setLoadedBooking] = useState(null);

  // Saved addresses for dropdown
  const [addressOptions, setAddressOptions] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Profile/address prefill
  const [profileData, setProfileData] = useState(null);
  const [addressData, setAddressData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [form, setForm] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    const base = saved ? JSON.parse(saved) : {};
    return {
      service: base.service || 'residential-cleaning',
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
      firstName: base.firstName || '',
      lastName: base.lastName || '',
      email: base.email || '',
      phone: base.phone || '',
      street: base.street || base.address || '',
      city: base.city || '',
      state: base.state || '',
      zip: base.zip || '',
      // Separate notes:
      accessNotes: base.accessNotes || base.notes || '',
      cleanerNotes: base.cleanerNotes || '',
      // Recurrence
      recurrence: base.recurrence || 'none',
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
  const checkoutRequestIdRef = useRef(null);

  const emptyDayAvailability = useCallback(() => ({
    dateKey: null,
    fullyBooked: false,
    blockedSlots: [],
    slotCounts: {},
    dayCountBlocking: 0,
    unavailableReason: null,
  }), []);

  // Server-side day availability (no booking details, only aggregated counts/blockedSlots)
  const [dayAvailability, setDayAvailability] = useState({
    dateKey: null,
    fullyBooked: false,
    blockedSlots: [],
    slotCounts: {},
    dayCountBlocking: 0,
    unavailableReason: null,
  });
  const [availabilityStatus, setAvailabilityStatus] = useState('idle');
  const [availabilityError, setAvailabilityError] = useState('');
  const [loadingDay, setLoadingDay] = useState(false);

  // Validation state
  const [errors, setErrors] = useState({});
  const estimateLiveRef = useRef(null);

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...next,
          date: next.date ? next.date.toISOString() : null,
        })
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

  // Pricing/estimate calculation
  const calculateEstimate = useCallback(() => {
    const service = getServiceBySlug(form.service) || getServiceBySlug('residential-cleaning');
    const pricing = service.pricing;
    let base = 0,
      sizeCost = 0,
      conditionMultiplier = 1,
      petsCost = 0,
      addonsCost = 0,
      frequencyDiscount = 0,
      duration = 0;

    if (pricing.sqftRate) {
      base = pricing.basePrice;
      sizeCost = form.sqft * pricing.sqftRate;
      duration = form.sqft / pricing.sqftPerHour;
    } else {
      base = pricing.basePrice;
      sizeCost =
        form.bedrooms * ESTIMATE_RULES.bedroomPrice +
        form.bathrooms * ESTIMATE_RULES.bathroomPrice;
      duration =
        (form.bedrooms * ESTIMATE_RULES.bedroomDurationHours +
          form.bathrooms * ESTIMATE_RULES.bathroomDurationHours +
          ESTIMATE_RULES.baseDurationHours) *
        pricing.durationMultiplier;
    }

    conditionMultiplier =
      ESTIMATE_RULES.conditionMultipliers[form.condition] || 1;
    duration *=
      ESTIMATE_RULES.conditionDurationMultipliers[form.condition] || 1;

    if (form.pets === 'yes') {
      petsCost = ESTIMATE_RULES.petPrice;
      duration += ESTIMATE_RULES.petDurationHours;
    }

    form.addons.forEach((addonId) => {
      const addon = addons.find((a) => a.id === addonId);
      if (addon) {
        addonsCost += addon.price;
        duration += addon.durationHours;
      }
    });

    const subtotalBeforeCondition = base + sizeCost + petsCost + addonsCost;
    const conditionAdjustedTotal = subtotalBeforeCondition * conditionMultiplier;

    const freq = getFrequencyById(form.frequency);
    if (freq && service.recurringDiscountEligible) {
      frequencyDiscount = conditionAdjustedTotal * freq.discount;
    }

    // Apply promo AFTER frequency discount
    const afterFreq = conditionAdjustedTotal - frequencyDiscount;
    const promoDiscount =
      promoApplied && form.promoCode?.toUpperCase() === 'CLEAN10' ? afterFreq * 0.1 : 0;

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

  // Promo
  const handleApplyPromoCode = () => {
    const code = (form.promoCode || '').trim().toUpperCase();
    if (!code) {
      toast({ title: 'Enter a code to apply' });
      return;
    }
    if (promoApplied) {
      toast({
        title: 'Promo already applied',
        description: 'Remove or change code to re-apply.',
      });
      return;
    }
    if (code === 'CLEAN10') {
      setPromoApplied(true);
      toast({
        title: 'Promo Code Applied!',
        description: '10% off your estimate has been applied.',
      });
    } else {
      setPromoApplied(false);
      toast({ title: 'Invalid Promo Code', variant: 'destructive' });
    }
  };

  useEffect(() => {
    handleFormChange('time', '');
    setDayAvailability(emptyDayAvailability());
    setAvailabilityStatus(form.date ? 'loaded' : 'idle');
    setAvailabilityError('');
    setLoadingDay(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, emptyDayAvailability]);

  // Disabled times from capacity + operating rules
  const disabledTimes = useMemo(() => {
    if (!form.date) return new Set();
    if (OPERATING_RULES.SUN_CLOSED && isSunday(form.date)) {
      return new Set(getTimeOptionsForDate(form.date));
    }
    return new Set();
  }, [form.date]);

    // Only show times that are actually available (capacity + operating rules)
  const timeOptionsForUi = useMemo(() => {
    if (!form.date) return [];
    if (form.date && availabilityStatus !== 'loaded') return [];
    const base = getTimeOptionsForDate(form.date); // already respects Sunday / Sat rules
    return base.filter((t) => !disabledTimes.has(t));
  }, [form.date, disabledTimes, availabilityStatus]);

  // Validation
  const validateForm = useCallback(() => {
    const next = {};
    const required = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'street',
      'city',
      'state',
      'zip',
      'date',
      'time',
    ];
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
      const allowed = getTimeOptionsForDate(form.date).filter(
        (t) => !disabledTimes.has(t)
      );
      if (!allowed.includes(form.time)) {
        next.time = 'This time is not available on the selected day.';
      }
    }

    if (form.date && availabilityStatus !== 'loaded') {
      next.date = availabilityError || "We couldn't verify availability right now. Please try again.";
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
  }, [form, disabledTimes, availabilityError, availabilityStatus]);

  // Submit
  const handleProceedToCheckout = async () => {
    if (isSubmitting) return;

    const ok = validateForm();
    if (!ok) {
      toast({
        variant: "destructive",
        title: "Please fix the highlighted fields",
        description: "We need a few details to prepare your demo booking.",
      });
      return;
    }

    const normalized = normalizePhone(form.phone);
    if (!normalized || normalized.replace(/\D/g, "").length < 10) {
      setErrors((prev) => ({ ...prev, phone: "Enter a valid phone number." }));
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number (at least 10 digits).",
      });
      return;
    }

    if (disabledTimes.has(form.time)) {
      toast({
        variant: "destructive",
        title: "Time no longer available",
        description: "Please choose another time slot.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const service = getServiceBySlug(form.service);
      const payload = createDemoBookingFromForm(
        {
          ...form,
          serviceName: service?.bookingName || service?.title || form.service,
        },
        estimate
      );

      savePendingDemoBooking(payload);
      sessionStorage.removeItem(STORAGE_KEY);
      toast({
        title: "Demo booking created",
        description: "Your local confirmation is ready. No data was stored.",
      });
      navigate(`/confirm?bookingId=${payload.appointment.id}`);
    } catch (err) {
      console.error("Booking failed:", err);
      toast({
        variant: "destructive",
        title: "Could not create demo booking",
        description: "Please review the form and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  // a11y live region
  useEffect(() => {
    if (estimateLiveRef.current) {
      estimateLiveRef.current.textContent = `Estimated total ${estimate.total.toFixed(
        2
      )} dollars, duration approximately ${estimate.duration} hours.`;
    }
  }, [estimate.total, estimate.duration]);

  return (
    <TooltipProvider>
      <div className="py-12 sm:py-16 md:py-20 px-3 sm:px-4 bg-[#F7F7F7]">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-plum mb-3 sm:mb-4">
              {isEditing ? 'Reschedule Your Cleaning' : 'Book Your Cleaning Service'}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-plum/80">
              {isEditing
                ? 'Pick a new date and time. Details can be adjusted if needed.'
                : 'Get an instant estimate and schedule your appointment in minutes.'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-7 md:gap-8 items-start">
            <div className="lg:col-span-2 space-y-6 sm:space-y-7 md:space-y-8">
              {/* Step 1 */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Step 1: Select Your Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    {services.map((service) => {
                      const selected = form.service === service.id;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleFormChange('service', service.id)}
                          className={[
                            'p-4 border-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all',
                            'bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
                            selected
                              ? 'border-gold bg-gold/10'
                              : 'border-plum/20 hover:border-gold/50',
                          ].join(' ')}
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

              {/* Step 2 (Contact & Access) */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Step 2: Contact & Access Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className={errors.firstName ? 'relative' : ''}>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={form.firstName}
                        onChange={(e) => handleFormChange('firstName', e.target.value)}
                        aria-invalid={!!errors.firstName}
                        required
                        autoComplete="given-name"
                        className="bg-white"
                      />
                      {errors.firstName && (
                        <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div className={errors.lastName ? 'relative' : ''}>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={form.lastName}
                        onChange={(e) => handleFormChange('lastName', e.target.value)}
                        aria-invalid={!!errors.lastName}
                        required
                        autoComplete="family-name"
                        className="bg-white"
                      />
                      {errors.lastName && (
                        <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
                      )}
                    </div>
                    <div className={errors.email ? 'relative' : ''}>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        aria-invalid={!!errors.email}
                        required
                        autoComplete="email"
                        className="bg-white"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Saved address dropdown */}
                  {addressOptions.length > 0 && (
                    <div className="space-y-1">
                      <Label htmlFor="saved-address">Service address</Label>
                      <Select
                        value={selectedAddressId || ''}
                        onValueChange={(v) => {
                          setSelectedAddressId(v);
                          const addr = addressOptions.find((a) => a.id === v);
                          if (addr) {
                            handleFormChange('street', addr.street || '');
                            handleFormChange('city', addr.city || '');
                            handleFormChange('state', addr.state || '');
                            handleFormChange('zip', addr.zip || '');
                          }
                        }}
                      >
                        <SelectTrigger
                          id="saved-address"
                          className={selectTriggerClass}
                          disabled={loadingAddresses}
                        >
                          <SelectValue placeholder="Choose a saved address" />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          {addressOptions.map((a) => {
                            const nickname = a.nickname || a.type || 'Home';
                            const short = [a.street, a.city].filter(Boolean).join(', ');
                            return (
                              <SelectItem
                                key={a.id}
                                value={a.id}
                                className={selectItemClass}
                              >
                                {nickname} — {short}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-plum/70">
                        We&apos;ll pre-fill the address fields below. You can still tweak them
                        for this visit.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className={errors.street ? 'relative' : ''}>
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        value={form.street}
                        onChange={(e) => handleFormChange('street', e.target.value)}
                        aria-invalid={!!errors.street}
                        required
                        autoComplete="street-address"
                        className="bg-white"
                      />
                      {errors.street && (
                        <p className="text-xs text-red-600 mt-1">{errors.street}</p>
                      )}
                    </div>

                    <div className={errors.city ? 'relative' : ''}>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => handleFormChange('city', e.target.value)}
                        aria-invalid={!!errors.city}
                        required
                        autoComplete="address-level2"
                        className="bg-white"
                      />
                      {errors.city && (
                        <p className="text-xs text-red-600 mt-1">{errors.city}</p>
                      )}
                    </div>

                    <div className={errors.state ? 'relative' : ''}>
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={form.state || ''}
                        onValueChange={(v) => handleFormChange('state', v)}
                      >
                        <SelectTrigger id="state" className={selectTriggerClass}>
                          <SelectValue placeholder="Select a state" />
                        </SelectTrigger>
                        <SelectContent className={`${selectContentClass} max-h-48 overflow-auto`}>
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s} className={selectItemClass}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.state && (
                        <p className="text-xs text-red-600 mt-1">{errors.state}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={errors.phone ? 'relative' : ''}>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="e.g., (555) 123-4567"
                        value={form.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                        aria-invalid={!!errors.phone}
                        required
                        autoComplete="tel"
                        className="bg-white"
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                      )}
                    </div>
                    <div className={errors.zip ? 'relative' : ''}>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        inputMode="numeric"
                        pattern="\\d{5}(-\\d{4})?"
                        value={form.zip}
                        onChange={(e) => handleFormChange('zip', e.target.value)}
                        aria-invalid={!!errors.zip}
                        required
                        autoComplete="postal-code"
                        className="bg-white"
                      />
                      {errors.zip && (
                        <p className="text-xs text-red-600 mt-1">{errors.zip}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Service Frequency</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={(v) => handleFormChange('frequency', v)}
                    >
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClass}>
                        {frequencies.map((freq) => (
                          <SelectItem
                            key={freq.id}
                            value={freq.id}
                            className={selectItemClass}
                          >
                            {freq.name}{' '}
                            {freq.discount > 0 &&
                              `(${Math.round(freq.discount * 100)}% off)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Access notes */}
                  <div>
                    <Label htmlFor="accessNotes">Access Notes (gate codes, parking, etc.)</Label>
                    <Textarea
                      id="accessNotes"
                      value={form.accessNotes}
                      onChange={(e) =>
                        handleFormChange('accessNotes', e.target.value)
                      }
                      className="bg-white"
                    />
                  </div>

                  {/* Special notes for cleaner */}
                  <div>
                    <Label htmlFor="cleanerNotes">Special notes for your cleaner</Label>
                    <Textarea
                      id="cleanerNotes"
                      value={form.cleanerNotes}
                      onChange={(e) =>
                        handleFormChange('cleanerNotes', e.target.value)
                      }
                      className="bg-white"
                      placeholder="Example: Focus on bathrooms and kitchen, avoid strong scents in bedrooms, etc."
                    />
                    <p className="text-xs text-plum/70 mt-1">
                      These notes apply to this visit. Your cleaner will also see any
                      standing preferences saved in your profile.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 (Customize) */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Step 3: Customize Your Cleaning</CardTitle>
                </CardHeader>
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
                            <RadioGroupItem value="house" id="house" />
                            <Label htmlFor="house">House</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="apartment" id="apartment" />
                            <Label htmlFor="apartment">Apartment</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={errors.bedrooms ? 'relative' : ''}>
                          <Label htmlFor="bedrooms">Bedrooms</Label>
                          <Select
                            value={String(form.bedrooms)}
                            onValueChange={(v) =>
                              handleFormChange('bedrooms', Number(v))
                            }
                          >
                            <SelectTrigger
                              className={selectTriggerClass}
                              aria-invalid={!!errors.bedrooms}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                              {[...Array(9).keys()].map((i) => (
                                <SelectItem
                                  key={i}
                                  value={String(i)}
                                  className={selectItemClass}
                                >
                                  {i}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className={errors.bathrooms ? 'relative' : ''}>
                          <Label htmlFor="bathrooms">Bathrooms</Label>
                          <Select
                            value={String(form.bathrooms)}
                            onValueChange={(v) =>
                              handleFormChange('bathrooms', Number(v))
                            }
                          >
                            <SelectTrigger
                              className={selectTriggerClass}
                              aria-invalid={!!errors.bathrooms}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                              {[...Array(7).keys()].map((i) => (
                                <SelectItem
                                  key={i}
                                  value={String(i)}
                                  className={selectItemClass}
                                >
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
                        onChange={(e) =>
                          handleFormChange('sqft', Number(e.target.value))
                        }
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
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="light" id="light" />
                          <Label htmlFor="light">Light</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="standard" id="standard" />
                          <Label htmlFor="standard">Standard</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="heavy" id="heavy" />
                          <Label htmlFor="heavy">Heavy</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>Pets on Site?</Label>
                      <RadioGroup
                        value={form.pets}
                        onValueChange={(v) => handleFormChange('pets', v)}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="pet-no" />
                          <Label htmlFor="pet-no">No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="pet-yes" />
                          <Label htmlFor="pet-yes">Yes</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div>
                    <Label>Add-ons</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                      {addons.map((addon) => (
                        <div key={addon.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={addon.id}
                            checked={form.addons.includes(addon.id)}
                            onCheckedChange={() => handleAddonToggle(addon.id)}
                          />
                          <Label htmlFor={addon.id} className="cursor-pointer">
                            {addon.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 4 (Schedule) */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Step 4: Schedule Date &amp; Time</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className={errors.date ? 'relative' : ''}>
                    <Calendar
                      mode="single"
                      selected={form.date}
                      onSelect={(d) => handleFormChange('date', d)}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPast = date < today;
                        const isClosedSun =
                          OPERATING_RULES.SUN_CLOSED && isSunday(date);
                        return isPast || isClosedSun;
                      }}
                      className="rounded-md border bg-white"
                      classNames={{
                        day_selected:
                          'bg-gold text-white hover:bg-gold hover:text-white focus:bg-gold focus:text-white',
                        day_today: 'border border-gold/50',
                        nav_button: 'hover:bg-gold/10',
                      }}
                    />
                    {errors.date && (
                      <p className="text-xs text-red-600 mt-2">{errors.date}</p>
                    )}
                    {loadingDay && (
                      <p className="text-xs text-plum/60 mt-2">
                        Checking availability…
                      </p>
                    )}
                    {!loadingDay && availabilityStatus === 'failed' && (
                      <p className="text-xs text-red-600 mt-2">
                        {availabilityError}
                      </p>
                    )}
                  </div>

                  <div>
                    <Tooltip>
                      <TooltipTrigger className="w-full text-left">
                        <Label>Available Times</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Select a time that works best for you.</p>
                      </TooltipContent>
                    </Tooltip>
                    <p className="text-sm text-plum/70 mb-2">
                      On {form.date ? format(form.date, 'PPP') : 'your selected date'}
                    </p>
                    <RadioGroup
                      value={form.time}
                      onValueChange={(v) => handleFormChange('time', v)}
                      className="grid grid-cols-2 gap-2"
                    >
                      {(!form.date || timeOptionsForUi.length === 0) && (
                        <div className="col-span-2 text-sm text-plum/70">
                          {!form.date
                            ? 'Pick a date to see available times.'
                            : availabilityStatus === 'loading'
                            ? 'Checking availability…'
                            : availabilityStatus === 'failed'
                            ? "We couldn't verify availability right now. Please try again."
                            : dayAvailability.unavailableReason === 'blackout'
                            ? 'This date is blocked and cannot be booked. Please choose another date.'
                            : 'No time slots are available on this day. Please choose another date.'}
                        </div>
                      )}

                      {timeOptionsForUi.map((time) => {
                        const timeId = `time-${time.replace(/[^a-zA-Z0-9]/g, '')}`;
                        const selected = form.time === time;
                        return (
                          <div key={time}>
                            <RadioGroupItem
                              value={time}
                              id={timeId}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={timeId}
                              className={[
                                'block p-3 border-2 rounded-lg text-center transition bg-white cursor-pointer',
                                selected
                                  ? 'border-gold bg-gold/10 ring-2 ring-gold/30'
                                  : 'border-plum/20 hover:border-gold/50',
                              ].join(' ')}
                              aria-pressed={selected}
                              aria-current={selected ? 'true' : undefined}
                            >
                              {time}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                    {errors.time && (
                      <p className="text-xs text-red-600 mt-2">{errors.time}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 sticky top-24">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-plum">Your Estimate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(estimate).map(([key, value]) => {
                    const labels = {
                      base: 'Base Service',
                      sizeCost: 'Size',
                      petsCost: 'Pet Fee',
                      addonsCost: 'Add-ons',
                      conditionCost: 'Condition',
                    };
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
                    <Label htmlFor="promo-code" className="sr-only">Promo code</Label>
                    <Input
                      id="promo-code"
                      type="text"
                      name="promoCode"
                      placeholder="Promo Code"
                      value={form.promoCode}
                      onChange={(e) => {
                        handleFormChange('promoCode', e.target.value);
                        if (promoApplied) setPromoApplied(false);
                      }}
                      autoComplete="off"
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
                  <div className="rounded-xl border border-gold/30 bg-[#EEF5FB] p-4 -mt-1">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-gold mt-0.5" />
                      <div className="text-sm text-plum/80">
                        <p className="font-semibold text-plum">
                          Important: estimates are not final quotes.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>
                            The online total is an estimate. Final pricing is confirmed
                            after we physically see the property and walk through the
                            scope.
                          </li>
                          <li>
                            A <span className="font-semibold">$50 non-refundable deposit</span> is required to hold your appointment. It is
                            applied to your final balance at service. In this demo, no card checkout is started.
                          </li>
                          <li>
                            <span className="font-semibold">Timing:</span> once we confirm
                            your date and time, the deposit is due within 24 hours or the
                            slot may be released.
                          </li>
                          <li>
                            <span className="font-semibold">Rescheduling:</span> one
                            reschedule is allowed with at least 48 hours notice. The
                            deposit transfers to the new date.
                          </li>
                          <li>
                            <span className="font-semibold">
                              Cancellations and no-shows:
                            </span>{' '}
                            canceling within 48 hours of the appointment or not being
                            present at the scheduled time forfeits the deposit.
                          </li>
                          <li>
                            If the size or condition differs from what was submitted, the
                            price and duration will be adjusted on site before work
                            begins.
                          </li>
                        </ul>
                        <label className="mt-3 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.agreePolicy}
                            onChange={(e) =>
                              handleFormChange('agreePolicy', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-plum/30 accent-[--gold-500]"
                          />
                          <span>
                            I understand and agree to the estimate and deposit policy.
                          </span>
                        </label>
                        {errors.agreePolicy && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.agreePolicy}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      console.log("ProceedToBook clicked");
                      handleProceedToCheckout();
                    }}
                    size="lg"
                    className="w-full bg-gold hover:bg-gold/90 text-white rounded-full disabled:opacity-60 flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span>{isEditing ? "Saving..." : "Creating demo booking..."}</span>
                      </>
                    ) : (
                      <>
                        <span>{isEditing ? "Save New Date/Time" : "Proceed to Book"}</span>
                        <ChevronRight className="h-5 w-5" />
                      </>
                    )}
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
