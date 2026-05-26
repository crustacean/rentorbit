"use client";

import {
  ArrowUpRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  FileSignature,
  Filter,
  Handshake,
  Heart,
  MapPin,
  MessageCircle,
  PackageCheck,
  Search,
  Send,
  Truck,
  UserRoundCheck,
  ZoomIn,
  ZoomOut,
  X
} from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "@/components/CustomSelect";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
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
import { useEffect, useMemo, useRef, useState } from "react";

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
type FocusedPanel = "details" | "chat";

type AccountChatMessage = {
  id: string;
  author: "me" | "them" | "system";
  text: string;
  time: string;
};

type AccountChatThread = {
  id: string;
  participant: string;
  listing: string;
  status: string;
  unread: number;
  messages: AccountChatMessage[];
};

type SavedMarketplaceListing = {
  id: string;
  title: string;
  description: string;
  county: string;
  price: string;
  kind: ResourceListing["kind"];
  category: string;
};

const marketplaceThreadsKey = "rentorbit:marketplace-chat-threads";
const marketplaceThreadsUpdatedEvent = "rentorbit:marketplace-chats-updated";
const savedListingsKey = "rentorbit:saved-marketplace-listings";
const savedListingsUpdatedEvent = "rentorbit:saved-listings-updated";

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

function listingKindLabel(kind: ResourceListing["kind"]) {
  if (kind === "good") return "Goods";
  if (kind === "service") return "Services";
  return "Personnel";
}

function positiveInteger(value: string | number, fallback = 1): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function bookedUnitsLabel(bookedCount: number, totalCount: number): string {
  const total = Math.max(1, Math.floor(totalCount));
  const booked = Math.min(total, Math.max(0, Math.floor(bookedCount)));
  return `${booked}:${total} BOOKED`;
}

const seededInventoryTotals: Record<string, number> = {
  lst_events_tent_nairobi_005: 8,
  lst_events_chairs_kiambu_006: 120,
  lst_electronics_camera_nairobi_007: 3,
  lst_electronics_drone_nakuru_008: 2,
  lst_vehicle_moving_truck_mombasa_009: 4,
  lst_vehicle_delivery_bike_kisumu_010: 9,
  lst_spaces_meeting_room_nairobi_015: 6,
  lst_spaces_storage_yard_machakos_016: 12,
  lst_sports_bikes_nyeri_017: 10,
  lst_sports_camping_nakuru_018: 8,
  lst_electronics_laptops_nairobi_028: 10,
  lst_events_lighting_kisumu_029: 5,
  lst_home_baby_seats_kiambu_032: 7,
  lst_spaces_kiosk_mombasa_033: 6,
  lst_events_sound_nairobi_001: 2,
  lst_tools_generator_kisumu_002: 2,
  lst_personnel_loader_mombasa_003: 4,
  lst_space_studio_nakuru_004: 3
};

const seededBookedUnits: Record<string, number> = {
  lst_electronics_camera_nairobi_007: 1,
  lst_tools_generator_kisumu_002: 1,
  lst_personnel_loader_mombasa_003: 1,
  lst_spaces_meeting_room_nairobi_015: 2,
  lst_events_chairs_kiambu_006: 12
};

function listingInventoryTotal(listing: ResourceListing): number {
  const metadataTotal = listing.metadata.inventoryTotal;
  if (typeof metadataTotal === "number" && metadataTotal > 0) {
    return Math.floor(metadataTotal);
  }

  return seededInventoryTotals[listing.id] ?? 1;
}

function readMarketplaceThreads(): AccountChatThread[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(marketplaceThreadsKey) ?? "[]");
    return Array.isArray(parsed) ? (parsed as AccountChatThread[]) : [];
  } catch {
    return [];
  }
}

function writeMarketplaceThreads(threads: AccountChatThread[]) {
  window.localStorage.setItem(marketplaceThreadsKey, JSON.stringify(threads));
  window.dispatchEvent(new Event(marketplaceThreadsUpdatedEvent));
}

function marketplaceThreadForListing(listing: ResourceListing): AccountChatThread {
  return {
    id: `marketplace-${listing.id}`,
    participant: `Owner ${listing.ownerId.replace(/^usr_/, "").replaceAll("_", " ")}`,
    listing: listing.title,
    status: "Marketplace DM",
    unread: 0,
    messages: [
      {
        id: `marketplace-system-${listing.id}`,
        author: "system",
        text: `Thread opened for ${listing.title}.`,
        time: "Now"
      }
    ]
  };
}

function upsertMarketplaceThread(listing: ResourceListing, message?: AccountChatMessage) {
  const threadId = `marketplace-${listing.id}`;
  const existingThreads = readMarketplaceThreads();
  const existingThread = existingThreads.find((thread) => thread.id === threadId) ?? marketplaceThreadForListing(listing);
  const nextThread = {
    ...existingThread,
    unread: 0,
    messages: message ? [...existingThread.messages, message] : existingThread.messages
  };
  const nextThreads = [nextThread, ...existingThreads.filter((thread) => thread.id !== threadId)];
  writeMarketplaceThreads(nextThreads);
  return nextThread;
}

function readSavedListings(): SavedMarketplaceListing[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(savedListingsKey) ?? "[]");
    return Array.isArray(parsed) ? (parsed as SavedMarketplaceListing[]) : [];
  } catch {
    return [];
  }
}

function writeSavedListings(listings: SavedMarketplaceListing[]) {
  window.localStorage.setItem(savedListingsKey, JSON.stringify(listings));
  window.dispatchEvent(new Event(savedListingsUpdatedEvent));
}

function savedListingFromResource(listing: ResourceListing): SavedMarketplaceListing {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    county: listing.location.county,
    price: kes(listing.modeRules[0]?.pricing.rate.amount ?? 0),
    kind: listing.kind,
    category: listing.category
  };
}

function saveMarketplaceListing(listing: ResourceListing) {
  const savedListing = savedListingFromResource(listing);
  const currentListings = readSavedListings();
  const nextListings = [
    savedListing,
    ...currentListings.filter((currentListing) => currentListing.id !== savedListing.id)
  ];

  writeSavedListings(nextListings);
  return nextListings;
}

function focusedGalleryForListing(listing: ResourceListing) {
  const relatedMedia = seededListings
    .filter((candidate) => candidate.id !== listing.id && candidate.category === listing.category)
    .flatMap((candidate) => candidate.media)
    .slice(0, 4);

  return [...listing.media, ...relatedMedia].slice(0, 6);
}

function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }
}

export function MarketplaceExperience() {
  const firstListing = seededListings[0];
  const requestedListingRef = useRef<string | null>(null);
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
  const [focusedListingId, setFocusedListingId] = useState<string | null>(null);
  const [focusedImageIndex, setFocusedImageIndex] = useState(0);
  const [focusedZoom, setFocusedZoom] = useState(1);
  const [focusedPanel, setFocusedPanel] = useState<FocusedPanel>("details");
  const [focusedDraft, setFocusedDraft] = useState("");
  const [focusedThread, setFocusedThread] = useState<AccountChatThread | null>(null);
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);
  const [bookingQuantity, setBookingQuantity] = useState("1");
  const [bookedUnitCounts] = useState<Record<string, number>>(seededBookedUnits);

  useEffect(registerServiceWorker, []);

  useEffect(() => {
    const requestedListingId = new URLSearchParams(window.location.search).get("listing");
    const requestedListing = requestedListingId
      ? seededListings.find((listing) => listing.id === requestedListingId)
      : undefined;

    if (!requestedListing) {
      return;
    }

    requestedListingRef.current = requestedListing.id;
    setFilters({
      ...initialFilters,
      category: "all",
      county: "all",
      operationMode: "all",
      includeCountrywide: true
    });
    setSelectedId(requestedListing.id);
    setSelectedMode(requestedListing.modeRules[0]?.mode ?? "self_operated");
    setContract(null);
  }, []);

  useEffect(() => {
    function refreshSavedListings() {
      setSavedListingIds(readSavedListings().map((listing) => listing.id));
    }

    refreshSavedListings();
    window.addEventListener("storage", refreshSavedListings);
    window.addEventListener(savedListingsUpdatedEvent, refreshSavedListings);

    return () => {
      window.removeEventListener("storage", refreshSavedListings);
      window.removeEventListener(savedListingsUpdatedEvent, refreshSavedListings);
    };
  }, []);

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

  useEffect(() => {
    if (!focusedListingId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFocusedListingId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusedListingId]);

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

  useEffect(() => {
    if (requestedListingRef.current !== selectedId) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.querySelector(`[data-listing-id="${selectedId}"]`)?.scrollIntoView({
        block: "center",
        behavior: "smooth"
      });
      requestedListingRef.current = null;
    });
  }, [selectedId, results]);

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
  const selectedTotalUnits = listingInventoryTotal(selectedListing);
  const selectedBookedUnits = Math.min(selectedTotalUnits, bookedUnitCounts[selectedListing.id] ?? 0);
  const selectedAvailableUnits = Math.max(0, selectedTotalUnits - selectedBookedUnits);
  const selectedQuantity = selectedAvailableUnits > 0
    ? Math.min(positiveInteger(bookingQuantity, 1), selectedAvailableUnits)
    : 0;
  const focusedListing = focusedListingId
    ? seededListings.find((listing) => listing.id === focusedListingId) ?? selectedListing
    : null;
  const focusedRule = focusedListing?.modeRules.find((rule) => rule.mode === selectedMode) ?? focusedListing?.modeRules[0];
  const focusedMode = focusedRule?.mode ?? activeMode;
  const focusedQuote = focusedListing
    ? calculateBookingQuote({
        listing: focusedListing,
        mode: focusedMode,
        start: filters.start,
        end: filters.end
      })
    : quote;
  const focusedPublicCoordinates = focusedListing
    ? results.find((result) => result.listing.id === focusedListing.id)?.publicCoordinates
    : undefined;
  const focusedGallery = focusedListing ? focusedGalleryForListing(focusedListing) : [];
  const focusedImage = focusedGallery[focusedImageIndex] ?? focusedGallery[0];
  const focusedTotalUnits = focusedListing ? listingInventoryTotal(focusedListing) : selectedTotalUnits;
  const focusedBookedUnits = focusedListing ? Math.min(focusedTotalUnits, bookedUnitCounts[focusedListing.id] ?? 0) : selectedBookedUnits;
  const focusedAvailableUnits = Math.max(0, focusedTotalUnits - focusedBookedUnits);
  const focusedQuantity = focusedAvailableUnits > 0
    ? Math.min(positiveInteger(bookingQuantity, 1), focusedAvailableUnits)
    : 0;

  function patchFilters(next: Partial<FilterState>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function selectListing(listing: ResourceListing) {
    setSelectedId(listing.id);
    setSelectedMode(listing.modeRules[0]?.mode ?? "self_operated");
    setBookingQuantity("1");
    setContract(null);
  }

  function openFocusedListing(listing: ResourceListing) {
    selectListing(listing);
    setFocusedListingId(listing.id);
    setFocusedImageIndex(0);
    setFocusedZoom(1);
    setFocusedPanel("details");
    setFocusedDraft("");
    setFocusedThread(null);
    setBookingQuantity("1");
  }

  function focusDmForListing(listing: ResourceListing) {
    const thread = upsertMarketplaceThread(listing);
    setFocusedThread(thread);
    setFocusedPanel("chat");
  }

  function sendFocusedMessage() {
    const text = focusedDraft.trim();

    if (!focusedListing || !text) {
      return;
    }

    const thread = upsertMarketplaceThread(focusedListing, {
      id: `marketplace-message-${Date.now()}`,
      author: "me",
      text,
      time: "Now"
    });
    setFocusedThread(thread);
    setFocusedDraft("");
  }

  function saveListingToAccount(listing: ResourceListing) {
    const nextListings = saveMarketplaceListing(listing);
    setSavedListingIds(nextListings.map((savedListing) => savedListing.id));
  }

  function proposeBooking() {
    const proposalQuantity = focusedListing ? focusedQuantity : selectedQuantity;
    if (proposalQuantity <= 0) {
      return;
    }

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
        text: `Proposal created for ${proposalQuantity} item(s), ${readableMode(activeMode)}: ${kes(nextContract.quote.totalDueNow.amount * proposalQuantity)} due now.`
      }
    ]);

    if (focusedListing) {
      const thread = upsertMarketplaceThread(focusedListing, {
        id: `marketplace-proposal-${Date.now()}`,
        author: "system",
        text: `Proposal created for ${proposalQuantity} item(s), ${readableMode(focusedMode)}: ${kes(focusedQuote.totalDueNow.amount * proposalQuantity)} due now.`,
        time: "Now"
      });
      setFocusedThread(thread);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-orbit-field">
      <header className="theme-body-border border-b border-white/70 bg-orbit-panel/90">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="RentOrbit home">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-orbit-green text-orbit-field">
              <span className="text-lg font-black">RO</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-orbit-ink sm:text-2xl">RentOrbit</h1>
              <p className="truncate text-sm text-neutral-600">Kenya rentals, services, personnel</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitcher compact />
            <Link
              href="/account"
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orbit-panel/90 text-orbit-ink shadow-[0_2px_14px_rgba(25,32,29,0.12)] backdrop-blur transition-colors hover:bg-orbit-panel focus-visible:outline-none"
              title="Account"
            >
              <CircleUserRound className="h-7 w-7" aria-hidden="true" />
              <span className="sr-only">Account</span>
            </Link>
          </div>
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
              bookingQuantity={bookingQuantity}
              setBookingQuantity={setBookingQuantity}
              selectedQuantity={selectedQuantity}
              totalUnits={selectedTotalUnits}
              bookedUnits={selectedBookedUnits}
              availableUnits={selectedAvailableUnits}
              setSelectedMode={setSelectedMode}
              setChatLines={setChatLines}
              proposeBooking={proposeBooking}
            />
          ) : null}
        </MobilePanelOverlay>
      ) : null}

      <div className="grid min-h-[calc(100svh-81px)] min-w-0 w-full gap-3 px-3 py-3 xl:h-[calc(100svh-81px)] xl:overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)_360px] 2xl:grid-cols-[300px_minmax(0,1fr)_380px]">
        <aside className="hidden min-w-0 h-fit self-start xl:sticky xl:top-0 xl:block xl:max-h-full xl:overflow-x-hidden xl:overflow-y-visible">
          <DiscoveryPanel filters={filters} patchFilters={patchFilters} />
        </aside>

        <section className="grid min-w-0 content-start gap-3 xl:h-full xl:overflow-y-auto xl:pr-1">
          <MarketplaceSummaryPanel filters={filters} resultsLength={results.length} className="hidden xl:grid" />

          <div className="grid gap-3">
            <div className="rounded-[30px] bg-orbit-panel/35 p-3">
              <div className="grid gap-x-3 gap-y-3 lg:grid-cols-2 2xl:grid-cols-3">
                {results.map((result) => (
                  <MarketplaceListingCard
                    key={result.listing.id}
                    result={result}
                    selected={selectedListing.id === result.listing.id}
                    saved={savedListingIds.includes(result.listing.id)}
                    onSelect={() => selectListing(result.listing)}
                    onOpen={() => openFocusedListing(result.listing)}
                    onSave={() => saveListingToAccount(result.listing)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden min-w-0 h-fit self-start xl:sticky xl:top-0 xl:block xl:max-h-full xl:overflow-x-hidden xl:overflow-y-visible">
          <ListingDetailsPanel
            selectedListing={selectedListing}
            selectedPublicCoordinates={selectedPublicCoordinates}
            activeMode={activeMode}
            quote={quote}
            bookingQuantity={bookingQuantity}
            setBookingQuantity={setBookingQuantity}
            selectedQuantity={selectedQuantity}
            totalUnits={selectedTotalUnits}
            bookedUnits={selectedBookedUnits}
            availableUnits={selectedAvailableUnits}
            setSelectedMode={setSelectedMode}
            setChatLines={setChatLines}
            proposeBooking={proposeBooking}
          />
        </aside>
      </div>

      {focusedListing ? (
        <FocusedListingOverlay
          listing={focusedListing}
          gallery={focusedGallery}
          image={focusedImage}
          imageIndex={focusedImageIndex}
          setImageIndex={setFocusedImageIndex}
          zoom={focusedZoom}
          setZoom={setFocusedZoom}
          activeMode={focusedMode}
          quote={focusedQuote}
          bookingQuantity={bookingQuantity}
          setBookingQuantity={setBookingQuantity}
          selectedQuantity={focusedQuantity}
          totalUnits={focusedTotalUnits}
          bookedUnits={focusedBookedUnits}
          availableUnits={focusedAvailableUnits}
          publicCoordinates={focusedPublicCoordinates}
          setSelectedMode={setSelectedMode}
          panel={focusedPanel}
          setPanel={setFocusedPanel}
          thread={focusedThread ?? marketplaceThreadForListing(focusedListing)}
          draft={focusedDraft}
          setDraft={setFocusedDraft}
          sendMessage={sendFocusedMessage}
          onDm={() => focusDmForListing(focusedListing)}
          proposeBooking={proposeBooking}
          onClose={() => setFocusedListingId(null)}
        />
      ) : null}
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
    <div className="theme-body-border sticky top-0 z-40 grid grid-cols-3 gap-2 border-b border-white/70 bg-orbit-field/95 px-3 py-2 backdrop-blur xl:hidden">
      <button
        type="button"
        onClick={() => onOpen("discovery")}
        className="theme-body-border inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orbit-panel/92 px-3 text-xs font-black text-orbit-ink ring-1 ring-white/70"
      >
        <Filter className="h-4 w-4 text-orbit-green" aria-hidden="true" />
        Discovery
      </button>
      <button
        type="button"
        onClick={() => onOpen("metrics")}
        className="theme-body-border inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orbit-panel/92 px-3 text-xs font-black text-orbit-ink ring-1 ring-white/70"
      >
        <MapPin className="h-4 w-4 text-orbit-green" aria-hidden="true" />
        Metrics
      </button>
      <button
        type="button"
        onClick={() => onOpen("details")}
        className="theme-body-border inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orbit-panel/92 px-3 text-xs font-black text-orbit-ink ring-1 ring-white/70"
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
    <div className="fixed inset-0 z-50 flex flex-col bg-orbit-field" role="dialog" aria-modal="true" aria-label={title}>
      <div className="theme-body-border flex min-h-16 items-center justify-between border-b border-white/70 bg-orbit-panel/90 px-4">
        <h2 className="text-lg font-black text-orbit-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-orbit-soft/85 text-orbit-ink focus-visible:outline-none"
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
    <section className="theme-body-border m-[2px] max-h-full min-w-0 overflow-y-auto overflow-x-hidden rounded-[36px] bg-orbit-panel/92 p-5 ring-1 ring-white/70">
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
        <FilterSelect
          label="Category"
          value={filters.category}
          onChange={(value) => patchFilters({ category: value })}
          options={[
            { value: "all", label: "All categories" },
            ...marketplaceCategories.map((category) => ({ value: category.id, label: category.label }))
          ]}
        />

        <FilterSelect
          label="County"
          value={filters.county}
          onChange={(value) => patchFilters({ county: value })}
          options={[
            { value: "all", label: "All Kenya" },
            ...kenyaCounties.map((county) => ({ value: county, label: county }))
          ]}
        />

        <FilterSelect
          label="Mode"
          value={filters.operationMode}
          onChange={(value) => patchFilters({ operationMode: value })}
          options={[
            { value: "all", label: "Any mode" },
            { value: "self_operated", label: "Self-operated" },
            { value: "owner_operated", label: "Owner-operated" },
            { value: "operator_only", label: "Operator-only" }
          ]}
        />

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
    <div className={`theme-body-border ${className} m-[2px] gap-3 rounded-[36px] bg-orbit-panel/92 p-5 ring-1 ring-white/70 lg:grid-cols-[1fr_280px]`}>
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
        <Metric label="Searches" value="1.8k" tone="yellow" />
        <Metric label="Signed" value="64%" tone="green" />
        <Metric label="Disputes" value="2.1%" tone="red" />
      </div>
    </div>
  );
}

function ListingDetailsPanel({
  selectedListing,
  selectedPublicCoordinates,
  activeMode,
  quote,
  bookingQuantity,
  setBookingQuantity,
  selectedQuantity,
  totalUnits,
  bookedUnits,
  availableUnits,
  setSelectedMode,
  setChatLines,
  proposeBooking
}: {
  selectedListing: ResourceListing;
  selectedPublicCoordinates?: Coordinates;
  activeMode: OperationMode;
  quote: ReturnType<typeof calculateBookingQuote>;
  bookingQuantity: string;
  setBookingQuantity: (value: string) => void;
  selectedQuantity: number;
  totalUnits: number;
  bookedUnits: number;
  availableUnits: number;
  setSelectedMode: (mode: OperationMode) => void;
  setChatLines: React.Dispatch<React.SetStateAction<ChatLine[]>>;
  proposeBooking: () => void;
}) {
  const totalRental = quote.rentalFee.amount * selectedQuantity;
  const totalPlatform = quote.platformFee.amount * selectedQuantity;
  const totalDeposit = quote.deposit.amount * selectedQuantity;
  const totalDueNow = quote.totalDueNow.amount * selectedQuantity;

  return (
    <section className="theme-body-border m-[2px] max-h-full min-w-0 overflow-y-auto overflow-x-hidden rounded-[36px] bg-orbit-panel/92 p-5 ring-1 ring-white/70">
      <img
        src={selectedListing.media[0]?.url}
        alt={selectedListing.media[0]?.alt ?? selectedListing.title}
        className="aspect-[16/8] w-full rounded-[28px] object-cover"
      />
      <div className="grid gap-4 pt-4">
        <div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="orbit-tag rounded-full bg-orbit-field px-3 py-1">{selectedListing.location.county}</span>
            <span className="orbit-tag rounded-full bg-orbit-field px-3 py-1">{selectedListing.category}</span>
            <span className="kind-tag orbit-tag rounded-full px-3 py-1" data-kind={selectedListing.kind}>
              {listingKindLabel(selectedListing.kind)}
            </span>
            <span className="orbit-tag rounded-full bg-orbit-field px-3 py-1">{bookedUnitsLabel(bookedUnits, totalUnits)}</span>
          </div>
          <h2 className="mt-3 text-xl font-black">{selectedListing.title}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{selectedListing.description}</p>
        </div>

        <div className="rounded-[28px] bg-orbit-soft/75 p-3">
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
          <div className="relative mt-3 h-36 overflow-hidden rounded-[26px] bg-orbit-line">
            <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="absolute left-[18%] top-[24%] h-20 w-20 rounded-full border border-white/70 bg-white/20" />
            <div className="absolute bottom-[12%] right-[14%] h-24 w-24 rounded-full border border-white/60 bg-white/15" />
            <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orbit-green text-orbit-field shadow-panel">
              <MapPin className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-neutral-600">
            {selectedPublicCoordinates
              ? `${selectedPublicCoordinates.latitude}, ${selectedPublicCoordinates.longitude}`
              : "Approximate public area only"}
          </p>
        </div>

        <div className="rounded-[24px] border border-orbit-line bg-orbit-field p-4">
          <p className="text-xs font-black uppercase text-orbit-ink/55">Booking mode</p>
          <div className="mt-3 grid min-w-0 grid-cols-3 gap-2">
            {selectedListing.modeRules.map((rule) => (
              <button
                key={rule.mode}
                onClick={() => setSelectedMode(rule.mode)}
                className={`min-w-0 min-h-14 rounded-[18px] border px-2 py-2 text-xs font-bold leading-tight ${
                  activeMode === rule.mode
                    ? "border-orbit-green bg-orbit-soft text-orbit-green"
                    : "border-orbit-line bg-orbit-panel text-orbit-ink"
                }`}
                title={rule.label}
              >
                {readableMode(rule.mode)}
              </button>
            ))}
          </div>
        </div>

        <BookingQuantityControl
          quantityValue={bookingQuantity}
          setQuantityValue={setBookingQuantity}
          selectedQuantity={selectedQuantity}
          totalUnits={totalUnits}
          bookedUnits={bookedUnits}
          availableUnits={availableUnits}
        />

        <div className="grid grid-cols-2 gap-2 border-y border-orbit-line py-3 text-sm">
          <SummaryLine label="Rental" value={kes(totalRental)} />
          <SummaryLine label="Platform" value={kes(totalPlatform)} />
          <SummaryLine label="Deposit" value={kes(totalDeposit)} />
          <SummaryLine label="Due now" value={kes(totalDueNow)} strong />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <IconFact icon={<Truck className="h-4 w-4" />} label={selectedListing.logistics.deliveryModes.join(", ")} />
          <IconFact icon={<CalendarClock className="h-4 w-4" />} label={`${selectedQuantity} item(s), ${quote.units} billed unit(s)`} />
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
            disabled={availableUnits <= 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-orbit-green px-3 py-3 text-sm font-bold text-orbit-field disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45"
          >
            <FileSignature className="h-4 w-4" aria-hidden="true" />
            Propose
          </button>
        </div>
      </div>
    </section>
  );
}

function FocusedListingOverlay({
  listing,
  gallery,
  image,
  imageIndex,
  setImageIndex,
  zoom,
  setZoom,
  activeMode,
  quote,
  bookingQuantity,
  setBookingQuantity,
  selectedQuantity,
  totalUnits,
  bookedUnits,
  availableUnits,
  publicCoordinates,
  setSelectedMode,
  panel,
  setPanel,
  thread,
  draft,
  setDraft,
  sendMessage,
  onDm,
  proposeBooking,
  onClose
}: {
  listing: ResourceListing;
  gallery: ResourceListing["media"];
  image?: ResourceListing["media"][number];
  imageIndex: number;
  setImageIndex: React.Dispatch<React.SetStateAction<number>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  activeMode: OperationMode;
  quote: ReturnType<typeof calculateBookingQuote>;
  bookingQuantity: string;
  setBookingQuantity: (value: string) => void;
  selectedQuantity: number;
  totalUnits: number;
  bookedUnits: number;
  availableUnits: number;
  publicCoordinates?: Coordinates;
  setSelectedMode: (mode: OperationMode) => void;
  panel: FocusedPanel;
  setPanel: (panel: FocusedPanel) => void;
  thread: AccountChatThread;
  draft: string;
  setDraft: (value: string) => void;
  sendMessage: () => void;
  onDm: () => void;
  proposeBooking: () => void;
  onClose: () => void;
}) {
  const hasMultipleImages = gallery.length > 1;

  function shiftImage(direction: "previous" | "next") {
    if (!gallery.length) {
      return;
    }

    setZoom(1);
    setImageIndex((current) => {
      if (direction === "previous") {
        return current === 0 ? gallery.length - 1 : current - 1;
      }

      return current === gallery.length - 1 ? 0 : current + 1;
    });
  }

  function updateZoom(nextZoom: number) {
    setZoom(Math.min(2.5, Math.max(1, nextZoom)));
  }

  return (
    <div className="fixed inset-0 z-[80] bg-orbit-field p-2 text-orbit-ink sm:p-3" role="dialog" aria-modal="true" aria-label={listing.title}>
      <div className="grid h-full min-w-0 overflow-hidden rounded-[34px] border-2 border-[#4391F5] bg-orbit-panel shadow-[0_24px_70px_rgba(25,32,29,0.22)] lg:grid-cols-[minmax(0,7fr)_minmax(340px,3fr)]">
        <section className="relative min-h-[55svh] overflow-hidden bg-[#1A1A1A] lg:min-h-0">
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-black/65 p-1 text-white backdrop-blur">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              title="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Close focused listing</span>
            </button>
            <span className="max-w-[42vw] truncate pr-3 text-sm font-black">{listing.title}</span>
          </div>

          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            {image ? (
              <img
                src={image.url}
                alt={image.alt || listing.title}
                className="h-full w-full object-contain transition-transform duration-200 ease-out"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              />
            ) : null}
          </div>

          <div className="absolute bottom-5 left-5 z-20 flex rounded-[18px] bg-black p-1 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
            <button
              type="button"
              onClick={() => shiftImage("previous")}
              disabled={!hasMultipleImages}
              className="flex h-12 w-12 items-center justify-center rounded-[14px] disabled:cursor-not-allowed disabled:opacity-35"
              title="Previous image"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">Previous image</span>
            </button>
            <button
              type="button"
              onClick={() => shiftImage("next")}
              disabled={!hasMultipleImages}
              className="flex h-12 w-12 items-center justify-center rounded-[14px] disabled:cursor-not-allowed disabled:opacity-35"
              title="Next image"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">Next image</span>
            </button>
          </div>

          <div className="absolute bottom-5 right-5 z-20 flex rounded-[18px] bg-black p-1 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
            <button
              type="button"
              onClick={() => updateZoom(zoom - 0.2)}
              disabled={zoom <= 1}
              className="flex h-12 w-12 items-center justify-center rounded-[14px] disabled:cursor-not-allowed disabled:opacity-35"
              title="Zoom out"
            >
              <ZoomOut className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Zoom out</span>
            </button>
            <button
              type="button"
              onClick={() => updateZoom(zoom + 0.2)}
              disabled={zoom >= 2.5}
              className="flex h-12 w-12 items-center justify-center rounded-[14px] disabled:cursor-not-allowed disabled:opacity-35"
              title="Zoom in"
            >
              <ZoomIn className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Zoom in</span>
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="hidden h-12 items-center justify-center rounded-[14px] px-3 text-xs font-black sm:flex"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
          </div>
        </section>

        <aside className="min-h-0 min-w-0 overflow-hidden bg-orbit-panel">
          {panel === "details" ? (
            <FocusedDetailsPanel
              listing={listing}
              publicCoordinates={publicCoordinates}
              activeMode={activeMode}
              quote={quote}
              bookingQuantity={bookingQuantity}
              setBookingQuantity={setBookingQuantity}
              selectedQuantity={selectedQuantity}
              totalUnits={totalUnits}
              bookedUnits={bookedUnits}
              availableUnits={availableUnits}
              setSelectedMode={setSelectedMode}
              onDm={onDm}
              proposeBooking={proposeBooking}
            />
          ) : (
            <FocusedChatPanel
              thread={thread}
              draft={draft}
              setDraft={setDraft}
              sendMessage={sendMessage}
              backToDetails={() => setPanel("details")}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function FocusedDetailsPanel({
  listing,
  publicCoordinates,
  activeMode,
  quote,
  bookingQuantity,
  setBookingQuantity,
  selectedQuantity,
  totalUnits,
  bookedUnits,
  availableUnits,
  setSelectedMode,
  onDm,
  proposeBooking
}: {
  listing: ResourceListing;
  publicCoordinates?: Coordinates;
  activeMode: OperationMode;
  quote: ReturnType<typeof calculateBookingQuote>;
  bookingQuantity: string;
  setBookingQuantity: (value: string) => void;
  selectedQuantity: number;
  totalUnits: number;
  bookedUnits: number;
  availableUnits: number;
  setSelectedMode: (mode: OperationMode) => void;
  onDm: () => void;
  proposeBooking: () => void;
}) {
  const totalRental = quote.rentalFee.amount * selectedQuantity;
  const totalPlatform = quote.platformFee.amount * selectedQuantity;
  const totalDeposit = quote.deposit.amount * selectedQuantity;
  const totalDueNow = quote.totalDueNow.amount * selectedQuantity;

  return (
    <section className="grid h-full min-h-0 min-w-0 content-start gap-4 overflow-y-auto overflow-x-hidden p-4">
      <div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="orbit-tag rounded-full bg-orbit-field px-3 py-1">{listing.location.county}</span>
          <span className="orbit-tag rounded-full bg-orbit-field px-3 py-1">{listing.category}</span>
          <span className="kind-tag orbit-tag rounded-full px-3 py-1" data-kind={listing.kind}>
            {listingKindLabel(listing.kind)}
          </span>
          <span className="orbit-tag rounded-full bg-orbit-field px-3 py-1">{bookedUnitsLabel(bookedUnits, totalUnits)}</span>
        </div>
        <h2 className="mt-4 text-2xl font-black">{listing.title}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{listing.description}</p>
      </div>

      <div className="rounded-[28px] bg-orbit-soft/75 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black">Approximate</h3>
            <p className="mt-1 text-xs font-semibold text-neutral-600">
              {listing.location.generalArea}, {listing.location.county}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-orbit-green">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <div className="relative mt-3 h-36 overflow-hidden rounded-[26px] bg-orbit-line">
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute left-[18%] top-[24%] h-20 w-20 rounded-full border border-white/70 bg-white/20" />
          <div className="absolute bottom-[12%] right-[14%] h-24 w-24 rounded-full border border-white/60 bg-white/15" />
          <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orbit-green text-orbit-field shadow-panel">
            <MapPin className="h-6 w-6" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-3 text-xs font-semibold text-neutral-600">
          {publicCoordinates ? `${publicCoordinates.latitude}, ${publicCoordinates.longitude}` : "Approximate public area only"}
        </p>
      </div>

      <div className="rounded-[24px] border border-orbit-line bg-orbit-field p-4">
        <p className="text-xs font-black uppercase text-orbit-ink/55">Booking mode</p>
        <div className="mt-3 grid min-w-0 grid-cols-3 gap-2">
          {listing.modeRules.map((rule) => (
            <button
              key={rule.mode}
              onClick={() => setSelectedMode(rule.mode)}
              className={`min-w-0 min-h-14 rounded-[18px] border px-2 py-2 text-xs font-bold leading-tight ${
                activeMode === rule.mode
                  ? "border-[#4391F5] bg-orbit-soft text-orbit-green"
                  : "border-orbit-line bg-orbit-panel text-orbit-ink"
              }`}
              title={rule.label}
            >
              {readableMode(rule.mode)}
            </button>
          ))}
        </div>
      </div>

      <BookingQuantityControl
        quantityValue={bookingQuantity}
        setQuantityValue={setBookingQuantity}
        selectedQuantity={selectedQuantity}
        totalUnits={totalUnits}
        bookedUnits={bookedUnits}
        availableUnits={availableUnits}
      />

      <div className="grid grid-cols-2 gap-2 border-y border-orbit-line py-3 text-sm">
        <SummaryLine label="Rental" value={kes(totalRental)} />
        <SummaryLine label="Platform" value={kes(totalPlatform)} />
        <SummaryLine label="Deposit" value={kes(totalDeposit)} />
        <SummaryLine label="Due now" value={kes(totalDueNow)} strong />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <IconFact icon={<Truck className="h-4 w-4" />} label={listing.logistics.deliveryModes.join(", ")} />
        <IconFact icon={<CalendarClock className="h-4 w-4" />} label={`${selectedQuantity} item(s), ${quote.units} billed unit(s)`} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onDm}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-orbit-line px-3 py-3 text-sm font-bold"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          DM
        </button>
        <button
          onClick={proposeBooking}
          disabled={availableUnits <= 0}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-orbit-green px-3 py-3 text-sm font-bold text-orbit-field disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45"
        >
          <FileSignature className="h-4 w-4" aria-hidden="true" />
          Propose
        </button>
      </div>
    </section>
  );
}

function FocusedChatPanel({
  thread,
  draft,
  setDraft,
  sendMessage,
  backToDetails
}: {
  thread: AccountChatThread;
  draft: string;
  setDraft: (value: string) => void;
  sendMessage: () => void;
  backToDetails: () => void;
}) {
  return (
    <section className="grid h-full min-h-[45svh] grid-rows-[auto_minmax(0,1fr)_auto] bg-[#ffffff] dark:bg-[#000000]">
      <div className="theme-body-border flex min-h-16 items-center justify-between gap-3 border-b border-white/70 bg-orbit-panel/95 px-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-black">{thread.participant}</h2>
          <p className="truncate text-xs font-semibold text-orbit-ink/60">{thread.listing}</p>
        </div>
        <button
          type="button"
          onClick={backToDetails}
          className="rounded-full bg-orbit-soft px-4 py-2 text-xs font-black"
        >
          Details
        </button>
      </div>

      <div className="chat-thread-body overflow-y-auto bg-[#ffffff] p-4">
        <div className="grid gap-3">
          {thread.messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[82%] rounded-[24px] px-4 py-3 text-sm font-semibold leading-6 ${
                message.author === "me" ? "ml-auto bg-[#07777a] text-white" : "mr-auto bg-[#2a2836] text-white"
              }`}
            >
              <p>{message.text}</p>
              <p className="mt-1 text-[10px] font-black uppercase text-white/60">{message.time}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="theme-body-border border-t border-white/70 bg-orbit-panel p-4">
        <div className="flex items-center gap-2 rounded-full border border-orbit-line bg-orbit-field p-[3px] focus-within:border-orbit-line focus-within:outline-none focus-within:ring-0">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={1}
            className="chat-composer-field max-h-24 min-h-12 min-w-0 flex-1 resize-none rounded-[22px] px-4 py-3 text-sm font-bold text-orbit-ink outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!draft.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orbit-green text-orbit-field disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45"
            title="Send message"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
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
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
}) {
  return (
    <CustomSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      labelClassName="mb-1 block text-xs font-semibold uppercase text-neutral-500"
      buttonClassName="flex min-h-10 w-full items-center gap-3 rounded-[18px] border border-orbit-line bg-orbit-panel py-2 pl-3 pr-2 text-left text-sm text-orbit-ink outline-none transition hover:bg-orbit-soft/45 focus:border-orbit-line focus:outline-none focus:ring-0 focus-visible:outline-none"
    />
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
        className="w-full rounded-[18px] border border-orbit-line bg-orbit-panel px-3 py-2 text-sm outline-none focus:border-orbit-line focus:outline-none focus:ring-0 focus-visible:outline-none"
      />
    </label>
  );
}

function MarketplaceListingCard({
  result,
  selected,
  saved,
  onSelect,
  onOpen,
  onSave
}: {
  result: SearchResult;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onSave: () => void;
}) {
  const listing = result.listing;
  const media = listing.media[0];
  const rate = kes(listing.modeRules[0]?.pricing.rate.amount ?? 0);
  const unavailable = result.availabilityState === "unavailable_for_window";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      data-selected={selected ? "true" : "false"}
      data-listing-id={listing.id}
      className="grid min-h-[240px] cursor-pointer overflow-hidden rounded-[30px] border-2 border-transparent bg-orbit-panel p-4 text-left shadow-[0_2px_14px_rgba(25,32,29,0.12)] transition-shadow data-[selected=true]:border-orbit-green hover:shadow-[0_2px_14px_rgba(25,32,29,0.18)] focus-visible:border-orbit-green focus-visible:outline-none focus-visible:shadow-[0_2px_14px_rgba(25,32,29,0.12)] md:min-h-[clamp(220px,16vw,270px)] md:grid-cols-[minmax(0,1fr)_40%]"
    >
      <div className="flex min-w-0 flex-col justify-between gap-3 overflow-hidden pr-0 md:pr-3">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className="kind-tag orbit-tag inline-flex h-[clamp(32px,2.4vw,36px)] items-center gap-2 rounded-full border px-[clamp(10px,1vw,12px)] text-[clamp(10px,0.8vw,11px)] font-black uppercase tracking-normal"
              data-kind={listing.kind}
            >
              {listingIcon(listing.kind)}
              {listingKindLabel(listing.kind)}
            </span>
            {unavailable ? (
              <span className="orbit-tag inline-flex h-[clamp(32px,2.4vw,36px)] items-center rounded-full bg-orbit-clay px-[clamp(10px,1vw,12px)] text-[clamp(10px,0.8vw,11px)] font-black uppercase text-orbit-field">Booked</span>
            ) : (
              <span className="orbit-tag inline-flex h-[clamp(32px,2.4vw,36px)] items-center rounded-full bg-orbit-soft/85 px-[clamp(10px,1vw,12px)] text-[clamp(10px,0.8vw,11px)] font-black uppercase text-orbit-ink">
                Available
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-[clamp(1.05rem,1.45vw,1.35rem)] font-black leading-tight text-orbit-ink">{listing.title}</h3>
          <p className="mt-2 line-clamp-2 text-[clamp(0.8rem,0.95vw,0.95rem)] leading-5 text-neutral-500 2xl:line-clamp-1">{listing.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[clamp(10px,0.8vw,11px)] font-black text-orbit-ink">
          <span className="orbit-tag rounded-full bg-orbit-soft/85 px-[clamp(10px,1vw,12px)] py-2">{listing.location.county}</span>
          <span className="orbit-tag rounded-full bg-orbit-soft/85 px-[clamp(10px,1vw,12px)] py-2">{rate}</span>
        </div>
      </div>

      <div className="relative isolate mt-4 aspect-[16/9] min-h-[170px] self-stretch overflow-hidden rounded-[26px] bg-orbit-soft md:mt-0 md:h-full md:min-h-[clamp(180px,14vw,240px)] md:aspect-auto">
        <img
          src={media?.url}
          alt={media?.alt ?? listing.title}
          className={`absolute inset-0 z-0 h-full w-full object-cover ${unavailable ? "grayscale" : ""}`}
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSave();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className={`image-overlay-element image-overlay-surface absolute right-[clamp(6px,2vw,8px)] top-[clamp(6px,2vw,8px)] z-10 flex h-[clamp(28px,8vw,32px)] w-[clamp(28px,8vw,32px)] items-center justify-center rounded-full text-red-500 backdrop-blur transition-colors ${
            saved ? "bg-white/80" : "bg-white/45 hover:bg-white/70"
          }`}
          aria-pressed={saved}
          aria-label={saved ? `Saved ${listing.title}` : `Save ${listing.title}`}
          title={saved ? "Saved item" : "Save item"}
        >
          <Heart className={`h-[clamp(12px,3.5vw,14px)] w-[clamp(12px,3.5vw,14px)] ${saved ? "fill-current" : "fill-transparent"}`} aria-hidden="true" />
        </button>
        <span className="image-overlay-element image-overlay-surface absolute left-[clamp(6px,2vw,8px)] top-[clamp(6px,2vw,8px)] z-10 inline-flex h-[clamp(24px,7vw,28px)] items-center gap-1 rounded-full bg-white/70 px-[clamp(6px,2vw,8px)] text-[clamp(9px,2.8vw,10px)] font-black text-orbit-ink backdrop-blur">
          {listing.rating.toFixed(1)}
          <span className="text-[clamp(8px,2.4vw,9px)] font-bold text-neutral-500">({listing.reviewCount})</span>
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className="image-overlay-element image-overlay-surface absolute bottom-[clamp(6px,2vw,8px)] right-[clamp(6px,2vw,8px)] z-10 inline-flex h-[clamp(32px,9vw,35px)] items-center gap-1 rounded-full bg-[#c8bfb1]/90 p-[2px] pl-[clamp(10px,3vw,12px)] text-[clamp(10px,3vw,11px)] font-semibold text-orbit-ink backdrop-blur-md"
        >
          Open
          <span className="image-overlay-element image-overlay-strong flex h-full aspect-square items-center justify-center rounded-full bg-black text-white">
            <ArrowUpRight className="h-[clamp(12px,3.5vw,14px)] w-[clamp(12px,3.5vw,14px)]" aria-hidden="true" />
          </span>
        </button>
      </div>
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "yellow" | "green" | "red" }) {
  const tones = {
    yellow: "text-[#FFBD2E]",
    green: "text-[#28C840]",
    red: "text-[#FF5F57]"
  };
  return (
    <div className="rounded-[18px] border border-orbit-line bg-orbit-field p-2">
      <p className={`text-lg font-black ${tones[tone]}`}>{value}</p>
      <p className="mt-1 font-semibold text-neutral-600">{label}</p>
    </div>
  );
}

function BookingQuantityControl({
  quantityValue,
  setQuantityValue,
  selectedQuantity,
  totalUnits,
  bookedUnits,
  availableUnits
}: {
  quantityValue: string;
  setQuantityValue: (value: string) => void;
  selectedQuantity: number;
  totalUnits: number;
  bookedUnits: number;
  availableUnits: number;
}) {
  const disabled = availableUnits <= 0;

  function updateQuantity(nextValue: number) {
    if (availableUnits <= 0) {
      setQuantityValue("0");
      return;
    }

    setQuantityValue(String(Math.min(availableUnits, Math.max(1, Math.floor(nextValue)))));
  }

  return (
    <div className="min-w-0 rounded-[24px] border border-orbit-line bg-orbit-field p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-orbit-ink/55">Booking quantity</p>
          <p className="mt-1 text-sm font-semibold text-orbit-ink/60">
            {availableUnits} available • {bookedUnitsLabel(bookedUnits, totalUnits)}
          </p>
        </div>
        <span className="rounded-full bg-orbit-panel px-3 py-2 text-xs font-black text-orbit-green">
          Max {availableUnits}
        </span>
      </div>
      <div className="mt-3 flex h-14 min-w-0 items-center rounded-full border border-orbit-line bg-orbit-panel p-[3px]">
        <button
          type="button"
          onClick={() => updateQuantity(selectedQuantity - 1)}
          disabled={disabled || selectedQuantity <= 1}
          className="flex h-full aspect-square shrink-0 items-center justify-center rounded-full bg-orbit-soft text-lg font-black disabled:cursor-not-allowed disabled:opacity-35"
          title="Decrease quantity"
        >
          -
        </button>
        <input
          value={quantityValue}
          onChange={(event) => {
            if (!event.target.value) {
              setQuantityValue("");
              return;
            }

            updateQuantity(positiveInteger(event.target.value, 1));
          }}
          onBlur={() => updateQuantity(positiveInteger(quantityValue, 1))}
          disabled={disabled}
          type="text"
          inputMode="numeric"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-center text-lg font-black text-orbit-ink outline-none focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => updateQuantity(selectedQuantity + 1)}
          disabled={disabled || selectedQuantity >= availableUnits}
          className="flex h-full aspect-square shrink-0 items-center justify-center rounded-full bg-orbit-green text-lg font-black text-orbit-field disabled:cursor-not-allowed disabled:grayscale disabled:opacity-35"
          title="Increase quantity"
        >
          +
        </button>
      </div>
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
