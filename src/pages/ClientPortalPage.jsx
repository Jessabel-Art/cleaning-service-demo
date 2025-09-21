// temporary — add at top of HomePage, ClientPortalPage, etc.
console.log('[route] HomePage mounted');

// src/pages/ClientPortalPage.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, Repeat, XCircle, DollarSign, MapPin, Mail, BadgeDollarSign, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { signInWithPhoneNumber } from "firebase/auth";
import { auth, setupRecaptcha } from "@/lib/firebase";

import { onAuthStateChanged } from "firebase/auth";
import {
  ensureProfile,
  getAddress,
  saveAddress as fbSaveAddress,
  deleteAddress as fbDeleteAddress,
  onUserBookings,
} from "@/lib/db";

// ---- Configure your offline payment methods here ----
const PAYMENT_INFO = {
  depositAmount: 50,
  cash: true, // accept cash at time of service
  cashApp: '$YOUR_CASHTAG', // <-- replace with your real Cash App $tag
  zelle: 'sanchezservices24@yahoo.com',
  notes: 'Please include your full name and booking ID in the payment note.'
};

const ClientPortalPage = () => {
  const { toast } = useToast();

  // login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // data state
  const [bookings, setBookings] = useState([]);
  const [address, setAddress] = useState(null);

  const [activeTab, setActiveTab] = useState('login');

  // address form state
  const [addrForm, setAddrForm] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  // phone login state
  const [phoneMode, setPhoneMode] = useState(false);   // toggles the phone UI
  const [phone, setPhone] = useState("");              // e.g., +14015551234
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsLoggedIn(false);
        setBookings([]);
        setAddress(null);
        setLoginEmail("");
        return;
      }

      // logged in
      setIsLoggedIn(true);
      const display = user.email || user.phoneNumber || "client";
      setLoginEmail(display);

      // Ensure a profile doc exists
      await ensureProfile(user.uid, {
        email: user.email || "",
        phone: user.phoneNumber || "",
        fullName: "",
      });

      // Load address (single-doc per user for now)
      const addr = await getAddress(user.uid);
      if (addr) setAddress(addr);

      // Subscribe to bookings
      const unsubBookings = onUserBookings(user.uid, (rows) => {
        // Map Firestore rows to your existing UI shape
        const mapped = rows.map((r) => ({
          id: r.id,
          service: r.serviceSlug || "Residential Cleaning",
          date: r.startAt ? new Date(r.startAt.toDate()).toLocaleString() : "TBD",
          cost: Number(r.cost || 0),
          paid: Number(r.paid || 0),
          status: (r.status || "requested").toLowerCase() === "requested" ? "Upcoming" : r.status,
        }));
        setBookings(mapped);
      });

      // Clean up bookings subscription when auth changes
      return () => unsubBookings && unsubBookings();
    });

    return () => unsubAuth();
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
      title: 'Heads up',
      description: `“${action}” will be wired to your database when ready.`,
    });
  };

  // ---------- Email/password login (placeholder wiring for now) ----------
  const handleLogin = (e) => {
    e?.preventDefault?.();
    // Replace this with Firebase email/password when ready.
    toast({ title: 'Logging In...', description: 'This is a placeholder email login.' });
    setTimeout(() => {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', loginEmail || 'client@sanchezservices.com');
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
    toast({
      title: 'Sign Up',
      description: 'Account creation will be wired to Firebase Auth next.',
    });
  };

  // ---------- Phone login handlers ----------
  const startPhoneLogin = async () => {
    if (!phone) {
      toast({ title: "Enter phone number", description: "Use E.164 format, e.g., +14015551234.", variant: "destructive" });
      return;
    }
    try {
      setOtpLoading(true);
      const verifier = setupRecaptcha("recaptcha-container");
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      window.confirmationResult = confirmation;
      setOtpSent(true);
      toast({ title: "Code sent", description: "Check your SMS for the verification code." });
    } catch (err) {
      console.error(err);
      toast({ title: "SMS failed", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const confirmOtp = async () => {
    if (!otp) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    try {
      setOtpLoading(true);
      const result = await window.confirmationResult.confirm(otp);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", result.user.phoneNumber || "phone-user");
      setIsLoggedIn(true);
      const existing = JSON.parse(localStorage.getItem("pastBookings") || "[]");
      existing?.length ? setBookings(existing) : seedDemoData();
      toast({ title: "Logged in via phone" });
    } catch (err) {
      console.error(err);
      toast({ title: "Invalid code", description: "Please try again.", variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  // ---------- Address actions ----------
  const saveAddress = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Please log in first", variant: "destructive" });
      return;
    }
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
    await fbSaveAddress(user.uid, saved);
    setAddress(saved);
    toast({ title: 'Address Saved' });
  };

  const clearAddress = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await fbDeleteAddress(user.uid);
    setAddress(null);
    setAddrForm({ street: '', city: '', state: '', zip: '' });
    toast({ title: 'Address Removed' });
  };


  // ---------- Views ----------
  const upcomingBookings = bookings.filter((b) => b.status === 'Upcoming');
  const pastBookings = bookings.filter((b) => b.status !== 'Upcoming');

  // helper: jump to payment section
  const scrollToPayments = () => {
    const el = document.getElementById('payment-instructions');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="py-12 md:py-20 px-4 bg-white flex items-center justify-center">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-plum/5 p-1">
              <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Log In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Sign Up
              </TabsTrigger>
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
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>

                    {/* Inline Phone Login */}
                    <div className="space-y-3">
                      {!phoneMode ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-gold text-gold hover:bg-gold/10"
                          onClick={() => setPhoneMode(true)}
                        >
                          Log in with Phone
                        </Button>
                      ) : (
                        <div className="rounded-xl border border-plum/15 p-4 space-y-3">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label htmlFor="phone">Phone Number</Label>
                              <Input
                                id="phone"
                                placeholder="+14015551234"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                              />
                            </div>
                            {otpSent && (
                              <div>
                                <Label htmlFor="otp">Verification Code</Label>
                                <Input
                                  id="otp"
                                  placeholder="123456"
                                  value={otp}
                                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {!otpSent ? (
                              <Button
                                type="button"
                                onClick={startPhoneLogin}
                                disabled={otpLoading}
                                className="bg-gold text-white hover:bg-gold/90"
                              >
                                {otpLoading ? 'Sending...' : 'Send Code'}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                onClick={confirmOtp}
                                disabled={otpLoading}
                                className="bg-gold text-white hover:bg-gold/90"
                              >
                                {otpLoading ? 'Verifying...' : 'Verify & Log In'}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setPhoneMode(false);
                                setOtpSent(false);
                                setPhone('');
                                setOtp('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                      Log In
                    </Button>
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
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input id="signup-name" placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="you@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" placeholder="Create a password" required />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                      Create Account
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Invisible reCAPTCHA container for phone login */}
          <div id="recaptcha-container"></div>
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
                  <BookingCard key={b.id} booking={b} onAction={handleAction} onViewPayments={scrollToPayments} />
                )) : <p className="text-plum/70">No upcoming bookings.</p>}
              </CardContent>
            </Card>

            {/* Payment Instructions visible on the same tab for convenience */}
            <PaymentInstructions />
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
                  <p className="font-semibold text-plum">{loginEmail || 'client@sanchezservices.com'}</p>
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

            {/* Service Address */}
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
                      placeholder="MA"
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

            {/* Payment Instructions also accessible on Account tab */}
            <PaymentInstructions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const PaymentInstructions = () => (
  <Card id="payment-instructions" className="mt-6 shadow-sm border-plum/10">
    <CardHeader className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <BadgeDollarSign className="h-5 w-5 text-gold" />
        <CardTitle>Payment Instructions</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="rounded-lg bg-plum/5 p-4">
        <p className="text-plum/80">
          A <strong>${PAYMENT_INFO.depositAmount} non-refundable deposit</strong> is required to confirm your appointment.
          Since we don’t accept payments on the website, please use one of the methods below and include your
          <strong> full name and booking ID</strong> in the payment note.
        </p>
      </div>

      {PAYMENT_INFO.cash && (
        <div className="rounded-xl border border-gold/20 bg-white p-4 flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-gold mt-0.5" />
          <div>
            <p className="text-plum font-medium">Cash</p>
            <p className="text-sm text-plum/70">Cash is accepted at time of service. Deposits can be sent via Cash App or Zelle.</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gold/20 bg-white p-4 flex items-start gap-3">
        <DollarSign className="w-5 h-5 text-gold mt-0.5" />
        <div>
          <p className="text-plum font-medium">Cash App</p>
          <p className="text-sm text-plum/70">
            Send to <span className="font-semibold">{PAYMENT_INFO.cashApp}</span> and include your name & booking ID.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gold/20 bg-white p-4 flex items-start gap-3">
        <Mail className="w-5 h-5 text-gold mt-0.5" />
        <div>
          <p className="text-plum font-medium">Zelle</p>
          <p className="text-sm text-plum/70">
            Send to <span className="font-semibold">{PAYMENT_INFO.zelle}</span> and include your name & booking ID.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-rose-50 border border-gold/20 p-3 text-sm text-plum/80">
        <Info className="inline-block w-4 h-4 mr-1 text-gold" />
        {PAYMENT_INFO.notes}
      </div>
    </CardContent>
  </Card>
);

const BookingCard = ({ booking, onAction, onViewPayments }) => {
  const depositDue = Math.max(PAYMENT_INFO.depositAmount - (booking.paid || 0), 0);
  const hasDeposit = depositDue === 0;

  return (
    <Card className="bg-white border border-plum/10 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="text-plum">{booking.service}</CardTitle>
            <CardDescription>ID: {booking.id}</CardDescription>
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${booking.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{booking.status}</span>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${hasDeposit ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {hasDeposit ? 'Deposit received' : `Deposit due: $${depositDue.toFixed(2)}`}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
        <InfoItem icon={Calendar} label="Date" value={booking.date} />
        <InfoItem icon={DollarSign} label="Total / Paid" value={`$${booking.cost.toFixed(2)} / $${booking.paid.toFixed(2)}`} />
        {booking.status === 'Upcoming' && (
          <div className="col-span-2 md:col-span-2 flex flex-col sm:flex-row gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onViewPayments} className="border-gold text-gold hover:bg-gold/10 hover:text-gold">
              <DollarSign className="h-4 w-4 mr-1" /> View Payment Instructions
            </Button>
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
};

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
