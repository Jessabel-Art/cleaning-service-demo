import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Home,
  Sparkles,
  Truck,
  Building,
  Leaf,
  CalendarClock,
  Bell,
  CheckCircle2,
  ClipboardList,
  Handshake,
} from "lucide-react";

const services = [
  {
    slug: "residential-cleaning",
    icon: Home,
    title: "Residential Cleaning",
    blurb: "Keep your home spotless and comfortable for your family.",
    price: 99,
    bestFor: "Apartments, condos, and homes that need routine upkeep.",
    includes: [
      "Dust all surfaces & ceiling fans",
      "Vacuum/mop floors",
      "Kitchen wipe-down (exterior appliances, counters, sink)",
      "Bathroom clean (toilet, tub/shower, mirrors)",
      "Make beds, tidy rooms, empty trash",
    ],
  },
  {
    slug: "deep-clean",
    icon: Sparkles,
    title: "Deep Clean",
    blurb: "A top-to-bottom reset that reaches every corner and surface.",
    price: 149,
    bestFor: "First-time cleans, seasonal refreshes, or before hosting.",
    includes: [
      "Everything in Residential",
      "Baseboards, doors, door frames",
      "Detailed kitchen (cabinet faces, backsplash)",
      "Bathroom detailing (tile, grout edges)",
      "Window sills, tracks, light switches",
    ],
  },
  {
    slug: "move-in-move-out",
    icon: Truck,
    title: "Move-In / Move-Out",
    blurb: "Make your place move-ready for keys-in or keys-out.",
    price: 199,
    bestFor: "Landlords, renters, buyers, and sellers.",
    includes: [
      "Inside cabinets & drawers (empty)",
      "Inside fridge & oven (add-on if heavy)",
      "Appliance exteriors & counters",
      "Bathrooms sanitized top to bottom",
      "Baseboards, closets, window sills",
    ],
  },
  {
    slug: "office-cleaning",
    icon: Building,
    title: "Office / Commercial",
    blurb: "A clean, healthy workspace for teams and customers.",
    price: 129,
    bestFor: "Offices, studios, retail suites, and common areas.",
    includes: [
      "Dust & disinfect high-touch surfaces",
      "Vacuum/mop floors & entryways",
      "Kitchenette break areas",
      "Restrooms stocked & sanitized",
      "Trash removal & recycling",
    ],
  },
];

const perks = [
  { icon: Leaf, text: "Eco-Friendly Products" },
  { icon: CalendarClock, text: "Recurring Discounts" },
  { icon: Bell, text: "Next-Day Availability" },
];

const addOns = [
  { id: "fridge", label: "Inside Fridge", price: 25 },
  { id: "oven", label: "Inside Oven", price: 25 },
  { id: "windows", label: "Interior Windows", price: 30 },
  { id: "baseboards", label: "Baseboards Detailing", price: 30 },
  { id: "laundry", label: "One Load Laundry", price: 20 },
  { id: "garage", label: "Garage Sweep", price: 20 },
];

const Steps = [
  {
    icon: ClipboardList,
    title: "Tell us about your space",
    text: "Bedrooms, bathrooms, add-ons, and your preferred time window.",
  },
  {
    icon: Handshake,
    title: "Get a firm quote",
    text: "We confirm the price and details—no surprises, ever.",
  },
  {
    icon: CheckCircle2,
    title: "We handle the rest",
    text: "Pro team arrives on time with supplies and smiles.",
  },
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
            <h2 className="text-4xl md:text-5xl font-bold text-plum mb-4">
              Our Services
            </h2>
            <p className="text-lg text-plum/80 max-w-2xl mx-auto">
              Professional cleaning solutions tailored to your home or business.
            </p>
          </motion.div>
        )}

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((svc, idx) => (
            <motion.div
              key={svc.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.08 }}
              viewport={{ once: true }}
              className="flex"
            >
              <Card className="bg-white/90 border-gold/20 w-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svc.icon className="w-8 h-8 text-gold" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-plum">
                    {svc.title}
                  </CardTitle>
                  <p className="text-plum/60 font-medium">From ${svc.price}</p>
                </CardHeader>

                <CardContent className="flex-grow">
                  <p className="text-plum/80 text-center text-sm mb-4">
                    {svc.blurb}
                  </p>
                  <ul className="text-sm text-plum/80 space-y-2">
                    {svc.includes.map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-gold mt-0.5" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <Button
                    asChild
                    className="w-full bg-gold hover:bg-gold/90 text-white rounded-full"
                  >
                    <Link to={`/book?service=${svc.slug}`}>Book Now</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-full border-gold/40 text-plum hover:bg-gold/10"
                  >
                    <Link to={`/contact?service=${svc.slug}`}>
                      Request Custom Estimate
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
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
                <span className="font-medium text-plum/90 text-sm">
                  {perk.text}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recurring discounts banner */}
        <div className="mt-10 rounded-2xl bg-rose-50 border border-gold/20 p-6 text-center">
          <p className="text-plum text-lg">
            <span className="font-semibold">Save on recurring cleans:</span>{" "}
            Weekly <span className="font-semibold">20%</span> · Bi-weekly{" "}
            <span className="font-semibold">15%</span> · Monthly{" "}
            <span className="font-semibold">10%</span>
          </p>
        </div>

        {/* Add-ons */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-plum mb-4">Popular Add-ons</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {addOns.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-gold/20 bg-white p-4"
              >
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
          <h3 className="text-2xl font-bold text-plum mb-4">
            Not sure which to pick?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s) => (
              <Card key={s.slug} className="bg-white/90 border-gold/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <s.icon className="w-5 h-5 text-gold" />
                    <p className="font-semibold text-plum">{s.title}</p>
                  </div>
                  <p className="text-sm text-plum/80">{s.bestFor}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-plum mb-6">How it works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Steps.map((st, i) => (
              <div
                key={st.title}
                className="rounded-2xl border border-gold/20 bg-white p-6"
              >
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                  <st.icon className="w-6 h-6 text-gold" />
                </div>
                <p className="font-semibold text-plum">{`${i + 1}. ${st.title}`}</p>
                <p className="text-sm text-plum/80 mt-1">{st.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-plum mb-6">FAQs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <details className="rounded-xl border border-gold/20 bg-white p-4">
              <summary className="cursor-pointer font-medium text-plum">
                Do you bring supplies and equipment?
              </summary>
              <p className="mt-2 text-sm text-plum/80">
                Yes. We bring eco-friendly products and professional equipment.
                If you’d like us to use your supplies, let us know at booking.
              </p>
            </details>
            <details className="rounded-xl border border-gold/20 bg-white p-4">
              <summary className="cursor-pointer font-medium text-plum">
                Are you insured and background-checked?
              </summary>
              <p className="mt-2 text-sm text-plum/80">
                Absolutely. We’re fully insured and all pros pass background
                checks for your peace of mind.
              </p>
            </details>
            <details className="rounded-xl border border-gold/20 bg-white p-4">
              <summary className="cursor-pointer font-medium text-plum">
                What’s your cancellation policy?
              </summary>
              <p className="mt-2 text-sm text-plum/80">
                You can reschedule or cancel up to 24 hours before your
                appointment with no fee.
              </p>
            </details>
            <details className="rounded-xl border border-gold/20 bg-white p-4">
              <summary className="cursor-pointer font-medium text-plum">
                Do you serve my area?
              </summary>
              <p className="mt-2 text-sm text-plum/80">
                We operate within our local service area. If you’re not sure,
                start an estimate—our form will let you know right away.
              </p>
            </details>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-3">
            <Button asChild className="rounded-full bg-gold hover:bg-gold/90 text-white">
              <Link to="/book">Book a Cleaning</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-gold/40 text-plum hover:bg-gold/10"
            >
              <Link to="/contact">Request an Estimate</Link>
            </Button>
          </div>
          <p className="text-sm text-plum/60 mt-3">
            Questions? Call{" "}
            <a className="text-gold underline" href="tel:5551234567">
              (555) 123-4567
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
};

export default Services;
