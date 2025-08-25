import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Lock } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e) => {
    e.preventDefault();
    toast({
      title: "Logging In...",
      description: "This is a demo login.",
    });

    setTimeout(() => {
      // Simulate successful login
      localStorage.setItem('isLoggedIn', 'true');
      toast({
        title: "Login Successful!",
        description: "Redirecting you to the client portal.",
      });
      navigate('/portal');
    }, 1500);
  };
  
  const handleSignUp = () => {
      toast({
        title: "🚧 This feature isn't implemented yet",
        description: "Account creation will be available soon. For this, I need a database and authentication system like Supabase.",
      });
  };

  return (
    <div className="py-12 md:py-20 px-4 bg-white flex items-center justify-center">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-plum">Client Login</CardTitle>
            <CardDescription>Access your bookings and account details.</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="email" type="email" placeholder="you@example.com" required className="pl-10"/>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                 <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="password" type="password" required className="pl-10"/>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">Log In</Button>
              <p className="text-sm text-plum/70">
                Don't have an account?{' '}
                <Button variant="link" className="p-0 h-auto text-gold" type="button" onClick={handleSignUp}>
                   Sign up here
                </Button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;