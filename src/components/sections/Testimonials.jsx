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

// Typed out from the screenshots you provided
const REVIEWS = [
  {
    id: 'r1',
    name: 'Client via SMS',
    rating: 5,
    source: 'Text message',
    body:
      "Good morning Sterling. I just want to say how happy I am I found you. Having you do your work makes me free to do other things I need to get done and I'm very grateful for that. It felt so nice after working all day in the yard to walk into a fresh and clean space. Thank you for your service, I appreciate you like you wouldn't believe.",
    screenshot: img('review-1.jpg'),
  },
  {
    id: 'r2',
    name: 'Client via SMS',
    rating: 5,
    source: 'Text message',
    body:
      'Hey Sterling – Thank you for such a wonderful day. You and Brenda make me smile. My home is so clean & organized because of you. I am so very happy with everything! Let me know when you can come back to finish the basement. xoxo',
    screenshot: img('review-2.jpg'),
  },
  {
    id: 'r3',
    name: 'Client via SMS',
    rating: 5,
    source: 'Text message',
    body:
      "Good morning Sterling! It's so good to have you back. My house looks tremendous! I appreciate you taking extra time and care — it means a lot. I will buy that cleaner and hopefully it will work. Again, cannot thank you enough. Tell Brenda I missed her organizing too!",
    screenshot: img('review-3.jpg'),
  },
  {
    id: 'r4',
    name: 'Client via SMS',
    rating: 5,
    source: 'Text message',
    body:
      "The house looks excellent. Thank you so much. You guys do a great job. See you next month. Have a wonderful weekend.",
    screenshot: img('review-4.jpg'),
  },
  {
    id: 'r5',
    name: 'Google Reviewer',
    rating: 5,
    source: 'Google',
    body:
      'Highly recommend to any person or business looking for cleaning services. Very easy to book, punctual, and respectful; they went above and beyond to ensure I got great value on the deep cleaning my house needed.',
    screenshot: img('review-5.jpg'),
  },
  {
    id: 'r6',
    name: 'Client via SMS',
    rating: 5,
    source: 'Text message',
    body:
      'You have made my downstairs into what it looked like when we first moved in. You did a fabulous job and I hope I can contact you again. The bathroom looks brand new! Thanks a million!!!!',
    screenshot: img('review-6.jpg'),
  },
];

const GOOGLE_REVIEW_LINK = 'https://share.google/PMwss9jKLHqMSjc9C';

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
            Real words from clients in and around Providence who trust us to keep
            their spaces clean.
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

                      {/* View screenshot link + hover preview */}
                      <div className="mt-3 sm:mt-4 inline-block relative">
                        <a
                          href={r.screenshot}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs sm:text-sm underline text-plum/70 hover:text-gold"
                        >
                          View screenshot
                        </a>

                        {/* Floating preview (desktop hover). Kept outside the link so clicks still open the image. */}
                        <motion.div
                          initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 6 }}
                          whileHover={{}}
                          // group-hover from the card OR hover from the link container
                          className="pointer-events-none absolute left-0 top-7 sm:left-auto sm:right-0 z-50 w-[260px] sm:w-[340px] rounded-xl shadow-2xl border border-plum/10 bg-white/95 backdrop-blur overflow-hidden
                                     opacity-0 scale-95 translate-y-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0
                                     hover:opacity-100 hover:scale-100 hover:translate-y-0 transition-all duration-200 ease-out"
                        >
                          {/* Tiny header strip for polish */}
                          <div className="h-1 w-full bg-gold/70" />
                          <img
                            src={r.screenshot}
                            alt={`Screenshot of ${r.name}'s review`}
                            loading="lazy"
                            className="block w-full h-auto"
                          />
                          <div className="px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-[11px] text-plum/70">
                            Hover preview — click the link to open full size
                          </div>
                        </motion.div>
                      </div>
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
            <a href={GOOGLE_REVIEW_LINK} target="_blank" rel="noreferrer">
              Submit Your Review on Google
            </a>
          </Button>

          <a
            href={GOOGLE_REVIEW_LINK}
            target="_blank"
            rel="noreferrer"
            className="text-xs sm:text-sm text-plum hover:text-gold"
          >
            Read more on Google
          </a>
        </div>
      </div>
    </section>
  );
}
