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

// ✅ Background image for the auth page
import authBg from '@/assets/images/client-portal.jpeg';

export default function AuthPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state && location.state.from) || '/portal';

  // UI state
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);

  // login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // signup form
  const [name, setName] = useState('');
  const [signEmail, setSignEmail] = useState('');
  const [signPassword, setSignPassword] = useState('');

  // redirect if already logged in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate(redirectTo, { replace: true });
    });
    return () => unsub();
  }, [navigate, redirectTo]);

  // ----- Actions -----
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
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      toast({ title: 'Account created!', description: 'You are now signed in.' });
      navigate('/portal', { replace: true });
    } catch (err) {
      toast({ title: 'Sign up failed', description: humanizeAuthError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!loginEmail) {
      toast({ title: 'Enter your email first', description: 'Type your email, then click Reset Password.' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, loginEmail.trim());
      toast({ title: 'Password reset sent', description: 'Check your inbox for reset instructions.' });
    } catch (err) {
      toast({ title: 'Could not send reset', description: humanizeAuthError(err), variant: 'destructive' });
    }
  };

  return (
    <div
      className="relative min-h-[90vh] flex items-center justify-center px-4 py-12 md:py-20"
      style={{
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay to tone down the photo */}
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

      {/* Foreground content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-full bg-white/70 backdrop-blur p-1">
            <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
              Log In
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow">
              Sign Up
            </TabsTrigger>
          </TabsList>

          {/* LOGIN */}
          <TabsContent value="login">
            <Card className="shadow-md border-plum/10 bg-white/95 backdrop-blur">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-plum">Client Login</CardTitle>
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
                    />
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-sm text-gold hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold hover:bg-gold/90 text-white rounded-full"
                  >
                    {loading ? 'Please wait…' : 'Log In'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* SIGNUP */}
          <TabsContent value="signup">
            <Card className="shadow-md border-plum/10 bg-white/95 backdrop-blur">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-plum">Create Account</CardTitle>
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

        <p className="text-center text-sm text-white/80 mt-6">
          By continuing you agree to our{' '}
          <Link to="/terms-of-service" className="underline hover:text-white">Terms</Link> and{' '}
          <Link to="/privacy-policy" className="underline hover:text-white">Privacy Policy</Link>.
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
