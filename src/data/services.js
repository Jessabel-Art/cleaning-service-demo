// src/data/services.js
// Single source of truth for service metadata used across the site.

export const SERVICES = [
  {
    slug: "residential-cleaning",
    icon: "Home",
    title: "Residential Cleaning",
    blurb: "Keep your home tidy, healthy, and stress-free.",
    priceFrom: 99,
    duration: "2–3 hrs avg",
    popular: false,
    bestFor: "Apartments, condos, and homes that need routine upkeep.",
    includes: [
      "Dust all surfaces & ceiling fans",
      "Vacuum & mop floors",
      "Kitchen wipe-down (exterior appliances, counters, sink)",
      "Bathrooms (toilet, tub/shower, mirrors)",
      "Make beds, tidy rooms, empty trash",
    ],
  },
  {
    slug: "deep-cleaning",
    icon: "Sparkles",
    title: "Deep Clean",
    blurb: "Top-to-bottom detail with extra time on kitchens & baths.",
    priceFrom: 149,
    duration: "3–5 hrs avg",
    popular: true,
    bestFor: "First-time cleans, seasonal refreshes, or before hosting.",
    includes: [
      "Everything in Residential",
      "Baseboards, doors, door frames",
      "Detailed kitchen (cabinet faces, backsplash)",
      "Bathroom detailing (tile, grout edges)",
      "Window sills, tracks, light switches",
    ],
  },
  {
    slug: "moving-cleaning",
    icon: "Truck",
    title: "Move-In / Move-Out",
    blurb: "Make your place move-ready—keys in or keys out.",
    priceFrom: 199,
    duration: "4–6 hrs avg",
    popular: false,
    bestFor: "Landlords, renters, buyers, and sellers.",
    includes: [
      "Inside cabinets & drawers (empty)",
      "Inside fridge & oven (add-on if heavy)",
      "Appliance exteriors & counters",
      "Bathrooms sanitized top to bottom",
      "Baseboards, closets, window sills",
    ],
  },
  {
    slug: "commercial-cleaning",
    icon: "Building",
    title: "Office / Commercial",
    blurb: "A clean, healthy workspace for teams and customers.",
    priceFrom: 129,
    duration: "Custom",
    popular: false,
    bestFor: "Offices, studios, retail suites, and common areas.",
    includes: [
      "Dust & disinfect high-touch surfaces",
      "Vacuum/mop floors & entryways",
      "Kitchenette break areas",
      "Restrooms stocked & sanitized",
      "Trash removal & recycling",
    ],
  },
];

// Optional: site-wide add-ons/offers can live here too if you want to reuse them elsewhere.
export const ADD_ONS = [
  { id: "fridge", label: "Inside Fridge", price: 25 },
  { id: "oven", label: "Inside Oven", price: 25 },
  { id: "windows", label: "Interior Windows", price: 30 },
  { id: "baseboards", label: "Baseboards Detailing", price: 30 },
  { id: "laundry", label: "One Load Laundry", price: 20 },
  { id: "garage", label: "Garage Sweep", price: 20 },
];
