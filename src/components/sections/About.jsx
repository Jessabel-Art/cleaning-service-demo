// src/components/sections/About.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Star, Heart } from 'lucide-react';

// ✅ Import mascot image directly
import mascotImg from '@/assets/mascot/mascot-standalone.png'; 

const About = () => {
  const whyChooseUs = [
    {
      icon: Leaf,
      title: "Eco-Friendly Products",
      text: "We favor pet-safe, low-odor cleaners and microfiber methods whenever possible."
    },
    {
      icon: Star,
      title: "Satisfaction Focused",
      text: "Clear communication, consistent results, and friendly service—every visit."
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 px-3 sm:px-4 bg-gradient-to-br from-rose-50 via-white to-rose-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 md:gap-16 items-center">
          {/* Mascot visual */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <img
              src={mascotImg}
              alt="Sanchez Services mascot"
              className="drop-shadow-md max-w-[460px] w-full h-auto"
              loading="eager"
            />
          </motion.div>

          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-plum mb-3 sm:mb-4">A Higher Standard of Clean</h2>
            <p className="text-base sm:text-lg font-semibold text-plum/80 mb-4 sm:mb-6">
              Small, local, and people-first—serving <span className="font-semibold">all of Rhode Island</span> and <span className="font-semibold">Massachusetts</span>.
            </p>

            <p className="text-sm sm:text-base text-plum/80 mb-4">
              Sanchez Services is a locally run cleaning business based in <strong>Providence, RI</strong>.
              We believe a clean home should feel calm and effortless. You’ll get the same friendly faces,
              consistent results, and clear communication—every visit.
            </p>

            {/* Mission */}
            <div className="rounded-lg sm:rounded-2xl border border-gold/20 bg-rose-50 p-4 sm:p-5 mb-5 sm:mb-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base text-plum font-semibold">Our Mission</h3>
                  <p className="text-xs sm:text-sm text-plum/80 mt-1">
                    We're working toward becoming a nonprofit organization that provides support for
                    low-income families and those facing mental-health challenges—using cleaning as a way
                    to bring relief, dignity, and a fresh start.
                  </p>
                </div>
              </div>
            </div>

            {/* Why choose us */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              {whyChooseUs.map((item, index) => (
                <div key={index} className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gold/10 rounded-full flex items-center justify-center">
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-plum">{item.title}</h4>
                    <p className="text-xs sm:text-sm text-plum/70">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
