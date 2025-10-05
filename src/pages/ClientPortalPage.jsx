// src/pages/ClientPortalPage.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  updateProfile,
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

// Components (split)
import PaymentInstructions from '@/components/portal/PaymentInstructions';
import AddressForm from '@/components/portal/AddressForm';
import AccountPanel from '@/components/portal/AccountPanel';

// ---------- Config ----------
const PAYMENT_INFO = {
  depositAmount: 50,
  cash: true,
  cashApp: '$YOUR_CASHTAG',
  zelle: 'sanchezservices24@yahoo.com',
  notes: 'Please include your full name and booking ID in the payment note.',
};

// ---------- Helpers ----------
function toFriendlyStatus(raw, endAt) {
  const base = String(raw || '').toLowerCase();
  // Automatically show Completed if time has passed
  const now = new Date();
  const ended = endAt ? (endAt?.toDate ? endAt.toDate() : new Date(endAt)) : null;
  if (ended && ended < now) return 'Completed';

  if (base === 'completed') return 'Completed';
  if (base === 'refunded') return 'Refunded';
  if (base === 'canceled' || base === 'cancelled' || base === 'expired') return 'Expired';
  if (base === 'pending') return 'Pending';
  if (base === 'review') return 'Review';
  // requested/confirmed -> Scheduled
  return 'Scheduled';
}

function formatDate(tsLike) {
  try {
    if (!tsLike) return 'TBD';
    const d = tsLike?.toDate ? tsLike.toDate() : new Date(tsLike);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'TBD';
  }
}

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

export default function ClientPortalPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // -------- Auth UI state --------
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [authTab, setAuthTab] = useState('login');

  // Phone login
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // -------- Data state --------
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [address, setAddress] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sidebar section
  const [section, setSection] = useState('appointments'); // appointments | address | account

  // Address form local state
  const [addrForm, setAddrForm] = useState({ street: '', city: '', state: '', zip: '' });
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // live listener cleanup
  const bookingsUnsubRef = useRef(null);

  // -------- Auth listener --------
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // cleanup old listener
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

        // If they just signed up and provided a name, update auth profile displayName
        if (!user.displayName && signupName) {
          try {
            await updateProfile(user, { displayName: signupName });
          } catch {
            /* ignore */
          }
        }

        const addr = await getAddress(user.uid);
        if (addr) setAddress(addr);

        bookingsUnsubRef.current = onUserBookings(user.uid, (rows) => {
          const mapped = rows.map((r) => ({
            id: r.id,
            date: r.startAt,
            endAt: r.endAt,
            total: Number(r.cost || 0),
            paid: Number(r.paid || 0),
            status: toFriendlyStatus(r.status, r.endAt),
            service: r.serviceName || r.serviceSlug || 'Residential Cleaning',
          }));
          setBookings(mapped);
          setLoadingBookings(false);
        });
      } catch (err) {
        if (String(err?.code).includes('permission-denied')) {
          setLoadingBookings(false);
        } else {
          setErrorMsg(err?.message || String(err));
          setLoadingBookings(false);
        }
      }
    });

    return () => {
      if (bookingsUnsubRef.current) bookingsUnsubRef.current();
      unsubAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- Auth actions --------
  const handleLogin = async (e) => {
    e?.preventDefault?.();
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast({ title: 'Signed in' });
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
      // set display name on the auth user
      if (signupName) {
        try { await updateProfile(cred.user, { displayName: signupName }); } catch {}
      }
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
    setSection('appointments');
  };

  // Phone login
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

  // Address actions
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

  // -------- Appointments filters/table --------
  const [apptTab, setApptTab] = useState('Completed'); // Completed | Pending | Review | Scheduled | Expired | Refunded
  const appointmentsByTab = useMemo(
    () => bookings.filter((b) => toFriendlyStatus(b.status, b.endAt) === apptTab),
    [bookings, apptTab]
  );

  // -------- Unauthenticated view (Book Now styling) --------
  if (!isLoggedIn) {
    return (
      <div className="relative min-h-[90vh] flex items-center justify-center px-4 py-12 md:py-20 bg-[#FADADD]">
        <motion.div
          className="relative z-10 w-full max-w-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-plum">Log in or Create your account</h1>
            <p className="text-plum/80 mt-1">
              <span className="font-medium">Returning customers:</span> Sign in.&nbsp;
              <span className="font-medium">New customers:</span> Create your account to book.
            </p>
          </div>

          <Tabs value={authTab} onValueChange={setAuthTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-white p-1">
              <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
                Create Account
              </TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <div className="shadow-md border-plum/10 bg-white rounded-xl">
                <form onSubmit={handleLogin} className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>

                  {/* Phone Login */}
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
                      <div className="rounded-xl border border-plum/15 p-4 space-y-3 bg-white">
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            placeholder="+14015551234"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="bg-white"
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
                              className="bg-white"
                            />
                          </div>
                        )}
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

                  <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                    Sign In
                  </Button>
                </form>
                {/* Invisible reCAPTCHA container */}
                <div id="recaptcha-container" className="p-0 m-0" />
              </div>
            </TabsContent>

            {/* SIGNUP */}
            <TabsContent value="signup">
              <div className="shadow-md border-plum/10 bg-white rounded-xl p-6 space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      className="bg-white"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                    Create Account
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    );
  }

  // -------- Logged-in Portal --------
  const displayName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    auth.currentUser?.phoneNumber ||
    'client';

  return (
    <div className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Top header: title centered */}
        <motion.div
          className="mb-6 text-center"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-plum">My Account</h1>
          <p className="text-plum/80 mt-2">Welcome {displayName}.</p>
        </motion.div>

        {/* CTA left-aligned */}
        <div className="mt-2 mb-8 flex justify-start">
          <Button
            className="bg-gold hover:bg-gold/90 text-white rounded-full"
            onClick={() => navigate('/book')}
          >
            Book a Cleaning
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
          {/* Sidebar */}
          <aside className="md:sticky md:top-20">
            <nav className="rounded-2xl border border-plum/15 bg-white overflow-hidden">
              {[
                { key: 'appointments', label: 'Appointments' }, // renamed from Orders
                { key: 'address', label: 'Address' },
                { key: 'account', label: 'Account Details' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={[
                    'w-full text-left px-4 py-3 border-b border-plum/10',
                    section === item.key ? 'bg-plum/5 font-medium text-plum' : 'hover:bg-plum/5 text-plum/80',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-rose-600 hover:bg-rose-50"
              >
                Logout
              </button>
            </nav>
          </aside>

          {/* Main Panel */}
          <section className="min-h-[420px]">
            {section === 'appointments' && (
              <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                <Tabs value={apptTab} onValueChange={setApptTab} className="w-full">
                  <TabsList className="flex flex-wrap gap-x-2 gap-y-2 bg-transparent p-0">
                    {['Completed', 'Pending', 'Review', 'Scheduled', 'Expired', 'Refunded'].map((tab) => (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="data-[state=active]:bg-plum data-[state=active]:text-white rounded-full px-3 py-1.5"
                      >
                        {tab}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value={apptTab} className="mt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-plum/70 border-b">
                            <th className="py-2 pr-4">Order No.</th>
                            <th className="py-2 pr-4">Date</th>
                            {/* Hide Status column entirely until any booking exists */}
                            {bookings.length > 0 && <th className="py-2 pr-4">Status</th>}
                            <th className="py-2 pr-4">Total</th>
                            <th className="py-2 pr-4">Actions</th>
                            <th className="py-2 pr-4">Feedback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingBookings ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center">
                                <span className="animate-spin inline-block w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
                              </td>
                            </tr>
                          ) : appointmentsByTab.length ? (
                            appointmentsByTab.map((b) => (
                              <tr key={b.id} className="border-b last:border-0">
                                <td className="py-3 pr-4">
                                  <span className="text-plum underline underline-offset-2 cursor-default">
                                    {`CI-${b.id.slice(0, 5).toUpperCase()}`}
                                  </span>
                                  <div className="text-xs text-gold">Renew</div>
                                </td>
                                <td className="py-3 pr-4">{formatDate(b.date)}</td>
                                {bookings.length > 0 && <td className="py-3 pr-4">{toFriendlyStatus(b.status, b.endAt)}</td>}
                                <td className="py-3 pr-4">${Number(b.total || 0).toFixed(2)}</td>
                                <td className="py-3 pr-4">
                                  <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white">
                                    Invoice
                                  </Button>
                                </td>
                                <td className="py-3 pr-4">
                                  <button className="text-gold underline">Give your feedback</button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-plum/70">
                                No appointments found in “{apptTab}”.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {section === 'address' && (
              <div className="space-y-6">
                <AddressForm
                  address={address}
                  addrForm={addrForm}
                  setAddrForm={setAddrForm}
                  onSave={saveAddress}
                  onClearForm={clearAddress}
                  onRemoveAddress={() => setShowRemoveModal(true)}
                />
                <PaymentInstructions paymentInfo={PAYMENT_INFO} />
              </div>
            )}

            {section === 'account' && (
              <div className="space-y-6">
                {/* Your AccountPanel already allows updating name / password */}
                <AccountPanel user={auth.currentUser} onLogout={handleLogout} />
                <PaymentInstructions paymentInfo={PAYMENT_INFO} />
              </div>
            )}
          </section>
        </div>

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

        {/* Error Modal */}
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
}
