// src/components/sections/ContactSection.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Phone, Mail, Clock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
    recurring: "no",
    preferredDate: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRadioChange = (value) => {
    setFormData({ ...formData, recurring: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "Estimate Request Sent! 🎉",
      description: "We'll be in touch within 24 hours.",
    });
    setIsSubmitted(true);
  };

  if (isSubmitted) {
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
              <p className="text-lg text-plum/80">
                Your request has been sent. We'll contact you within 24 hours to
                finalize your custom estimate.
              </p>
            </Card>
          </motion.div>
        </div>
      </section>
    );
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
          <h2 className="text-4xl md:text-5xl font-bold text-plum mb-4">
            Request a Custom Estimate
          </h2>
          <p className="text-lg text-plum/80 max-w-2xl mx-auto">
            Have a unique cleaning need or a commercial property? Let's talk.
          </p>
        </motion.div>
        {/* form + contact info columns */}
        {/* ...rest of your code unchanged */}
      </div>
    </section>
  );
};

export default Contact;
