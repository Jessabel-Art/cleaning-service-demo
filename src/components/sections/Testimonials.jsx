import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const testimonialsData = [
  {
    name: "María R.",
    rating: 5,
    text: "Sanchez Services transformed my home! Their attention to detail is incredible, and the team is so professional.",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
  },
  {
    name: "James W.",
    rating: 5,
    text: "Best cleaning service in town! They’re reliable, thorough, and always leave my office sparkling clean.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
  },
  {
    name: "Sarah C.",
    rating: 5,
    text: "I’ve been using Sanchez Services for over a year. They’re trustworthy, efficient, and reasonably priced.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
  }
];

const ReviewForm = ({ onOpenChange }) => {
    const { toast } = useToast();
    const handleSubmit = (e) => {
        e.preventDefault();
        toast({
            title: "Thank you for your review! 🙏",
            description: "We appreciate your feedback.",
        });
        onOpenChange(false);
    }
    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" defaultValue="Your Name" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="review" className="text-right">Review</Label>
                    <Textarea id="review" placeholder="Tell us about your experience..." className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Rating</Label>
                    <div className="col-span-3 flex gap-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 text-gray-300 cursor-pointer hover:text-gold transition-colors" />)}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button type="submit" className="bg-gold hover:bg-gold/90 text-white rounded-full">Submit Review</Button>
            </DialogFooter>
        </form>
    )
}

const Testimonials = () => {
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const { toast } = useToast();

  const handleGoogleReviewsClick = () => {
    toast({
      title: "🚧 Feature in Progress!",
      description: "Live Google Reviews widget will be embedded here soon.",
    });
  };

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-plum mb-4">What Our Clients Say</h2>
          <p className="text-lg text-plum/80 max-w-2xl mx-auto">
            Real words from real clients who trust us to keep their spaces clean.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonialsData.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="testimonial-card h-full flex flex-col">
                <CardContent className="p-6 flex-grow flex flex-col">
                  <div className="flex items-center mb-4">
                     <Avatar>
                        <AvatarImage src={testimonial.image} alt={testimonial.name} />
                        <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4">
                      <h4 className="font-semibold text-plum">{testimonial.name}</h4>
                      <div className="flex">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 star-rating fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-plum/80 italic flex-grow">"{testimonial.text}"</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-12 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            onClick={() => setIsReviewFormOpen(true)}
            variant="outline"
            className="border-gold text-gold hover:bg-gold/10 hover:text-gold rounded-full px-6 py-3 text-base"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Submit Your Review
          </Button>
           <Button
            onClick={handleGoogleReviewsClick}
            variant="ghost"
            className="text-plum hover:text-gold"
          >
            Read more on Google
          </Button>
        </div>
      </div>
      <Dialog open={isReviewFormOpen} onOpenChange={setIsReviewFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
                Share your experience with us. Your feedback helps us improve.
            </DialogDescription>
            </DialogHeader>
            <ReviewForm onOpenChange={setIsReviewFormOpen} />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Testimonials;