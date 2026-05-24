"use client";

import {
  ArrowUpRight,
  CalendarClock,
  ChevronDown,
  CircleUserRound,
  FileSignature,
  Filter,
  Handshake,
  Heart,
  MapPin,
  MessageCircle,
  PackageCheck,
  Search,
  Truck,
  UserRoundCheck,
  X
} from "lucide-react";
import Link from "next/link";
import {
  calculateBookingQuote,
  createContractSummary,
  filterListings,
  kenyaCounties,
  marketplaceCategories,
  seededListings,
  type ContractSummary,
  type Coordinates,
  type OperationMode,
  type ResourceListing,
  type SearchResult
} from "@rentorbit/shared";
import { useEffect, useMemo, useState } from "react";

const countyOrigins: Record<string, Coordinates> = {
  Nairobi: { latitude: -1.286389, longitude: 36.817223 },
  Mombasa: { latitude: -4.043477, longitude: 39.668206 },
  Kisumu: { latitude: -0.091702, longitude: 34.767956 },
  Nakuru: { latitude: -0.303099, longitude: 36.080025 },
  Kiambu: { latitude: -1.1748, longitude: 36.8304 },
  "Uasin Gishu": { latitude: 0.5143, longitude: 35.2698 }
};

type FilterState = {
  query: string;
  category: string;
  county: string;
  radiusKm: number;
  operationMode: string;
  includeCountrywide: boolean;
  start: string;
  end: string;
};

type ChatLine = {
  id: string;
  from: "owner" | "renter" | "system";
  text: string;
};

type MobilePanel = "discovery" | "metrics" | "details";

const initialFilters: FilterState = {
  query: "",
  category: "all",
  county: "all",
  radiusKm: 50,
  operationMode: "all",
  includeCountrywide: true,
  start: "2026-06-16T09:00",
  end: "2026-06-17T09:00"
};

function kes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(amount);
}

function readableMode(mode: OperationMode): string {
  return mode
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function listingIcon(kind: ResourceListing["kind"]) {
  if (kind === "personnel") return <UserRoundCheck className="h-4 w-4" aria-hidden="true" />;
  if (kind === "service") return <Handshake className="h-4 w-4" aria-hidden="true" />;
  return <PackageCheck className="h-4 w-4" aria-hidden="true" />;
}

function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }
}

export function MarketplaceExperience() {
  const firstListing = seededListings[0];
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedId, setSelectedId] = useState(firstListing?.id ?? "");
  const [selectedMode, setSelectedMode] = useState<OperationMode>("owner_operated");
  const [chatLines, setChatLines] = useState<ChatLine[]>([
    {
      id: "msg_1",
      from: "renter",
      text: "Is delivery available and can the terms be signed here?"
    },
    {
      id: "msg_2",
      from: "owner",
      text: "Yes. Send a proposal with the date, mode, and deposit terms."
    }
  ]);
  const [contract, setContract] = useState<ContractSummary | null>(null);
  const [signatureName, setSignatureName] = useState("Brian Otieno");
  const [ownerSignatureName, setOwnerSignatureName] = useState("Asha Njeri");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel | null>(null);

  useEffect(registerServiceWorker, []);

  useEffect(() => {
    if (!mobilePanel) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobilePanel(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobilePanel]);

  const results = useMemo(() => {
    const origin = filters.county !== "all" ? countyOrigins[filters.county] : undefined;
    return filterListings(seededListings, {
      query: filters.query,
      category: filters.category === "all" ? undefined : filters.category,
      county: filters.county === "all" ? undefined : filters.county,
      radiusKm: origin ? filters.radiusKm : undefined,
      origin,
      operationMode: filters.operationMode === "all" ? undefined : (filters.operationMode as OperationMode),
      includeCountrywide: filters.includeCountrywide,
      start: filters.start,
      end: filters.end
    });
  }, [filters]);

  useEffect(() => {
    if (results.length > 0 && !results.some((result) => result.listing.id === selectedId)) {
      setSelectedId(results[0]?.listing.id ?? selectedId);
    }
  }, [results, selectedId]);

  if (!firstListing) {
    return null;
  }

  const selectedResult = results.find((result) => result.listing.id === selectedId) ?? results[0];
  const selectedListing = selectedResult?.listing ?? firstListing;
  const selectedPublicCoordinates = selectedResult?.publicCoordinates;
  const selectedRule = selectedListing.modeRules.find((rule) => rule.mode === selectedMode) ?? selectedListing.modeRules[0];
  const activeMode = selectedRule?.mode ?? selectedListing.modeRules[0]?.mode ?? "self_operated";
  const quote = calculateBookingQuote({
    listing: selectedListing,
    mode: activeMode,
    start: filters.start,
    end: filters.end
  });

  function patchFilters(next: Partial<FilterState>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function selectListing(listing: ResourceListing) {
    setSelectedId(listing.id);
    setSelectedMode(listing.modeRules[0]?.mode ?? "self_operated");
    setContract(null);
  }

  function proposeBooking() {
    const nextContract = createContractSummary({
      id: `ctr_preview_${Date.now()}`,
      threadId: `thr_${selectedListing.id}_usr_renter_brian`,
      listing: selectedListing,
      owner: {
        userId: selectedListing.ownerId,
        legalName: ownerSignatureName,
        role: "owner"
      },
      renter: {
        userId: "usr_renter_brian",
        legalName: signatureName,
        role: "renter"
      },
      mode: activeMode,
      bookingWindow: {
        start: filters.start,
        end: filters.end
      },
      createdAt: new Date().toISOString()
    });
    setContract(nextContract);
    setChatLines((current) => [
      ...current,
      {
        id: `msg_${Date.now()}`,
        from: "system",
        text: `Proposal created for ${readableMode(activeMode)}: ${kes(nextContract.quote.totalDueNow.amount)} due now.`
      }
    ]);
  }

  return (
    <main className="min-h-screen bg-[#eef0ec]">
      <header className="border-b border-white/70 bg-white/90">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="RentOrbit home">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-orbit-green text-white">
              <span className="text-lg font-black">RO</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-orbit-ink sm:text-2xl">RentOrbit</h1>
              <p className="truncate text-sm text-neutral-600">Kenya rentals, services, personnel</p>
            </div>
          </Link>
          <Link
            href="/account"
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/90 text-orbit-ink shadow-[0_2px_14px_rgba(25,32,29,0.12)] backdrop-blur transition-colors hover:bg-white focus-visible:outline-none"
            title="Account"
          >
            <CircleUserRound className="h-7 w-7" aria-hidden="true" />
            <span className="sr-only">Account</span>
          </Link>
        </div>
      </header>

      <MobilePanelBar onOpen={setMobilePanel} />

      {mobilePanel ? (
        <MobilePanelOverlay title={panelTitle(mobilePanel)} onClose={() => setMobilePanel(null)}>
          {mobilePanel === "discovery" ? (
            <DiscoveryPanel filters={filters} patchFilters={patchFilters} />
          ) : null}
          {mobilePanel === "metrics" ? <MarketplaceSummaryPanel filters={filters} resultsLength={results.length} /> : null}
          {mobilePanel === "details" ? (
            <ListingDetailsPanel
              selectedListing={selectedListing}
              selectedPublicCoordinates={selectedPublicCoordinates}
              activeMode={activeMode}
              quote={quote}
              setSelectedMode={setSelectedMode}
              setChatLines={setChatLines}
              proposeBooking={proposeBooking}
            />
          ) : null}
        </MobilePanelOverlay>
      ) : null}

      <div className="grid min-h-[calc(100svh-81px)] w-full gap-3 px-3 py-3 xl:h-[calc(100svh-81px)] xl:overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)_360px] 2xl:grid-cols-[300px_minmax(0,1fr)_380px]">
        <aside className="hidden h-fit self-start xl:sticky xl:top-0 xl:block xl:max-h-full xl:overflow-visible">
          <DiscoveryPanel filters={filters} patchFilters={patchFilters} />
        </aside>

        <section className="grid min-w-0 content-start gap-3 xl:h-full xl:overflow-y-auto xl:pr-1">
          <MarketplaceSummaryPanel filters={filters} resultsLength={results.length} className="hidden xl:grid" />

          <div className="grid gap-3">
            <div className="rounded-[30px] bg-white/35 p-3">
              <div className="grid gap-x-3 gap-y-3 lg:grid-cols-2 2xl:grid-cols-3">
                {results.map((result) => (
                  <MarketplaceListingCard
                    key={result.listing.id}
                    result={result}
                    selected={selectedListing.id === result.listing.id}
                    onSelect={() => selectListing(result.listing)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden h-fit self-start xl:sticky xl:top-0 xl:block xl:max-h-full xl:overflow-visible">
          <ListingDetailsPanel
            selectedListing={selectedListing}
            selectedPublicCoordinates={selectedPublicCoordinates}
            activeMode={activeMode}
            quote={quote}
            setSelectedMode={setSelectedMode}
            setChatLines={setChatLines}
            proposeBooking={proposeBooking}
          />
        </aside>
      </div>
    </main>
  );
}

function panelTitle(panel: MobilePanel): string {
  if (panel === "discovery") return "Discovery";
  if (panel === "metrics") return "Countrywide Metrics";
  return "More Details";
}

function MobilePanelBar({ onOpen }: { onOpen: (panel: MobilePanel) => void }) {
  return (
    <div className="sticky top-0 z-40 grid grid-cols-3 gap-2 border-b border-white/70 bg-[#eef0ec]/95 px-3 py-2 backdrop-blur xl:hidden">
      <button
        type="button"
        onClick={() => onOpen("discovery")}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white/92 px-3 text-xs font-black text-orbit-ink ring-1 ring-white/70"
      >
        <Filter className="h-4 w-4 text-orbit-green" aria-hidden="true" />
        Discovery
      </button>
      <button
        type="button"
        onClick={() => onOpen("metrics")}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white/92 px-3 text-xs font-black text-orbit-ink ring-1 ring-white/70"
      >
        <MapPin className="h-4 w-4 text-orbit-green" aria-hidden="true" />
        Metrics
      </button>
      <button
        type="button"
        onClick={() => onOpen("details")}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white/92 px-3 text-xs font-black text-orbit-ink ring-1 ring-white/70"
      >
        <PackageCheck className="h-4 w-4 text-orbit-green" aria-hidden="true" />
        Details
      </button>
    </div>
  );
}

function MobilePanelOverlay({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#eef0ec]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex min-h-16 items-center justify-between border-b border-white/70 bg-white/90 px-4">
        <h2 className="text-lg font-black text-orbit-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8e6e3]/85 text-orbit-ink focus-visible:outline-none"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

function DiscoveryPanel({
  filters,
  patchFilters
}: {
  filters: FilterState;
  patchFilters: (next: Partial<FilterState>) => void;
}) {
  return (
    <section className="max-h-full overflow-auto rounded-[36px] bg-white/92 p-4 shadow-[0_14px_36px_rgba(25,32,29,0.08)] ring-1 ring-white/70">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold">Discovery</h2>
        <button className="rounded-full border border-orbit-line p-2 text-orbit-green" title="Filter listings">
          <Filter className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-semibold uppercase text-neutral-500">Search</span>
        <div className="flex items-center gap-2 rounded-[18px] border border-orbit-line bg-orbit-field px-3 py-2 focus-within:border-orbit-line focus-within:outline-none focus-within:ring-0">
          <Search className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
          <input
            value={filters.query}
            onChange={(event) => patchFilters({ query: event.target.value })}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none ring-0 focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none"
            style={{ outline: "none" }}
            placeholder="camera, crew, generator"
          />
        </div>
      </label>

      <div className="grid gap-3">
        <FilterSelect label="Category" value={filters.category} onChange={(value) => patchFilters({ category: value })}>
          <option value="all">All categories</option>
          {marketplaceCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="County" value={filters.county} onChange={(value) => patchFilters({ county: value })}>
          <option value="all">All Kenya</option>
          {kenyaCounties.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Mode" value={filters.operationMode} onChange={(value) => patchFilters({ operationMode: value })}>
          <option value="all">Any mode</option>
          <option value="self_operated">Self-operated</option>
          <option value="owner_operated">Owner-operated</option>
          <option value="operator_only">Operator-only</option>
        </FilterSelect>

        <label className="block rounded-[18px] border border-orbit-line bg-orbit-field px-3 py-2">
          <span className="mb-1 block text-xs font-semibold uppercase text-neutral-500">Radius</span>
          <input
            type="range"
            min="5"
            max="300"
            step="5"
            value={filters.radiusKm}
            onChange={(event) => patchFilters({ radiusKm: Number(event.target.value) })}
            className="w-full accent-orbit-green"
          />
          <span className="text-sm font-semibold">{filters.radiusKm} km</span>
        </label>

        <label className="flex items-center gap-3 rounded-[18px] border border-orbit-line bg-orbit-field px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={filters.includeCountrywide}
            onChange={(event) => patchFilters({ includeCountrywide: event.target.checked })}
            className="h-4 w-4 accent-orbit-green"
          />
          Countrywide delivery
        </label>

        <DateInput label="Start" value={filters.start} onChange={(value) => patchFilters({ start: value })} />
        <DateInput label="End" value={filters.end} onChange={(value) => patchFilters({ end: value })} />
      </div>
    </section>
  );
}

function MarketplaceSummaryPanel({
  filters,
  resultsLength,
  className = "grid"
}: {
  filters: FilterState;
  resultsLength: number;
  className?: string;
}) {
  return (
    <div className={`${className} gap-3 rounded-[36px] bg-white/92 p-5 ring-1 ring-white/70 lg:grid-cols-[1fr_280px]`}>
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-orbit-green">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {filters.county === "all" ? "Countrywide marketplace" : `${filters.county} marketplace`}
        </div>
        <h2 className="mt-2 text-2xl font-black text-orbit-ink">All-category availability board</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600">
          {resultsLength} matching resources across goods, services, and personnel.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Metric label="Searches" value="1.8k" tone="sky" />
        <Metric label="Signed" value="64%" tone="green" />
        <Metric label="Disputes" value="2.1%" tone="clay" />
      </div>
    </div>
  );
}

function ListingDetailsPanel({
  selectedListing,
  selectedPublicCoordinates,
  activeMode,
  quote,
  setSelectedMode,
  setChatLines,
  proposeBooking
}: {
  selectedListing: ResourceListing;
  selectedPublicCoordinates?: Coordinates;
  activeMode: OperationMode;
  quote: ReturnType<typeof calculateBookingQuote>;
  setSelectedMode: (mode: OperationMode) => void;
  setChatLines: React.Dispatch<React.SetStateAction<ChatLine[]>>;
  proposeBooking: () => void;
}) {
  return (
    <section className="max-h-full overflow-auto rounded-[36px] bg-white/92 p-4 shadow-[0_14px_36px_rgba(25,32,29,0.08)] ring-1 ring-white/70">
      <img
        src={selectedListing.media[0]?.url}
        alt={selectedListing.media[0]?.alt ?? selectedListing.title}
        className="aspect-[16/8] w-full rounded-[28px] object-cover"
      />
      <div className="grid gap-4 pt-4">
        <div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-orbit-field px-3 py-1">{selectedListing.location.county}</span>
            <span className="rounded-full bg-orbit-field px-3 py-1">{selectedListing.category}</span>
            <span className="rounded-full bg-orbit-field px-3 py-1">{selectedListing.kind}</span>
          </div>
          <h2 className="mt-3 text-xl font-black">{selectedListing.title}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{selectedListing.description}</p>
        </div>

        <div className="rounded-[28px] bg-[#e8e6e3]/75 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black">Approximate</h3>
              <p className="mt-1 text-xs font-semibold text-neutral-600">
                {selectedListing.location.generalArea}, {selectedListing.location.county}
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-orbit-green">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="relative mt-3 h-36 overflow-hidden rounded-[26px] bg-[#d7d2ca]">
            <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="absolute left-[18%] top-[24%] h-20 w-20 rounded-full border border-white/70 bg-white/20" />
            <div className="absolute bottom-[12%] right-[14%] h-24 w-24 rounded-full border border-white/60 bg-white/15" />
            <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orbit-green text-white shadow-panel">
              <MapPin className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-neutral-600">
            {selectedPublicCoordinates
              ? `${selectedPublicCoordinates.latitude}, ${selectedPublicCoordinates.longitude}`
              : "Approximate public area only"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {selectedListing.modeRules.map((rule) => (
            <button
              key={rule.mode}
              onClick={() => setSelectedMode(rule.mode)}
              className={`min-h-14 rounded-[18px] border px-2 py-2 text-xs font-bold ${
                activeMode === rule.mode
                  ? "border-orbit-green bg-emerald-50 text-orbit-green"
                  : "border-orbit-line bg-white text-orbit-ink"
              }`}
              title={rule.label}
            >
              {readableMode(rule.mode)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 border-y border-orbit-line py-3 text-sm">
          <SummaryLine label="Rental" value={kes(quote.rentalFee.amount)} />
          <SummaryLine label="Platform" value={kes(quote.platformFee.amount)} />
          <SummaryLine label="Deposit" value={kes(quote.deposit.amount)} />
          <SummaryLine label="Due now" value={kes(quote.totalDueNow.amount)} strong />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <IconFact icon={<Truck className="h-4 w-4" />} label={selectedListing.logistics.deliveryModes.join(", ")} />
          <IconFact icon={<CalendarClock className="h-4 w-4" />} label={`${quote.units} billed unit(s)`} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              setChatLines((current) => [
                ...current,
                {
                  id: `msg_${Date.now()}`,
                  from: "renter",
                  text: `Can we proceed with ${readableMode(activeMode)} for ${selectedListing.title}?`
                }
              ])
            }
            className="inline-flex items-center justify-center gap-2 rounded-full border border-orbit-line px-3 py-3 text-sm font-bold"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            DM
          </button>
          <button
            onClick={proposeBooking}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-orbit-green px-3 py-3 text-sm font-bold text-white"
          >
            <FileSignature className="h-4 w-4" aria-hidden="true" />
            Propose
          </button>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-neutral-500">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[18px] border border-orbit-line bg-white py-2 pl-3 pr-11 text-sm outline-none focus:border-orbit-line focus:outline-none focus:ring-0 focus-visible:outline-none"
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          aria-hidden="true"
        />
      </div>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-neutral-500">{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[18px] border border-orbit-line bg-white px-3 py-2 text-sm outline-none focus:border-orbit-line focus:outline-none focus:ring-0 focus-visible:outline-none"
      />
    </label>
  );
}

function MarketplaceListingCard({
  result,
  selected,
  onSelect
}: {
  result: SearchResult;
  selected: boolean;
  onSelect: () => void;
}) {
  const listing = result.listing;
  const media = listing.media[0];
  const rate = kes(listing.modeRules[0]?.pricing.rate.amount ?? 0);
  const unavailable = result.availabilityState === "unavailable_for_window";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-selected={selected ? "true" : "false"}
      className="grid min-h-[240px] overflow-hidden rounded-[30px] border-2 border-transparent bg-white p-4 text-left shadow-[0_2px_14px_rgba(25,32,29,0.12)] transition-shadow data-[selected=true]:border-[#4391F5] hover:shadow-[0_2px_14px_rgba(25,32,29,0.18)] focus-visible:border-[#4391F5] focus-visible:outline-none focus-visible:shadow-[0_2px_14px_rgba(25,32,29,0.12)] md:min-h-[clamp(220px,16vw,270px)] md:grid-cols-[minmax(0,1fr)_40%]"
    >
      <div className="flex min-w-0 flex-col justify-between gap-3 overflow-hidden pr-0 md:pr-3">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-[clamp(32px,2.4vw,36px)] items-center gap-2 rounded-full border border-orbit-line bg-white px-[clamp(10px,1vw,12px)] text-[clamp(10px,0.8vw,11px)] font-black uppercase tracking-normal text-orbit-ink">
              {listingIcon(listing.kind)}
              {listing.kind}
            </span>
            {unavailable ? (
              <span className="inline-flex h-[clamp(32px,2.4vw,36px)] items-center rounded-full bg-orbit-clay px-[clamp(10px,1vw,12px)] text-[clamp(10px,0.8vw,11px)] font-black uppercase text-white">Booked</span>
            ) : (
              <span className="inline-flex h-[clamp(32px,2.4vw,36px)] items-center rounded-full bg-[#e8e6e3]/85 px-[clamp(10px,1vw,12px)] text-[clamp(10px,0.8vw,11px)] font-black uppercase text-orbit-ink">
                Available
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-[clamp(1.05rem,1.45vw,1.35rem)] font-black leading-tight text-orbit-ink">{listing.title}</h3>
          <p className="mt-2 line-clamp-2 text-[clamp(0.8rem,0.95vw,0.95rem)] leading-5 text-neutral-500 2xl:line-clamp-1">{listing.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[clamp(10px,0.8vw,11px)] font-black text-orbit-ink">
          <span className="rounded-full bg-[#e8e6e3]/85 px-[clamp(10px,1vw,12px)] py-2">{listing.location.county}</span>
          <span className="rounded-full bg-[#e8e6e3]/85 px-[clamp(10px,1vw,12px)] py-2">{rate}</span>
        </div>
      </div>

      <div className="relative isolate mt-4 aspect-[16/9] min-h-[170px] self-stretch overflow-hidden rounded-[26px] bg-[#e8e6e3] md:mt-0 md:h-full md:min-h-[clamp(180px,14vw,240px)] md:aspect-auto">
        <img
          src={media?.url}
          alt={media?.alt ?? listing.title}
          className={`absolute inset-0 z-0 h-full w-full object-cover ${unavailable ? "grayscale" : ""}`}
        />
        <span className="absolute right-[clamp(6px,2vw,8px)] top-[clamp(6px,2vw,8px)] z-10 flex h-[clamp(28px,8vw,32px)] w-[clamp(28px,8vw,32px)] items-center justify-center rounded-full bg-white/45 text-red-500 backdrop-blur">
          <Heart className="h-[clamp(12px,3.5vw,14px)] w-[clamp(12px,3.5vw,14px)] fill-current" aria-hidden="true" />
        </span>
        <span className="absolute left-[clamp(6px,2vw,8px)] top-[clamp(6px,2vw,8px)] z-10 inline-flex h-[clamp(24px,7vw,28px)] items-center gap-1 rounded-full bg-white/70 px-[clamp(6px,2vw,8px)] text-[clamp(9px,2.8vw,10px)] font-black text-orbit-ink backdrop-blur">
          {listing.rating.toFixed(1)}
          <span className="text-[clamp(8px,2.4vw,9px)] font-bold text-neutral-500">({listing.reviewCount})</span>
        </span>
        <span className="absolute bottom-[clamp(6px,2vw,8px)] right-[clamp(6px,2vw,8px)] z-10 inline-flex h-[clamp(32px,9vw,35px)] items-center gap-1 rounded-full bg-[#c8bfb1]/90 p-[2px] pl-[clamp(10px,3vw,12px)] text-[clamp(10px,3vw,11px)] font-semibold text-orbit-ink backdrop-blur-md">
          Open
          <span className="flex h-full aspect-square items-center justify-center rounded-full bg-black text-white">
            <ArrowUpRight className="h-[clamp(12px,3.5vw,14px)] w-[clamp(12px,3.5vw,14px)]" aria-hidden="true" />
          </span>
        </span>
      </div>
    </button>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "sky" | "clay" }) {
  const tones = {
    green: "text-orbit-green",
    sky: "text-orbit-sky",
    clay: "text-orbit-clay"
  };
  return (
    <div className="rounded-[18px] border border-orbit-line bg-orbit-field p-2">
      <p className={`text-lg font-black ${tones[tone]}`}>{value}</p>
      <p className="mt-1 font-semibold text-neutral-600">{label}</p>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-neutral-500">{label}</p>
      <p className={strong ? "font-black text-orbit-green" : "font-bold text-orbit-ink"}>{value}</p>
    </div>
  );
}

function IconFact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-[18px] border border-orbit-line bg-orbit-field px-3 py-2 text-xs font-bold">
      <span className="shrink-0 text-orbit-green">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
