// src/pages/ClientPortalPage.jsx

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Firebase
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { auth, setupRecaptcha } from '@/lib/firebase';

// Firestore helpers
import {
  ensureProfile,
  getAddress,
  saveAddress as fbSaveAddress,
  deleteAddress as fbDeleteAddress,
  onUserBookings,
} from '@/lib/db';

// Split components
import BookingCard from '@/components/portal/BookingCard';
import PaymentInstructions from '@/components/portal/PaymentInstructions';
import AddressForm from '@/components/portal/AddressForm';

// ---- Offline payment text ----
const PAYMENT_INFO = {
  depositAmount: 50,
  cash: true,
  cashApp: '$YOUR_CASHTAG', // TODO: set your real Cash App $tag
  zelle: 'sanchezservices24@yahoo.com',
  notes: 'Please include your full name and booking ID in the payment note.',
};

// Simple Modal (edit for your preferred modal/dialog)
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
        <Button
          variant="ghost"
          className="absolute top-2 right-2 text-plum"
          onClick={onClose}
          aria-label="Close Modal"
        >
          &times;
        </Button>
        {children}
      </div>
    </div>
  );
};

const ClientPortalPage = () => {
  const { toast } = useToast();

  // Email login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Email signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Auth / data state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [address, setAddress] = useState(null);

  // Loading/Error
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tabs for unauthenticated view
  const [authTab, setAuthTab] = useState('login');

  // Address form
  const [addrForm, setAddrForm] = useState({ street: '', city: '', state: '', zip: '' });
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Phone login state
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // unsubscribe holder for bookings listener
  const bookingsUnsubRef = useRef(null);

  // ---- Auth listener ----
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up previous
      if (bookingsUnsubRef.current) {
        bookingsUnsubRef.current();
        bookingsUnsubRef.current = null;
      }

      if (!user) {
        setIsLoggedIn(false);
        setBookings([]);
        setAddress(null);
        setAuthTab('login');
        return;
      }

      setIsLoggedIn(true);
      setLoadingBookings(true);

      try {
        await ensureProfile(user.uid, {
          email: user.email || '',
          phone: user.phoneNumber || '',
          fullName: user.displayName || signupName || '',
        });
        const addr = await getAddress(user.uid);
        if (addr) setAddress(addr);

        bookingsUnsubRef.current = onUserBookings(user.uid, (rows) => {
          const mapped = rows.map((r) => ({
            id: r.id,
            service: r.serviceName || r.serviceSlug || 'Residential Cleaning',
            date: r.startAt ? new Date(r.startAt.toDate()).toLocaleString() : 'TBD',
            cost: Number(r.cost || 0),
            paid: Number(r.paid || 0),
            status: (r.status || 'requested').toLowerCase() === 'requested' ? 'Upcoming' : r.status,
          }));
          setBookings(mapped);
          setLoadingBookings(false);
        });
      } catch (err) {
        setErrorMsg(err?.message || String(err));
        setLoadingBookings(false);
      }
    });

    return () => {
      if (bookingsUnsubRef.current) bookingsUnsubRef.current();
      unsubAuth();
    };
    // Prevent stale closure (functions shouldn't change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Email/Password actions ----
  const handleLogin = async (e) => {
    e?.preventDefault?.();
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast({ title: 'Logged in' });
    } catch (err) {
      toast({ title: 'Login failed', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  const handleSignUp = async (e) => {
    e?.preventDefault?.();
    try {
      const cred = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      await ensureProfile(cred.user.uid, {
        email: signupEmail,
        phone: cred.user.phoneNumber || '',
        fullName: signupName || '',
      });
      toast({ title: 'Account created', description: 'You are now signed in.' });
    } catch (err) {
      toast({ title: 'Sign up failed', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    if (bookingsUnsubRef.current) {
      bookingsUnsubRef.current();
      bookingsUnsubRef.current = null;
    }
    await signOut(auth);
    toast({ title: 'Logged out' });
    setAuthTab('login');
  };

  // ---- Phone login handlers ----
  const startPhoneLogin = async () => {
    if (!phone) {
      toast({
        title: 'Enter phone number',
        description: 'Use E.164 format, e.g., +14015551234.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setOtpLoading(true);
      const verifier = setupRecaptcha('recaptcha-container');
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      window.confirmationResult = confirmation;
      setOtpSent(true);
      toast({ title: 'Code sent', description: 'Check your SMS for the verification code.' });
    } catch (err) {
      toast({ title: 'SMS failed', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setOtpLoading(false);
    }
  };

  const confirmOtp = async () => {
    if (!otp) {
      toast({ title: 'Enter the 6-digit code', variant: 'destructive' });
      return;
    }
    try {
      setOtpLoading(true);
      await window.confirmationResult.confirm(otp);
      toast({ title: 'Logged in via phone' });
    } catch (err) {
      toast({ title: 'Invalid code', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setOtpLoading(false);
    }
  };

  // ---- Address actions ----
  const saveAddress = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      toast({ title: 'Please log in first', variant: 'destructive' });
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

  const clearAddress = () => setAddrForm({ street: '', city: '', state: '', zip: '' });

  const actuallyRemoveAddress = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await fbDeleteAddress(user.uid);
    setAddress(null);
    clearAddress();
    toast({ title: 'Address Removed' });
    setShowRemoveModal(false);
  };

  // ---- Derived lists & helpers ----
  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status === 'Upcoming'),
    [bookings]
  );
  const pastBookings = useMemo(
    () => bookings.filter((b) => b.status !== 'Upcoming'),
    [bookings]
  );

  const scrollToPayments = () => {
    const el = document.getElementById('payment-instructions');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ---- Unauthenticated view ----
  if (!isLoggedIn) {
    return (
      <div className="py-12 md:py-20 px-4 bg-white flex items-center justify-center">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Tabs value={authTab} onValueChange={setAuthTab} className="w-full" >
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-plum/5 p-1">
              <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Log In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Sign Up
              </TabsTrigger>
            </TabsList>
            {/* LOGIN */}
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
                        aria-label="Email Address"
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
                        aria-label="Password"
                      />
                    </div>
                    {/* Phone Login inline */}
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
                                aria-label="Phone number"
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
                                  aria-label="One Time Password"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
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
            {/* SIGNUP */}
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
                      <Input
                        id="signup-name"
                        placeholder="John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                        aria-label="Full Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        aria-label="Signup Email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        aria-label="Signup Password"
                      />
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
          <div id="recaptcha-container" />
        </motion.div>
      </div>
    );
  }

  // ---- Authenticated view ----
  return (
    <div className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-plum mb-4">Client Portal</h1>
          <p className="text-lg text-plum/80">
            Welcome
            {auth.currentUser?.email
              ? `, ${auth.currentUser.email}`
              : auth.currentUser?.phoneNumber
              ? `, ${auth.currentUser.phoneNumber}`
              : ''}! Manage your bookings and account.
          </p>
        </motion.div>
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-full bg-plum/5 p-1">
            <TabsTrigger value="upcoming" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
              Past Bookings
            </TabsTrigger>
            <TabsTrigger value="account" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
              Account
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-6">
            <Card className="shadow-sm border-plum/10">
              <CardHeader><CardTitle>Upcoming Bookings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {loadingBookings ? (
                  <div className="text-center py-8">
                    <span className="animate-spin inline-block w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
                  </div>
                ) : upcomingBookings.length ? (
                  upcomingBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onAction={(a) => toast({ title: a })}
                      onViewPayments={scrollToPayments}
                      depositAmount={PAYMENT_INFO.depositAmount}
                    />
                  ))
                ) : (
                  <p className="text-plum/70">No upcoming bookings.</p>
                )}
              </CardContent>
            </Card>
            <PaymentInstructions paymentInfo={PAYMENT_INFO} />
          </TabsContent>
          <TabsContent value="past" className="mt-6">
            <Card className="shadow-sm border-plum/10">
              <CardHeader><CardTitle>Past Bookings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {loadingBookings ? (
                  <div className="text-center py-8">
                    <span className="animate-spin inline-block w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
                  </div>
                ) : pastBookings.length ? (
                  pastBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onAction={(a) => toast({ title: a })}
                      depositAmount={PAYMENT_INFO.depositAmount}
                    />
                  ))
                ) : (
                  <p className="text-plum/70">No past bookings.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="account" className="mt-6 space-y-6">
            {/* Signed-in summary */}
            <Card className="shadow-sm border-plum/10">
              <CardHeader><CardTitle>Account Overview</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-plum/5 p-4">
                  <p className="text-plum/80">Signed in as</p>
                  <p className="font-semibold text-plum break-words">
                    {auth.currentUser?.email || auth.currentUser?.phoneNumber || 'client'}
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-plum/5 p-4">
                  <p className="text-plum/80">Quick Actions</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-plum text-plum hover:bg-plum/10"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                      Go to Top
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleLogout}>
                      Log Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Address card with Remove confirmation */}
            <AddressForm
              address={address}
              addrForm={addrForm}
              setAddrForm={setAddrForm}
              onSave={saveAddress}
              onClearForm={clearAddress}
              onRemoveAddress={() => setShowRemoveModal(true)}
            />
            <PaymentInstructions paymentInfo={PAYMENT_INFO} />
          </TabsContent>
        </Tabs>
        {/* Remove Address Confirmation Modal */}
        <Modal open={showRemoveModal} onClose={() => setShowRemoveModal(false)}>
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-plum">Remove Address?</h2>
            <p>This action cannot be undone. Are you sure you want to remove your service address?</p>
            <div className="flex gap-3 mt-4">
              <Button className="bg-rose-600 text-white" onClick={actuallyRemoveAddress}>
                Yes, Remove
              </Button>
              <Button variant="outline" className="border-plum text-plum" onClick={() => setShowRemoveModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
        {/* Error Toast */}
        {errorMsg && (
          <Modal open={!!errorMsg} onClose={() => setErrorMsg('')}>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-red-700">Error</h2>
              <p className="text-plum">{errorMsg}</p>
              <Button variant="outline" className="border-plum text-plum" onClick={() => setErrorMsg('')}>
                Close
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default ClientPortalPage;
