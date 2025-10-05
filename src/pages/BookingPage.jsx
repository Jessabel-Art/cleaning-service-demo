// src/pages/BookingPage.jsx
import React from 'react';
import { motion } from 'framer-motion';

export default function BookingPage() {
  return (
    <div className="py-12 md:py-20 px-4 bg-[#FADADD]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-plum mb-4">
            Book Your Cleaning Service
          </h1>
          <p className="text-lg text-plum/80">
            Get an instant estimate and schedule your appointment in minutes.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-plum/15 bg-white p-6">
          <p className="text-plum">
            Booking form is loading… (This is a safe skeleton to confirm the route renders.)
          </p>
        </div>
      </div>
    </div>
  );
}
