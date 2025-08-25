import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, Repeat, XCircle, DollarSign, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ClientPortalPage = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('login');
  const { toast } = useToast();

  useEffect(() => {
    const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedInStatus);
    if (loggedInStatus) {
      const storedBookings = JSON.parse(localStorage.getItem('pastBookings')) || [];
      setBookings(storedBookings);
    }
  }, []);
  
  const handleAction = (action) => {
     toast({
      title: "🚧 This feature isn't implemented yet",
      description: `The "${action}" functionality requires a backend. To enable this, I would need to set up Supabase for database and authentication. Would you like to proceed with that?`,
    });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    toast({ title: "Logging In...", description: "This is a demo login." });
    setTimeout(() => {
      localStorage.setItem('isLoggedIn', 'true');
      setIsLoggedIn(true);
      const storedBookings = JSON.parse(localStorage.getItem('pastBookings')) || [];
      setBookings(storedBookings);
      toast({ title: "Login Successful!" });
    }, 1000);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    setBookings([]);
    toast({ title: "Logged Out Successfully" });
  };
  
  const handleSignUp = (e) => {
    e.preventDefault();
    handleAction('Sign Up');
  }

  const upcomingBookings = bookings.filter(b => b.status === 'Upcoming');
  const pastBookings = bookings.filter(b => b.status !== 'Upcoming');

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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold text-plum">Client Login</CardTitle>
                        <CardDescription>Access your bookings and account details.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="you@example.com" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" type="password" required />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">Log In</Button>
                        </CardFooter>
                    </form>
                </Card>
              </TabsContent>
               <TabsContent value="signup">
                <Card>
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
                                <Input id="signup-password" type="password" required />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white rounded-full">Create Account</Button>
                        </CardFooter>
                    </form>
                </Card>
              </TabsContent>
            </Tabs>
            </motion.div>
        </div>
      );
  }

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
          <p className="text-lg text-plum/80">Welcome! Here you can manage your bookings and view your history.</p>
        </motion.div>
        
        <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past Bookings</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-6">
                <Card>
                    <CardHeader><CardTitle>Upcoming Bookings</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {upcomingBookings.length > 0 ? upcomingBookings.map(booking => (
                            <BookingCard key={booking.id} booking={booking} onAction={handleAction} />
                        )) : <p className="text-plum/70">No upcoming bookings.</p>}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="past" className="mt-6">
                 <Card>
                    <CardHeader><CardTitle>Past Bookings</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {pastBookings.length > 0 ? pastBookings.map(booking => (
                            <BookingCard key={booking.id} booking={booking} onAction={handleAction} />
                        )) : <p className="text-plum/70">No past bookings.</p>}
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="account" className="mt-6">
                <Card>
                    <CardHeader><CardTitle>Account Settings</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-plum/80">Here you can manage your personal information and saved payment methods.</p>
                         <Button variant="outline" className="border-plum text-plum hover:bg-plum/10 hover:text-plum" onClick={() => handleAction('Manage Account')}>
                            <User className="mr-2 h-4 w-4" /> Manage Account
                        </Button>
                        <div className="border-t pt-4">
                             <Button variant="ghost" onClick={handleLogout}>Log Out</Button>
                        </div>
                    </CardContent>
                </Card>
             </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const BookingCard = ({ booking, onAction }) => (
    <Card className="bg-light-pink/30">
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
            <InfoItem icon={DollarSign} label="Total / Paid" value={`${booking.cost.toFixed(2)} / ${booking.paid.toFixed(2)}`} />
            {booking.status === 'Upcoming' && (
                <div className="col-span-2 md:col-span-2 flex flex-col sm:flex-row gap-2 justify-end">
                    {booking.paid < booking.cost && (
                        <Button variant="outline" size="sm" onClick={() => onAction('Make Payment')} className="border-gold text-gold hover:bg-gold/10 hover:text-gold"><DollarSign className="h-4 w-4 mr-1"/> Pay Balance</Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onAction('Reschedule')} className="border-plum text-plum hover:bg-plum/10 hover:text-plum"><Repeat className="h-4 w-4 mr-1"/> Reschedule</Button>
                    <Button variant="destructive" size="sm" onClick={() => onAction('Cancel')}><XCircle className="h-4 w-4 mr-1"/> Cancel</Button>
                </div>
            )}
        </CardContent>
    </Card>
);

const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center">
        <Icon className="h-5 w-5 mr-2 text-gold"/>
        <div>
            <p className="text-xs text-plum/70">{label}</p>
            <p className="font-semibold text-plum text-sm">{value}</p>
        </div>
    </div>
);

export default ClientPortalPage;