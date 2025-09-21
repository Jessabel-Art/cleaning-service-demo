import React from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';
import BrandMark from '@/components/BrandMark';

const Footer = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSocialClick = (platform) => {
    toast({
      title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const handleServiceAreaClick = (area) => {
    toast({
      title: `Searching for services in ${area}...`,
      description: "This feature will be available soon!",
    });
    // In a real app, you might navigate(`/book?area=${area}`);
  };

  const trustBadges = [
    { name: 'Google Reviews', img: 'https://images.unsplash.com/photo-1611162618071-b37a2ecb5e9c?w=100&h=30&fit=crop' },
    { name: 'Yelp', img: 'https://images.unsplash.com/photo-1611162616801-692042855f49?w=100&h=30&fit=crop' },
    { name: 'BBB', img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=30&fit=crop' }
  ];

  return (
    <footer className="bg-plum text-white pt-16 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
          {/* Brand + blurb */}
          <div className="md:col-span-1">
            <Link to="/" aria-label="Sanchez Services home" className="flex items-center justify-center md:justify-start mb-4">
              <BrandMark variant="white" className="h-10 w-auto" />
            </Link>
            <p className="text-white/80 mb-4 text-sm">
              Professional cleaning services you can trust. Where clean meets care.
            </p>

            {/* Socials */}
            <div className="flex space-x-4 justify-center md:justify-start">
              <button onClick={() => handleSocialClick('facebook')} aria-label="Facebook"
                className="w-9 h-9 bg-gold/80 rounded-full flex items-center justify-center hover:bg-gold transition-colors">
                <Facebook className="w-5 h-5 text-white" />
              </button>
              <button onClick={() => handleSocialClick('instagram')} aria-label="Instagram"
                className="w-9 h-9 bg-gold/80 rounded-full flex items-center justify-center hover:bg-gold transition-colors">
                <Instagram className="w-5 h-5 text-white" />
              </button>
              <button onClick={() => handleSocialClick('twitter')} aria-label="Twitter"
                className="w-9 h-9 bg-gold/80 rounded-full flex items-center justify-center hover:bg-gold transition-colors">
                <Twitter className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gold">Quick Links</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link to="/services" className="hover:text-gold transition-colors">Services</Link></li>
              <li><Link to="/book" className="hover:text-gold transition-colors">Book Now</Link></li>
              <li><Link to="/portal" className="hover:text-gold transition-colors">Client Portal</Link></li>
              <li><Link to="/contact" className="hover:text-gold transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Service areas */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gold">Service Areas</h4>
            <ul className="space-y-2 text-white/80">
              {['Downtown', 'Westside', 'Northbrook', 'Riverdale', 'Oakwood', 'Hillcrest'].map((area) => (
                <li key={area}>
                  <button onClick={() => handleServiceAreaClick(area)} className="hover:text-gold transition-colors">
                    {area}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-gold">Contact Info</h4>
            <div className="space-y-2 text-white/80">
              <div className="flex items-center space-x-2 justify-center md:justify-start">
                <Phone className="w-4 h-4 text-gold" />
                <span>(555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2 justify-center md:justify-start">
                <Mail className="w-4 h-4 text-gold" />
                <span>info@sanchezservices.com</span>
              </div>
              <div className="flex items-center space-x-2 justify-center md:justify-start">
                <MapPin className="w-4 h-4 text-gold" />
                <span>Serving Greater Metro Area</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/20 mt-8 pt-8 text-center">
          <div className="flex justify-center items-center gap-4 mb-4">
            {trustBadges.map((badge) => (
              <img
                key={badge.name}
                src={badge.img}
                alt={`${badge.name} Trust Badge`}
                className="h-8 opacity-70 hover:opacity-100 transition-opacity"
                loading="lazy"
              />
            ))}
          </div>
          <div className="text-white/60 text-sm flex justify-center gap-4">
            <Link to="/privacy-policy" className="hover:text-gold transition-colors">Privacy Policy</Link>
            <span>|</span>
            <Link to="/terms-of-service" className="hover:text-gold transition-colors">Terms of Service</Link>
          </div>
          <p className="text-white/60 mt-4 text-xs">
            © {new Date().getFullYear()} Sanchez Services. All rights reserved. Licensed & Insured.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
