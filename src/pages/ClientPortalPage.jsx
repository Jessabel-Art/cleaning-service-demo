// src/pages/ClientPortalPage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, Repeat, XCircle, DollarSign, User, CreditCard, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ClientPortalPage = () => {
  const { toast } = useToast();

  // login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // data state
  const [bookings, setBookings] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [address, setAddress] = useState(null);

  const [activeTab, setActiveTab] = useState('login');

  // local form state for account tab
  const [pmForm, setPmForm] = useState({
    cardName: '',
    cardNumber: '',
    exp: '',
    cvc: '',
  });

  const [addrForm, setAddrForm] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  useEffect(() => {
    const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedInStatus);

    const storedPM = JSON.parse(localStorage.getItem('paymentMethod') || 'null');
    const storedAddr = JSON.parse(localStorage.getItem('address') || 'null');
    if (storedPM) setPaymentMethod(storedPM);
    if (storedAddr) setAddress(storedAddr);

    if (loggedInStatus) {
      const storedBookings = JSON.parse(localStorage.getItem('pastBookings')) || [];
      setBookings(storedBookings);
      setLoginEmail(localStorage.getItem('userEmail') || '');
    }
  }, []);

  // ---------- Demo data seeding ----------
  const seedDemoData = () => {
    const demo = [
      { id: 'A-10294', service: 'Residential Cleaning', date: '2025-09-18 10:00 AM', cost: 139.0, paid: 50.0, status: 'Upcoming' },
      { id: 'A-10212', service: 'Deep Clean',            date: '2025-08-22 2:00 PM',   cost: 189.0, paid: 189.0, status: 'Completed' },
      { id: 'A-10177', service: 'Move-Out Clean',        date: '2025-07-10 9:30 AM',  cost: 249.0, paid: 249.0, status: 'Completed' },
    ];
    localStorage.setItem('pastBookings', JSON.stringify(demo));
    setBookings(demo);
  };

  const handleAction = (action) => {
    toast({
      title: '🚧 Not live yet',
      description: `“${action}” will be wired up to a backend (Supabase auth + DB) when you’re ready.`,
    });
  };

  // ---------- Login ----------
  const handleLogin = (e) => {
    e?.preventDefault?.();
    toast({ title: 'Logging In...', description: 'This is a demo login.' });
    setTimeout(() => {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', loginEmail || 'demo@sanchezservices.com');
      setIsLoggedIn(true);

      const existing = JSON.parse(localStorage.getItem('pastBookings') || '[]');
      if (!existing || existing.length === 0) {
        seedDemoData();
      } else {
        setBookings(existing);
      }
      toast({ title: 'Login Successful!' });
    }, 700);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    toast({ title: 'Logged Out Successfully' });
    setActiveTab('login');
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    handleAction('Sign Up');
  };

  const useDemoLogin = () => {
    setLoginEmail('demo@sanchezservices.com');
    setLoginPassword('demo123');
    handleLogin();
  };

  // ---------- Helpers ----------
  const maskCard = (num = '') => {
    const digits = num.replace(/\D/g, '');
    if (digits.length < 4) return '•••• •••• •••• ••••';
    const last4 = digits.slice(-4);
    return `•••• •••• •••• ${last4}`;
  };

  const detectBrand = (num = '') => {
    const n = num.replace(/\D/g, '');
    if (/^4/.test(n)) return 'Visa';
    if (/^5[1-5]/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    if (/^6(?:011|5)/.test(n)) return 'Discover';
    return 'Card';
    };

  // ---------- Payment Method actions ----------
  const savePaymentMethod = (e) => {
    e.preventDefault();
    const cleanNumber = pmForm.cardNumber.replace(/\s+/g, '');

    if (cleanNumber.length < 12 || !/^\d+$/.test(cleanNumber)) {
      toast({ title: 'Invalid Card Number', description: 'Please enter a valid card number.', variant: 'destructive' });
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(pmForm.exp)) {
      toast({ title: 'Invalid Expiry', description: 'Use MM/YY format.', variant: 'destructive' });
      return;
    }
    if (!/^\d{3,4}$/.test(pmForm.cvc)) {
      toast({ title: 'Invalid CVC', description: 'Enter 3–4 digits.', variant: 'destructive' });
      return;
    }

    const saved = {
      cardName: pmForm.cardName.trim(),
      cardNumber: cleanNumber,
      exp: pmForm.exp,
      brand: detectBrand(pmForm.cardNumber),
      last4: cleanNumber.slice(-4),
    };
    localStorage.setItem('paymentMethod', JSON.stringify(saved));
    setPaymentMethod(saved);
    toast({ title: 'Payment Method Saved' });
  };

  const clearPaymentMethod = () => {
    localStorage.removeItem('paymentMethod');
    setPaymentMethod(null);
    setPmForm({ cardName: '', cardNumber: '', exp: '', cvc: '' });
    toast({ title: 'Payment Method Removed' });
  };

  // ---------- Address actions ----------
  const saveAddress = (e) => {
    e.preventDefault();
    const saved = {
      street: addrForm.street.trim(),
      city: addrForm.city.trim(),
      state: addrForm.state.trim(),
      zip: addrForm.zip.trim(),
    };
    if (!saved.street || !saved.city || !saved.state || !saved.zip) {
      toast({ title: 'Missing Fields', description: 'Please complete all address fields.', variant: 'destructive' });
      return;
    }
    localStorage.setItem('address', JSON.stringify(saved));
    setAddress(saved);
    toast({ title: 'Address Saved' });
  };

  const clearAddress = () => {
    localStorage.removeItem('address');
    setAddress(null);
    setAddrForm({ street: '', city: '', state: '', zip: '' });
    toast({ title: 'Address Removed' });
  };

  // ---------- Views ----------
  const upcomingBookings = bookings.filter((b) => b.status === 'Upcoming');
  const pastBookings = bookings.filter((b) => b.status !== 'Upcoming');

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="py-12 md:py-20 px-4 bg-white flex items-center justify-center">
        <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-plum/5 p-1">
              <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">Log In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="shadow-md border-plum/10">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold text-plum">Client Login</CardTitle>
                  <CardDescription>Access your bookings and account details.</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                    </div>
                    <Button type="button" variant="outline" className="w-full border-gold text-gold hover:bg-gold/10" onClick={useDemoLogin}>
                      Use Demo Account
                    </Button>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">Log In</Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="shadow-md border-plum/10">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold text-plum">Create Account</CardTitle>
                  <CardDescription>Join to easily manage your bookings.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSignUp}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="signup-name">Full Name</Label><Input id="signup-name" placeholder="John Doe" required /></div>
                    <div className="space-y-2"><Label htmlFor="signup-email">Email</Label><Input id="signup-email" type="email" placeholder="you@example.com" required /></div>
                    <div className="space-y-2"><Label htmlFor="signup-password">Password</Label><Input id="signup-password" type="password" placeholder="Create a password" required /></div>
                  </CardContent>
                  <CardFooter><Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">Create Account</Button></CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    );
  }

  // Logged-in portal
  return (
    <div className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl md:text-5xl font-bold text-plum mb-4">Client Portal</h1>
          <p className="text-lg text-plum/80">Welcome{loginEmail ? `, ${loginEmail}` : ''}! Manage your bookings and account.</p>
        </motion.div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-full bg-plum/5 p-1">
            <TabsTrigger value="upcoming" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">Past Bookings</TabsTrigger>
            <TabsTrigger value="account" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <Card className="shadow-sm border-plum/10">
              <CardHeader><CardTitle>Upcoming Bookings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {upcomingBookings.length ? upcomingBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} onAction={handleAction} />
                )) : <p className="text-plum/70">No upcoming bookings.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <Card className="shadow-sm border-plum/10">
              <CardHeader><CardTitle>Past Bookings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {pastBookings.length ? pastBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} onAction={handleAction} />
                )) : <p className="text-plum/70">No past bookings.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCOUNT TAB */}
          <TabsContent value="account" className="mt-6 space-y-6">
            {/* Signed-in summary */}
            <Card className="shadow-sm border-plum/10">
              <CardHeader><CardTitle>Account Overview</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-plum/5 p-4">
                  <p className="text-plum/80">Signed in as</p>
                  <p className="font-semibold text-plum">{loginEmail || 'demo@sanchezservices.com'}</p>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-plum/5 p-4">
                  <p className="text-plum/80">Quick Actions</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-plum text-plum hover:bg-plum/10" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Go to Top</Button>
                    <Button size="sm" variant="ghost" onClick={handleLogout}>Log Out</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="shadow-sm border-plum/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gold" />
                  <CardTitle>Payment Method</CardTitle>
                </div>
                {paymentMethod && (
                  <Button variant="outline" size="sm" className="border-plum text-plum hover:bg-plum/10"
                    onClick={() => {
                      setPmForm({ cardName: paymentMethod.cardName || '', cardNumber: paymentMethod.cardNumber || '', exp: paymentMethod.exp || '', cvc: '' });
                    }}>
                    Update
                  </Button>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {paymentMethod ? (
                  <>
                    <div className="rounded-lg bg-plum/5 p-4">
                      <p className="text-plum/80">{paymentMethod.brand}</p>
                      <p className="font-semibold text-plum">{maskCard(paymentMethod.cardNumber)}</p>
                      <p className="text-sm text-plum/70">Exp: {paymentMethod.exp}</p>
                      {paymentMethod.cardName ? <p className="text-sm text-plum/70">Name: {paymentMethod.cardName}</p> : null}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" className="border-plum text-plum hover:bg-plum/10" onClick={() => {
                        setPmForm({ cardName: paymentMethod.cardName || '', cardNumber: paymentMethod.cardNumber || '', exp: paymentMethod.exp || '', cvc: '' });
                      }}>Edit</Button>
                      <Button variant="ghost" onClick={clearPaymentMethod}>Remove</Button>
                    </div>
                  </>
                ) : (
                  <p className="text-plum/70">No payment method on file. Add one below.</p>
                )}

                {/* Add / Update form */}
                <form onSubmit={savePaymentMethod} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="cardName">Name on Card</Label>
                    <Input id="cardName" value={pmForm.cardName} onChange={(e) => setPmForm({ ...pmForm, cardName: e.target.value })} placeholder="Jane Doe" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      value={pmForm.cardNumber}
                      onChange={(e) => setPmForm({ ...pmForm, cardNumber: e.target.value.replace(/[^\d\s]/g, '') })}
                      placeholder="4242 4242 4242 4242"
                    />
                  </div>
                  <div>
                    <Label htmlFor="exp">Exp (MM/YY)</Label>
                    <Input
                      id="exp"
                      value={pmForm.exp}
                      onChange={(e) => setPmForm({ ...pmForm, exp: e.target.value.toUpperCase() })}
                      placeholder="09/27"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      value={pmForm.cvc}
                      onChange={(e) => setPmForm({ ...pmForm, cvc: e.target.value.replace(/\D/g, '') })}
                      placeholder="123"
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-3">
                    <Button type="submit" className="bg-gold hover:bg-gold/90 text-white rounded-full">Save Payment Method</Button>
                    <Button type="button" variant="outline" className="border-plum text-plum hover:bg-plum/10"
                      onClick={() => setPmForm({ cardName: '', cardNumber: '', exp: '', cvc: '' })}>
                      Clear Form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="shadow-sm border-plum/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gold" />
                  <CardTitle>Service Address</CardTitle>
                </div>
                {address && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-plum text-plum hover:bg-plum/10"
                    onClick={() =>
                      setAddrForm({
                        street: address.street || '',
                        city: address.city || '',
                        state: address.state || '',
                        zip: address.zip || '',
                      })
                    }
                  >
                    Update
                  </Button>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {address ? (
                  <>
                    <div className="rounded-lg bg-plum/5 p-4">
                      <p className="font-semibold text-plum">{address.street}</p>
                      <p className="text-plum/80">
                        {address.city}, {address.state} {address.zip}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="border-plum text-plum hover:bg-plum/10"
                        onClick={() =>
                          setAddrForm({
                            street: address.street || '',
                            city: address.city || '',
                            state: address.state || '',
                            zip: address.zip || '',
                          })
                        }
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={clearAddress}>Remove</Button>
                    </div>
                  </>
                ) : (
                  <p className="text-plum/70">No address on file. Add one below.</p>
                )}

                {/* Add / Update form */}
                <form onSubmit={saveAddress} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={addrForm.street}
                      onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
                      placeholder="123 Main St, Unit 2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} placeholder="Springfield" />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={addrForm.state}
                      onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value.toUpperCase() })}
                      placeholder="CA"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP</Label>
                    <Input id="zip" value={addrForm.zip} onChange={(e) => setAddrForm({ ...addrForm, zip: e.target.value.replace(/\D/g, '') })} placeholder="12345" />
                  </div>
                  <div className="md:col-span-2 flex gap-3">
                    <Button type="submit" className="bg-gold hover:bg-gold/90 text-white rounded-full">Save Address</Button>
                    <Button type="button" variant="outline" className="border-plum text-plum hover:bg-plum/10"
                      onClick={() => setAddrForm({ street: '', city: '', state: '', zip: '' })}>
                      Clear Form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const BookingCard = ({ booking, onAction }) => (
  <Card className="bg-white border border-plum/10 shadow-sm">
    <CardHeader>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <CardTitle className="text-plum">{booking.service}</CardTitle>
          <CardDescription>ID: {booking.id}</CardDescription>
        </div>
        <span className={`mt-2 sm:mt-0 px-3 py-1 text-sm font-semibold rounded-full ${booking.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{booking.status}</span>
      </div>
    </CardHeader>
    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
      <InfoItem icon={Calendar} label="Date" value={booking.date} />
      <InfoItem icon={DollarSign} label="Total / Paid" value={`$${booking.cost.toFixed(2)} / $${booking.paid.toFixed(2)}`} />
      {booking.status === 'Upcoming' && (
        <div className="col-span-2 md:col-span-2 flex flex-col sm:flex-row gap-2 justify-end">
          {booking.paid < booking.cost && (
            <Button variant="outline" size="sm" onClick={() => onAction('Make Payment')} className="border-gold text-gold hover:bg-gold/10 hover:text-gold">
              <DollarSign className="h-4 w-4 mr-1" /> Pay Balance
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onAction('Reschedule')} className="border-plum text-plum hover:bg-plum/10 hover:text-plum">
            <Repeat className="h-4 w-4 mr-1" /> Reschedule
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onAction('Cancel')}>
            <XCircle className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center">
    <Icon className="h-5 w-5 mr-2 text-gold" />
    <div>
      <p className="text-xs text-plum/70">{label}</p>
      <p className="font-semibold text-plum text-sm">{value}</p>
    </div>
  </div>
);

export default ClientPortalPage;
