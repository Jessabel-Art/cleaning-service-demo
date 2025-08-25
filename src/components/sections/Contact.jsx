import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Mail, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: '',
    recurring: 'no',
    preferredDate: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleRadioChange = (value) => {
    setFormData({ ...formData, recurring: value });
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "Estimate Request Sent! 🎉",
      description: "We'll be in touch within 24 hours.",
    });
    setIsSubmitted(true);
  };

  if(isSubmitted) {
    return (
        <section id="contact" className="py-20 px-4">
             <div className="max-w-2xl mx-auto text-center">
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                     <Card className="p-8">
                        <h2 className="text-3xl font-bold text-plum mb-4">Thank You!</h2>
                        <p className="text-lg text-plum/80">Your request has been sent. We'll contact you within 24 hours to finalize your custom estimate.</p>
                     </Card>
                </motion.div>
             </div>
        </section>
    )
  }


  return (
    <section id="contact" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-plum mb-4">Request a Custom Estimate</h2>
          <p className="text-lg text-plum/80 max-w-2xl mx-auto">
            Have a unique cleaning need or a commercial property? Let's talk.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
           <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card className="contact-form h-full">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="name">Name</Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} required /></div>
                    <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required /></div>
                     <div><Label htmlFor="preferredDate">Preferred Date</Label><Input id="preferredDate" name="preferredDate" type="date" value={formData.preferredDate} onChange={handleInputChange} /></div>
                  </div>
                  
                  <div>
                    <Label>Is this for recurring service?</Label>
                    <RadioGroup value={formData.recurring} onValueChange={handleRadioChange} className="flex gap-4 mt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="no" /><Label htmlFor="no">No, just one-time</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="yes" /><Label htmlFor="yes">Yes, recurring</Label></div>
                    </RadioGroup>
                  </div>

                  <div><Label htmlFor="message">Tell us about your needs</Label><Textarea id="message" name="message" value={formData.message} onChange={handleInputChange} rows={4} required/></div>

                  <Button type="submit" size="lg" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                    Send Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6 bg-white p-8 rounded-lg shadow-sm h-full">
              <h3 className="text-2xl font-bold text-plum mb-4">Contact Directly</h3>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h4 className="font-semibold text-plum">Call Us</h4>
                  <a href="tel:5551234567" className="text-gold hover:underline text-lg">(555) 123-4567</a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h4 className="font-semibold text-plum">Email Us</h4>
                  <a href="mailto:info@sanchezservices.com" className="text-gold hover:underline text-lg">info@sanchezservices.com</a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h4 className="font-semibold text-plum">Business Hours</h4>
                  <p className="text-plum/80">Mon–Fri: 8 AM – 6 PM</p>
                  <p className="text-plum/80">Sat: 9 AM – 4 PM</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;