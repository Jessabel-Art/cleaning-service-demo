import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

// Load all meta.json files (eager so it's available synchronously)
const metaFiles = import.meta.glob('/src/assets/before-after/*/meta.json', {
  eager: true,
  import: 'default',
});

// Load all images and map path -> URL (works in dev and build)
const imageFiles = import.meta.glob('/src/assets/before-after/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  import: 'default',
});

function resolveImage(path) {
  return imageFiles[path];
}

const Gallery = () => {
  // Build slides from each job's meta.json
  const slides = Object.entries(metaFiles).flatMap(([metaPath, metaObj]) => {
    const baseDir = metaPath.replace(/\/meta\.json$/, '');

    const title = metaObj?.title || 'Project';
    const altTemplate = metaObj?.altTemplate || {
      before: '{{label}} before cleaning',
      after: '{{label}} after cleaning',
    };

    return (metaObj?.pairs || []).map((p) => {
      const beforePath = `${baseDir}/${p.before}`;
      const afterPath = `${baseDir}/${p.after}`;

      return {
        title: `${title}${p.label ? ` – ${p.label}` : ''}`,
        beforeSrc: resolveImage(beforePath),
        afterSrc: resolveImage(afterPath),
        beforeAlt: (altTemplate.before || '{{label}} before cleaning').replace('{{label}}', p.label || title),
        afterAlt: (altTemplate.after || '{{label}} after cleaning').replace('{{label}}', p.label || title),
      };
    });
  }).filter(s => s.beforeSrc && s.afterSrc); // guard against missing files

  return (
    <section className="py-12 sm:py-16 md:py-20 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-8 sm:mb-12 md:mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-plum mb-3 sm:mb-4">Before &amp; After</h2>
          <p className="text-sm sm:text-base md:text-lg text-plum/80 max-w-3xl mx-auto">
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
              {slides.map((item, index) => (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <Card className="bg-white rounded-lg shadow-lg overflow-hidden">
                      <CardContent className="p-3 sm:p-4 md:p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                          <div className="relative">
                            <img
                              src={item.beforeSrc}
                              alt={item.beforeAlt}
                              className="w-full h-40 sm:h-56 md:h-64 lg:h-96 object-cover rounded-md"
                              loading="lazy"
                            />
                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold shadow-md">
                              Before
                            </div>
                          </div>
                          <div className="relative">
                            <img
                              src={item.afterSrc}
                              alt={item.afterAlt}
                              className="w-full h-40 sm:h-56 md:h-64 lg:h-96 object-cover rounded-md"
                              loading="lazy"
                            />
                            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold shadow-md">
                              After
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-4 md:mt-6 text-center">
                          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-plum">{item.title}</h3>
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
