// src/pages/ClientPortalPage.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Firebase Auth
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPhoneNumber,
  updateProfile,
  sendPasswordResetEmail,
  updateEmail,
} from 'firebase/auth';
import { auth, setupRecaptcha, db } from '@/lib/firebase';

// Firestore (direct)
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';

// Firestore helpers (keep these)
import {
  ensureProfile,
  getAddress,
  saveAddress as fbSaveAddress,
  deleteAddress as fbDeleteAddress,
} from '@/lib/db';

// Components
import PaymentInstructions from '@/components/portal/PaymentInstructions';
import AddressForm from '@/components/portal/AddressForm';

// ---------- Config ----------
const PAYMENT_INFO = {
  depositAmount: 50,
  cash: true,
  cashApp: 'Sterlingsterls',
  zelle: '401-658-6708, use my name Sterling Sanchez in Zelle',
  notes: 'Please include your full name in the payment note.',
};

// ---------- Helpers ----------
function toFriendlyStatus(raw, endAt) {
  const base = String(raw || '').toLowerCase();
  const now = new Date();
  const ended = endAt ? (endAt?.toDate ? endAt.toDate() : new Date(endAt)) : null;

  if (['canceled', 'cancelled'].includes(base)) return 'Canceled';
  if (base === 'refunded') return 'Refunded';
  if (base === 'expired') return 'Expired';
  if (ended && ended < now) return 'Confirmed';
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

function mergeUnique(prev, incoming) {
  const map = new Map(prev.map(x => [x.id, x]));
  for (const row of incoming) map.set(row.id, row);
  return Array.from(map.values());
}

const PORTAL_STATUSES = ['requested', 'confirmed', 'completed', 'canceled', 'cancelled', 'refunded', 'pending', 'review', 'expired'];

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

  // -------- Auth UI state (always declared) --------
  const [loginEmail, setLoginEmail] = useState('');
  theconst [loginPassword, setLoginPassword] = useState('');
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

  // -------- Data state (always declared) --------
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bookings, setBookings] = useState([]); // raw firestore rows
  const [address, setAddress] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sidebar section
  const [section, setSection] = useState('appointments'); // appointments | address | account

  // Address form local state
  const [addrForm, setAddrForm] = useState({ street: '', city: '', state: '', zip: '' });
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Account (must be before any early return)
  const [fullName, setFullName] = useState(auth.currentUser?.displayName || '');
  const [emailEdit, setEmailEdit] = useState(auth.currentUser?.email || '');
  const [phoneEdit, setPhoneEdit] = useState('');

  // Update account editor fields when auth state changes
  useEffect(() => {
    const u = auth.currentUser;
    setFullName(u?.displayName || '');
    setEmailEdit(u?.email || '');
    // phoneEdit is stored in your profile doc; keep as-is unless you fetch it
  }, [isLoggedIn]);

  // live listener cleanup
  const bookingsUnsubsRef = useRef([]);

  // -------- Auth listener (always declared) --------
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // cleanup old listeners
      bookingsUnsubsRef.current.forEach(u => { try { u(); } catch {} });
      bookingsUnsubsRef.current = [];

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

        if (!user.displayName && signupName) {
          try { await updateProfile(user, { displayName: signupName }); } catch {}
        }

        const addr = await getAddress(user.uid);
        if (addr) setAddress(addr);

        const uidKey = `uid:${user.uid}`;
        const emailLower = (user.email || '').toLowerCase();

        const qByUid = query(
          collection(db, 'bookings'),
          where('ownerKeys', 'array-contains', uidKey),
          where('status', 'in', PORTAL_STATUSES),
          orderBy('startAt', 'desc')
        );

        const qByEmail = emailLower
          ? query(
              collection(db, 'bookings'),
              where('contact.emailLower', '==', emailLower),
              where('status', 'in', PORTAL_STATUSES),
              orderBy('startAt', 'desc')
            )
          : null;

        const handleSnap = (snap) => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setBookings(prev => mergeUnique(prev, rows));
          setLoadingBookings(false);
        };

        const unsub1 = onSnapshot(qByUid, handleSnap, () => setLoadingBookings(false));
        bookingsUnsubsRef.current.push(unsub1);

        if (qByEmail) {
          const unsub2 = onSnapshot(qByEmail, handleSnap, () => setLoadingBookings(false));
          bookingsUnsubsRef.current.push(unsub2);
        }
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
      bookingsUnsubsRef.current.forEach(u => { try { u(); } catch {} });
      bookingsUnsubsRef.current = [];
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
      if (signupName) {
        try { await updateProfile(cred.user, { displayName: signupName }); } catch {}
      }
      toast({ title: 'Account created', description: 'You are now signed in.' });
    } catch (err) {
      toast({ title: 'Sign up failed', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    bookingsUnsubsRef.current.forEach(u => { try { u(); } catch {} });
    bookingsUnsubsRef.current = [];
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

  // -------- Mapped bookings --------
  const bookingsWithFriendly = useMemo(() => {
    return bookings
      .map((r) => ({
        id: r.id,
        date: r.startAt,
        endAt: r.endAt,
        total: Number(r.cost || 0),
        paid: Number(r.paid || 0),
        rawStatus: r.status || 'requested',
        friendly: toFriendlyStatus(r.status, r.endAt),
        service: r.serviceName || r.serviceSlug || 'Residential Cleaning',
        addressZip: r.address?.zip || '',
      }))
      .sort((a, b) => (b.date?.toMillis?.() ?? 0) - (a.date?.toMillis?.() ?? 0));
  }, [bookings]);

  // -------- Unauthenticated view --------
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

  const saveFullName = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      await updateProfile(u, { displayName: fullName.trim() });
      await ensureProfile(u.uid, { fullName: fullName.trim() });
      toast({ title: 'Full name updated' });
    } catch (err) {
      toast({ title: 'Could not update name', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const saveEmail = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      await updateEmail(u, emailEdit.trim());
      await ensureProfile(u.uid, { email: emailEdit.trim() });
      toast({ title: 'Email updated' });
    } catch (err) {
      toast({
        title: 'Could not update email',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    }
  };

  const savePhone = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      await ensureProfile(u.uid, { phone: phoneEdit.trim() });
      toast({ title: 'Phone saved to profile' });
    } catch (err) {
      toast({ title: 'Could not save phone', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const sendReset = async () => {
    const u = auth.currentUser;
    const target = emailEdit?.trim() || u?.email;
    if (!target) {
      toast({ title: 'Missing email', description: 'Please enter a valid email first.', variant: 'destructive' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, target);
      toast({ title: 'Password reset sent', description: `Check ${target} for the reset link.` });
    } catch (err) {
      toast({ title: 'Could not send reset', description: String(err?.message || err), variant: 'destructive' });
    }
  };

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
            Book a Service
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
          {/* Sidebar */}
          <aside className="md:sticky md:top-20">
            <nav className="rounded-2xl border border-plum/15 bg-white overflow-hidden">
              {[
                { key: 'appointments', label: 'Appointments' },
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
            </nav>
          </aside>

          {/* Main Panel */}
          <section className="min-h-[420px]">
            {section === 'appointments' && (
              <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-plum/70 border-b">
                        <th className="py-2 pr-4">Order No.</th>
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Status</th>
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
                      ) : bookingsWithFriendly.length ? (
                        bookingsWithFriendly.map((b) => (
                          <tr key={b.id} className="border-b last:border-0">
                            <td className="py-3 pr-4">
                              <span className="text-plum underline underline-offset-2 cursor-default">
                                {`CI-${b.id.slice(0, 5).toUpperCase()}`}
                              </span>
                              <div className="text-xs text-gold">Renew</div>
                            </td>
                            <td className="py-3 pr-4">{formatDate(b.date)}</td>
                            <td className="py-3 pr-4">{b.friendly}</td>
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
                            No appointments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
                {/* Full Name */}
                <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-plum mb-3">Full Name</h3>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="bg-white w-full sm:max-w-sm"
                    />
                    <Button onClick={saveFullName} className="bg-gold text-white hover:bg-gold/90">
                      Save Name
                    </Button>
                  </div>
                  <p className="text-xs text-plum/70 mt-2">
                    This updates your display name and your profile record.
                  </p>
                </div>

                {/* Email */}
                <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-plum mb-3">Email</h3>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <Input
                      type="email"
                      value={emailEdit}
                      onChange={(e) => setEmailEdit(e.target.value)}
                      placeholder="you@example.com"
                      className="bg-white w-full sm:max-w-sm"
                    />
                    <Button onClick={saveEmail} className="bg-gold text-white hover:bg-gold/90">
                      Save Email
                    </Button>
                  </div>
                  <p className="text-xs text-plum/70 mt-2">
                    You may be asked to re-authenticate for security when changing your email.
                  </p>
                </div>

                {/* Phone Number */}
                <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-plum mb-3">Phone Number</h3>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <Input
                      value={phoneEdit}
                      onChange={(e) => setPhoneEdit(e.target.value)}
                      placeholder="+1 401 555 1234"
                      className="bg-white w-full sm:max-w-sm"
                    />
                    <Button onClick={savePhone} className="bg-gold text-white hover:bg-gold/90">
                      Save Phone
                    </Button>
                  </div>
                  <p className="text-xs text-plum/70 mt-2">
                    This saves to your profile. To change the phone tied to login, use phone login & verification.
                  </p>
                </div>

                {/* Password Reset */}
                <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-plum mb-3">Password</h3>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <Button onClick={sendReset} className="bg-rose-500 hover:bg-rose-600 text-white">
                      Send Password Reset Email
                    </Button>
                    <Button variant="outline" className="border-plum text-plum" onClick={handleLogout}>
                      Log Out
                    </Button>
                  </div>
                  <p className="text-xs text-plum/70 mt-2">
                    We’ll email a secure link to reset your password.
                  </p>
                </div>

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
