// src/pages/AuthPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { auth } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';

// ✅ Match Booking page’s pink background for consistency
export default function AuthPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state && location.state.from) || '/portal';

  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);

  // login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // signup form
  const [name, setName] = useState('');
  const [signEmail, setSignEmail] = useState('');
  const [signPassword, setSignPassword] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate(redirectTo, { replace: true });
    });
    return () => unsub();
  }, [navigate, redirectTo]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      toast({ title: 'Welcome back!', description: 'You are now signed in.' });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast({ title: 'Login failed', description: humanizeAuthError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, signEmail.trim(), signPassword);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      toast({ title: 'Account created!', description: 'You are now signed in.' });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast({ title: 'Sign up failed', description: humanizeAuthError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Password reset with Action URL so the email link returns to your app
  const handleReset = async () => {
    if (!loginEmail) {
      toast({ title: 'Enter your email first', description: 'Type your email, then click Reset Password.' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, loginEmail.trim(), {
        url: 'https://sanchezproservices.com/auth'
      });
      toast({ title: 'Password reset sent', description: 'Check your inbox for reset instructions.' });
    } catch (err) {
      toast({ title: 'Could not send reset', description: humanizeAuthError(err), variant: 'destructive' });
    }
  };

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
            <span className="font-medium">Returning customers:</span> Sign in.{' '}
            <span className="font-medium">New customers:</span> Create your account to book.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
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
            <Card className="shadow-md border-plum/10 bg-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-plum">Welcome back</CardTitle>
                <CardDescription>Access your bookings and account details.</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-sm text-gold hover:underline"
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('signup')}
                      className="text-sm text-plum/80 hover:underline"
                    >
                      New customer? Create your account
                    </button>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold hover:bg-gold/90 text-white rounded-full"
                  >
                    {loading ? 'Please wait…' : 'Sign In'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* SIGNUP */}
          <TabsContent value="signup">
            <Card className="shadow-md border-plum/10 bg-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-plum">Create Account</CardTitle>
                <CardDescription>Join to easily manage your bookings.</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      autoComplete="name"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signEmail}
                      onChange={(e) => setSignEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signPassword}
                      onChange={(e) => setSignPassword(e.target.value)}
                      placeholder="Create a password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="bg-white"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold hover:bg-gold/90 text-white rounded-full"
                  >
                    {loading ? 'Please wait…' : 'Create Account'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-plum/80 mt-6">
          By continuing you agree to our{' '}
          <Link to="/terms-of-service" className="underline hover:text-plum">Terms</Link> and{' '}
          <Link to="/privacy-policy" className="underline hover:text-plum">Privacy Policy</Link>.
        </p>
      </motion.div>
    </div>
  );
}

function humanizeAuthError(err) {
  const code = String(err?.code || '').replace('auth/', '');
  switch (code) {
    case 'invalid-credential':
    case 'wrong-password':
      return 'Incorrect email or password.';
    case 'user-not-found':
      return 'No account found with that email.';
    case 'email-already-in-use':
      return 'That email is already registered.';
    case 'weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return err?.message || 'Something went wrong.';
  }
}
