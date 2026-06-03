"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { startSearchIntelligenceSession } from "@/lib/intelligence";
import { listingThumbnailUrl } from "@/lib/listingImageUrls";
import { cn, ui } from "@/lib/ui";
import { seededListings, type ResourceListing } from "@rentorbit/shared";

const featuredListings = [...seededListings]
  .filter((listing) => listing.status === "active" && listing.media.length > 0)
  .sort((left, right) => right.rating * 100 + right.reviewCount - (left.rating * 100 + left.reviewCount))
  .slice(0, 3);

const popularSearches = [
  { label: "Camping", href: "/marketplace?search=camping" },
  { label: "DJ Gear", href: "/marketplace?search=dj%20gear" },
  { label: "Projectors", href: "/marketplace?search=projectors" },
  { label: "Bikes", href: "/marketplace?search=bikes" }
];
const listItemHref = "/account?mode=signup&returnTo=%2F";

function kes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(amount);
}

export function HomeLanding() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = searchTerm.trim();
    if (trimmed) {
      void startSearchIntelligenceSession({ query: trimmed, source: "home" });
    }
    router.push(trimmed ? `/marketplace?search=${encodeURIComponent(trimmed)}` : "/marketplace");
  }

  return (
    <main id="top" className="min-h-svh bg-orbit-field text-orbit-ink">
      <SiteHeader active="home" />

      <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-20 pt-16 text-center sm:px-8 lg:px-16">
        <h1 className="max-w-3xl text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.16] tracking-[-0.02em] text-orbit-ink">
          Access Everything. Own Less.
        </h1>

        <p className="mt-5 max-w-2xl text-base font-normal leading-7 text-orbit-ink/68 sm:text-lg">
          Rent trusted goods, book verified services, and find personnel across Kenya without buying what you only need for a moment.
        </p>

        <form onSubmit={handleSearch} className="mt-10 w-full max-w-2xl" role="search">
          <div className={cn(ui.searchShell, "min-h-[68px] rounded-full")}>
            <Search className="ml-3 h-6 w-6 shrink-0 text-orbit-ink/55" aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold text-orbit-ink placeholder:text-orbit-ink/45 focus:outline-none focus-visible:outline-none sm:text-base"
              placeholder="What do you need today? Cameras, tools, cars..."
              aria-label="Search marketplace"
            />
            <button
              type="submit"
              className={cn(ui.goldPill, "min-h-12 shrink-0 px-5 text-xs sm:px-8 sm:text-sm")}
            >
              Search
            </button>
          </div>

          <div className="no-scrollbar mt-6 flex justify-start gap-3 overflow-x-auto pb-2 sm:justify-center">
            {popularSearches.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(ui.panelPill, "theme-body-border shrink-0 px-4 py-2 text-xs text-orbit-ink/66 hover:bg-orbit-panel hover:text-orbit-green")}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </form>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 lg:px-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.01em] text-orbit-ink sm:text-3xl">Featured Rentals</h2>
            <p className="mt-1 text-sm font-normal text-orbit-ink/62 sm:text-base">High-quality equipment curated for you.</p>
          </div>
          <Link href="/marketplace" className="hidden items-center gap-2 text-sm font-black text-orbit-green hover:underline sm:inline-flex">
            View all
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredListings.map((listing, index) => (
            <FeaturedRentalCard key={listing.id} listing={listing} priority={index === 0} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-8 lg:px-16">
        <div className="relative overflow-hidden rounded-[32px] bg-[#ffd700] px-6 py-12 text-center text-[#1a1a1a] sm:px-12 md:py-20">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl font-semibold leading-tight tracking-[-0.01em] sm:text-4xl">Have items gathering dust?</h2>
            <p className="mx-auto mt-5 max-w-xl text-base font-normal leading-7 text-[#1a1a1a]/75 sm:text-lg">
              Join RentOrbit and start earning from tools, spaces, vehicles, equipment, and services people already need.
            </p>
            <Link
              href={listItemHref}
              className="mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-[#705d00] px-8 text-sm font-black text-white transition-colors hover:bg-[#544600] focus-visible:outline-none"
            >
              List Your Item Now
            </Link>
          </div>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}

function FeaturedRentalCard({ listing, priority }: { listing: ResourceListing; priority: boolean }) {
  const media = listing.media[0];
  const thumbnailUrl = media ? listingThumbnailUrl(media.url, 720, 900) : undefined;
  const price = kes(listing.modeRules[0]?.pricing.rate.amount ?? 0);

  return (
    <Link
      href={`/marketplace?listing=${encodeURIComponent(listing.id)}`}
      className="group relative overflow-hidden rounded-[32px] bg-orbit-panel text-left focus-visible:outline-none"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] ring-1 ring-orbit-line/35">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={media?.alt || listing.title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : undefined}
            width={720}
            height={900}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="featured-rental-glass relative rounded-[24px] p-5 backdrop-blur-xl">
            <div className="featured-rental-rating absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-semibold">
              {listing.rating.toFixed(1)}
            </div>
            <div className="space-y-1 pr-16">
              <span className="block text-2xl font-black">{price.replace("KES", "").trim()}</span>
              <h3 className="truncate text-lg font-semibold">{listing.title}</h3>
              <p className="truncate text-sm font-medium opacity-75">
                {listing.location.generalArea}, {listing.location.county}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function HomeFooter() {
  return (
    <footer className="home-footer-divider border-t bg-orbit-field px-5 py-[clamp(1.5rem,4vw,3rem)] sm:px-8 lg:px-16">
      <div className="home-footer-content mx-auto w-full max-w-7xl">
        <Link href="/" className="home-footer-brand font-black text-orbit-green">RentOrbit</Link>
        <nav className="home-footer-links font-semibold text-orbit-ink/62" aria-label="Footer">
          <Link href="/terms" className="hover:text-orbit-green">Terms</Link>
          <Link href="/privacy" className="hover:text-orbit-green">Privacy</Link>
          <a href="mailto:hello@rentorbit.co.ke" className="hover:text-orbit-green">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
