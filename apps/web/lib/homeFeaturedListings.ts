export type HomeFeaturedListing = {
  id: string;
  title: string;
  rating: number;
  media: {
    url: string;
    alt: string;
  };
  location: {
    generalArea: string;
    county: string;
  };
  rateAmount: number;
};

export const homeFeaturedListings: HomeFeaturedListing[] = [
  {
    id: "lst_electronics_camera_nairobi_007",
    title: "Canon R6 Camera and Lens Kit",
    rating: 4.9,
    media: {
      url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=72&h=1400",
      alt: "Professional camera kit on a desk"
    },
    location: {
      generalArea: "Kilimani and Hurlingham",
      county: "Nairobi"
    },
    rateAmount: 7500
  },
  {
    id: "lst_toys_bouncy_castle_nairobi_037",
    title: "Bouncy Castle and Kids Slide",
    rating: 4.9,
    media: {
      url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1000&q=72&h=1400",
      alt: "Children playing on colorful outdoor play equipment"
    },
    location: {
      generalArea: "Kasarani, Garden Estate, and Roysambu",
      county: "Nairobi"
    },
    rateAmount: 7500
  },
  {
    id: "lst_events_sound_nairobi_001",
    title: "JBL PA Sound System with Optional Engineer",
    rating: 4.9,
    media: {
      url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1000&q=72&h=1400",
      alt: "Live event sound mixer and stage equipment"
    },
    location: {
      generalArea: "Westlands and nearby estates",
      county: "Nairobi"
    },
    rateAmount: 8500
  }
];
