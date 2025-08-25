import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Sparkles, Truck, Building, Leaf, CalendarClock, Bell } from 'lucide-react';

const services = [
  {
    slug: 'residential-cleaning',
    icon: Home,
    title: "Residential Cleaning",
    description: "Keep your home spotless and comfortable for your family.",
    price: 99
  },
  {
    slug: 'deep-clean',
    icon: Sparkles,
    title: "Deep Cleans",
    description: "Thorough cleaning that reaches every corner and surface.",
    price: 149
  },
  {
    slug: 'move-in-move-out',
    icon: Truck,
    title: "Move-In/Move-Out",
    description: "Complete cleaning for transitions, ensuring a move-ready space.",
    price: 199
  },
  {
    slug: 'office-cleaning',
    icon: Building,
    title: "Office Cleaning",
    description: "Maintain a clean and productive work environment.",
    price: 129
  }
];

const perks = [
  { icon: Leaf, text: 'Eco-Friendly Products' },
  { icon: CalendarClock, text: 'Recurring Services' },
  { icon: Bell, text: 'Emergency Availability' }
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
              <h2 className="text-4xl md:text-5xl font-bold text-plum mb-4">Our Services</h2>
              <p className="text-lg text-plum/80 max-w-2xl mx-auto">
                Professional cleaning solutions tailored to your needs.
              </p>
            </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex"
            >
              <Card className="service-card bg-white/90 border-gold/20 w-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <service.icon className="w-8 h-8 text-gold" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-plum">{service.title}</CardTitle>
                   <p className="text-plum/60 font-medium">From ${service.price}</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-plum/80 text-center text-sm">{service.description}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                    <Link to={`/book?service=${service.slug}`}>Book Now</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
        
         <motion.div 
            className="text-center mt-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
         >
            <div className="inline-flex flex-col md:flex-row items-center gap-4 md:gap-8 rounded-full bg-white p-4 shadow-sm">
                {perks.map((perk, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <perk.icon className="w-5 h-5 text-gold" />
                        <span className="font-medium text-plum/90 text-sm">{perk.text}</span>
                    </div>
                ))}
            </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Services;