import type { ResourceListing } from "./types.js";

export const seededListings: ResourceListing[] = [
  {
    id: "lst_events_sound_nairobi_001",
    ownerId: "usr_owner_asha",
    kind: "good",
    category: "events",
    subCategory: "sound",
    title: "JBL PA Sound System with Optional Engineer",
    description: "Two powered tops, subwoofer, mixer, microphones, stands, and an owner-operated sound engineer option.",
    status: "active",
    media: [
      {
        id: "media_001",
        url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
        alt: "Live event sound mixer and stage equipment",
        isPrimary: true
      }
    ],
    location: {
      country: "Kenya",
      county: "Nairobi",
      town: "Westlands",
      generalArea: "Westlands and nearby estates",
      exactCoordinates: { latitude: -1.2641, longitude: 36.8028 },
      maxTravelRadiusKm: 40,
      countrywideAvailable: false
    },
    modeRules: [
      {
        mode: "self_operated",
        label: "Self-operated package",
        pricing: {
          billingMetric: "daily",
          rate: { amount: 8500, currency: "KES" },
          minimumUnits: 1,
          deposit: { amount: 25000, currency: "KES" },
          replacementValue: { amount: 180000, currency: "KES" },
          platformFeeRate: 0.08
        },
        requiresKyc: true,
        requiresDeposit: true
      },
      {
        mode: "owner_operated",
        label: "Engineer included",
        pricing: {
          billingMetric: "daily",
          rate: { amount: 18000, currency: "KES" },
          minimumUnits: 1,
          platformFeeRate: 0.08
        },
        requiresKyc: true,
        requiresDeposit: false
      }
    ],
    logistics: {
      deliveryModes: ["pickup", "local_delivery"],
      returnRequirements: "Return by 10:00 the next day unless amended in chat.",
      setupTimeMinutes: 90,
      overtimeRate: { amount: 2500, currency: "KES" },
      providesOwnTransport: true
    },
    unavailableWindows: [{ start: "2026-06-14T08:00:00+03:00", end: "2026-06-15T10:00:00+03:00" }],
    rating: 4.9,
    reviewCount: 42,
    metadata: { seedCountyPriority: 1, insuredByOwner: false },
    createdAt: "2026-05-24T12:00:00+03:00",
    updatedAt: "2026-05-24T12:00:00+03:00"
  },
  {
    id: "lst_tools_generator_kisumu_002",
    ownerId: "usr_owner_otieno",
    kind: "good",
    category: "tools",
    subCategory: "power",
    title: "7.5kVA Silent Generator",
    description: "Event and site generator with delivery available around Kisumu and regional dispatch on request.",
    status: "active",
    media: [
      {
        id: "media_002",
        url: "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=900&q=80",
        alt: "Portable power generator and cables",
        isPrimary: true
      }
    ],
    location: {
      country: "Kenya",
      county: "Kisumu",
      town: "Milimani",
      generalArea: "Milimani, Kisumu",
      exactCoordinates: { latitude: -0.1022, longitude: 34.7617 },
      maxTravelRadiusKm: 80,
      countrywideAvailable: true
    },
    modeRules: [
      {
        mode: "self_operated",
        label: "Pickup or delivered generator",
        pricing: {
          billingMetric: "daily",
          rate: { amount: 6000, currency: "KES" },
          minimumUnits: 1,
          deposit: { amount: 15000, currency: "KES" },
          replacementValue: { amount: 125000, currency: "KES" },
          platformFeeRate: 0.08
        },
        requiresKyc: true,
        requiresDeposit: true
      }
    ],
    logistics: {
      deliveryModes: ["pickup", "local_delivery", "regional_delivery", "countrywide_delivery"],
      returnRequirements: "Fuel level and hour meter are photographed at pickup and return."
    },
    unavailableWindows: [],
    rating: 4.7,
    reviewCount: 18,
    metadata: { seedCountyPriority: 1, fuelPolicy: "return_same_level" },
    createdAt: "2026-05-24T12:00:00+03:00",
    updatedAt: "2026-05-24T12:00:00+03:00"
  },
  {
    id: "lst_personnel_loader_mombasa_003",
    ownerId: "usr_owner_mwikali",
    kind: "personnel",
    category: "casual_labor",
    subCategory: "event_crew",
    title: "Verified Event Setup Crew",
    description: "Three-person crew for tent setup, chairs, staging, loading, and teardown around the coast.",
    status: "active",
    media: [
      {
        id: "media_003",
        url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=80",
        alt: "Outdoor event crew setting up a venue",
        isPrimary: true
      }
    ],
    location: {
      country: "Kenya",
      county: "Mombasa",
      town: "Nyali",
      generalArea: "Nyali and greater Mombasa",
      exactCoordinates: { latitude: -4.0435, longitude: 39.6682 },
      maxTravelRadiusKm: 65,
      countrywideAvailable: false
    },
    modeRules: [
      {
        mode: "operator_only",
        label: "Crew booking",
        pricing: {
          billingMetric: "hourly",
          rate: { amount: 1800, currency: "KES" },
          minimumUnits: 4,
          platformFeeRate: 0.1
        },
        requiresKyc: true,
        requiresDeposit: false
      }
    ],
    logistics: {
      deliveryModes: ["local_delivery"],
      setupTimeMinutes: 30,
      overtimeRate: { amount: 2400, currency: "KES" },
      providesOwnTransport: true
    },
    unavailableWindows: [],
    rating: 4.8,
    reviewCount: 27,
    metadata: { maxCrewSize: 6 },
    createdAt: "2026-05-24T12:00:00+03:00",
    updatedAt: "2026-05-24T12:00:00+03:00"
  },
  {
    id: "lst_space_studio_nakuru_004",
    ownerId: "usr_owner_wanjiku",
    kind: "service",
    category: "spaces",
    subCategory: "studio",
    title: "Podcast and Product Shoot Studio",
    description: "Small studio with lights, backdrops, table setup, and optional camera operator.",
    status: "active",
    media: [
      {
        id: "media_004",
        url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=80",
        alt: "Recording studio with microphones and monitors",
        isPrimary: true
      }
    ],
    location: {
      country: "Kenya",
      county: "Nakuru",
      town: "Section 58",
      generalArea: "Section 58, Nakuru",
      exactCoordinates: { latitude: -0.3031, longitude: 36.0800 },
      maxTravelRadiusKm: 0,
      countrywideAvailable: false
    },
    modeRules: [
      {
        mode: "self_operated",
        label: "Studio only",
        pricing: {
          billingMetric: "hourly",
          rate: { amount: 2500, currency: "KES" },
          minimumUnits: 2,
          deposit: { amount: 5000, currency: "KES" },
          replacementValue: { amount: 80000, currency: "KES" },
          platformFeeRate: 0.08
        },
        requiresKyc: true,
        requiresDeposit: true
      },
      {
        mode: "owner_operated",
        label: "Operator included",
        pricing: {
          billingMetric: "hourly",
          rate: { amount: 4200, currency: "KES" },
          minimumUnits: 2,
          platformFeeRate: 0.08
        },
        requiresKyc: true,
        requiresDeposit: false
      }
    ],
    logistics: {
      deliveryModes: ["pickup"],
      setupTimeMinutes: 20,
      overtimeRate: { amount: 4500, currency: "KES" }
    },
    unavailableWindows: [],
    rating: 4.6,
    reviewCount: 11,
    metadata: { rooms: 2 },
    createdAt: "2026-05-24T12:00:00+03:00",
    updatedAt: "2026-05-24T12:00:00+03:00"
  }
];
