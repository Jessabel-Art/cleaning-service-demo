import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Phone, Mail, Clock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import clsx from "clsx";

const SERVICE_TYPES = [
  { id: "standard", label: "Standard Cleaning" },
  { id: "deep", label: "Deep Cleaning" },
  { id: "move", label: "Move-In/Move-Out" },
  { id: "post", label: "Post-Construction" },
];

const HOME_TYPES = [
  { id: "apt", label: "Apartment" },
  { id: "condo", label: "Condo" },
  { id: "house", label: "House" },
];

const FREQUENCIES = [
  { id: "one", label: "One-time" },
  { id: "weekly", label: "Weekly (save 20%)" },
  { id: "biweekly", label: "Bi-weekly (save 15%)" },
  { id: "monthly", label: "Monthly (save 10%)" },
];

const TIME_WINDOWS = [
  { id: "am", label: "Morning (8a–12p)" },
  { id: "pm", label: "Afternoon (12p–4p)" },
];

const ADD_ONS = [
  { id: "fridge", label: "Inside Fridge" },
  { id: "oven", label: "Inside Oven" },
  { id: "baseboards", label: "Baseboards" },
  { id: "windows", label: "Interior Windows" },
  { id: "laundry", label: "One Load Laundry" },
  { id: "garage", label: "Garage Sweep" },
];

const SERVICE_AREA_ZIPS = ["12345", "12346", "12347", "12348", "12349"]; // ⬅️ update with real service-area ZIPs

const initialForm = {
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  gateNotes: "",
  homeType: "",
  bedrooms: "",
  bathrooms: "",
  sqft: "",
  frequency: "one",
  serviceType: "standard",
  preferredDate: "",
  timeWindow: "am",
  pets: "no",
  supplies: "ours",
  message: "",
  addOns: [],
};

const phoneMask = (v) =>
  v
    .replace(/[^\d]/g, "")
    .slice(0, 10)
    .replace(/(\d{0,3})(\d{0,3})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a && a.length === 3 ? ") " : "", b, c && b ? "-" : "", c]
        .filter(Boolean)
        .join("")
    );

const dollars = (n) => `$${Math.round(n).toLocaleString()}`;

const Contact = () => {
  const { toast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const inArea = useMemo(
    () => (form.zip ? SERVICE_AREA_ZIPS.includes(form.zip.trim()) : true),
    [form.zip]
  );

  const addOnCost = (id) => {
    switch (id) {
      case "fridge":
      case "oven":
        return 25;
      case "baseboards":
        return 30;
      case "windows":
        return 30;
      case "laundry":
        return 20;
      case "garage":
        return 20;
      default:
        return 0;
    }
  };

  // Lightweight instant estimate (ballpark only)
  const estimate = useMemo(() => {
    const beds = Number(form.bedrooms || 0);
    const baths = Number(form.bathrooms || 0);
    const sqft = Number(form.sqft || 0);

    // base by size
    let base =
      sqft > 0
        ? 80 + (Math.min(sqft, 3500) / 500) * 25 // gentle slope by sqft
        : 80 + beds * 15 + baths * 25; // fallback on rooms

    // service type multipliers
    const svcMult = {
      standard: 1,
      deep: 1.4,
      move: 1.5,
      post: 1.6,
    }[form.serviceType || "standard"];

    // frequency discounts
    const freqMult = {
      one: 1,
      weekly: 0.8,
      biweekly: 0.85,
      monthly: 0.9,
    }[form.frequency || "one"];

    // add-ons
    const addOnSum = (form.addOns || []).reduce((s, id) => s + addOnCost(id), 0);

    let subtotal = base * svcMult + addOnSum;

    // quick range (+/- 10%)
    const low = subtotal * freqMult * 0.9;
    const high = subtotal * freqMult * 1.1;

    return { low, high };
  }, [form]);

  const onChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "phone") v = phoneMask(value);
    if (name === "zip") v = value.replace(/[^\d]/g, "").slice(0, 5);
    if (name === "sqft") v = value.replace(/[^\d]/g, "").slice(0, 5);
    if (name === "bedrooms" || name === "bathrooms")
      v = value.replace(/[^\d]/g, "").slice(0, 2);
    setForm((f) => ({ ...f, [name]: v }));
  };

  const onRadio = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const onToggleAddOn = (id, checked) =>
    setForm((f) => {
      const set = new Set(f.addOns);
      checked ? set.add(id) : set.delete(id);
      return { ...f, addOns: Array.from(set) };
    });

  const validate = () => {
    if (!form.name || !form.email || !form.phone) return false;
    if (!form.street || !form.city || !form.state || !form.zip) return false;
    if (!form.homeType || !form.serviceType) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: "Missing info",
        description: "Please complete all required fields.",
      });
      return;
    }
    if (!inArea) {
      toast({
        title: "Outside service area",
        description:
          "It looks like your ZIP is outside our current service area. We’ll still reach out with options.",
      });
    }

    setLoading(true);

    try {
      // TODO: Hook up your POST here (Formspree, Email API, or server endpoint)
      // await fetch("/api/estimate", { method: "POST", body: JSON.stringify(form) });

      setSubmitted(true);
      toast({
        title: "Estimate request sent 🎉",
        description: "We’ll be in touch within 24 hours.",
      });
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: "Please try again or call us directly.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section id="contact" className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8">
              <h2 className="text-3xl font-bold text-plum mb-4">Thank you!</h2>
              <p className="text-lg text-plum/80">
                Your request has been sent. We’ll contact you within 24 hours to
                finalize your custom estimate.
              </p>
              <p className="mt-4 text-sm text-plum/70">
                Need something sooner? Call{" "}
                <a className="text-gold underline" href="tel:5551234567">
                  (555) 123-4567
                </a>
                .
              </p>
            </Card>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-plum mb-4">
            Request a Custom Estimate
          </h2>
          <p className="text-lg text-plum/80 max-w-2xl mx-auto">
            Have a unique cleaning need? We’ll respond within 24 hours.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card className="contact-form h-full">
              <CardContent className="p-8">
                <form className="space-y-5" onSubmit={handleSubmit}>
                  {/* Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={form.name}
                        onChange={onChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={onChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        inputMode="tel"
                        value={form.phone}
                        onChange={onChange}
                        placeholder="(555) 123-4567"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="preferredDate">Preferred Date</Label>
                      <Input
                        id="preferredDate"
                        name="preferredDate"
                        type="date"
                        value={form.preferredDate}
                        onChange={onChange}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Preferred Time Window</Label>
                      <RadioGroup
                        value={form.timeWindow}
                        onValueChange={(v) => onRadio("timeWindow", v)}
                        className="mt-2 flex flex-wrap gap-4"
                      >
                        {TIME_WINDOWS.map((t) => (
                          <div key={t.id} className="flex items-center space-x-2">
                            <RadioGroupItem id={`tw-${t.id}`} value={t.id} />
                            <Label htmlFor={`tw-${t.id}`}>{t.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        name="street"
                        value={form.street}
                        onChange={onChange}
                        placeholder="123 Main St, Unit 2"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={form.city}
                        onChange={onChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={form.state}
                        onChange={onChange}
                        maxLength={2}
                        placeholder="NC"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code *</Label>
                      <Input
                        id="zip"
                        name="zip"
                        value={form.zip}
                        onChange={onChange}
                        placeholder="12345"
                        required
                        className={clsx(!inArea && "border-red-400")}
                      />
                      {!inArea && (
                        <p className="mt-1 text-xs text-red-600">
                          This ZIP looks outside our service area. Submit
                          anyway—we’ll see if we can accommodate.
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="gateNotes">
                        Access Notes (gate codes, parking, etc.)
                      </Label>
                      <Input
                        id="gateNotes"
                        name="gateNotes"
                        value={form.gateNotes}
                        onChange={onChange}
                        placeholder="Gate code 1234, park in rear…"
                      />
                    </div>
                  </div>

                  {/* Job specifics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Home Type *</Label>
                      <RadioGroup
                        value={form.homeType}
                        onValueChange={(v) => onRadio("homeType", v)}
                        className="mt-2 flex flex-wrap gap-4"
                      >
                        {HOME_TYPES.map((h) => (
                          <div key={h.id} className="flex items-center space-x-2">
                            <RadioGroupItem id={`home-${h.id}`} value={h.id} />
                            <Label htmlFor={`home-${h.id}`}>{h.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>Service Type *</Label>
                      <RadioGroup
                        value={form.serviceType}
                        onValueChange={(v) => onRadio("serviceType", v)}
                        className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        {SERVICE_TYPES.map((s) => (
                          <div key={s.id} className="flex items-center space-x-2">
                            <RadioGroupItem id={`svc-${s.id}`} value={s.id} />
                            <Label htmlFor={`svc-${s.id}`}>{s.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <div>
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        name="bedrooms"
                        value={form.bedrooms}
                        onChange={onChange}
                        placeholder="e.g., 3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        name="bathrooms"
                        value={form.bathrooms}
                        onChange={onChange}
                        placeholder="e.g., 2"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="sqft">Approx. Square Footage</Label>
                      <Input
                        id="sqft"
                        name="sqft"
                        value={form.sqft}
                        onChange={onChange}
                        placeholder="e.g., 1600"
                      />
                    </div>
                  </div>

                  {/* Frequency & toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Frequency</Label>
                      <RadioGroup
                        value={form.frequency}
                        onValueChange={(v) => onRadio("frequency", v)}
                        className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        {FREQUENCIES.map((f) => (
                          <div key={f.id} className="flex items-center space-x-2">
                            <RadioGroupItem id={`freq-${f.id}`} value={f.id} />
                            <Label htmlFor={`freq-${f.id}`}>{f.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>Pets at Home?</Label>
                      <RadioGroup
                        value={form.pets}
                        onValueChange={(v) => onRadio("pets", v)}
                        className="mt-2 flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem id="pets-no" value="no" />
                          <Label htmlFor="pets-no">No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem id="pets-yes" value="yes" />
                          <Label htmlFor="pets-yes">Yes</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Supplies</Label>
                      <RadioGroup
                        value={form.supplies}
                        onValueChange={(v) => onRadio("supplies", v)}
                        className="mt-2 flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem id="sup-ours" value="ours" />
                          <Label htmlFor="sup-ours">Use our supplies</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem id="sup-yours" value="yours" />
                          <Label htmlFor="sup-yours">Use customer supplies</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Add-ons */}
                  <div>
                    <Label>Add-ons</Label>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ADD_ONS.map((item) => {
                        const checked = form.addOns.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-rose-50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(val) =>
                                onToggleAddOn(item.id, Boolean(val))
                              }
                            />
                            <span className="text-sm">
                              {item.label} <span className="text-plum/60">(+{dollars(addOnCost(item.id))})</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="message">Anything else we should know?</Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={form.message}
                      onChange={onChange}
                      placeholder="Entry access, parking notes, special requests…"
                    />
                  </div>

                  {/* Instant estimate */}
                  <div className="rounded-xl bg-rose-50 p-4 text-plum">
                    <p className="text-sm">
                      Instant ballpark estimate (final price confirmed after a quick call/walk-through):
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {dollars(estimate.low)} – {dollars(estimate.high)}
                    </p>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gold hover:bg-gold/90 text-white rounded-full"
                    disabled={loading}
                  >
                    {loading ? "Sending…" : "Request Estimate"}
                  </Button>

                  <p className="text-xs text-plum/60 text-center">
                    By submitting, you agree to be contacted by phone, SMS, or
                    email. We respect your privacy.
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact info + hours */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6 bg-white p-8 rounded-lg shadow-sm h-full">
              <h3 className="text-2xl font-bold text-plum mb-4">Contact Directly</h3>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h4 className="font-semibold text-plum">Call Us</h4>
                  <a href="tel:5551234567" className="text-gold hover:underline text-lg">
                    (555) 123-4567
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h4 className="font-semibold text-plum">Email Us</h4>
                  <a href="mailto:info@sanchezservices.com" className="text-gold hover:underline text-lg">
                    info@sanchezservices.com
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h4 className="font-semibold text-plum">Business Hours</h4>
                  <p className="text-plum/80">Mon–Fri: 8 AM – 6 PM</p>
                  <p className="text-plum/80">Sat: 9 AM – 4 PM</p>
                </div>
              </div>

              {/* Trust boosters */}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-plum/70">
                <div className="rounded-lg border p-3">✅ Insured</div>
                <div className="rounded-lg border p-3">✅ Background-checked</div>
                <div className="rounded-lg border p-3">✅ Eco-friendly supplies</div>
                <div className="rounded-lg border p-3">✅ Satisfaction guaranteed</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
