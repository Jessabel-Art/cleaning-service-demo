// src/components/sections/ContactSection.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Mail, Clock, CalendarClock, ShieldCheck, BadgeDollarSign, X } from 'lucide-react';
import { SERVICES } from '@/data/services';
import contactImg from '@/assets/images/contact.jpeg'; // ✅ add your image

const BUSINESS_EMAIL = 'sanchezservices24@yahoo.com';

const ContactSection = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    message: '',
  });
  const [sent, setSent] = useState(false);

  // map slug → service title
  const serviceFromSlug = (slug) => SERVICES.find((s) => s.slug === slug);

  useEffect(() => {
    const slug = searchParams.get('service');
    if (slug) {
      const svc = serviceFromSlug(slug);
      setSelectedService(svc ? { slug, title: svc.title } : { slug, title: slug });
      const line = `Service: ${svc ? svc.title : slug}`;
      setForm((prev) => {
        if (!prev.message?.includes('Service:')) {
          return { ...prev, message: prev.message ? `${line}\n${prev.message}` : `${line}\n` };
        }
        return prev;
      });
    }
  }, [searchParams]);

  const clearSelectedService = () => {
    setSelectedService(null);
    searchParams.delete('service');
    setSearchParams(searchParams, { replace: true });
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    toast({
      title: 'Estimate Request Sent! 🎉',
      description: "Thanks! We’ll reply within 24 hours during business hours.",
    });
  };

  if (sent) {
    return (
      <section id="contact" className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-10 shadow-lg rounded-2xl">
            <h2 className="text-3xl font-bold text-plum mb-2">Thank you!</h2>
            <p className="text-plum/80">
              Your request has been sent. We’ll reach out within 24 hours to finalize your custom estimate.
            </p>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-plum">Request a Custom Estimate</h2>
          <p className="text-lg text-plum/80 mt-2">Have a unique cleaning need or a commercial property? Let’s talk.</p>
          <p className="text-sm text-plum/60 mt-1">
            We typically reply within <span className="font-semibold">24 hours</span>.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Form */}
          <Card className="lg:col-span-7 bg-white border border-plum/10 rounded-2xl shadow-lg">
            <CardContent className="p-8">
              {/* Selected service pill */}
              {selectedService && (
                <div className="mb-6">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 text-plum px-3 py-1 text-sm">
                    <span className="font-medium">Service:</span> {selectedService.title}
                    <button
                      type="button"
                      className="ml-1 text-plum/60 hover:text-plum"
                      onClick={clearSelectedService}
                      aria-label="Clear selected service"
                      title="Clear selected service"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-plum">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      required
                      className="mt-2 bg-white border-plum/20 rounded-xl focus-visible:ring-gold focus-visible:border-gold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-plum">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={onChange}
                      required
                      className="mt-2 bg-white border-plum/20 rounded-xl focus-visible:ring-gold focus-visible:border-gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-plum">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={onChange}
                      required
                      className="mt-2 bg-white border-plum/20 rounded-xl focus-visible:ring-gold focus-visible:border-gold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredDate" className="text-sm font-medium text-plum">
                      Preferred Date
                    </Label>
                    <Input
                      id="preferredDate"
                      name="preferredDate"
                      type="date"
                      value={form.preferredDate}
                      onChange={onChange}
                      className="mt-2 bg-white border-plum/20 rounded-xl focus-visible:ring-gold focus-visible:border-gold"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message" className="text-sm font-medium text-plum">
                    Tell us about your needs
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={form.message}
                    onChange={onChange}
                    required
                    className="mt-2 bg-white border-plum/20 rounded-xl focus-visible:ring-gold focus-visible:border-gold"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gold hover:bg-gold/90 text-white rounded-full py-6 text-base transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Send Request
                </Button>

                {/* 🔻 Image in the red-box area */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  viewport={{ once: true }}
                  className="mt-6"
                >
                  <img
                    src={contactImg}
                    alt="Sanchez Services team providing quality cleaning"
                    loading="lazy"
                    className="w-full h-56 md:h-64 rounded-2xl object-cover border border-plum/10 shadow-sm"
                  />
                </motion.div>
              </form>
            </CardContent>
          </Card>

          {/* Info card */}
          <div className="lg:col-span-5">
            <div className="h-full bg-white p-8 rounded-2xl shadow-md border border-plum/10 space-y-6">
              <h3 className="text-2xl font-bold text-plum">Contact Directly</h3>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-plum">Call Us</p>
                  <a href="tel:4016586708" className="text-gold hover:underline text-lg">
                    (401) 658-6708
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-plum">Email Us</p>
                  <a href={`mailto:${BUSINESS_EMAIL}`} className="text-gold hover:underline text-lg">
                    {BUSINESS_EMAIL}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-plum">Business Hours</p>
                  <p className="text-plum/80">Mon–Fri: 8:00 AM – 3:00 PM</p>
                  <p className="text-plum/80">Sat: 9:00 AM – 2:00 PM</p>
                  <p className="text-plum/60 text-sm mt-1">We typically reply within 24 hours.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-gold/20 p-3 flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-gold mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-plum">Background-Checked</p>
                    <p className="text-xs text-plum/70">All cleaners pass background checks.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-gold/20 p-3 flex items-start gap-2">
                  <BadgeDollarSign className="w-5 h-5 text-gold mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-plum">$50 Deposit</p>
                    <p className="text-xs text-plum/70">Non-refundable; applied to your balance.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-gold/20 p-3 flex items-start gap-2">
                  <CalendarClock className="w-5 h-5 text-gold mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-plum">48-Hour Cancellation</p>
                    <p className="text-xs text-plum/70">Please give two days’ notice.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-gold/20 p-3 flex items-start gap-2">
                  <Mail className="w-5 h-5 text-gold mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-plum">Estimates, Not Quotes</p>
                    <p className="text-xs text-plum/70">Final price confirmed after review.</p>
                  </div>
                </div>
              </div>

              {/* ✅ Requested quote added */}
              <div className="rounded-xl border border-gold/30 bg-rose-50 p-4">
                <p className="text-sm text-plum/80">
                  <span className="font-semibold">*</span> Availability varies by week. Ask about
                  <span className="font-semibold"> first-time client discounts</span>,
                  <span className="font-semibold"> referral rewards</span>, and
                  <span className="font-semibold"> bundle packages</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
