// src/components/sections/Services.jsx
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Home, Sparkles, Truck, Building, Leaf,
  CalendarClock, Bell, CheckCircle2, ClipboardList, Heart, Crown, ShieldCheck, Clock4
} from "lucide-react";

import { SERVICES, ADD_ONS } from "@/data/services";

// Import service images
import residentialImg from "@/assets/images/residential-cleaning.jpeg";
import commercialImg from "@/assets/images/commercial-cleaning.jpeg";
import movingImg from "@/assets/images/moving-cleaning.jpeg";
import deepImg from "@/assets/images/deep-cleaning.jpeg";

const SERVICE_IMAGES = {
  "residential-cleaning": residentialImg,
  "commercial-cleaning": commercialImg,
  "moving-cleaning": movingImg,
  "deep-cleaning": deepImg,
};

// Map string icon keys from data → actual Lucide components
const ICONS = { Home, Sparkles, Truck, Building };

const perks = [
  { icon: ShieldCheck, text: "Background-Checked Pros" },
  { icon: CalendarClock, text: "Replies within 24 hours" },
  { icon: Leaf, text: "Eco-Friendly Products" },
];

const steps = [
  { icon: ClipboardList, title: "Tell us about your space", text: "Bedrooms, bathrooms, add-ons, and your preferred time window." },
  { icon: Heart, title: "Get an estimate", text: "Transparent, no-pressure estimates (estimates are not quotes)." },
  { icon: CheckCircle2, title: "We handle the rest", text: "Pro team arrives on time with supplies and smiles." },
];

const serviceAreas = ["Rhode Island (statewide)", "Massachusetts (statewide)"];

const hours = [
  { label: "Mon–Fri", value: "8:00 AM – 3:00 PM" },
  { label: "Saturday", value: "9:00 AM – 2:00 PM" },
  { label: "Sunday", value: "Closed" },
];

const Services = ({ showTitle = true }) => {
  return (
    <section id="services" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">

        {showTitle && (
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-plum mb-4">Our Services</h2>
            <p className="text-lg text-plum/80 max-w-2xl mx-auto">
              Locally owned & people-first — serving <span className="font-semibold">all of Rhode Island</span> and <span className="font-semibold">Massachusetts</span>.
            </p>
          </motion.div>
        )}

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {SERVICES.map((svc, idx) => {
            const Icon = ICONS[svc.icon] || Home;
            return (
              <motion.div
                key={svc.slug}
                id={svc.slug} // ← anchor for /services#slug
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.08 }}
                viewport={{ once: true }}
                className="flex"
              >
                <Card className="bg-white/90 border-gold/20 w-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden">
                  {svc.popular && (
                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-xs font-semibold">
                      <Crown className="w-3.5 h-3.5" /> Most Popular
                    </div>
                  )}

                  {/* Service Image */}
                  <img
                    src={SERVICE_IMAGES[svc.slug]}
                    alt={svc.title}
                    className="w-full h-32 object-cover object-center"
                    style={{ borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit' }}
                  />

                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-gold" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-plum">{svc.title}</CardTitle>
                    <p className="text-plum/60 font-medium">
                      From ${svc.priceFrom} • <span className="text-plum/70">{svc.duration}</span>
                    </p>
                  </CardHeader>

                  <CardContent className="flex-grow">
                    <p className="text-plum/80 text-center text-sm mb-4">{svc.blurb}</p>
                    <ul className="text-sm text-plum/80 space-y-2">
                      {svc.includes.map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <CheckCircle2 className="w-4 h-4 text-gold mt-0.5" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[12px] text-plum/60 mt-3">
                      Prices shown are <strong>estimates</strong> (not quotes). Final pricing may vary for heavy buildup, pet hair, or larger homes—confirmed during booking.
                    </p>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2">
                    <Button asChild className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                      <Link to={`/book?service=${svc.slug}`}>Book Now</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full rounded-full border-gold/40 text-plum hover:bg-gold/10">
                      <Link to={`/contact?service=${svc.slug}`}>Request Custom Estimate</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Perks strip */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex flex-col md:flex-row items-center gap-4 md:gap-8 rounded-full bg-white p-4 shadow-sm">
              {perks.map((perk, index) => (
                <div key={index} className="flex items-center gap-2">
                  <perk.icon className="w-5 h-5 text-gold" />
                  <span className="font-medium text-plum/90 text-sm">{perk.text}</span>
                </div>
              ))}
            </div>
        </motion.div>

        {/* Offers & recurring banner */}
        <div className="mt-10 rounded-2xl bg-rose-50 border border-gold/20 p-6 text-center">
          <p className="text-plum text-lg">
            <span className="font-semibold">Ways to save:</span>{" "}
            Weekly <span className="font-semibold">20%</span> · Bi-weekly{" "}
            <span className="font-semibold">15%</span> · Monthly{" "}
            <span className="font-semibold">10%</span> ·{" "}
            <span className="font-semibold">First-time client discount</span> ·{" "}
            <span className="font-semibold">Referral rewards</span> ·{" "}
            <span className="font-semibold">Bundle packages</span>
          </p>
        </div>

        {/* Operating Hours */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-plum mb-4">Operating Hours</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {hours.map((h) => (
              <div key={h.label} className="rounded-xl border border-gold/20 bg-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock4 className="w-5 h-5 text-gold" />
                  <span className="font-semibold text-plum">{h.label}</span>
                </div>
                <span className="text-plum/80">{h.value}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-plum/60 mt-2">
            Need a different time? Add a note with your request—we'll do our best.
          </p>
        </div>

        {/* Add-ons */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-plum mb-4">Popular Add-ons</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {ADD_ONS.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-gold/20 bg-white p-4">
                <span className="text-plum">{a.label}</span>
                <span className="text-plum/70 font-medium">${a.price}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-plum/60 mt-2">
            Add-ons can be selected during booking or requested in your estimate.
          </p>
        </div>

        {/* Who it's best for */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-plum mb-4">Not sure which to pick?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((s) => {
              const Icon = ICONS[s.icon] || Home;
              return (
                <Card key={s.slug} className="bg-white/90 border-gold/20">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className="w-5 h-5 text-gold" />
                      <p className="font-semibold text-plum">{s.title}</p>
                    </div>
                    <p className="text-sm text-plum/80">{s.bestFor}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-plum mb-6">How it works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((st, i) => (
              <div key={st.title} className="rounded-2xl border border-gold/20 bg-white p-6">
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                  <st.icon className="w-6 h-6 text-gold" />
                </div>
                <p className="font-semibold text-plum">{`${i + 1}. ${st.title}`}</p>
                <p className="text-sm text-plum/80 mt-1">{st.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Service Area */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-plum mb-4">Service Area</h3>
          <p className="text-plum/80 mb-3">
            We’re based in <strong>Providence, RI</strong> and proudly serve <strong>all of Rhode Island</strong> and <strong>Massachusetts</strong>.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {serviceAreas.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-white border border-gold/20 text-plum text-sm">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-[12px] text-plum/60 mt-2">
            Not sure if you’re in range? Start a booking—we’ll confirm instantly.
          </p>
        </div>

        {/* Final CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-3">
            <Button asChild className="rounded-full bg-gold hover:bg-gold/90 text-white">
              <Link to="/book">Book a Cleaning</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-gold/40 text-plum hover:bg-gold/10">
              <Link to="/contact">Request an Estimate</Link>
            </Button>
          </div>
          <p className="text-sm text-plum/60 mt-3">
            Questions? Call <a className="text-gold underline" href="tel:5551234567">(555) 123-4567</a>.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Services;
