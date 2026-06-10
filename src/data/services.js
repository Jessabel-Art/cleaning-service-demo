// Single source of truth for service metadata and client-side estimate pricing.

export const SERVICES = [
  {
    slug: "residential-cleaning",
    icon: "Home",
    title: "Residential Cleaning",
    bookingName: "Residential Cleaning",
    blurb: "Keep your home tidy, healthy, and stress-free.",
    priceFrom: 99,
    duration: "2-3 hrs avg",
    popular: false,
    recurringDiscountEligible: true,
    pricing: { basePrice: 80, durationMultiplier: 1 },
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
    slug: "deep-clean",
    icon: "Sparkles",
    title: "Deep Clean",
    bookingName: "Deep Clean",
    blurb: "Top-to-bottom detail with extra time on kitchens & baths.",
    priceFrom: 149,
    duration: "3-5 hrs avg",
    popular: true,
    recurringDiscountEligible: true,
    pricing: { basePrice: 120, durationMultiplier: 1.5 },
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
    slug: "move-in-move-out",
    icon: "Truck",
    title: "Move-In / Move-Out",
    bookingName: "Move-In/Move-Out",
    blurb: "Make your place move-ready - keys in or keys out.",
    priceFrom: 199,
    duration: "4-6 hrs avg",
    popular: false,
    recurringDiscountEligible: false,
    pricing: { basePrice: 144, durationMultiplier: 1.8 },
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
    slug: "office-cleaning",
    icon: "Building",
    title: "Office / Commercial",
    bookingName: "Office Cleaning",
    blurb: "A clean, healthy workspace for teams and customers.",
    priceFrom: 129,
    duration: "Custom",
    popular: false,
    recurringDiscountEligible: false,
    pricing: { basePrice: 0, sqftRate: 0.12, sqftPerHour: 500 },
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

export const ADD_ONS = [
  { id: "fridge", label: "Inside Fridge", price: 20, durationHours: 0.5 },
  { id: "oven", label: "Inside Oven", price: 20, durationHours: 0.5 },
  { id: "windows", label: "Interior Windows", price: 30, durationHours: 0.5 },
  { id: "baseboards", label: "Baseboards", price: 25, durationHours: 0.5 },
  { id: "laundry", label: "Laundry Fold", price: 15, durationHours: 0.5 },
  { id: "garage", label: "Garage Sweep", price: 20, durationHours: 0.5 },
  { id: "carpet", label: "Carpet Shampoo", price: 40, durationHours: 0.5 },
];

export const FREQUENCIES = [
  { id: "one-time", name: "One-time", discount: 0 },
  { id: "weekly", name: "Weekly", discount: 0.15 },
  { id: "biweekly", name: "Biweekly", discount: 0.1 },
  { id: "monthly", name: "Monthly", discount: 0.05 },
];

export const ESTIMATE_RULES = {
  bedroomPrice: 20,
  bathroomPrice: 25,
  bedroomDurationHours: 0.5,
  bathroomDurationHours: 0.5,
  baseDurationHours: 1,
  petPrice: 15,
  petDurationHours: 0.25,
  conditionMultipliers: {
    light: 0.9,
    standard: 1,
    heavy: 1.25,
  },
  conditionDurationMultipliers: {
    light: 1,
    standard: 1,
    heavy: 1.2,
  },
};

export function getServiceBySlug(slug) {
  return SERVICES.find((service) => service.slug === slug) || null;
}

export function getFrequencyById(id) {
  return FREQUENCIES.find((frequency) => frequency.id === id) || null;
}
