import React from 'react';
import { motion } from 'framer-motion';
import {
  Leaf,
  Clock,
  ShieldCheck,
  Star,
  Heart,
  MapPin,
  CalendarClock,
  BadgeDollarSign
} from 'lucide-react';
import Mascot from '@/components/Mascot';

const About = () => {
  const whyChooseUs = [
    {
      icon: Leaf,
      title: "Eco-Friendly Products",
      text: "We favor pet-safe, low-odor cleaners and microfiber methods whenever possible."
    },
    {
      icon: ShieldCheck,
      title: "Background-Checked Pros",
      text: "Every cleaner passes a background check for your peace of mind."
    },
    {
      icon: Clock,
      title: "Reliable Hours",
      text: "Mon–Fri 8:00 AM–3:00 PM • Sat 9:00 AM–2:00 PM (Closed Sun)."
    },
    {
      icon: Star,
      title: "Satisfaction Focused",
      text: "Clear communication, consistent results, and friendly service—every visit."
    }
  ];

  const fastFacts = [
    { icon: MapPin, label: "Service Area", value: "All of Rhode Island & Massachusetts" },
    { icon: BadgeDollarSign, label: "Deposit", value: "$50 non-refundable deposit to confirm appointments" },
    { icon: CalendarClock, label: "Cancellation", value: "Please provide at least 48 hours’ notice" },
    { icon: Clock, label: "Response Time", value: "We typically reply within 24 hours" }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-rose-50 via-white to-rose-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Mascot visual */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <Mascot size={460} className="drop-shadow-md" alt="Sanchez Services mascot" />
          </motion.div>

          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-plum mb-4">A Higher Standard of Clean</h2>
            <p className="text-lg font-semibold text-plum/80 mb-6">
              Small, local, and people-first—serving <span className="font-semibold">all of Rhode Island</span> and <span className="font-semibold">Massachusetts</span>.
            </p>

            <p className="text-plum/80 mb-4">
              Sanchez Services is a locally run cleaning business based in <strong>Providence, RI</strong>.
              We believe a clean home should feel calm and effortless. You’ll get the same friendly faces,
              consistent results, and clear communication—every visit.
            </p>

            {/* Mission */}
            <div className="rounded-2xl border border-gold/20 bg-rose-50 p-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-plum font-semibold">Our Mission</h3>
                  <p className="text-plum/80 text-sm mt-1">
                    We’re working toward becoming a nonprofit organization that provides support for
                    low-income families and those facing mental-health challenges—using cleaning as a way
                    to bring relief, dignity, and a fresh start.
                  </p>
                </div>
              </div>
            </div>

            {/* Why choose us */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {whyChooseUs.map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-plum">{item.title}</h4>
                    <p className="text-plum/70 text-sm">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick facts / policies */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fastFacts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-gold/20 bg-white p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-plum font-medium">{label}</p>
                    <p className="text-sm text-plum/70">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-plum/60 mt-6">
              *Availability varies by week. Ask about first-time client discounts, referral rewards, and bundle packages.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
