import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Clock, ShieldCheck, Star } from 'lucide-react';

const About = () => {
  const whyChooseUs = [
    {
      icon: Leaf,
      title: "Eco-Friendly Products",
      text: "We use pet-safe, environmentally friendly products."
    },
    {
      icon: Clock,
      title: "Flexible Scheduling",
      text: "We work around your schedule for ultimate convenience."
    },
    {
      icon: ShieldCheck,
      title: "Licensed & Insured",
      text: "Full protection and peace of mind for your property."
    },
    {
      icon: Star,
      title: "Satisfaction Guaranteed",
      text: "If you're not happy, we'll come back and make it right."
    }
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <img  
              className="rounded-lg shadow-lg w-full aspect-[4/3] object-cover" 
              alt="Friendly owner of Sanchez Services"
              src="https://images.unsplash.com/photo-1554151228-14d9def656e4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-plum mb-4">A Higher Standard of Clean</h2>
            <p className="text-lg font-semibold text-plum/80 mb-6">
              Family-owned, detail-driven cleaning you can trust.
            </p>
            <p className="text-plum/80 mb-6">
              At Sanchez Services, we believe cleaning is more than just a task—it’s about creating a fresh, welcoming space where you can truly relax. With over 10 years of experience, we’ve earned our reputation for reliability, quality, and genuine care.
            </p>
            
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
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;