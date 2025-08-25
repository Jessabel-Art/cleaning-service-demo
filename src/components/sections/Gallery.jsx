import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Star } from 'lucide-react';

const beforeAfterImages = [
  {
    before: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop&q=80",
    after: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&q=80",
    title: "Kitchen Deep Clean – Downtown",
    testimonial: "Absolutely transformed my kitchen! It's never been this clean."
  },
  {
    before: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop&q=80",
    after: "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&h=600&fit=crop&q=80",
    title: "Living Room Refresh – Hillcrest",
    testimonial: "They brought my living room back to life. So impressed!"
  },
  {
    before: "https://images.unsplash.com/photo-1556912173-35f75a845949?w=800&h=600&fit=crop&q=80",
    after: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&h=600&fit=crop&q=80",
    title: "Sparkling Clean Bathroom - Northbrook",
    testimonial: "The attention to detail in the bathroom was incredible."
  }
];

const Gallery = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-plum mb-4">Before & After</h2>
          <p className="text-lg text-plum/80 max-w-3xl mx-auto">
            See the difference a Sanchez Services clean can make. Our results speak for themselves.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Carousel className="w-full" opts={{ loop: true }}>
            <CarouselContent>
              {beforeAfterImages.map((item, index) => (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <Card className="bg-white rounded-lg shadow-lg overflow-hidden">
                      <CardContent className="p-4 md:p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="relative">
                            <img src={item.before} alt={`Before cleaning - ${item.title}`} className="w-full h-64 md:h-96 object-cover rounded-md" />
                            <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                              Before
                            </div>
                          </div>
                          <div className="relative">
                            <img src={item.after} alt={`After cleaning - ${item.title}`} className="w-full h-64 md:h-96 object-cover rounded-md" />
                            <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-md">
                              After
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 text-center">
                            <h3 className="text-xl font-semibold text-plum">{item.title}</h3>
                            <blockquote className="text-plum/80 italic mt-2">"{item.testimonial}"</blockquote>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </motion.div>
      </div>
    </section>
  );
};

export default Gallery;