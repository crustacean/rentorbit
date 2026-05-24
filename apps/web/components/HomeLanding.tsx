"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  CircleUserRound,
  Drill,
  Headphones,
  LogIn,
  Search,
  Sparkles,
  UserPlus
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type OfferingKey = "goods" | "personnel" | "services";

type ListingCard = {
  title: string;
  area: string;
  price: string;
  image: string;
};

type Offering = {
  key: OfferingKey;
  title: string;
  eyebrow: string;
  image: string;
  icon: React.ReactNode;
  listings: ListingCard[];
};

const heroImage =
  "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=2200&q=85";

const offerings: Offering[] = [
  {
    key: "goods",
    title: "Goods",
    eyebrow: "Equipment, tools, spaces, fashion",
    image: "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=1200&q=80",
    icon: <Drill className="h-5 w-5" aria-hidden="true" />,
    listings: [
      {
        title: "7.5kVA Silent Generator",
        area: "Kisumu",
        price: "KES 6,000/day",
        image: "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Sony FX3 Camera Rig",
        area: "Nairobi",
        price: "KES 8,500/day",
        image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Event Tent Package",
        area: "Nakuru",
        price: "KES 12,000/day",
        image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Projector and Screen",
        area: "Mombasa",
        price: "KES 4,200/day",
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Moving Van",
        area: "Kiambu",
        price: "KES 9,000/day",
        image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Wedding Gown",
        area: "Eldoret",
        price: "KES 5,500/day",
        image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Podcast Studio",
        area: "Nakuru",
        price: "KES 2,500/hr",
        image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Camping Kit",
        area: "Naivasha",
        price: "KES 3,000/day",
        image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "PA Speaker Set",
        area: "Nairobi",
        price: "KES 8,500/day",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Pressure Washer",
        area: "Thika",
        price: "KES 2,200/day",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=500&q=80"
      }
    ]
  },
  {
    key: "personnel",
    title: "Personnel",
    eyebrow: "Operators, crews, support workers",
    image: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80",
    icon: <BadgeCheck className="h-5 w-5" aria-hidden="true" />,
    listings: [
      {
        title: "Event Setup Crew",
        area: "Mombasa",
        price: "KES 1,800/hr",
        image: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Camera Operator",
        area: "Nairobi",
        price: "KES 4,000/hr",
        image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Forklift Operator",
        area: "Athi River",
        price: "KES 3,500/hr",
        image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Driver With Van",
        area: "Kiambu",
        price: "KES 7,500/day",
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Stage Ushers",
        area: "Nakuru",
        price: "KES 1,200/hr",
        image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Sound Engineer",
        area: "Nairobi",
        price: "KES 5,000/hr",
        image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Loaders Team",
        area: "Kisumu",
        price: "KES 1,500/hr",
        image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Catering Staff",
        area: "Mombasa",
        price: "KES 2,000/hr",
        image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Machine Operator",
        area: "Eldoret",
        price: "KES 3,200/hr",
        image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Event Security Lead",
        area: "Nairobi",
        price: "KES 3,800/hr",
        image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=500&q=80"
      }
    ]
  },
  {
    key: "services",
    title: "Services",
    eyebrow: "Managed rentals and skilled help",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
    icon: <Headphones className="h-5 w-5" aria-hidden="true" />,
    listings: [
      {
        title: "DJ and Lighting Set",
        area: "Nairobi",
        price: "KES 28,000/event",
        image: "https://images.unsplash.com/photo-1571266028243-d220c9c3b7d2?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Full Event Sound",
        area: "Nakuru",
        price: "KES 38,000/event",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Photo Booth Crew",
        area: "Mombasa",
        price: "KES 18,000/event",
        image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Tent Setup Service",
        area: "Kiambu",
        price: "KES 16,000/event",
        image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Product Shoot Team",
        area: "Nairobi",
        price: "KES 22,000/session",
        image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Home Deep Cleaning",
        area: "Kisumu",
        price: "KES 9,500/job",
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Furniture Moving",
        area: "Nairobi",
        price: "KES 14,000/job",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Stage Buildout",
        area: "Eldoret",
        price: "KES 45,000/event",
        image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Catering Setup",
        area: "Mombasa",
        price: "KES 25,000/event",
        image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=500&q=80"
      },
      {
        title: "Live Stream Package",
        area: "Nairobi",
        price: "KES 35,000/event",
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80"
      }
    ]
  }
];

export function HomeLanding() {
  return (
    <main className="min-h-screen bg-orbit-field text-orbit-ink">
      <section className="relative isolate flex min-h-svh overflow-hidden">
        <img src={heroImage} alt="RentOrbit marketplace scene" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-black/45" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-black/55 to-transparent" />

        <header className="absolute left-4 top-4 z-20 flex items-center gap-3 rounded-md bg-orbit-panel/90 px-3 py-2 shadow-panel backdrop-blur sm:left-8 sm:top-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-orbit-green text-orbit-field">
            <span className="text-lg font-black">RO</span>
          </div>
          <div>
            <p className="text-lg font-black leading-none">RentOrbit</p>
            <p className="mt-1 text-xs font-semibold text-neutral-600">Kenya marketplace</p>
          </div>
        </header>

        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-8 sm:top-8">
          <ThemeSwitcher compact />
          <Link
            href="/account"
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orbit-panel/90 text-orbit-ink shadow-panel backdrop-blur transition-colors hover:bg-orbit-panel"
            title="Account"
          >
            <CircleUserRound className="h-7 w-7" aria-hidden="true" />
            <span className="sr-only">Account</span>
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[1600px] items-end px-4 pb-28 pt-28 sm:px-8 lg:pb-32">
          <div className="image-overlay-element max-w-3xl text-white">
            <div className="image-overlay-element image-overlay-surface mb-5 inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-sm font-bold backdrop-blur">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Goods, personnel, and services
            </div>
            <h1 className="text-5xl font-black leading-none sm:text-7xl lg:text-8xl">RentOrbit</h1>
            <p className="image-overlay-element mt-5 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
              Rent what you need, list what you own, and keep every booking tied to verified identity, in-app terms, and secure payment records.
            </p>
          </div>
        </div>

        <div className="absolute bottom-6 left-4 z-20 flex flex-wrap gap-3 sm:left-8">
          <Link
            href="/account?mode=signup"
            className="image-overlay-element image-overlay-surface inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-orbit-panel px-5 py-3 text-sm font-black text-orbit-ink shadow-panel transition hover:-translate-y-0.5"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Sign up
          </Link>
          <Link
            href="/account"
            className="image-overlay-element image-overlay-surface inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/40 bg-black/35 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
        </div>

        <div className="absolute bottom-5 right-4 hidden gap-2 sm:flex sm:right-8" aria-hidden="true">
          <span className="h-2 w-14 rounded-full bg-white" />
          <span className="h-2 w-10 rounded-full bg-white/50" />
          <span className="h-2 w-8 rounded-full bg-white/35" />
        </div>
      </section>

      <section id="offerings" className="flex min-h-[70svh] px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
        <div className="flex min-h-[calc(70svh-2rem)] w-full flex-col sm:min-h-[calc(70svh-2.5rem)] lg:min-h-[calc(70svh-3rem)]">
          <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-orbit-green">Browse the orbit</p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">Choose an offering</h2>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex w-fit items-center gap-2 rounded-md border border-orbit-line bg-orbit-panel px-4 py-3 text-sm font-black shadow-panel"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Open marketplace
            </Link>
          </div>

          <div className="grid min-h-0 flex-1 w-full gap-4 xl:grid-cols-3">
            {offerings.map((offering) => (
              <OfferingPhone key={offering.key} offering={offering} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function OfferingPhone({ offering }: { offering: Offering }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const viewAllIndex = offering.listings.length;
  const isViewAllPage = activeIndex === viewAllIndex;
  const canSlideLeft = activeIndex > 0;
  const canSlideRight = activeIndex < viewAllIndex;
  const stackListings = [0, 1, 2].map((offset) => offering.listings[activeIndex + offset]);

  useEffect(() => {
    return () => {
      if (fadeTimer.current) {
        clearTimeout(fadeTimer.current);
      }
    };
  }, []);

  function scrollByCard(direction: "left" | "right") {
    const nextIndex = direction === "left" ? Math.max(0, activeIndex - 1) : Math.min(viewAllIndex, activeIndex + 1);

    if (nextIndex === activeIndex) {
      return;
    }

    if (fadeTimer.current) {
      clearTimeout(fadeTimer.current);
    }

    setIsFading(true);
    setActiveIndex(nextIndex);

    fadeTimer.current = setTimeout(() => {
      setIsFading(false);
    }, 180);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    pointerStartX.current = event.clientX;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    if (pointerStartX.current === null) {
      return;
    }

    const distance = event.clientX - pointerStartX.current;
    pointerStartX.current = null;

    if (Math.abs(distance) < 48) {
      return;
    }

    event.preventDefault();
    scrollByCard(distance < 0 ? "right" : "left");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByCard("left");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByCard("right");
    }
  }

  return (
    <article
      className="group relative h-[80svh] min-h-[640px] overflow-hidden rounded-[34px] bg-transparent shadow-[0_2px_12px_rgba(25,32,29,0.24)] outline-none xl:h-full xl:min-h-0"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="relative h-full overflow-hidden rounded-[34px] bg-neutral-200">
        <img src={offering.image} alt={`${offering.title} rentals`} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/25 transition duration-300 group-hover:bg-black/45" />
        <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-black/65 to-transparent" />

        <div className="absolute left-5 right-5 top-5 z-10 flex items-start justify-between gap-3">
          <div className="image-overlay-element min-w-0 text-white">
            <div className="image-overlay-element image-overlay-surface mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              {offering.icon}
            </div>
            <h3 className="text-4xl font-black leading-none">{offering.title}</h3>
            <p className="image-overlay-element mt-2 max-w-[260px] text-sm font-semibold text-white/80">{offering.eyebrow}</p>
          </div>
          <Link href={`/marketplace?category=${offering.key}`} className="image-overlay-element image-overlay-surface rounded-full bg-orbit-panel px-4 py-3 text-sm font-black text-orbit-ink">
            View
          </Link>
        </div>

        <div
          className={`pointer-events-none absolute left-1/2 top-[18%] z-20 h-[70%] w-[clamp(280px,72%,520px)] -translate-x-1/2 opacity-0 transition duration-300 group-hover:pointer-events-auto group-hover:opacity-100 ${
            isFading
              ? "scale-[0.98] group-hover:opacity-75"
              : "scale-100"
          }`}
          key={`${offering.key}-${activeIndex}`}
          aria-label={`${offering.title} sample listings`}
          aria-live="polite"
        >
          {isViewAllPage ? (
            <ViewAllStack offering={offering} />
          ) : (
            stackListings.map((listing, index) =>
              listing ? <StackedListingPreview key={`${listing.title}-${activeIndex}-${index}`} listing={listing} index={index} /> : null
            )
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-50 translate-y-5 opacity-0 transition duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <div className="mx-auto flex h-[75px] w-[clamp(280px,88%,620px)] items-center justify-between rounded-full bg-orbit-soft/85 p-[3px] backdrop-blur-md">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                scrollByCard("left");
              }}
              disabled={!canSlideLeft}
              className="inline-flex h-full aspect-square shrink-0 items-center justify-center rounded-full bg-orbit-panel p-[0.5%] text-orbit-ink disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45"
              title="Slide left"
              aria-label={`Show previous ${offering.title} listing`}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-center text-[18px] font-semibold text-orbit-ink">Slide left and right</span>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                scrollByCard("right");
              }}
              disabled={!canSlideRight}
              className="image-overlay-element image-overlay-strong inline-flex h-full aspect-square shrink-0 items-center justify-center rounded-full bg-black p-[0.5%] text-white disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45"
              title="Slide right"
              aria-label={`Show next ${offering.title} listing`}
            >
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function StackedListingPreview({ listing, index }: { listing: ListingCard; index: number }) {
  const layers = [
    "inset-x-0 top-0 z-30 h-[78%] opacity-100",
    "inset-x-[7%] top-[12%] z-20 h-[72%] opacity-[0.88]",
    "inset-x-[14%] top-[24%] z-10 h-[66%] opacity-75"
  ];

  return (
    <Link
      href={`/marketplace?listing=${encodeURIComponent(listing.title)}`}
      className={`absolute overflow-hidden rounded-[30px] bg-orbit-panel text-left shadow-[0_18px_45px_rgba(0,0,0,0.2)] transition duration-300 ${layers[index]}`}
      style={{ transform: `scale(${1 - index * 0.06})` }}
    >
      <img src={listing.image} alt={listing.title} className="h-[62%] w-full object-cover" />
      <div className="grid gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-2xl font-black text-orbit-ink">{listing.price.replace("KES ", "")}</span>
          <span className="orbit-tag rounded-full bg-orbit-panel px-3 py-2 text-xs font-black text-orbit-amber">4.9</span>
        </div>
        <h4 className="line-clamp-2 text-base font-black text-orbit-ink">{listing.title}</h4>
        <p className="truncate text-sm font-semibold text-neutral-500">{listing.area}</p>
      </div>
    </Link>
  );
}

function ViewAllStack({ offering }: { offering: Offering }) {
  return (
    <Link
      href={`/marketplace?offering=${offering.key}`}
      className="absolute inset-x-0 top-0 z-30 h-[78%] overflow-hidden rounded-[30px] bg-orbit-panel text-left shadow-[0_18px_45px_rgba(0,0,0,0.2)] transition duration-300"
    >
      <span className="relative block h-[62%] w-full overflow-hidden">
        <img src={offering.image} alt={`${offering.title} listings`} className="h-full w-full object-cover" />
        <span className="absolute inset-0 bg-black/30" />
        <span className="image-overlay-element image-overlay-surface absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-orbit-green">
          {offering.icon}
        </span>
      </span>
      <span className="grid gap-2 p-4 text-center">
        <span className="text-2xl font-black text-orbit-ink">View all</span>
        <span className="text-base font-semibold text-neutral-600">{offering.title} listings across Kenya</span>
        <span className="image-overlay-element image-overlay-strong mx-auto mt-2 inline-flex h-[60px] w-fit items-center justify-center gap-2 rounded-full bg-black px-6 text-sm font-black text-white">
          Open marketplace
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
