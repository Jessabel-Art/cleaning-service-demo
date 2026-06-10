// src/pages/Services.jsx
import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Card, CardContent, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Home, Sparkles, Truck, Building, Leaf,
  CalendarClock, CheckCircle2, ClipboardList, Heart,
  Crown, ShieldCheck, Clock4, MapPin, ArrowRight
} from "lucide-react";

import { SERVICES, ADD_ONS, FREQUENCIES } from "@/data/services";

// Per-service images (module imports)
import residentialImg from "@/assets/images/residential-cleaning.jpeg";
import commercialImg from "@/assets/images/commercial-cleaning.jpeg";
import movingImg from "@/assets/images/moving-cleaning.jpeg";
import deepImg from "@/assets/images/deep-cleaning.jpeg";

// ✅ Import banner + service-area visual so Vite bundles them
import servicesBanner from "@/assets/images/services-banner.jpeg";
import servicesSide from "@/assets/images/services-image.jpeg";

const SERVICE_IMAGES = {
  "residential-cleaning": residentialImg,
  "office-cleaning": commercialImg,
  "move-in-move-out": movingImg,
  "deep-clean": deepImg,
};

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

const fadeUp = (delay = 0, reduceMotion = false) => {
  if (reduceMotion) {
    return {
      initial: false,
      transition: { duration: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: "easeOut", delay },
    viewport: { once: true },
  };
};

const ServicesPage = () => {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <Helmet>
        <title>Cleaning Services in RI & MA | Sanchez Services</title>
        <meta
          name="description"
          content="Explore residential, deep clean, move-in/out, and office cleaning services across Rhode Island and Massachusetts with transparent pricing estimates."
        />
      </Helmet>

    <main className="py-8 sm:py-10 md:py-14 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">

        {/* Banner — uses bundled image import */}
        <motion.div
          className="relative mb-8 sm:mb-10 md:mb-12 overflow-hidden rounded-xl sm:rounded-2xl border border-gold/20"
          aria-label="Professional cleaning services in Rhode Island and Massachusetts"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={reduceMotion ? undefined : { opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
          viewport={reduceMotion ? undefined : { once: true }}
          style={{
            backgroundImage:
              `linear-gradient(to top right, rgba(0,0,0,.55), rgba(0,0,0,.35), rgba(0,0,0,0)), url(${servicesBanner})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          >
          <div className="h-[200px] sm:h-[240px] md:h-[320px] w-full" />
          <div className="absolute inset-0 flex items-center">
            <div className="px-4 sm:px-6 md:px-10 max-w-2xl">
              <h1 className="text-white text-xl sm:text-2xl md:text-4xl font-bold leading-tight drop-shadow-sm">
                Spotless spaces, zero guesswork
              </h1>
              <p className="mt-1.5 sm:mt-2 text-white/90 text-xs sm:text-sm md:text-base">
                Clear options, upfront estimates, and flexible add-ons. Browse services and book in minutes.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  className="rounded-full bg-gold hover:bg-gold/90 text-white transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <Link to={`/auth?redirect=${encodeURIComponent('/book')}`}>Book a Cleaning</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-white/60 text-white hover:bg-white/10 transition-all focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <Link to="/contact">Request Estimate</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Title */}
  <motion.div className="text-center mb-8 sm:mb-10 md:mb-16" {...fadeUp(0, reduceMotion)}>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-plum mb-3 sm:mb-4">Our Cleaning Services</h2>
          <p className="text-sm sm:text-base text-plum/80 max-w-2xl mx-auto px-2">
            We offer a range of professional cleaning solutions to fit your needs, from routine
            maintenance to deep cleaning projects. Each service is performed with care and attention to detail.
          </p>
        </motion.div>

        {/* 1) Cleaning Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {SERVICES.map((svc, idx) => {
            const Icon = ICONS[svc.icon] || Home;
            return (
              <motion.div
                key={svc.slug}
                id={svc.slug}
                initial={reduceMotion ? false : { opacity: 0, y: 30 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : idx * 0.08 }}
                viewport={reduceMotion ? undefined : { once: true }}
                className="flex"
              >
                <Card className="bg-white/90 border-gold/20 w-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden">
                  {svc.popular && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold">
                      <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Most Popular
                    </div>
                  )}

                  <div className="w-full h-28 sm:h-32 overflow-hidden">
                    <img
                      src={SERVICE_IMAGES[svc.slug]}
                      alt={svc.title}
                      className="w-full h-full object-cover object-center block"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <CardHeader className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-gold" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl font-semibold text-plum">{svc.title}</CardTitle>
                    <p className="text-sm sm:text-base text-plum/60 font-medium">
                      From ${svc.priceFrom} • <span className="text-plum/70">{svc.duration}</span>
                    </p>
                  </CardHeader>

                  <CardContent className="flex-grow">
                    <p className="text-plum/80 text-center text-xs sm:text-sm mb-3 sm:mb-4">{svc.blurb}</p>
                    <ul className="text-xs sm:text-sm text-plum/80 space-y-1.5 sm:space-y-2">
                      {svc.includes.map((line, i) => (
                        <li key={i} className="flex gap-1.5 sm:gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold mt-0.5" aria-hidden="true" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] sm:text-[12px] text-plum/60 mt-2 sm:mt-3">
                      Prices shown are <strong>estimates</strong> (not quotes). Final pricing may vary—confirmed during booking.
                    </p>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-1">
                    {/* Single primary CTA */}
            <Button
                asChild
                className="w-full bg-gold hover:bg-gold/90 text-white rounded-full transition-all will-change-transform hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-gold/60 text-sm sm:text-base"
              >
            <Link to={`/auth?redirect=${encodeURIComponent(`/book?service=${svc.slug}`)}`}>Book Now</Link>
              </Button>
                    {/* Low-emphasis secondary link */}
                    <Link
                      to={`/contact?service=${svc.slug}`}
                      className="mt-1 inline-flex items-center justify-center gap-1 text-xs sm:text-sm text-plum/70 hover:text-plum transition-colors"
                    >
                      Request custom estimate <ArrowRight className="w-4 h-4" />
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Perks strip */}
        <motion.div className="text-center mt-12 sm:mt-14 md:mt-16" {...fadeUp(0.1, reduceMotion)}>
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:gap-8 rounded-2xl sm:rounded-full bg-white p-3 sm:p-4 shadow-sm">
            {perks.map((perk, index) => (
              <div key={index} className="flex items-center gap-2">
                <perk.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gold" aria-hidden="true" />
                <span className="font-medium text-plum/90 text-xs sm:text-sm">{perk.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Savings banner */}
        <div className="mt-8 sm:mt-10 rounded-xl sm:rounded-2xl bg-rose-50 border border-gold/20 p-4 sm:p-5 md:p-6 text-center">
          <p className="text-xs sm:text-sm md:text-base text-plum">
            <span className="font-semibold">Ways to save:</span>{" "}
            {FREQUENCIES.filter((frequency) => frequency.discount > 0).map(
              (frequency) => (
                <React.Fragment key={frequency.id}>
                  {frequency.name}{" "}
                  <span className="font-semibold">
                    {Math.round(frequency.discount * 100)}%
                  </span>{" "}
                  ·{" "}
                </React.Fragment>
              )
            )}
            <span className="font-semibold">First-time client discount</span> ·{" "}
            <span className="font-semibold">Referral rewards</span> ·{" "}
            <span className="font-semibold">Bundle packages</span>
          </p>
        </div>

        {/* 2) Popular Add-ons */}
        <div className="mt-12 sm:mt-14 md:mt-16">
          <motion.h3 className="text-xl sm:text-2xl font-bold text-plum mb-3 sm:mb-4" {...fadeUp(0, reduceMotion)}>Popular Add-ons</motion.h3>
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4" {...fadeUp(0.05, reduceMotion)}>
            {ADD_ONS.map((a) => (
              <div
                key={a.id}
                className="group flex items-center justify-between rounded-lg sm:rounded-xl border border-gold/20 bg-white p-3 sm:p-4 transition-all hover:shadow-sm hover:-translate-y-0.5"
              >
                <span className="text-sm sm:text-base text-plum">
                  <span className="relative inline-block">
                    {a.label}
                    <span className="block h-px w-0 bg-gold transition-all duration-300 group-hover:w-full" />
                  </span>
                </span>
                <span className="text-sm sm:text-base text-plum/70 font-medium">${a.price}</span>
              </div>
            ))}
          </motion.div>
          <p className="text-xs sm:text-sm text-plum/60 mt-2">
            Add-ons can be selected during booking or requested in your estimate.
          </p>
        </div>

        {/* 3) Not sure which to pick? */}
        <div className="mt-12 sm:mt-14 md:mt-16">
          <motion.h3 className="text-xl sm:text-2xl font-bold text-plum mb-3 sm:mb-4" {...fadeUp(0, reduceMotion)}>Not sure which to pick?</motion.h3>
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6" {...fadeUp(0.05, reduceMotion)}>
            {SERVICES.map((s) => {
              const Icon = ICONS[s.icon] || Home;
              return (
                <Card key={s.slug} className="bg-white/90 border-gold/20 transition-all hover:shadow-sm hover:-translate-y-0.5">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gold" aria-hidden="true" />
                      <p className="text-sm sm:text-base font-semibold text-plum">{s.title}</p>
                    </div>
                    <p className="text-xs sm:text-sm text-plum/80">{s.bestFor}</p>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        </div>

        {/* 4) How it works */}
        <div className="mt-12 sm:mt-14 md:mt-16">
          <motion.h3 className="text-xl sm:text-2xl font-bold text-plum mb-4 sm:mb-5 md:mb-6" {...fadeUp(0, reduceMotion)}>How it works</motion.h3>
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6" {...fadeUp(0.05, reduceMotion)}>
            {steps.map((st, i) => (
              <div key={st.title} className="rounded-xl sm:rounded-2xl border border-gold/20 bg-white p-4 sm:p-5 md:p-6 transition-all hover:-translate-y-0.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gold/10 flex items-center justify-center mb-3 sm:mb-4">
                  <st.icon className="w-5 h-5 sm:w-6 sm:h-6 text-gold" aria-hidden="true" />
                </div>
                <p className="text-sm sm:text-base font-semibold text-plum">{`${i + 1}. ${st.title}`}</p>
                <p className="text-xs sm:text-sm text-plum/80 mt-1">{st.text}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* 5) Service Area + Operating Hours */}
        <div className="mt-12 sm:mt-14 md:mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 md:gap-8 items-stretch">
          {/* Visual side — uses bundled image import */}
          <motion.div
            className="rounded-xl sm:rounded-2xl overflow-hidden border border-gold/20 bg-white"
            {...fadeUp(0, reduceMotion)}
            style={{
              backgroundImage: `url(${servicesSide})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="w-full aspect-[4/3]" aria-hidden="true" />
          </motion.div>

          {/* Information panel */}
          <motion.div {...fadeUp(0.05, reduceMotion)}>
            <Card className="h-full flex flex-col border-gold/25 bg-white">
              <CardHeader className="space-y-2">
                <CardTitle className="text-plum text-xl sm:text-2xl flex items-center gap-2">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gold" aria-hidden="true" />
                  Service Area & Hours
                </CardTitle>
                <p className="text-plum/70 text-xs sm:text-sm leading-relaxed">
                  We’re based in <strong>Providence, RI</strong> and proudly serve <strong>all of Rhode Island</strong> and <strong>Massachusetts</strong>.
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                  {serviceAreas.map((tag) => (
                    <span key={tag} className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-rose-50 border border-gold/20 text-plum text-[10px] sm:text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {hours.map((h) => (
                    <div key={h.label} className="rounded-lg sm:rounded-xl border border-gold/20 bg-white p-3 sm:p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Clock4 className="w-4 h-4 sm:w-5 sm:h-5 text-gold" aria-hidden="true" />
                        <span className="text-sm sm:text-base font-semibold text-plum">{h.label}</span>
                      </div>
                      <span className="text-xs sm:text-sm text-plum/80">{h.value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-plum/60 mt-2 sm:mt-3">
                  Need a different time? Add a note with your request—we’ll do our best.
                </p>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  asChild
                  className="rounded-full bg-gold hover:bg-gold/90 text-white transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  <Link to={`/auth?redirect=${encodeURIComponent('/book')}`}>Book a Cleaning</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-gold/40 text-plum hover:bg-gold/10 transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-plum/40"
                >
                  <Link to="/contact">Request an Estimate</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

      </div>
    </main>
    </>
  );
};

export default ServicesPage;
