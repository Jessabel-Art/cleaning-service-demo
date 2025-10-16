// src/pages/ClientPortalPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays,
  MapPin,
  UserRound,
  FileDown,
  Eye,
  Pencil,
  XCircle,
  CheckCircle2,
  Ban,
  Star,
  Trash2,
  Check,
  LogOut,
} from 'lucide-react';

// Select (for state + address type)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  orderBy,
  deleteDoc,
  setDoc,
  getDocs,
} from 'firebase/firestore';

// Firestore helpers (still used for legacy single-address support when present)
import {
  ensureProfile,
  getAddress,
} from '@/lib/db';

// Components
import PaymentInstructions from '@/components/portal/PaymentInstructions';

/* -------------------- Config -------------------- */
const PAYMENT_INFO = {
  depositAmount: 50,
  cash: true,
  cashApp: 'Sterlingsterls',
  zelle: '401-658-6708, use my name Sterling Sanchez in Zelle',
  notes: 'Please include your full name in the payment note.',
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

/* Utility for shadcn Select classnames */
const selectTriggerClass =
  "bg-white text-plum border border-plum/30 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus:border-gold/60";
const selectContentClass = "bg-white border border-plum/20 text-plum shadow-xl";
const selectItemClass = "focus:bg-gold/10 focus:text-plum cursor-pointer";

// keep listeners scoped: last 6 months past → next 12 months
function rangeBounds() {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(past.getMonth() - 6);
  const future = new Date(now);
  future.setMonth(future.getMonth() + 12);
  return { past, future };
}

/* -------------------- Helpers -------------------- */
function toFriendlyStatus(raw, endAt) {
  const base = String(raw || '').toLowerCase();
  if (['canceled', 'cancelled'].includes(base)) return 'Canceled';
  if (base === 'refunded') return 'Refunded';
  if (base === 'expired') return 'Expired';
  if (base === 'completed') return 'Completed';
  if (base === 'pending') return 'Pending';
  if (base === 'declined') return 'Declined';
  if (base === 'confirmed') return 'Confirmed';
  const ended = endAt ? (endAt?.toDate ? endAt.toDate() : new Date(endAt)) : null;
  if (ended && ended < new Date()) return 'Confirmed';
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
function formatDateTime(tsLike) {
  try {
    if (!tsLike) return 'TBD';
    const d = tsLike?.toDate ? tsLike.toDate() : new Date(tsLike);
    return d.toLocaleString();
  } catch {
    return 'TBD';
  }
}
function dedupeById(rows) {
  const m = new Map();
  rows.forEach((r) => m.set(r.id, r));
  return Array.from(m.values());
}
function statusToken(s) {
  const map = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    Scheduled: 'bg-sky-100 text-sky-800 border-sky-200',
    Confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Completed: 'bg-neutral-200 text-neutral-800 border-neutral-300',
    Declined: 'bg-rose-100 text-rose-800 border-rose-200',
    Canceled: 'bg-rose-100 text-rose-800 border-rose-200',
    Refunded: 'bg-purple-100 text-purple-800 border-purple-200',
    Expired: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };
  return map[s] || 'bg-plum/10 text-plum border-plum/20';
}

/* -------------------- Lightweight Dialog -------------------- */
const Modal = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-start md:items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-plum/10 relative">
          <button
            className="absolute right-4 top-3 text-plum/70 hover:text-plum"
            aria-label="Close modal"
            onClick={onClose}
          >
            ×
          </button>
          {title && <div className="px-5 pt-5 text-lg font-semibold text-plum">{title}</div>}
          <div className="px-5 py-4">{children}</div>
          {footer && <div className="px-5 pb-5">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

/* ============================================================= */

export default function ClientPortalPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  /* --------------- Auth UI state --------------- */
  const [authTab, setAuthTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  /* --------------- Portal state --------------- */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [section, setSection] = useState('appointments'); // appointments | contact | account | logout

  // profile fields (click-to-edit)
  const [fullName, setFullName] = useState('');
  const [phoneEdit, setPhoneEdit] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);

  // email/password (Account tab)
  const [emailEdit, setEmailEdit] = useState('');

  // addresses
  const [addresses, setAddresses] = useState([]); // array of {id, type, street, city, state, zip, isDefault}
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [addrEditingId, setAddrEditingId] = useState(null);
  const [addrForm, setAddrForm] = useState({ type: 'home', street: '', city: '', state: '', zip: '' });

  // details / review / cancel modals
  const [activeBooking, setActiveBooking] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  // live listener cleanup
  const unsubsRef = useRef([]);

  /* --------------- Auth listener --------------- */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // cleanup listeners
      unsubsRef.current.forEach((u) => { try { u(); } catch {} });
      unsubsRef.current = [];

      if (!user) {
        setIsLoggedIn(false);
        setBookings([]);
        setAddresses([]);
        setFullName('');
        setEmailEdit('');
        setPhoneEdit('');
        setAuthTab('login');
        setLoadingInitial(false);
        return;
      }

      setIsLoggedIn(true);
      setLoadingBookings(true);
      setLoadingInitial(false);

      try {
        await ensureProfile(user.uid, {
          email: user.email || '',
          phone: user.phoneNumber || '',
          fullName: user.displayName || signupName || '',
        });

        setFullName(user.displayName || signupName || '');
        setEmailEdit(user.email || '');
        setPhoneEdit(user.phoneNumber || '');

        // Migrate/seed from legacy single address if user has one via getAddress
        try {
          const legacy = await getAddress(user.uid);
          if (legacy && (!addresses || addresses.length === 0)) {
            // upsert into subcollection if empty
            const sub = collection(db, 'users', user.uid, 'addresses');
            await addDoc(sub, {
              type: 'home',
              street: legacy.street || legacy.line1 || '',
              city: legacy.city || '',
              state: legacy.state || '',
              zip: legacy.zip || '',
              isDefault: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch {}

        // scoped bookings listeners
        const { past, future } = rangeBounds();

        const baseQ = (field, value) =>
          query(
            collection(db, 'bookings'),
            where(field, '==', value),
            where('startAt', '>=', past),
            where('startAt', '<=', future),
            orderBy('startAt', 'desc')
          );

        // by userId
        const q1 = baseQ('userId', user.uid);
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

        // by emailLower (captures pre-login bookings)
        const emailLower = (user.email || '').toLowerCase();
        if (emailLower) {
          const q2 = baseQ('contact.emailLower', emailLower);
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

        // addresses subcollection listener
        const addrQ = query(collection(db, 'users', user.uid, 'addresses'), orderBy('createdAt', 'desc'));
        const uAddr = onSnapshot(addrQ, (snap) => {
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setAddresses(rows);
        });
        unsubsRef.current.push(uAddr);

      } catch (err) {
        setLoadingBookings(false);
        setErrorMsg(err?.message || String(err));
      }
    });

    return () => {
      unsubsRef.current.forEach((u) => { try { u(); } catch {} });
      unsubsRef.current = [];
      unsubAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------- Derived --------------- */
  const bookingsWithFriendly = useMemo(() => {
    const mapped = bookings.map((r) => ({
      id: r.id,
      date: r.startAt,
      endAt: r.endAt,
      total: Number(r.cost || 0),
      paid: Number(r.paid || 0),
      rawStatus: r.status || 'pending',
      friendly: toFriendlyStatus(r.status, r.endAt),
      service: r.serviceName || r.serviceSlug || 'Residential Cleaning',
      addressLine: r.address?.line1 || '',
      addressZip: r.address?.zip || '',
      notes: r.notes || '',
      depositDue: Number(r.depositDue || 0),
      frequency: r.frequency || 'one-time',
      addons: Array.isArray(r.addons) ? r.addons : [],
    }));
    return mapped.sort(
      (a, b) =>
        ((b.date?.toMillis?.() ?? new Date(b.date || 0).getTime()) -
          (a.date?.toMillis?.() ?? new Date(a.date || 0).getTime()))
    );
  }, [bookings]);

  const displayName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    auth.currentUser?.phoneNumber ||
    'client';

  /* --------------- Actions --------------- */
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
    unsubsRef.current.forEach((u) => { try { u(); } catch {} });
    unsubsRef.current = [];
    await signOut(auth);
    toast({ title: 'Logged out' });
    setAuthTab('login');
    setSection('appointments');
  };

  // Profile save helpers
  const saveFullName = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      const name = (fullName || '').trim();
      await updateProfile(u, { displayName: name });
      await ensureProfile(u.uid, { fullName: name });
      toast({ title: 'Full name updated' });
      setEditingName(false);
    } catch (err) {
      toast({ title: 'Could not update name', description: String(err?.message || err), variant: 'destructive' });
    }
  };
  const savePhone = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      await ensureProfile(u.uid, { phone: (phoneEdit || '').trim() });
      toast({ title: 'Phone saved to profile' });
      setEditingPhone(false);
    } catch (err) {
      toast({ title: 'Could not save phone', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  // Account Details
  const saveEmail = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      const newEmail = (emailEdit || '').trim();
      await updateEmail(u, newEmail);
      await ensureProfile(u.uid, { email: newEmail });
      toast({ title: 'Email updated' });
    } catch (err) {
      toast({ title: 'Could not update email', description: String(err?.message || err), variant: 'destructive' });
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

  // Addresses CRUD
  const resetAddrForm = () => setAddrForm({ type: 'home', street: '', city: '', state: '', zip: '' });

  const openAddAddress = () => {
    setAddrEditingId(null);
    resetAddrForm();
    setAddrModalOpen(true);
  };
  const openEditAddress = (row) => {
    setAddrEditingId(row.id);
    setAddrForm({
      type: row.type || 'other',
      street: row.street || '',
      city: row.city || '',
      state: row.state || '',
      zip: row.zip || '',
    });
    setAddrModalOpen(true);
  };

  const saveAddress = async () => {
    const u = auth.currentUser;
    if (!u) return;
    const clean = {
      type: addrForm.type || 'other',
      street: (addrForm.street || '').trim(),
      city: (addrForm.city || '').trim(),
      state: (addrForm.state || '').trim(),
      zip: (addrForm.zip || '').trim(),
      updatedAt: serverTimestamp(),
    };
    if (!clean.street || !clean.city || !clean.state || !clean.zip) {
      toast({ title: 'Missing fields', description: 'Please complete all address fields.', variant: 'destructive' });
      return;
    }
    const sub = collection(db, 'users', u.uid, 'addresses');
    try {
      if (addrEditingId) {
        await updateDoc(doc(sub, addrEditingId), clean);
        toast({ title: 'Address updated' });
      } else {
        await addDoc(sub, { ...clean, isDefault: addresses.length === 0, createdAt: serverTimestamp() });
        toast({ title: 'Address added' });
      }
      setAddrModalOpen(false);
      setAddrEditingId(null);
      resetAddrForm();
    } catch (e) {
      toast({ title: 'Could not save address', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const deleteAddress = async (row) => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      await deleteDoc(doc(db, 'users', u.uid, 'addresses', row.id));
      toast({ title: 'Address removed' });
    } catch (e) {
      toast({ title: 'Could not remove address', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const setDefaultAddress = async (row) => {
    const u = auth.currentUser;
    if (!u) return;
    // unset all, then set target
    const sub = collection(db, 'users', u.uid, 'addresses');
    try {
      const snapshot = await getDocs(sub);
      const batchUpdates = snapshot.docs.map(async (d) => {
        const ref = doc(sub, d.id);
        await updateDoc(ref, { isDefault: d.id === row.id });
      });
      await Promise.all(batchUpdates);
      toast({ title: 'Default address set' });
    } catch (e) {
      toast({ title: 'Could not set default', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const exportCsv = useCallback(() => {
    const header = ['Order', 'Date', 'Status', 'Service', 'Total', 'Paid'];
    const rows = bookingsWithFriendly.map((b) => [
      `CI-${b.id.slice(0, 5).toUpperCase()}`,
      formatDate(b.date),
      b.friendly,
      b.service,
      b.total.toFixed(2),
      b.paid.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'appointments.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [bookingsWithFriendly]);

  /* -------------------- Render (Auth) -------------------- */
  if (!isLoggedIn) {
    return (
      <div className="relative min-h-[90vh] flex items-center justify-center px-4 py-12 md:py-20 bg-[#FADADD]">
        <div className="w-full max-w-md">
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
        </div>
      </div>
    );
  }

  /* -------------------- Logged-in -------------------- */
  return (
    <div className="py-12 md:py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
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

        {/* Actions */}
        <div className="mt-2 mb-8 flex justify-between items-center">
          <div className="text-sm text-plum/70 flex gap-3 items-center">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-300 inline-block" /> Confirmed
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-300 inline-block" /> Pending
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-rose-300 inline-block" /> Canceled/Declined
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-plum text-plum" onClick={exportCsv}>
              <FileDown className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button
              className="bg-gold hover:bg-gold/90 text-white rounded-full"
              onClick={() => navigate(`/auth?redirect=${encodeURIComponent('/book')}`)}
            >
              Book a Service
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
          {/* Sidebar */}
          <aside className="md:sticky md:top-20">
            <nav className="rounded-2xl border border-plum/15 bg-white overflow-hidden">
              {[
                { key: 'appointments', label: 'Appointments', icon: CalendarDays },
                { key: 'contact', label: 'Contact Details', icon: MapPin },
                { key: 'account', label: 'Account Details', icon: UserRound },
                { key: 'logout', label: 'Log Out', icon: LogOut },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className={[
                    'w-full text-left px-4 py-3 border-b border-plum/10 flex items-center gap-2',
                    section === item.key ? 'bg-plum/5 font-medium text-plum' : 'hover:bg-plum/5 text-plum/80',
                  ].join(' ')}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <section className="min-h-[420px]">
            {/* Appointments */}
            {section === 'appointments' && (
              <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-plum/70 border-b">
                        <th className="py-2 pr-4">Order</th>
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Total</th>
                        <th className="py-2 pr-4">Actions</th>
                        <th className="py-2 pr-4">Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingBookings ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="border-b last:border-0 animate-pulse">
                            <td className="py-3 pr-4"><div className="h-4 w-24 bg-plum/10 rounded" /></td>
                            <td className="py-3 pr-4"><div className="h-4 w-32 bg-plum/10 rounded" /></td>
                            <td className="py-3 pr-4"><div className="h-5 w-20 bg-plum/10 rounded-full" /></td>
                            <td className="py-3 pr-4"><div className="h-4 w-16 bg-plum/10 rounded" /></td>
                            <td className="py-3 pr-4"><div className="h-8 w-36 bg-plum/10 rounded" /></td>
                            <td className="py-3 pr-4"><div className="h-4 w-24 bg-plum/10 rounded" /></td>
                          </tr>
                        ))
                      ) : bookingsWithFriendly.length ? (
                        bookingsWithFriendly.map((b) => {
                          const canReview =
                            b.endAt &&
                            (b.endAt?.toDate ? b.endAt.toDate() : new Date(b.endAt)) < new Date();
                          return (
                            <tr key={b.id} className="border-b last:border-0">
                              <td className="py-3 pr-4">
                                <span className="px-2 py-1 rounded bg-plum/5 text-plum font-mono">
                                  {`CI-${b.id.slice(0, 5).toUpperCase()}`}
                                </span>
                              </td>
                              <td className="py-3 pr-4">{formatDate(b.date)}</td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${statusToken(b.friendly)}`}>
                                  {b.friendly}
                                </span>
                              </td>
                              <td className="py-3 pr-4">${Number(b.total || 0).toFixed(2)}</td>
                              <td className="py-3 pr-4">
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { setActiveBooking(b); setShowDetails(true); }}>
                                    <Eye className="w-4 h-4 mr-1" /> Details
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => navigate(`/book?bookingId=${b.id}`)}>
                                    <Pencil className="w-4 h-4 mr-1" /> Reschedule
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-rose-600 border-rose-200"
                                    onClick={() => { setActiveBooking(b); setShowCancel(true); }}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" /> Cancel
                                  </Button>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                {canReview ? (
                                  <button className="text-gold underline inline-flex items-center gap-1"
                                          onClick={() => { setActiveBooking(b); setShowReview(true); }}>
                                    <Star className="w-4 h-4" /> Leave review
                                  </button>
                                ) : (
                                  <span className="text-plum/50 text-xs">Available after service</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-plum/70">
                            No appointments found.{' '}
                            <button
                              className="text-gold underline"
                              onClick={() => navigate(`/auth?redirect=${encodeURIComponent('/book')}`)}
                            >
                              Book a service
                            </button>
                            .
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Contact Details (name/phone read-only + addresses list) */}
            {section === 'contact' && (
              <div className="space-y-6">
                {/* Name */}
                <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-plum">Name</h3>
                    {!editingName ? (
                      <button className="text-plum/70 hover:text-plum inline-flex items-center gap-1" onClick={() => setEditingName(true)}>
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                    ) : null}
                  </div>
                  {!editingName ? (
                    <div className="mt-2 text-plum/90">{fullName || '—'}</div>
                  ) : (
                    <div className="mt-3 flex flex-col sm:flex-row gap-3 items-start">
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="bg-white w-full sm:max-w-sm"
                      />
                      <div className="flex gap-2">
                        <Button onClick={saveFullName} className="bg-gold text-white hover:bg-gold/90">
                          <Check className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingName(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-plum">Phone Number</h3>
                    {!editingPhone ? (
                      <button className="text-plum/70 hover:text-plum inline-flex items-center gap-1" onClick={() => setEditingPhone(true)}>
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                    ) : null}
                  </div>
                  {!editingPhone ? (
                    <div className="mt-2 text-plum/90">{phoneEdit || '—'}</div>
                  ) : (
                    <div className="mt-3 flex flex-col sm:flex-row gap-3 items-start">
                      <Input
                        value={phoneEdit}
                        onChange={(e) => setPhoneEdit(e.target.value)}
                        placeholder="+1 401 555 1234"
                        className="bg-white w-full sm:max-w-sm"
                      />
                      <div className="flex gap-2">
                        <Button onClick={savePhone} className="bg-gold text-white hover:bg-gold/90">
                          <Check className="w-4 h-4 mr-1" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingPhone(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-plum/70 mt-2">Saved to your profile.</p>
                </div>

                {/* Addresses List */}
                <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-plum">Addresses</h3>
                    <Button onClick={openAddAddress} className="bg-gold text-white hover:bg-gold/90 rounded-full">Add Address</Button>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="text-sm text-plum/70">No addresses on file. Add one to speed up booking.</div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((a) => (
                        <div key={a.id} className="border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="text-sm">
                            <div className="font-medium text-plum">
                              {a.type ? a.type.charAt(0).toUpperCase() + a.type.slice(1) : 'Other'}
                              {a.isDefault ? <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Default</span> : null}
                            </div>
                            <div className="text-plum/80">
                              {a.street || '—'}, {a.city || '—'}, {a.state || '—'} {a.zip || ''}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!a.isDefault && (
                              <Button size="sm" variant="outline" onClick={() => setDefaultAddress(a)}>
                                Set Default
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openEditAddress(a)}>
                              <Pencil className="w-4 h-4 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" className="text-rose-600 border-rose-200" onClick={() => deleteAddress(a)}>
                              <Trash2 className="w-4 h-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <PaymentInstructions paymentInfo={PAYMENT_INFO} />
              </div>
            )}

            {/* Account Details (Email + Password only; no logout here) */}
            {section === 'account' && (
              <div className="space-y-6">
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

                {/* Password */}
                <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-plum mb-3">Password</h3>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <Button onClick={sendReset} className="bg-rose-500 hover:bg-rose-600 text-white">
                      Send Password Reset Email
                    </Button>
                  </div>
                  <p className="text-xs text-plum/70 mt-2">We’ll email a secure link to reset your password.</p>
                </div>

                <PaymentInstructions paymentInfo={PAYMENT_INFO} />
              </div>
            )}

            {/* Logout Tab */}
            {section === 'logout' && (
              <div className="rounded-2xl border border-plum/15 bg-white p-6">
                <h3 className="text-lg font-semibold text-plum mb-2">Log Out</h3>
                <p className="text-sm text-plum/80 mb-4">You’ll be signed out of your account on this device.</p>
                <Button variant="outline" className="text-plum border-plum mr-3" onClick={() => setSection('appointments')}>Cancel</Button>
                <Button className="bg-rose-600 text-white" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-1" /> Log Out
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Appointment Details modal */}
      <Modal
        open={showDetails}
        onClose={() => setShowDetails(false)}
        title="Appointment details"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
            {activeBooking && (
              <>
                <Button variant="outline" onClick={() => navigate(`/book?bookingId=${activeBooking.id}`)}>
                  <Pencil className="w-4 h-4 mr-1" /> Reschedule
                </Button>
                <Button variant="outline" className="text-rose-600 border-rose-200" onClick={() => { setShowDetails(false); setShowCancel(true); }}>
                  <XCircle className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </>
            )}
          </div>
        }
      >
        {activeBooking ? (
          <div className="space-y-2 text-sm">
            <div><b>Order:</b> {`CI-${activeBooking.id.slice(0,5).toUpperCase()}`}</div>
            <div><b>Service:</b> {activeBooking.service}</div>
            <div><b>Date/Time:</b> {formatDateTime(activeBooking.date)} — {formatDateTime(activeBooking.endAt)}</div>
            <div><b>Status:</b> {activeBooking.friendly}</div>
            <div><b>Total:</b> ${activeBooking.total.toFixed(2)}</div>
            {activeBooking.depositDue > 0 && <div><b>Deposit Due:</b> ${activeBooking.depositDue.toFixed(2)}</div>}
            <div><b>Frequency:</b> {activeBooking.frequency}</div>
            <div><b>Address:</b> {activeBooking.addressLine || '—'} {activeBooking.addressZip && `(${activeBooking.addressZip})`}</div>
            {activeBooking.addons?.length > 0 && <div><b>Add-ons:</b> {activeBooking.addons.join(', ')}</div>}
            {activeBooking.notes && (
              <div className="pt-2">
                <b>Notes</b>
                <pre className="mt-1 whitespace-pre-wrap bg-plum/5 p-2 rounded">{activeBooking.notes}</pre>
              </div>
            )}
          </div>
        ) : (
          <div className="text-plum/70">No booking selected.</div>
        )}
      </Modal>

      {/* Cancel modal */}
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel appointment?"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCancel(false)}>Keep</Button>
            <Button className="bg-rose-600 text-white" onClick={async () => {
              try {
                await updateDoc(doc(db, 'bookings', activeBooking.id), { status: 'canceled', updatedAt: serverTimestamp() });
                toast({ title: 'Booking canceled' });
              } catch (e) {
                toast({ title: 'Could not cancel', description: String(e?.message || e), variant: 'destructive' });
              } finally {
                setShowCancel(false);
              }
            }}>
              <Ban className="w-4 h-4 mr-1" /> Confirm Cancel
            </Button>
          </div>
        }
      >
        <p className="text-sm text-plum/80">
          This will mark the booking as canceled. Deposit policy may apply. Are you sure?
        </p>
      </Modal>

      {/* Review modal */}
      <Modal
        open={showReview}
        onClose={() => setShowReview(false)}
        title="Leave a review"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowReview(false)}>Cancel</Button>
            <Button className="bg-gold text-white" onClick={async () => {
              const u = auth.currentUser;
              const name = u?.displayName || 'Anonymous';
              const email = u?.email || null;
              if (!reviewText || reviewText.trim().length < 5) {
                toast({ title: 'Please enter a longer review', variant: 'destructive' });
                return;
              }
              try {
                await addDoc(collection(db, 'reviews'), {
                  userId: u?.uid || null,
                  bookingId: activeBooking?.id || null,
                  serviceName: activeBooking?.service || null,
                  name,
                  email,
                  rating: Number(reviewRating) || 5,
                  body: reviewText.trim(),
                  source: 'client-portal',
                  status: 'pending',
                  createdAt: serverTimestamp(),
                });
                toast({ title: 'Thanks for your feedback', description: 'Your review is pending approval.' });
                setShowReview(false);
                setReviewText('');
                setReviewRating(5);
              } catch (err) {
                toast({ title: 'Could not submit review', description: String(err?.message || err), variant: 'destructive' });
              }
            }}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Submit
            </Button>
          </div>
        }
      >
        {activeBooking && (
          <div className="space-y-3">
            <div className="text-sm text-plum/80">
              <b>Service:</b> {activeBooking.service} &middot; <b>Date:</b> {formatDate(activeBooking.date)}
            </div>
            <div>
              <Label>Rating</Label>
              <div className="flex items-center gap-2 mt-1">
                {[1,2,3,4,5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewRating(n)}
                    className={`p-2 rounded ${reviewRating >= n ? 'text-gold' : 'text-plum/30'}`}
                    aria-label={`${n} star${n>1?'s':''}`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-text">Your review</Label>
              <textarea
                id="review-text"
                rows={5}
                className="w-full p-3 border rounded mt-1"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="How did it go?"
              />
              <div className="text-xs text-plum/60 mt-1">{reviewText.length} / 1000</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Error modal */}
      <Modal
        open={!!errorMsg}
        onClose={() => setErrorMsg('')}
        title="Error"
        footer={<Button variant="outline" className="border-plum text-plum" onClick={() => setErrorMsg('')}>Close</Button>}
      >
        <div className="text-plum">{errorMsg}</div>
      </Modal>

      {/* Address Add/Edit modal */}
      <Modal
        open={addrModalOpen}
        onClose={() => { setAddrModalOpen(false); setAddrEditingId(null); }}
        title={addrEditingId ? 'Edit Address' : 'Add Address'}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setAddrModalOpen(false); setAddrEditingId(null); }}>Cancel</Button>
            <Button className="bg-gold text-white" onClick={saveAddress}>
              <Check className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Address Type</Label>
            <Select value={addrForm.type} onValueChange={(v) => setAddrForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
              <SelectContent className={selectContentClass}>
                {['home', 'business', 'other'].map((t) => (
                  <SelectItem key={t} value={t} className={selectItemClass}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Street Address</Label>
            <Input
              value={addrForm.street}
              onChange={(e) => setAddrForm((p) => ({ ...p, street: e.target.value }))}
              className="bg-white"
              placeholder="123 Main St, Unit 2"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>City</Label>
              <Input
                value={addrForm.city}
                onChange={(e) => setAddrForm((p) => ({ ...p, city: e.target.value }))}
                className="bg-white"
                placeholder="Springfield"
              />
            </div>
            <div>
              <Label>State</Label>
              <Select value={addrForm.state} onValueChange={(v) => setAddrForm((p) => ({ ...p, state: v }))}>
                <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s} className={selectItemClass}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ZIP</Label>
              <Input
                value={addrForm.zip}
                onChange={(e) => setAddrForm((p) => ({ ...p, zip: e.target.value }))}
                className="bg-white"
                placeholder="12345"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
