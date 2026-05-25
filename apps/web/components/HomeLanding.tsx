"use client";

import {
  ArrowLeft,
  ArrowRight,
  CircleUserRound,
  LogIn,
  Search,
  Sparkles,
  UserPlus
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import Link from "next/link";
import { seededListings, type ResourceListing } from "@rentorbit/shared";
import { useEffect, useRef, useState } from "react";

const newDealCategories = new Set(["events", "tools", "electronics", "vehicles", "spaces"]);

function stableHash(value: string) {
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 9973, 17);
}

function dealScore(listing: ResourceListing) {
  const categoryBoost = newDealCategories.has(listing.category) ? 400 : 0;
  return categoryBoost + listing.rating * 100 + listing.reviewCount + (stableHash(listing.id) % 73);
}

const newDealListings = [...seededListings]
  .filter((listing) => listing.status === "active" && listing.media.length > 0)
  .sort((left, right) => dealScore(right) - dealScore(left))
  .slice(0, 10);

type DealCard =
  | { kind: "marketplace"; id: string; backgroundListing?: ResourceListing }
  | { kind: "listing"; id: string; listing: ResourceListing };

function kes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(amount);
}

export function HomeLanding() {
  return (
    <main id="top" className="landing-shell min-h-svh text-orbit-ink">
      <div className="flex min-h-svh flex-col">
        <header className="flex w-full shrink-0 items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="RentOrbit home">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-orbit-green text-orbit-field">
              <span className="text-lg font-black">RO</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black leading-none text-orbit-ink sm:text-2xl">RentOrbit</p>
              <p className="mt-1 truncate text-sm font-semibold text-orbit-ink/65">Kenya marketplace</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitcher compact />
            <Link
              href="/account"
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orbit-panel/85 text-orbit-ink shadow-[0_2px_14px_rgba(25,32,29,0.12)] backdrop-blur transition-colors hover:bg-orbit-panel focus-visible:outline-none"
              title="Account"
            >
              <CircleUserRound className="h-7 w-7" aria-hidden="true" />
              <span className="sr-only">Account</span>
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-7 px-4 py-4 sm:px-8 lg:grid-cols-[minmax(340px,0.86fr)_minmax(440px,0.94fr)] lg:gap-8 lg:py-2">
          <div className="w-full max-w-2xl justify-self-start lg:ml-[5.5vw]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orbit-panel/72 px-4 py-3 text-xs font-black text-orbit-green shadow-[0_10px_28px_rgba(25,32,29,0.08)] sm:mb-5 sm:text-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Countrywide rentals
            </div>
            <h1 className="text-5xl font-black leading-none text-orbit-ink sm:text-6xl xl:text-7xl 2xl:text-8xl">RentOrbit</h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-orbit-ink/68 sm:text-lg sm:leading-8 xl:text-xl">
              A national Kenyan marketplace for renting goods, booking services, and finding verified personnel.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
              <LandingAction href="/account?mode=signup" icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}>
                Sign up
              </LandingAction>
              <LandingAction href="/account" icon={<LogIn className="h-4 w-4" aria-hidden="true" />}>
                Sign in
              </LandingAction>
              <LandingAction href="/marketplace" icon={<Search className="h-4 w-4" aria-hidden="true" />}>
                Go To Marketplace
              </LandingAction>
            </div>
          </div>

          <div className="w-full max-w-[520px] justify-self-center sm:max-w-[620px] lg:max-w-[676px] lg:justify-self-end lg:pr-[2vw] xl:pr-[4vw] 2xl:pr-[6vw]">
            <DealsWindow listings={newDealListings} />
          </div>
        </section>

        <LandingFooter />
      </div>
    </main>
  );
}

function LandingAction({
  href,
  icon,
  children
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#EFBF04] px-5 text-xs font-black text-[#1a1a1a] shadow-[0_12px_30px_rgba(25,32,29,0.12)] transition-colors hover:bg-[#d9ad03] focus-visible:outline-none sm:min-h-14 sm:px-6 sm:text-sm"
    >
      {icon}
      {children}
    </Link>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-footer shrink-0 px-4 py-4 sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 text-sm font-black text-orbit-ink/65 sm:flex-row sm:items-center sm:justify-between">
        <p>Countrywide Kenyan rentals for goods, services, and personnel.</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          <Link href="/marketplace" className="hover:text-orbit-green">Marketplace</Link>
          <Link href="/account?mode=signup" className="hover:text-orbit-green">List a resource</Link>
          <Link href="/account" className="hover:text-orbit-green">Account</Link>
          <a href="mailto:hello@rentorbit.co.ke" className="hover:text-orbit-green">hello@rentorbit.co.ke</a>
        </nav>
      </div>
    </footer>
  );
}

function DealsWindow({ listings }: { listings: ResourceListing[] }) {
  const dealCards: DealCard[] = [
    { kind: "marketplace", id: "marketplace-start", backgroundListing: listings[0] },
    ...listings.map((listing) => ({ kind: "listing" as const, id: listing.id, listing })),
    { kind: "marketplace", id: "marketplace-end", backgroundListing: listings[listings.length - 1] }
  ];
  const [activeIndex, setActiveIndex] = useState(1);
  const [isFading, setIsFading] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const preloadedImages = useRef<HTMLImageElement[]>([]);
  const lastIndex = Math.max(0, dealCards.length - 1);
  const canSlideLeft = activeIndex > 0;
  const canSlideRight = activeIndex < lastIndex;
  const stackCards = [0, 1, 2].map((offset) => dealCards[activeIndex + offset]);
  const activeCard = dealCards[activeIndex];
  const backgroundListing =
    activeCard?.kind === "listing"
      ? activeCard.listing
      : activeCard?.backgroundListing ?? listings[0];
  const backgroundMedia = backgroundListing?.media[0];

  useEffect(() => {
    const imageUrls = Array.from(new Set(listings.flatMap((listing) => listing.media.map((media) => media.url))));

    preloadedImages.current = imageUrls.map((url) => {
      const image = new window.Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = url;
      void image.decode?.().catch(() => undefined);
      return image;
    });

    return () => {
      preloadedImages.current = [];
    };
  }, [listings]);

  useEffect(() => {
    return () => {
      if (fadeTimer.current) {
        clearTimeout(fadeTimer.current);
      }
    };
  }, []);

  function scrollByCard(direction: "left" | "right") {
    const nextIndex = direction === "left" ? Math.max(0, activeIndex - 1) : Math.min(lastIndex, activeIndex + 1);

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
      className="group relative h-[48svh] min-h-[374px] max-h-[682px] overflow-hidden rounded-[34px] bg-transparent outline-none sm:h-[64svh] sm:min-h-[495px] lg:h-[84svh] lg:min-h-[660px] lg:max-h-[902px]"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="relative h-full overflow-hidden rounded-[34px] bg-transparent">
        {backgroundMedia ? (
          <img src={backgroundMedia.url} alt={backgroundMedia.alt} loading="eager" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-black/32" />
        <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-black/65 to-transparent" />

        <div className="absolute left-4 right-4 top-4 z-10 sm:left-5 sm:right-5 sm:top-5">
          <h3 className="image-overlay-element font-sans text-4xl font-thin leading-none text-white sm:text-5xl xl:text-6xl 2xl:text-7xl">New Deals</h3>
        </div>

        <div
          className={`pointer-events-auto absolute left-1/2 top-[18%] z-20 h-[70%] w-[clamp(270px,76%,676px)] -translate-x-1/2 opacity-100 transition duration-300 ${
            isFading ? "scale-[0.98] opacity-75" : "scale-100"
          }`}
          key={`new-deals-${activeIndex}`}
          aria-label="New Deals sample listings"
          aria-live="polite"
        >
          {stackCards.map((card, index) =>
            card ? <StackedDealCard key={`${card.id}-${activeIndex}-${index}`} card={card} index={index} /> : null
          )}
        </div>

        <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-50 translate-y-0 opacity-100 transition duration-300">
          <div className="mx-auto flex h-[64px] w-[clamp(270px,88%,806px)] items-center justify-between rounded-full bg-orbit-soft/85 p-[3px] backdrop-blur-md sm:h-[75px]">
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
              aria-label="Show previous deal"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="text-center text-base font-semibold text-orbit-ink sm:text-lg">Slide left and right</span>
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
              aria-label="Show next deal"
            >
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function StackedDealCard({ card, index }: { card: DealCard; index: number }) {
  if (card.kind === "marketplace") {
    return <MarketplaceDealCard backgroundListing={card.backgroundListing} index={index} />;
  }

  return <ListingDealCard listing={card.listing} index={index} />;
}

function ListingDealCard({ listing, index }: { listing: ResourceListing; index: number }) {
  const layers = [
    "inset-x-0 top-0 z-30 h-[78%] opacity-100",
    "inset-x-[7%] top-[12%] z-20 h-[72%] opacity-[0.88]",
    "inset-x-[14%] top-[24%] z-10 h-[66%] opacity-75"
  ];
  const media = listing.media[0];
  const rate = kes(listing.modeRules[0]?.pricing.rate.amount ?? 0);

  return (
    <Link
      href={`/marketplace?listing=${encodeURIComponent(listing.id)}`}
      className={`deal-stack-card absolute overflow-hidden rounded-[30px] text-left shadow-[0_18px_45px_rgba(0,0,0,0.16)] transition duration-300 ${layers[index]}`}
      style={{ transform: `scale(${1 - index * 0.06})` }}
    >
      {media ? <img src={media.url} alt={media.alt || listing.title} loading="eager" decoding="async" className="h-[62%] w-full object-cover" /> : null}
      <div className="grid gap-1 p-3 sm:gap-2 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-lg font-black text-orbit-ink sm:text-2xl 2xl:text-3xl">{rate.replace("KES", "").trim()}</span>
          <span className="orbit-tag rounded-full bg-orbit-panel px-2 py-1 text-[10px] font-black text-orbit-amber sm:px-3 sm:py-2 sm:text-xs">{listing.rating.toFixed(1)}</span>
        </div>
        <h4 className="line-clamp-2 text-sm font-black text-orbit-ink sm:text-base 2xl:text-lg">{listing.title}</h4>
        <p className="truncate text-xs font-semibold text-neutral-500 sm:text-sm">
          {listing.location.generalArea}, {listing.location.county}
        </p>
      </div>
    </Link>
  );
}

function MarketplaceDealCard({
  backgroundListing,
  index
}: {
  backgroundListing?: ResourceListing;
  index: number;
}) {
  const layers = [
    "inset-x-0 top-0 z-30 h-[78%] opacity-100",
    "inset-x-[7%] top-[12%] z-20 h-[72%] opacity-[0.88]",
    "inset-x-[14%] top-[24%] z-10 h-[66%] opacity-75"
  ];
  const media = backgroundListing?.media[0];

  return (
    <Link
      href="/marketplace"
      className={`deal-stack-card absolute overflow-hidden rounded-[30px] text-left shadow-[0_18px_45px_rgba(0,0,0,0.16)] transition duration-300 ${layers[index]}`}
      style={{ transform: `scale(${1 - index * 0.06})` }}
    >
      <span className="relative block h-[62%] w-full overflow-hidden">
        {media ? <img src={media.url} alt="" loading="eager" decoding="async" className="h-full w-full object-cover" /> : null}
        <span className="absolute inset-0 bg-black/35" />
      </span>
      <span className="grid gap-2 p-4 text-center">
        <span className="text-xl font-black text-orbit-ink sm:text-2xl 2xl:text-3xl">Go to Marketplace</span>
        <span className="text-sm font-semibold text-neutral-600 sm:text-base 2xl:text-lg">Browse all listings across Kenya</span>
        <span className="image-overlay-element image-overlay-strong mx-auto mt-2 inline-flex h-12 w-fit items-center justify-center gap-2 rounded-full bg-black px-5 text-xs font-black text-white sm:h-[60px] sm:px-6 sm:text-sm">
          Open marketplace
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
