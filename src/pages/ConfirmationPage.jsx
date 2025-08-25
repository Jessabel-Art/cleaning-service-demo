import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Sparkles, Home, DollarSign } from 'lucide-react';

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const confirmationDetails = localStorage.getItem('confirmationDetails');
    if (confirmationDetails) {
      setDetails(JSON.parse(confirmationDetails));
      localStorage.removeItem('bookingDetails');
      // Do not remove confirmation details so user can refresh
    } else {
      // Maybe some old booking is there, but checkout not completed
      navigate('/');
    }
  }, [navigate]);

  if (!details) return null;

  return (
    <div className="py-12 md:py-20 px-4 bg-white flex items-center justify-center min-h-[70vh]">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="text-center shadow-lg">
          <CardHeader className="pt-8">
            <CheckCircle className="mx-auto h-20 w-20 text-green-500" />
            <CardTitle className="text-3xl md:text-4xl font-bold text-plum mt-4">Booking Confirmed!</CardTitle>
            <p className="text-plum/80 text-lg">Thank you! Your cleaning service is scheduled.</p>
          </CardHeader>
          <CardContent className="space-y-6 text-left p-8">
            <h3 className="text-xl font-semibold text-plum border-b border-gold/50 pb-2 mb-4">Your Booking Details:</h3>
            <div className="space-y-3 text-plum/90">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center"><Sparkles className="h-5 w-5 mr-2 text-gold"/>Service:</span>
                <span className="font-semibold">{details.serviceName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center"><Calendar className="h-5 w-5 mr-2 text-gold"/>Date:</span>
                <span className="font-semibold">{details.date} at {details.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center"><DollarSign className="h-5 w-5 mr-2 text-gold"/>Total:</span>
                <span className="font-semibold">${details.estimate.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center"><DollarSign className="h-5 w-5 mr-2 text-gold"/>Amount Paid:</span>
                <span className="font-semibold">${details.amountPaid.toFixed(2)} ({details.paymentType})</span>
              </div>
            </div>
            <p className="text-center text-sm text-plum/70 pt-4">
              A confirmation email has been sent to you. You can manage your booking from your client portal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                <Link to="/portal">Go to Client Portal</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full border-gold text-gold hover:bg-gold/10 hover:text-gold rounded-full">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Homepage
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ConfirmationPage;