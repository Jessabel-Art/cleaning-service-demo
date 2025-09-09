// src/components/sections/ContactSection.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Mail, Clock } from 'lucide-react';

const ContactSection = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferredDate: '',
    message: '',
  });
  const [sent, setSent] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    toast({ title: 'Estimate Request Sent! 🎉', description: "We’ll be in touch within 24 hours." });
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
        </motion.div>

        {/* 12-col layout so form can be wider than the info card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Form (7 cols on desktop) */}
          <Card className="lg:col-span-7 bg-white border border-plum/10 rounded-2xl shadow-lg">
            <CardContent className="p-8">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-plum">Full Name</Label>
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
                    <Label htmlFor="email" className="text-sm font-medium text-plum">Email</Label>
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
                    <Label htmlFor="phone" className="text-sm font-medium text-plum">Phone</Label>
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
                    <Label htmlFor="preferredDate" className="text-sm font-medium text-plum">Preferred Date</Label>
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
                  <Label htmlFor="message" className="text-sm font-medium text-plum">Tell us about your needs</Label>
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
              </form>
            </CardContent>
          </Card>

          {/* Info card (5 cols on desktop) */}
          <div className="lg:col-span-5">
            <div className="h-full bg-white p-8 rounded-2xl shadow-md border border-plum/10 space-y-6">
              <h3 className="text-2xl font-bold text-plum">Contact Directly</h3>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                  <Phone className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-plum">Call Us</p>
                  <a href="tel:5551234567" className="text-gold hover:underline text-lg">(555) 123-4567</a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-plum">Email Us</p>
                  <a href="mailto:info@sanchezservices.com" className="text-gold hover:underline text-lg">
                    info@sanchezservices.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-plum">Business Hours</p>
                  <p className="text-plum/80">Mon–Fri: 8 AM – 6 PM</p>
                  <p className="text-plum/80">Sat: 9 AM – 4 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
