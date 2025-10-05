// src/pages/ClientPortalPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  updateProfile,
  sendPasswordResetEmail,
  updateEmail,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

import { collection, onSnapshot, query, where } from 'firebase/firestore';

// Firestore helpers
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

function dedupeById(rows) {
  const m = new Map();
  rows.forEach((r) => m.set(r.id, r));
  return Array.from(m.values());
}

// ---------- UI ----------
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
        <button
          type="button"
          className="absolute top-2 right-3 text-2xl leading-none text-plum"
          onClick={onClose}
          aria-label="Close Modal"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default function ClientPortalPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // ---------- Auth UI state (always defined – fixes hook-order issue) ----------
  const [authTab, setAuthTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // ---------- Portal state (always defined) ----------
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [address, setAddress] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [section, setSection] = useState('appointments'); // appointments | address | account
  const [addrForm, setAddrForm] = useState({ street: '', city: '', state: '', zip: '' });
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Account editor state (always defined)
  const [fullName, setFullName] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [phoneEdit, setPhoneEdit] = useState('');

  // live listener cleanup
  const unsubsRef = useRef([]);

  // ---------- Auth listener ----------
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // cleanup any old listeners
      unsubsRef.current.forEach((u) => {
        try { u(); } catch {}
      });
      unsubsRef.current = [];

      if (!user) {
        setIsLoggedIn(false);
        setBookings([]);
        setAddress(null);
        setFullName('');
        setEmailEdit('');
        setPhoneEdit('');
        setAuthTab('login');
        return;
      }

      setIsLoggedIn(true);
      setLoadingBookings(true);

      try {
        // Ensure profile exists / patch known fields
        await ensureProfile(user.uid, {
          email: user.email || '',
          phone: user.phoneNumber || '',
          fullName: user.displayName || signupName || '',
        });

        // Pre-fill account editor fields
        setFullName(user.displayName || signupName || '');
        setEmailEdit(user.email || '');
        setPhoneEdit(user.phoneNumber || '');

        // Load saved address (if any)
        try {
          const a = await getAddress(user.uid);
          if (a) setAddress(a);
        } catch {}

        // Listen bookings: by userId
        const q1 = query(collection(db, 'bookings'), where('userId', '==', user.uid));
        const u1 = onSnapshot(
          q1,
          (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setBookings((prev) => dedupeById([...prev, ...rows]));
            setLoadingBookings(false);
          },
          () => setLoadingBookings(false)
        );
        unsubsRef.current.push(u1);

        // Also listen bookings by emailLower (captures pre-login bookings)
        const emailLower = (user.email || '').toLowerCase();
        if (emailLower) {
          const q2 = query(
            collection(db, 'bookings'),
            where('contact.emailLower', '==', emailLower)
          );
          const u2 = onSnapshot(
            q2,
            (snap) => {
              const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              setBookings((prev) => dedupeById([...prev, ...rows]));
              setLoadingBookings(false);
            },
            () => setLoadingBookings(false)
          );
          unsubsRef.current.push(u2);
        }
      } catch (err) {
        setLoadingBookings(false);
        setErrorMsg(err?.message || String(err));
      }
    });

    return () => {
      unsubsRef.current.forEach((u) => {
        try { u(); } catch {}
      });
      unsubsRef.current = [];
      unsubAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Mapped bookings ----------
  const bookingsWithFriendly = useMemo(() => {
    const mapped = bookings.map((r) => ({
      id: r.id,
      date: r.startAt,
      endAt: r.endAt,
      total: Number(r.cost || 0),
      paid: Number(r.paid || 0),
      rawStatus: r.status || 'requested',
      friendly: toFriendlyStatus(r.status, r.endAt),
      service: r.serviceName || r.serviceSlug || 'Residential Cleaning',
      addressZip: r.address?.zip || '',
    }));
    // Sort by date desc (works for both Timestamp and Date)
    return mapped.sort(
      (a, b) =>
        ((b.date?.toMillis?.() ?? new Date(b.date || 0).getTime()) -
         (a.date?.toMillis?.() ?? new Date(a.date || 0).getTime()))
    );
  }, [bookings]);

  // ---------- Auth actions ----------
  const handleLogin = async (e) => {
    e?.preventDefault?.();
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      toast({ title: 'Signed in' });
    } catch (err) {
      toast({ title: 'Login failed', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  const handleSignUp = async (e) => {
    e?.preventDefault?.();
    try {
      const cred = await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupPassword);
      if (signupName.trim()) {
        try { await updateProfile(cred.user, { displayName: signupName.trim() }); } catch {}
      }
      await ensureProfile(cred.user.uid, {
        email: cred.user.email || signupEmail.trim(),
        phone: cred.user.phoneNumber || '',
        fullName: signupName.trim(),
      });
      toast({ title: 'Account created', description: 'You are now signed in.' });
    } catch (err) {
      toast({ title: 'Sign up failed', description: err?.message || String(err), variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    unsubsRef.current.forEach((u) => {
      try { u(); } catch {}
    });
    unsubsRef.current = [];
    await signOut(auth);
    toast({ title: 'Logged out' });
    setAuthTab('login');
    setSection('appointments');
  };

  // ---------- Address actions ----------
  const saveAddress = async (e) => {
    e?.preventDefault?.();
    const user = auth.currentUser;
    if (!user) {
      toast({ title: 'Please log in first', variant: 'destructive' });
      return;
    }
    const saved = {
      street: (addrForm.street || '').trim(),
      city: (addrForm.city || '').trim(),
      state: (addrForm.state || '').trim(),
      zip: (addrForm.zip || '').trim(),
    };
    if (!saved.street || !saved.city || !saved.state || !saved.zip) {
      toast({ title: 'Missing fields', description: 'Please complete all address fields.', variant: 'destructive' });
      return;
    }
    await fbSaveAddress(user.uid, saved);
    setAddress(saved);
    toast({ title: 'Address saved' });
  };

  const clearAddress = () => setAddrForm({ street: '', city: '', state: '', zip: '' });

  const actuallyRemoveAddress = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await fbDeleteAddress(user.uid);
    setAddress(null);
    clearAddress();
    toast({ title: 'Address removed' });
    setShowRemoveModal(false);
  };

  // ---------- Account actions ----------
  const saveFullName = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      const name = (fullName || '').trim();
      await updateProfile(u, { displayName: name });
      await ensureProfile(u.uid, { fullName: name });
      toast({ title: 'Full name updated' });
    } catch (err) {
      toast({ title: 'Could not update name', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const saveEmail = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      const newEmail = (emailEdit || '').trim();
      await updateEmail(u, newEmail); // may require re-auth
      await ensureProfile(u.uid, { email: newEmail });
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
      await ensureProfile(u.uid, { phone: (phoneEdit || '').trim() });
      toast({ title: 'Phone saved to profile' });
    } catch (err) {
      toast({ title: 'Could not save phone', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const sendReset = async () => {
    const target = (emailEdit || auth.currentUser?.email || '').trim();
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

  const displayName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    auth.currentUser?.phoneNumber ||
    'client';

  // ---------- Render ----------
  return (
    <div className={isLoggedIn ? 'py-12 md:py-20 px-4 bg-white' : 'relative min-h-[90vh] flex items-center justify-center px-4 py-12 md:py-20 bg-[#FADADD]'}>
      <div className={isLoggedIn ? 'max-w-6xl mx-auto' : 'w-full max-w-md'}>
        {!isLoggedIn ? (
          <motion.div
            className="relative z-10 w-full"
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
                        autoComplete="email"
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
                        autoComplete="current-password"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">
                      Sign In
                    </Button>
                  </form>
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
                        autoComplete="name"
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
                        autoComplete="email"
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
                        autoComplete="new-password"
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
        ) : (
          <>
            {/* Header */}
            <motion.div
              className="mb-6 text-center"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-plum">My Account</h1>
              <p className="text-plum/80 mt-2">Welcome {displayName}.</p>
            </motion.div>

            {/* CTA */}
            <div className="mt-2 mb-8 flex justify-start">
              <Button className="bg-gold hover:bg-gold/90 text-white rounded-full" onClick={() => navigate('/book')}>
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

              {/* Main */}
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
                      <p className="text-xs text-plum/70 mt-2">Updates your display name and profile record.</p>
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
                      <p className="text-xs text-plum/70 mt-2">You may be asked to re-authenticate for security.</p>
                    </div>

                    {/* Phone */}
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
                        Saves to your profile. (Changing login phone requires SMS verification.)
                      </p>
                    </div>

                    {/* Password / Logout */}
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
                      <p className="text-xs text-plum/70 mt-2">We’ll email a secure link to reset your password.</p>
                    </div>

                    <PaymentInstructions paymentInfo={PAYMENT_INFO} />
                  </div>
                )}
              </section>
            </div>

            {/* Remove Address Modal */}
            <Modal open={showRemoveModal} onClose={() => setShowRemoveModal(false)}>
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-plum">Remove Address?</h2>
                <p>This action cannot be undone. Remove your service address?</p>
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
            <Modal open={!!errorMsg} onClose={() => setErrorMsg('')}>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-red-700">Error</h2>
                <p className="text-plum">{errorMsg}</p>
                <Button variant="outline" className="border-plum text-plum" onClick={() => setErrorMsg('')}>
                  Close
                </Button>
              </div>
            </Modal>
          </>
        )}
      </div>
    </div>
  );
}
