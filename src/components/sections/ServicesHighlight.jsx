import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Sparkles, Truck, Building, CheckCircle2 } from "lucide-react";
import { SERVICES } from "@/data/services";

// Reuse the same icon mapping
const ICONS = { Home, Sparkles, Truck, Building };

// If you ever want fewer than all 4, filter here (e.g., show top 3)
const HIGHLIGHTS = SERVICES; // or SERVICES.filter(s => s.popular || /* whatever logic */)

const ServicesHighlight = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-12 sm:py-16 md:py-20 px-3 sm:px-4 bg-[#EEF5FB]/40">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-8 sm:mb-10 md:mb-12"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6 }}
          viewport={reduceMotion ? undefined : { once: true }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-plum">What We Clean</h2>
          <p className="text-xs sm:text-sm md:text-base text-plum/80 mt-2">
            Serving clients nationwide. Explore services and book online in minutes.
          </p>
        </motion.div>

        {/* 4-up highlight cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {HIGHLIGHTS.map((svc, i) => {
            const Icon = ICONS[svc.icon] || Home;
            return (
              <motion.div
                key={svc.slug}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : i * 0.06 }}
                viewport={reduceMotion ? undefined : { once: true }}
              >
                <Card className="h-full border-gold/20 bg-white hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 sm:pb-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gold/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-plum text-sm sm:text-base md:text-lg">{svc.title}</CardTitle>
                        {svc.popular && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Most Popular
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs sm:text-sm text-plum/80">
                    <p>{svc.blurb}</p>
                    <div className="mt-3 sm:mt-4">
                      {/* Anchors to specific cards on the /services page */}
                      <Link
                        to={`/services#${svc.slug}`}
                        className="text-xs sm:text-sm text-gold font-semibold hover:underline"
                      >
                        Learn more →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-8 sm:mt-10 md:mt-12">
          <Button asChild className="rounded-full bg-gold hover:bg-gold/90 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base">
            <Link to="/services">Explore All Services</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServicesHighlight;
