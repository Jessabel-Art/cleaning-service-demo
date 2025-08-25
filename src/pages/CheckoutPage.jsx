import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { CreditCard, Lock, Calendar, Sparkles, ShieldCheck } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [paymentOption, setPaymentOption] = useState('full');

  useEffect(() => {
    const details = localStorage.getItem('bookingDetails');
    if (details) {
      setBookingDetails(JSON.parse(details));
    } else {
      navigate('/book');
    }
  }, [navigate]);

  const handlePayment = (e) => {
    e.preventDefault();
    toast({
      title: 'Initiating Payment...',
      description: 'This is a demo. No real payment will be processed.',
    });
    
    setTimeout(() => {
      toast({
        title: "🚧 Payment Feature Not Implemented",
        description: "To enable payments, I need to integrate a provider like Stripe. Would you like me to set up Stripe for you?",
      });
      setTimeout(() => {
        const amountPaid = paymentOption === 'full' ? bookingDetails.estimate.total : bookingDetails.estimate.total * 0.3;
        
        localStorage.setItem('confirmationDetails', JSON.stringify({
          ...bookingDetails,
          paymentType: paymentOption === 'full' ? 'Full Payment' : '30% Deposit',
          amountPaid
        }));

        let pastBookings = JSON.parse(localStorage.getItem('pastBookings')) || [];
        const newBooking = {
            id: `BK${Math.floor(1000 + Math.random() * 9000)}`,
            service: bookingDetails.serviceName,
            date: bookingDetails.date,
            status: 'Upcoming',
            cost: bookingDetails.estimate.total,
            paid: amountPaid,
        };
        pastBookings.unshift(newBooking);
        localStorage.setItem('pastBookings', JSON.stringify(pastBookings));

        navigate('/confirmation');
      }, 2000);
    }, 1500);
  };

  if (!bookingDetails) return null;

  const depositAmount = (bookingDetails.estimate.total * 0.3).toFixed(2);
  const fullAmount = bookingDetails.estimate.total.toFixed(2);

  return (
    <div className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-plum mb-4">Secure Checkout</h1>
          <p className="text-lg text-plum/80">You're just one step away from a sparkling clean space!</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-plum/80 flex items-center"><Sparkles className="h-4 w-4 mr-2"/> Service</span>
                  <span className="font-semibold text-plum">{bookingDetails.serviceName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-plum/80 flex items-center"><Calendar className="h-4 w-4 mr-2"/> Date</span>
                  <span className="font-semibold text-plum">{bookingDetails.date}</span>
                </div>
                 <div className="border-t border-gold/30 my-2"></div>
                <div className="flex items-center justify-between text-lg">
                  <span className="font-bold text-plum">Total Amount</span>
                  <span className="font-bold text-gold">${fullAmount}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Payment Options</CardTitle>
              </CardHeader>
              <CardContent>
                 <RadioGroup value={paymentOption} onValueChange={setPaymentOption} className="space-y-4">
                    <div>
                      <RadioGroupItem value="full" id="full" className="peer sr-only" />
                      <Label htmlFor="full" className="w-full p-4 border-2 rounded-lg text-left transition-all block cursor-pointer peer-data-[state=checked]:border-gold peer-data-[state=checked]:bg-gold/10 hover:border-gold/50">
                        <p className="font-bold text-plum">Pay in Full</p>
                        <p className="text-plum/80">Pay the total amount of <span className="font-semibold text-gold">${fullAmount}</span> now.</p>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="deposit" id="deposit" className="peer sr-only" />
                      <Label htmlFor="deposit" className="w-full p-4 border-2 rounded-lg text-left transition-all block cursor-pointer peer-data-[state=checked]:border-gold peer-data-[state=checked]:bg-gold/10 hover:border-gold/50">
                        <p className="font-bold text-plum">Pay 30% Deposit</p>
                        <p className="text-plum/80">Secure your booking with a deposit of <span className="font-semibold text-gold">${depositAmount}</span>.</p>
                      </Label>
                    </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-green-600"/> All transactions are secure and encrypted.</CardDescription>
              </CardHeader>
              <form onSubmit={handlePayment}>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <div className="relative">
                       <Input id="cardNumber" required className="pl-10" placeholder="0000 0000 0000 0000" />
                       <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input id="expiryDate" required placeholder="MM/YY" />
                    </div>
                     <div>
                      <Label htmlFor="cvc">CVC</Label>
                       <div className="relative">
                        <Input id="cvc" required placeholder="123" />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                       </div>
                    </div>
                  </div>
                   <div>
                    <Label htmlFor="cardName">Name on Card</Label>
                    <Input id="cardName" required placeholder="John Doe" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" size="lg" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                    {paymentOption === 'full' ? `Pay $${fullAmount}` : `Pay Deposit $${depositAmount}`}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;