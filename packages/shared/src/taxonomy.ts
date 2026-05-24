export type MarketplaceCategory = {
  id: string;
  label: string;
  examples: string[];
};

export const marketplaceCategories: MarketplaceCategory[] = [
  { id: "events", label: "Events", examples: ["Tents", "sound systems", "lighting", "chairs", "DJs"] },
  { id: "tools", label: "Tools", examples: ["Drills", "ladders", "generators", "welding kits"] },
  { id: "vehicles", label: "Vehicles", examples: ["Vans", "motorbikes", "moving trucks", "chauffeurs"] },
  { id: "electronics", label: "Electronics", examples: ["Cameras", "projectors", "laptops", "drones"] },
  { id: "fashion", label: "Fashion", examples: ["Suits", "gowns", "costumes", "jewelry"] },
  { id: "home", label: "Home", examples: ["Appliances", "furniture", "cleaning machines"] },
  { id: "spaces", label: "Spaces", examples: ["Studios", "meeting rooms", "yards", "storage"] },
  { id: "sports", label: "Sports", examples: ["Bikes", "camping gear", "fitness equipment"] },
  { id: "professional_services", label: "Professional Services", examples: ["Photography", "sound engineering", "accounting"] },
  { id: "domestic_help", label: "Domestic Help", examples: ["Cleaning", "cooking", "child care", "elder care"] },
  { id: "casual_labor", label: "Casual Labor", examples: ["Loaders", "ushers", "farm help", "event crew"] },
  { id: "operators", label: "Operators", examples: ["Drivers", "camera operators", "machine operators"] }
];

export const kenyaCounties = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot"
] as const;

export const featuredLaunchCounties = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Uasin Gishu"] as const;
