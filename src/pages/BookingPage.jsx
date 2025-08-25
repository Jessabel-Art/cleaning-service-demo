import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/components/ui/use-toast';
import { Home, Sparkles, Truck, Building, Clock, ChevronRight, DollarSign, Tag, Info } from 'lucide-react';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const services = [
  { id: 'residential-cleaning', name: 'Residential Cleaning', icon: Home },
  { id: 'deep-clean', name: 'Deep Clean', icon: Sparkles },
  { id: 'move-in-move-out', name: 'Move-In/Move-Out', icon: Truck },
  { id: 'office-cleaning', name: 'Office Cleaning', icon: Building },
];

const addons = [
  { id: 'fridge', name: 'Inside Fridge', price: 20 },
  { id: 'oven', name: 'Inside Oven', price: 20 },
  { id: 'windows', name: 'Interior Windows', price: 30 },
  { id: 'baseboards', name: 'Baseboards', price: 25 },
  { id: 'laundry', name: 'Laundry Fold', price: 15 },
  { id: 'garage', name: 'Garage Sweep', price: 20 },
  { id: 'carpet', name: 'Carpet Shampoo', price: 40 },
];

const frequencies = [
    { id: 'one-time', name: 'One-time', discount: 0 },
    { id: 'weekly', name: 'Weekly', discount: 0.15 },
    { id: 'biweekly', name: 'Biweekly', discount: 0.10 },
    { id: 'monthly', name: 'Monthly', discount: 0.05 },
];


const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    service: searchParams.get('service') || 'residential-cleaning',
    propertyType: 'house',
    sqft: 1500,
    bedrooms: 2,
    bathrooms: 1,
    sizeMode: 'bed-bath',
    condition: 'standard',
    pets: 'no',
    addons: [],
    frequency: 'one-time',
    date: null,
    time: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    zip: '',
    notes: '',
    promoCode: '',
  });

  const [estimate, setEstimate] = useState({
      base: 0,
      sizeCost: 0,
      conditionCost: 0,
      petsCost: 0,
      addonsCost: 0,
      subtotal: 0,
      discount: 0,
      total: 0,
      duration: 0,
  });

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddonToggle = (addonId) => {
      const newAddons = form.addons.includes(addonId)
          ? form.addons.filter(id => id !== addonId)
          : [...form.addons, addonId];
      handleFormChange('addons', newAddons);
  };
  
  const calculateEstimate = useCallback(() => {
    let base = 0, sizeCost = 0, conditionMultiplier = 1, petsCost = 0, addonsCost = 0, frequencyDiscount = 0, duration = 0;

    if (form.service === 'office-cleaning') {
        base = 0; 
        sizeCost = form.sqft * 0.12;
        duration = form.sqft / 500;
    } else {
        base = 80;
        sizeCost = (form.bedrooms * 20) + (form.bathrooms * 25);
        duration = (form.bedrooms * 0.5) + (form.bathrooms * 0.5) + 1;
    }
    
    if (form.service === 'deep-clean') { base *= 1.5; duration *= 1.5; }
    if (form.service === 'move-in-move-out') { base *= 1.8; duration *= 1.8; }

    if (form.condition === 'light') conditionMultiplier = 0.9;
    if (form.condition === 'heavy') { conditionMultiplier = 1.25; duration *= 1.2; }
    
    if (form.pets === 'yes') { petsCost = 15; duration += 0.25; }
    
    form.addons.forEach(addonId => {
        const addon = addons.find(a => a.id === addonId);
        if (addon) { addonsCost += addon.price; duration += 0.5; }
    });

    const subtotalBeforeCondition = base + sizeCost + petsCost + addonsCost;
    const conditionAdjustedTotal = subtotalBeforeCondition * conditionMultiplier;
    
    const freq = frequencies.find(f => f.id === form.frequency);
    if (freq && (form.service === 'residential-cleaning' || form.service === 'deep-clean')) {
        frequencyDiscount = conditionAdjustedTotal * freq.discount;
    }

    const total = conditionAdjustedTotal - frequencyDiscount;

    setEstimate({
        base,
        sizeCost,
        conditionCost: (conditionAdjustedTotal - subtotalBeforeCondition),
        petsCost,
        addonsCost,
        subtotal: conditionAdjustedTotal,
        discount: frequencyDiscount,
        total,
        duration: Math.round(duration * 2) / 2, // round to nearest 0.5
    });
  }, [form]);

  useEffect(() => {
    calculateEstimate();
  }, [calculateEstimate]);

  const handleApplyPromoCode = () => {
    if (form.promoCode.toUpperCase() === 'CLEAN10') {
      toast({ title: 'Promo Code Applied!', description: 'You got 10% off!' });
      // In a real app, you would adjust the estimate state.
    } else {
      toast({ title: 'Invalid Promo Code', variant: 'destructive' });
    }
  }
  
  const handleProceedToCheckout = () => {
    if (!form.date || !form.time || !form.name || !form.email || !form.phone || !form.address || !form.zip) {
        toast({
            variant: "destructive",
            title: "Incomplete Information",
            description: "Please fill out all required fields before proceeding.",
        });
        return;
    }
    
    const bookingDetails = {
        ...form,
        date: format(form.date, 'PPP'),
        estimate,
        serviceName: services.find(s => s.id === form.service)?.name,
    };
    
    localStorage.setItem('bookingDetails', JSON.stringify(bookingDetails));
    // Simulate auto-confirmation email
    console.log("Booking confirmation email would be sent with these details:", bookingDetails);
    navigate('/checkout');
  };

  return (
    <TooltipProvider>
    <div className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-plum mb-4">Book Your Cleaning Service</h1>
          <p className="text-lg text-plum/80">Get an instant estimate and schedule your appointment in minutes.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader><CardTitle>Step 1: Select Your Service</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={form.service} onValueChange={(v) => handleFormChange('service', v)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {services.map(service => (
                    <div key={service.id}>
                      <RadioGroupItem value={service.id} id={`service-${service.id}`} className="peer sr-only" />
                      <Label htmlFor={`service-${service.id}`} className="p-4 border-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all cursor-pointer peer-data-[state=checked]:border-gold peer-data-[state=checked]:bg-gold/10 hover:border-gold/50">
                        <service.icon className="w-8 h-8 text-plum" />
                        <span className="text-sm font-medium text-center text-plum">{service.name}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Step 2: Customize Your Cleaning</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                
                {form.service !== 'office-cleaning' ? (
                  <>
                    <div>
                        <Label>Property Type</Label>
                        <RadioGroup value={form.propertyType} onValueChange={(v) => handleFormChange('propertyType', v)} className="flex gap-4 mt-2">
                             <div className="flex items-center space-x-2"><RadioGroupItem value="house" id="house" /><Label htmlFor="house">House</Label></div>
                             <div className="flex items-center space-x-2"><RadioGroupItem value="apartment" id="apartment" /><Label htmlFor="apartment">Apartment</Label></div>
                        </RadioGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                        <Select value={String(form.bedrooms)} onValueChange={(v) => handleFormChange('bedrooms', Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{[...Array(9).keys()].map(i => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                        <Select value={String(form.bathrooms)} onValueChange={(v) => handleFormChange('bathrooms', Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{[...Array(7).keys()].map(i => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div><Label htmlFor="sqft">Square Feet</Label><Input id="sqft" type="number" value={form.sqft} onChange={(e) => handleFormChange('sqft', Number(e.target.value))} /></div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <Label>Condition Level</Label>
                       <RadioGroup value={form.condition} onValueChange={(v) => handleFormChange('condition', v)} className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="light" id="light" /><Label htmlFor="light">Light</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="standard" id="standard" /><Label htmlFor="standard">Standard</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="heavy" id="heavy" /><Label htmlFor="heavy">Heavy</Label></div>
                      </RadioGroup>
                  </div>
                   <div>
                      <Label>Pets on Site?</Label>
                       <RadioGroup value={form.pets} onValueChange={(v) => handleFormChange('pets', v)} className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="pet-no" /><Label htmlFor="pet-no">No</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="pet-yes" /><Label htmlFor="pet-yes">Yes</Label></div>
                      </RadioGroup>
                  </div>
                </div>

                 <div>
                    <Label>Add-ons</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                        {addons.map(addon => (
                            <div key={addon.id} className="flex items-center space-x-2">
                                <Checkbox id={addon.id} checked={form.addons.includes(addon.id)} onCheckedChange={() => handleAddonToggle(addon.id)} />
                                <Label htmlFor={addon.id} className="cursor-pointer">{addon.name}</Label>
                            </div>
                        ))}
                    </div>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Step 3: Schedule Date & Time</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <Calendar mode="single" selected={form.date} onSelect={(d) => handleFormChange('date', d)} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} className="rounded-md border"/>
                    <div>
                        <Tooltip><TooltipTrigger className="w-full text-left"><Label>Available Times</Label></TooltipTrigger><TooltipContent><p>Select a time that works best for you.</p></TooltipContent></Tooltip>
                        <p className="text-sm text-plum/70 mb-2">On {form.date ? format(form.date, 'PPP') : 'your selected date'}</p>
                        <RadioGroup value={form.time} onValueChange={(v) => handleFormChange('time', v)} className="grid grid-cols-2 gap-2">
                            {['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'].map(time => (
                                <div key={time}><RadioGroupItem value={time} id={time} className="peer sr-only" /><Label htmlFor={time} className="block p-3 border-2 rounded-lg text-center cursor-pointer peer-data-[state=checked]:border-gold peer-data-[state=checked]:bg-gold/10 hover:border-gold/50">{time}</Label></div>
                            ))}
                        </RadioGroup>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Step 4: Contact & Access Details</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><Label htmlFor="name">Full Name</Label><Input id="name" value={form.name} onChange={e => handleFormChange('name', e.target.value)} required /></div>
                         <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={e => handleFormChange('email', e.target.value)} required /></div>
                    </div>
                    <div><Label htmlFor="address">Full Address</Label><Input id="address" value={form.address} onChange={e => handleFormChange('address', e.target.value)} required /></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} required /></div>
                         <div><Label htmlFor="zip">ZIP Code</Label><Input id="zip" value={form.zip} onChange={e => handleFormChange('zip', e.target.value)} required /></div>
                    </div>
                    <div><Label>Service Frequency</Label>
                      <Select value={form.frequency} onValueChange={(v) => handleFormChange('frequency', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{frequencies.map(freq => <SelectItem key={freq.id} value={freq.id}>{freq.name} {freq.discount > 0 && `(${freq.discount * 100}% off)`}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label htmlFor="notes">Access Notes (gate codes, parking, etc.)</Label><Textarea id="notes" value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} /></div>
                </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1 sticky top-24">
             <Card className="bg-light-pink/50">
                <CardHeader><CardTitle className="text-plum">Your Estimate</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    {Object.entries(estimate).map(([key, value]) => {
                        const labels = { base: 'Base Service', sizeCost: 'Size', petsCost: 'Pet Fee', addonsCost: 'Add-ons', conditionCost: 'Condition' };
                        if (value > 0 && labels[key]) {
                            return <div key={key} className="flex justify-between text-sm"><span className="text-plum/80">{labels[key]}</span><span>${value.toFixed(2)}</span></div>
                        }
                        return null;
                    })}
                    <div className="border-t border-gold/30 my-2 pt-2">
                        {estimate.discount > 0 && <div className="flex justify-between text-sm font-semibold text-green-600"><span className="flex items-center"><Tag className="h-4 w-4 mr-1"/>Frequency Discount</span><span>-${estimate.discount.toFixed(2)}</span></div>}
                        <div className="flex justify-between font-bold text-plum mt-2"><span className="flex items-center text-lg"><Clock className="h-5 w-5 mr-2 text-gold"/>Est. Duration</span><span>~{estimate.duration} hours</span></div>
                        <div className="flex justify-between text-2xl font-bold text-plum mt-2"><span>Total</span><span>${estimate.total.toFixed(2)}</span></div>
                    </div>
                    <div className="text-xs text-plum/70 text-center pt-2 flex items-start gap-1"><Info className="h-4 w-4 flex-shrink-0 mt-0.5" /><span>Final price may adjust on site after walkthrough.</span></div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input type="text" placeholder="Promo Code" value={form.promoCode} onChange={e => handleFormChange('promoCode', e.target.value)} />
                    <Button type="button" variant="outline" onClick={handleApplyPromoCode} className="border-gold text-gold hover:bg-gold/10 hover:text-gold">Apply</Button>
                  </div>
                  <Button onClick={handleProceedToCheckout} size="lg" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                      Proceed to Checkout <ChevronRight className="h-5 w-5 ml-2" />
                  </Button>
                </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default BookingPage;