// src/components/sections/Testimonials.jsx
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

// Helper to resolve screenshot URLs from /src
const img = (file) =>
  new URL(`@/assets/reviews/screenshots/${file}`, import.meta.url).href;

// Fictional demo reviews — clearly not real clients
const REVIEWS = [
  {
    id: 'r1',
    name: 'Alex M. — Demo Client',
    rating: 5,
    source: 'Demo review',
    body:
      "I can't believe how spotless the kitchen looks! The team was professional, on time, and went above and beyond. I'll definitely be booking again next month.",
    screenshot: null,
  },
  {
    id: 'r2',
    name: 'Jordan T. — Demo Client',
    rating: 5,
    source: 'Demo review',
    body:
      'Absolutely outstanding service. My apartment has never been this clean. They even organized the pantry without being asked. So impressed!',
    screenshot: null,
  },
  {
    id: 'r3',
    name: 'Morgan L. — Demo Client',
    rating: 5,
    source: 'Demo review',
    body:
      "Used CleanPro for a move-out clean and got my full deposit back. They were thorough, fast, and very reasonably priced. Highly recommend!",
    screenshot: null,
  },
  {
    id: 'r4',
    name: 'Riley K. — Demo Client',
    rating: 5,
    source: 'Demo review',
    body:
      "The house looks and smells amazing. Booking was simple, communication was great, and the results speak for themselves. 10/10.",
    screenshot: null,
  },
  {
    id: 'r5',
    name: 'Casey P. — Demo Client',
    rating: 5,
    source: 'Demo review',
    body:
      'Our office has never been so clean. The team is reliable, friendly, and always exceeds expectations. We switched from our old provider and wish we had done it sooner.',
    screenshot: null,
  },
  {
    id: 'r6',
    name: 'Taylor W. — Demo Client',
    rating: 5,
    source: 'Demo review',
    body:
      'Great attention to detail! They got every corner of the bathroom, cleaned the baseboards, and even wiped down the light switches. A truly deep clean.',
    screenshot: null,
  },
];

const GOOGLE_REVIEW_LINK = '#';  // Demo — no real review link

export default function Testimonials() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-12 sm:py-16 md:py-20 px-3 sm:px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          className="text-center mb-8 sm:mb-10 md:mb-12"
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6 }}
          viewport={reduceMotion ? undefined : { once: true }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-plum mb-2 sm:mb-3">
            What Our Clients Say
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-plum/80 max-w-2xl mx-auto">
            Sample reviews from demo clients. These are fictional for illustration purposes.
          </p>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.1 }}
          viewport={reduceMotion ? undefined : { once: true }}
        >
          <Carousel className="w-full max-w-3xl mx-auto" opts={{ loop: true }}>
            <CarouselContent>
              {REVIEWS.map((r) => (
                <CarouselItem key={r.id}>
                  {/* group + relative lets us reveal a hover preview */}
                  <Card className="bg-white border-gold/20 shadow-md overflow-visible">
                    <CardContent className="p-4 sm:p-5 md:p-6 relative group">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div>
                          <p className="font-semibold text-sm sm:text-base text-plum">{r.name}</p>
                          <p className="text-xs text-plum/60">{r.source}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${i < r.rating ? 'text-gold fill-current' : 'text-plum/20'}`}
                            />
                          ))}
                        </div>
                      </div>

                      <blockquote className="italic text-xs sm:text-sm md:text-base text-plum/90 leading-relaxed">
                        "{r.body}"
                      </blockquote>

                      <p className="mt-3 text-[11px] text-plum/50 italic">— Demo review, fictional client</p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Arrows (show on md+) */}
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </motion.div>

        {/* CTA row */}
        <div className="text-center mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
          <Button
            asChild
            variant="outline"
            className="border-gold text-gold hover:bg-gold/10 hover:text-gold rounded-full px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-base"
          >
            <a href="#" onClick={(e) => e.preventDefault()}>
              Submit Your Review (Demo Only)
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
