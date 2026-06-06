"use client";

import {
  ArrowUpRight,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Compass,
  FileSignature,
  Flame,
  Handshake,
  Heart,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  Star,
  Truck,
  UserRoundCheck,
  X
} from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "@/components/CustomSelect";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { AccountMode } from "@/components/AuthModal";
import { accountSessionUpdatedEvent, clearAccountSession, readAccountSession } from "@/lib/accountSession";
import {
  readSearchIntelligenceSession,
  recordListingIntelligenceSignal,
  recordSearchIntelligenceConversation,
  startSearchIntelligenceSession
} from "@/lib/intelligence";
import { listingThumbnailUrl } from "@/lib/listingImageUrls";
import { cn, ui } from "@/lib/ui";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  calculateBookingQuote,
  availabilityState,
  createContractSummary,
  filterListings,
  kenyaCounties,
  marketplaceCategories,
  publicLocationOffset,
  type ContractSummary,
  type Coordinates,
  type OperationMode,
  type ResourceListing,
  type SearchFilters,
  type SearchIntelligenceSession,
  type SearchIntelligenceTag,
  type SearchResult
} from "@rentorbit/shared";
import { seededListings } from "@rentorbit/shared/sample-data";
import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState } from "react";

const FocusedListingOverlay = dynamic(
  () => import("@/components/MarketplaceFocusedOverlay").then((module) => module.FocusedListingOverlay),
  {
    loading: () => (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-orbit-field/92 p-5 text-orbit-ink">
        <div className="rounded-full bg-orbit-panel px-5 py-3 text-sm font-black shadow-[0_18px_42px_rgba(25,32,29,0.14)]">
          Opening listing...
        </div>
      </div>
    )
  }
);

const AuthModal = dynamic(() => import("@/components/AuthModal").then((module) => module.AuthModal), {
  ssr: false
});

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

type FocusedPanel = "details" | "chat";
type SearchStatus = "idle" | "pending" | "complete";

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

type AiTagState = {
  id: string;
  label: string;
  color: string;
  textColor: string;
  matchCount: number;
  weight: number;
  active: boolean;
};

type RadialAiTag = AiTagState & {
  gridColumn: number;
  gridRow: number;
  shiftX: string;
  shiftY: string;
};

const marketplaceThreadsKey = "rentorbit:marketplace-chat-threads";
const marketplaceThreadsUpdatedEvent = "rentorbit:marketplace-chats-updated";
const savedListingsKey = "rentorbit:saved-marketplace-listings";
const savedListingsUpdatedEvent = "rentorbit:saved-listings-updated";
const aiTagStateKey = "rentorbit:marketplace-ai-tag-state";

const initialFilters: FilterState = {
  query: "",
  category: "all",
  county: "all",
  radiusKm: 300,
  operationMode: "all",
  includeCountrywide: false,
  start: "2026-06-16T09:00",
  end: "2026-06-17T09:00"
};

function hasMarketplaceSearchChanges(filters: FilterState, aiTags: AiTagState[]): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.category !== initialFilters.category ||
    filters.county !== initialFilters.county ||
    filters.radiusKm !== initialFilters.radiusKm ||
    filters.operationMode !== initialFilters.operationMode ||
    filters.includeCountrywide !== initialFilters.includeCountrywide ||
    aiTags.length > 0
  );
}

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

function availabilityTagStatus(bookedCount: number, totalCount: number): "available" | "partial" | "booked" {
  const total = Math.max(1, Math.floor(totalCount));
  const booked = Math.min(total, Math.max(0, Math.floor(bookedCount)));
  if (booked <= 0) return "available";
  if (booked < total) return "partial";
  return "booked";
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

function buildMarketplaceSearchFilters(filters: FilterState, includeQuery: boolean): SearchFilters {
  const origin = filters.county !== "all" ? countyOrigins[filters.county] : undefined;

  return {
    query: includeQuery ? filters.query : undefined,
    category: filters.category === "all" ? undefined : filters.category,
    county: filters.county === "all" ? undefined : filters.county,
    radiusKm: origin ? filters.radiusKm : undefined,
    origin,
    operationMode: filters.operationMode === "all" ? undefined : (filters.operationMode as OperationMode),
    includeCountrywide: filters.includeCountrywide,
    start: filters.start,
    end: filters.end
  };
}

function orderResultsByIntelligence(
  candidateResults: SearchResult[],
  intelligenceSession: SearchIntelligenceSession | null
): SearchResult[] {
  if (!intelligenceSession?.recommendations.length) {
    return [];
  }

  const resultsById = new Map(candidateResults.map((result) => [result.listing.id, result]));
  return intelligenceSession.recommendations
    .map((recommendation) => resultsById.get(recommendation.listingId))
    .filter((result): result is SearchResult => Boolean(result));
}

function readAiTagStates(): Record<string, AiTagState> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(aiTagStateKey) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, AiTagState>) : {};
  } catch {
    return {};
  }
}

function writeAiTagStates(states: Record<string, AiTagState>) {
  window.sessionStorage.setItem(aiTagStateKey, JSON.stringify(states));
}

function clearAiTagStates() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(aiTagStateKey);
}

function mergeAiTagStates(
  tags: SearchIntelligenceTag[],
  previousStates: Record<string, AiTagState>
): Record<string, AiTagState> {
  return Object.fromEntries(
    tags.map((tag) => {
      const previous = previousStates[tag.id];
      return [
        tag.id,
        {
          id: tag.id,
          label: tag.label,
          color: previous?.color ?? tag.color,
          textColor: previous?.textColor ?? tag.textColor,
          matchCount: tag.matchCount,
          weight: tag.weight ?? tag.matchCount,
          active: previous?.active ?? true
        }
      ];
    })
  );
}

function activeAiTags(tags: SearchIntelligenceTag[], states: Record<string, AiTagState>): AiTagState[] {
  return tags.map((tag) => {
    const previous = states[tag.id];

    return {
      id: tag.id,
      label: tag.label,
      color: previous?.color ?? tag.color,
      textColor: previous?.textColor ?? tag.textColor,
      matchCount: tag.matchCount,
      weight: tag.weight ?? tag.matchCount,
      active: previous?.active ?? true
    };
  });
}

function radialTagLayout(tags: AiTagState[]): { tags: RadialAiTag[]; columns: number; rows: number } {
  const count = tags.length;
  if (count === 0) {
    return { tags: [], columns: 1, rows: 1 };
  }

  const columns = Math.min(5, Math.max(1, Math.ceil(Math.sqrt(count * 1.25))));
  const rows = Math.ceil(count / columns);
  const centerColumn = (columns - 1) / 2;
  const centerRow = (rows - 1) / 2;
  const slots = Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const distance = (column - centerColumn) ** 2 + (row - centerRow) ** 2;
    const angle = Math.atan2(row - centerRow, column - centerColumn);

    return { row, column, distance, angle };
  }).sort((left, right) => left.distance - right.distance || left.angle - right.angle);

  const sortedTags = [...tags].sort((left, right) => {
    const leftWeight = Number.isFinite(left.weight) ? left.weight : left.matchCount;
    const rightWeight = Number.isFinite(right.weight) ? right.weight : right.matchCount;

    return rightWeight - leftWeight || right.matchCount - left.matchCount || left.label.localeCompare(right.label);
  });

  return {
    columns,
    rows,
    tags: sortedTags.map((tag, index) => {
      const slot = slots[index] ?? slots[slots.length - 1] ?? { row: 0, column: 0 };
      const jitterSeed = (index * 37 + count * 11) % 9;
      const shiftX = `${(jitterSeed - 4) * 0.08}rem`;
      const shiftY = `${(((jitterSeed * 5) % 9) - 4) * 0.05}rem`;

      return {
        ...tag,
        gridColumn: slot.column + 1,
        gridRow: slot.row + 1,
        shiftX,
        shiftY
      };
    })
  };
}

function tagIdFromLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function applyAiTagDropRule(
  orderedResults: SearchResult[],
  intelligenceSession: SearchIntelligenceSession | null,
  tagStates: Record<string, AiTagState>
): SearchResult[] {
  if (!intelligenceSession?.filterTags?.length) {
    return orderedResults;
  }

  const recommendationsByListingId = new Map(intelligenceSession.recommendations.map((recommendation) => [recommendation.listingId, recommendation]));
  const knownTagIds = new Set(intelligenceSession.filterTags.map((tag) => tag.id));

  return orderedResults.filter((result) => {
    const recommendation = recommendationsByListingId.get(result.listing.id);
    const matchedTagIds = recommendation?.matchedTags.map(tagIdFromLabel).filter((id) => knownTagIds.has(id)) ?? [];

    if (matchedTagIds.length === 0) {
      return true;
    }

    const disabledCount = matchedTagIds.filter((id) => tagStates[id]?.active === false).length;
    return disabledCount / matchedTagIds.length <= 0.7;
  });
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
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [focusedListingId, setFocusedListingId] = useState<string | null>(null);
  const [focusedImageIndex, setFocusedImageIndex] = useState(0);
  const [focusedZoom, setFocusedZoom] = useState(1);
  const [focusedPanel, setFocusedPanel] = useState<FocusedPanel>("details");
  const [focusedDraft, setFocusedDraft] = useState("");
  const [focusedThread, setFocusedThread] = useState<AccountChatThread | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AccountMode>("signin");
  const [accountSignedIn, setAccountSignedIn] = useState(false);
  const [pendingDmListingId, setPendingDmListingId] = useState<string | null>(null);
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);
  const [bookingQuantity, setBookingQuantity] = useState("1");
  const [bookedUnitCounts] = useState<Record<string, number>>(seededBookedUnits);
  const [intelligenceSession, setIntelligenceSession] = useState<SearchIntelligenceSession | null>(null);
  const [aiTagStates, setAiTagStates] = useState<Record<string, AiTagState>>({});
  const [aiTagsCleared, setAiTagsCleared] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [compactSearchVisible, setCompactSearchVisible] = useState(false);
  const [mobileHeaderSearch, setMobileHeaderSearch] = useState(false);
  const marketplaceContentRef = useRef<HTMLElement | null>(null);
  const desktopSearchSurfaceRef = useRef<HTMLDivElement | null>(null);
  const mobileSettingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    const existingIntelligenceSession = readSearchIntelligenceSession();
    setIntelligenceSession(existingIntelligenceSession);
    if (existingIntelligenceSession?.filterTags?.length) {
      setAiTagStates(mergeAiTagStates(existingIntelligenceSession.filterTags, readAiTagStates()));
    }

    const params = new URLSearchParams(window.location.search);
    const requestedListingId = params.get("listing");
    const requestedSearch = params.get("search")?.trim() ?? "";
    const requestedListing = requestedListingId
      ? seededListings.find((listing) => listing.id === requestedListingId)
      : undefined;

    if (!requestedListing) {
      if (requestedSearch) {
        setFilters((current) => normalizeFilterWindow(current, { query: requestedSearch }));
      }
      return;
    }

    requestedListingRef.current = requestedListing.id;
    setFilters({
      ...initialFilters,
      query: requestedSearch,
      category: "all",
      county: "all",
      operationMode: "all",
      includeCountrywide: initialFilters.includeCountrywide
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
    function refreshAccountSession() {
      setAccountSignedIn(Boolean(readAccountSession()));
    }

    refreshAccountSession();
    window.addEventListener("storage", refreshAccountSession);
    window.addEventListener(accountSessionUpdatedEvent, refreshAccountSession);

    return () => {
      window.removeEventListener("storage", refreshAccountSession);
      window.removeEventListener(accountSessionUpdatedEvent, refreshAccountSession);
    };
  }, []);

  useEffect(() => {
    if (!mobileSettingsOpen && !mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSettingsOpen(false);
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen, mobileSettingsOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    function updateMobileHeaderSearch() {
      setMobileHeaderSearch(mediaQuery.matches);
    }

    updateMobileHeaderSearch();
    mediaQuery.addEventListener("change", updateMobileHeaderSearch);

    return () => {
      mediaQuery.removeEventListener("change", updateMobileHeaderSearch);
    };
  }, []);

  useEffect(() => {
    const currentScroller = marketplaceContentRef.current;
    const currentSearchSurface = desktopSearchSurfaceRef.current;
    if (currentScroller === null || currentSearchSurface === null) {
      return;
    }
    const scroller: HTMLElement = currentScroller;
    const searchSurface: HTMLElement = currentSearchSurface;

    function updateCompactSearch() {
      const searchSurfaceBottom = searchSurface.offsetTop + searchSurface.offsetHeight;
      setCompactSearchVisible(scroller.scrollTop >= Math.max(0, searchSurfaceBottom - 2));
    }

    updateCompactSearch();
    scroller.addEventListener("scroll", updateCompactSearch, { passive: true });
    window.addEventListener("resize", updateCompactSearch);
    const resizeObserver = new ResizeObserver(updateCompactSearch);
    resizeObserver.observe(scroller);
    resizeObserver.observe(searchSurface);

    return () => {
      scroller.removeEventListener("scroll", updateCompactSearch);
      window.removeEventListener("resize", updateCompactSearch);
      resizeObserver.disconnect();
    };
  }, []);

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

  const exactResults = useMemo(() => filterListings(seededListings, buildMarketplaceSearchFilters(filters, true)), [filters]);
  const intelligenceCandidateResults = useMemo(() => filterListings(seededListings, buildMarketplaceSearchFilters(filters, false)), [filters]);
  const intelligenceResults = useMemo(
    () => orderResultsByIntelligence(intelligenceCandidateResults, intelligenceSession),
    [intelligenceCandidateResults, intelligenceSession]
  );
  const rawResults = useMemo(() => {
    if (filters.query.trim() && intelligenceSession) {
      return intelligenceResults;
    }

    return exactResults;
  }, [exactResults, filters.query, intelligenceResults, intelligenceSession]);
  const results = useMemo(
    () => applyAiTagDropRule(rawResults, intelligenceSession, aiTagStates),
    [aiTagStates, intelligenceSession, rawResults]
  );
  const visibleAiTags = useMemo(
    () => (aiTagsCleared ? [] : activeAiTags(intelligenceSession?.filterTags?.slice(0, 20) ?? [], aiTagStates)),
    [aiTagStates, aiTagsCleared, intelligenceSession]
  );

  useEffect(() => {
    const hasSpecificNeed =
      filters.query.trim().length > 0 ||
      filters.category !== "all" ||
      filters.county !== "all" ||
      filters.radiusKm !== initialFilters.radiusKm ||
      filters.operationMode !== "all" ||
      filters.includeCountrywide !== initialFilters.includeCountrywide;

    if (aiTagsCleared && !filters.query.trim()) {
      searchRequestIdRef.current += 1;
      setSearchStatus("idle");
      setIntelligenceSession(null);
      return;
    }

    if (!hasSpecificNeed) {
      searchRequestIdRef.current += 1;
      setSearchStatus("idle");
      setIntelligenceSession(null);
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setSearchStatus("pending");
    setIntelligenceSession(null);

    const timer = window.setTimeout(() => {
      void startSearchIntelligenceSession({
        query: filters.query.trim() || "marketplace discovery",
        source: "marketplace",
        filters: buildMarketplaceSearchFilters(filters, false)
      }).then((session) => {
        if (searchRequestIdRef.current !== requestId) {
          return;
        }

        if (session) {
          setIntelligenceSession(session);
          setAiTagsCleared(false);
          setAiTagStates((current) => {
            const next = mergeAiTagStates(session.filterTags, { ...readAiTagStates(), ...current });
            writeAiTagStates(next);
            return next;
          });
        }
      }).finally(() => {
        if (searchRequestIdRef.current === requestId) {
          setSearchStatus("complete");
        }
      });
    }, 550);

    return () => window.clearTimeout(timer);
  }, [aiTagsCleared, filters]);

  const popularResults = useMemo(() => {
    const activeListings = seededListings
      .filter((listing) => listing.status === "active" && listing.media.length > 0)
      .sort((left, right) => right.rating * 100 + right.reviewCount - (left.rating * 100 + left.reviewCount));
    const localListings = filters.county !== "all"
      ? activeListings.filter((listing) => listing.location.county === filters.county)
      : [];
    const recommendationSource = localListings.length >= 3 ? localListings : activeListings;

    return recommendationSource.slice(0, 3).map((listing) => ({
      listing,
      publicCoordinates: publicLocationOffset(listing),
      availabilityState: availabilityState(listing, {
        start: filters.start,
        end: filters.end
      })
    })) satisfies SearchResult[];
  }, [filters.county, filters.end, filters.start]);

  useEffect(() => {
    if (searchStatus === "pending") {
      return;
    }

    if (results.length > 0 && !results.some((result) => result.listing.id === selectedId)) {
      const nextListing = results[0]?.listing;
      setSelectedId(nextListing?.id ?? selectedId);
      setSelectedMode(nextListing?.modeRules[0]?.mode ?? "self_operated");
      setBookingQuantity("1");
      setContract(null);
      return;
    }

    if (results.length === 0 && popularResults.length > 0 && !popularResults.some((result) => result.listing.id === selectedId)) {
      const nextListing = popularResults[0]?.listing;
      if (!nextListing) {
        return;
      }

      setSelectedId(nextListing.id);
      setSelectedMode(nextListing.modeRules[0]?.mode ?? "self_operated");
      setBookingQuantity("1");
      setContract(null);
    }
  }, [popularResults, results, searchStatus, selectedId]);

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

  const selectedResult = results.length > 0
    ? results.find((result) => result.listing.id === selectedId) ?? results[0]
    : popularResults.find((result) => result.listing.id === selectedId) ?? popularResults[0];
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
  const searchBusy = searchStatus === "pending";

  function patchFilters(next: Partial<FilterState>) {
    setFilters((current) => normalizeFilterWindow(current, next));
  }

  function toggleAiTag(tagId: string) {
    setAiTagStates((current) => {
      const existing = current[tagId];
      if (!existing) {
        return current;
      }

      const nextActive = !existing.active;
      const next = {
        ...current,
        [tagId]: {
          ...existing,
          active: nextActive
        }
      };
      writeAiTagStates(next);
      void recordSearchIntelligenceConversation({
        source: "marketplace",
        query: filters.query.trim() || "marketplace discovery",
        filters: buildMarketplaceSearchFilters(filters, false),
        message: `${nextActive ? "AI tag restored" : "AI tag removed"}: ${existing.label}`,
        payload: {
          kind: "tag_toggle",
          tagId,
          label: existing.label,
          active: nextActive,
          activeTagIds: Object.values(next)
            .filter((tag) => tag.active)
            .map((tag) => tag.id),
          disabledTagIds: Object.values(next)
            .filter((tag) => !tag.active)
            .map((tag) => tag.id)
        }
      }).then((session) => {
        if (session) {
          setIntelligenceSession(session);
        }
      });
      return next;
    });
  }

  function resetAiTags() {
    if (!intelligenceSession?.filterTags?.length) {
      patchFilters({ query: "" });
      clearAiTagStates();
      setAiTagStates({});
      setAiTagsCleared(true);
      return;
    }

    const clearedTagIds = intelligenceSession.filterTags.map((tag) => tag.id);
    const resetFilters = buildMarketplaceSearchFilters({ ...filters, query: "" }, false);

    patchFilters({ query: "" });
    clearAiTagStates();
    setAiTagStates({});
    setAiTagsCleared(true);
    void recordSearchIntelligenceConversation({
      source: "marketplace",
      query: "",
      filters: resetFilters,
      message: "AI filter tags reset and search query cleared.",
      payload: {
        kind: "tag_reset",
        clearedTagIds
      }
    }).then((session) => {
      if (session) {
        setIntelligenceSession(session);
      }
    });
  }

  function clearFilters() {
    if (!firstListing) {
      return;
    }

    setFilters(initialFilters);
    setSelectedId(firstListing.id);
    setSelectedMode(firstListing.modeRules[0]?.mode ?? "self_operated");
    setBookingQuantity("1");
    resetAiTags();
    setContract(null);
  }

  function broadenSearch() {
    setFilters((current) =>
      normalizeFilterWindow(current, {
        query: "",
        category: "all",
        county: "all",
        radiusKm: initialFilters.radiusKm,
        operationMode: "all",
        includeCountrywide: initialFilters.includeCountrywide
      })
    );
    setBookingQuantity("1");
    setContract(null);
  }

  function selectListing(listing: ResourceListing) {
    setSelectedId(listing.id);
    setSelectedMode(listing.modeRules[0]?.mode ?? "self_operated");
    setBookingQuantity("1");
    setContract(null);
  }

  function openFocusedListing(listing: ResourceListing) {
    selectListing(listing);
    void recordListingIntelligenceSignal(listing.id, { type: "visit_recorded" });
    setFocusedListingId(listing.id);
    setFocusedImageIndex(0);
    setFocusedZoom(1);
    setFocusedPanel("details");
    setFocusedDraft("");
    setFocusedThread(null);
    setBookingQuantity("1");
  }

  function openFocusedDmListing(listing: ResourceListing) {
    selectListing(listing);
    void recordListingIntelligenceSignal(listing.id, { type: "visit_recorded", note: "DM opened" });
    setFocusedListingId(listing.id);
    setFocusedImageIndex(0);
    setFocusedZoom(1);
    setFocusedDraft("");
    const thread = upsertMarketplaceThread(listing);
    setFocusedThread(thread);
    setFocusedPanel("chat");
    setBookingQuantity("1");
  }

  function requestDmForListing(listing: ResourceListing) {
    if (!readAccountSession()) {
      setPendingDmListingId(listing.id);
      setAuthModalMode("signin");
      setAuthModalOpen(true);
      return;
    }

    openFocusedDmListing(listing);
  }

  function openMobileMenuAuth(mode: AccountMode) {
    setAuthModalMode(mode);
    setPendingDmListingId(null);
    setMobileMenuOpen(false);
    setAuthModalOpen(true);
  }

  function signOutFromMobileMenu() {
    clearAccountSession();
    setAccountSignedIn(false);
    setMobileMenuOpen(false);
  }

  function closeDmAuthModal() {
    setAuthModalOpen(false);
    setPendingDmListingId(null);
  }

  function handleDmAuthenticated() {
    const listingId = pendingDmListingId;
    setAccountSignedIn(true);
    setAuthModalOpen(false);
    setPendingDmListingId(null);

    if (!listingId) {
      return;
    }

    const listing = seededListings.find((candidate) => candidate.id === listingId);
    if (listing) {
      openFocusedDmListing(listing);
    }
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
    void recordListingIntelligenceSignal(focusedListing.id, { type: "message_sent", note: text });
    setFocusedThread(thread);
    setFocusedDraft("");
  }

  function saveListingToAccount(listing: ResourceListing) {
    const nextListings = saveMarketplaceListing(listing);
    void recordListingIntelligenceSignal(listing.id, { type: "saved" });
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
    void recordListingIntelligenceSignal(selectedListing.id, {
      type: "proposal_created",
      value: proposalQuantity,
      note: `${readableMode(activeMode)} proposal for ${proposalQuantity} item(s)`
    });
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

  const showMarketplaceHeaderSearch = mobileHeaderSearch || compactSearchVisible;

  return (
    <main className="min-h-screen overflow-x-hidden bg-orbit-field">
      <SiteHeader
        active="rent"
        replacementActive={showMarketplaceHeaderSearch}
        replacementContent={(
          <MarketplaceHeaderSearch
            filters={filters}
            patchFilters={patchFilters}
            searchBusy={searchBusy}
            settingsButtonRef={mobileSettingsButtonRef}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            onOpenMobileSettings={() => setMobileSettingsOpen(true)}
            onSearchSubmit={() => {
              setMobileSettingsOpen(false);
            }}
          />
        )}
      />

      {mobileSettingsOpen ? (
        <MarketplaceFilterPopover
          anchorRef={mobileSettingsButtonRef}
          onClose={() => setMobileSettingsOpen(false)}
        >
          <SearchSettingsPanel
            filters={filters}
            patchFilters={patchFilters}
            aiTags={visibleAiTags}
            onToggleAiTag={toggleAiTag}
            onClearFilters={() => {
              clearFilters();
              setMobileSettingsOpen(false);
            }}
          />
        </MarketplaceFilterPopover>
      ) : null}

      {mobileMenuOpen ? (
        <MarketplaceMenuDrawer onClose={() => setMobileMenuOpen(false)}>
          <MarketplaceMobileMenu
            isSignedIn={accountSignedIn}
            onClose={() => setMobileMenuOpen(false)}
            onOpenAuth={openMobileMenuAuth}
            onSignOut={signOutFromMobileMenu}
          />
        </MarketplaceMenuDrawer>
      ) : null}

      <div className="grid min-h-[calc(100svh-81px)] min-w-0 w-full gap-3 px-3 py-3 xl:h-[calc(100svh-81px)] xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-hidden 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section ref={marketplaceContentRef} className="viewport-scroll-column grid min-w-0 content-start gap-3 xl:pr-1">
          <div ref={desktopSearchSurfaceRef} className="hidden xl:block">
            <MarketplaceSearchSurface
              filters={filters}
              patchFilters={patchFilters}
              aiTags={visibleAiTags}
              searchBusy={searchBusy}
              onToggleAiTag={toggleAiTag}
              onClearFilters={clearFilters}
              onSearchSubmit={() => {
                setMobileSettingsOpen(false);
              }}
              onOpenMobileSettings={() => setMobileSettingsOpen(true)}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
            />
          </div>

          <div className="grid gap-3">
            <div className="rounded-[30px] bg-orbit-panel/35 p-3">
              {searchBusy ? (
                <SearchProgressState />
              ) : results.length > 0 ? (
                <div className="grid gap-x-3 gap-y-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {results.map((result, index) => (
                    <MarketplaceListingCard
                      key={result.listing.id}
                      result={result}
                      selected={selectedListing.id === result.listing.id}
                      deferRendering={index > 5}
                      saved={savedListingIds.includes(result.listing.id)}
                      onSelect={() => selectListing(result.listing)}
                      onOpen={() => openFocusedListing(result.listing)}
                      onSave={() => saveListingToAccount(result.listing)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyMarketplaceState
                  filters={filters}
                  recommendations={popularResults}
                  selectedListingId={selectedListing.id}
                  savedListingIds={savedListingIds}
                  onClearFilters={clearFilters}
                  onBroadenSearch={broadenSearch}
                  onSelectListing={selectListing}
                  onOpenListing={openFocusedListing}
                  onSaveListing={saveListingToAccount}
                />
              )}
            </div>
          </div>
        </section>

        <aside className="viewport-scroll-column hidden min-w-0 self-start xl:sticky xl:top-0 xl:block">
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
            onDm={requestDmForListing}
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
          onDm={() => requestDmForListing(focusedListing)}
          proposeBooking={proposeBooking}
          onClose={() => setFocusedListingId(null)}
        />
      ) : null}

      {authModalOpen ? (
        <AuthModal
          open={authModalOpen}
          initialMode={authModalMode}
          onClose={closeDmAuthModal}
          onAuthenticated={handleDmAuthenticated}
        />
      ) : null}
    </main>
  );
}

function EmptyMarketplaceState({
  filters,
  recommendations,
  selectedListingId,
  savedListingIds,
  onClearFilters,
  onBroadenSearch,
  onSelectListing,
  onOpenListing,
  onSaveListing
}: {
  filters: FilterState;
  recommendations: SearchResult[];
  selectedListingId: string;
  savedListingIds: string[];
  onClearFilters: () => void;
  onBroadenSearch: () => void;
  onSelectListing: (listing: ResourceListing) => void;
  onOpenListing: (listing: ResourceListing) => void;
  onSaveListing: (listing: ResourceListing) => void;
}) {
  const areaLabel = filters.county === "all" ? "Kenya" : filters.county;

  return (
    <div className="grid min-h-[calc(100svh-190px)] content-between gap-10 rounded-[28px] bg-orbit-field/45 px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="relative mb-6 h-48 w-48 sm:h-56 sm:w-56">
          <div className="absolute inset-0 rounded-full bg-orbit-soft/45" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative z-10 flex h-24 w-24 rotate-12 items-center justify-center rounded-[28px] bg-[#EFBF04] text-[#403301] shadow-[0_18px_34px_rgba(25,32,29,0.14)] sm:h-28 sm:w-28">
              <SearchX className="h-12 w-12" aria-hidden="true" />
            </div>
            <span className="absolute right-7 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-orbit-panel text-[#705d00] shadow-[0_10px_24px_rgba(25,32,29,0.12)] sm:right-8 sm:h-14 sm:w-14">
              <Compass className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-black text-orbit-ink sm:text-3xl">We couldn&apos;t find any matches</h2>
        <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-orbit-ink/68 sm:text-base">
          Try adjusting your filters, widening your search radius, or exploring another category. New rentals from local owners keep arriving across {areaLabel}.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClearFilters}
            className="orbit-cta-gold inline-flex min-h-12 items-center justify-center rounded-[14px] px-7 text-sm font-black shadow-[0_10px_24px_rgba(239,191,4,0.18)]"
          >
            Clear all filters
          </button>
          <button
            type="button"
            onClick={onBroadenSearch}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-orbit-panel px-7 text-sm font-black text-orbit-ink shadow-[0_10px_24px_rgba(25,32,29,0.08)] transition-colors hover:bg-orbit-soft/70"
          >
            <Compass className="h-4 w-4 text-[#705d00]" aria-hidden="true" />
            Browse wider area
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-2 text-base font-black text-orbit-ink">
            <Flame className="h-4 w-4 text-[#EFBF04]" aria-hidden="true" />
            Popular in your area
          </h3>
          <button
            type="button"
            onClick={onClearFilters}
            className="hidden items-center gap-1 text-xs font-black text-[#705d00] hover:underline sm:inline-flex"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {recommendations.map((result) => (
            <EmptyRecommendationCard
              key={result.listing.id}
              result={result}
              selected={selectedListingId === result.listing.id}
              saved={savedListingIds.includes(result.listing.id)}
              onSelect={() => onSelectListing(result.listing)}
              onOpen={() => onOpenListing(result.listing)}
              onSave={() => onSaveListing(result.listing)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyRecommendationCard({
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
  const thumbnailUrl = media ? listingThumbnailUrl(media.url, 640, 400) : undefined;
  const rule = listing.modeRules[0];
  const rate = rule?.pricing.rate.amount ?? 0;
  const metric = rule?.pricing.billingMetric ?? "daily";
  const rateLabel = metric === "hourly" ? "Hourly rate" : metric === "fixed" ? "Per booking" : `${metric} rate`;

  return (
    <article
      className="group overflow-hidden rounded-[22px] border-2 border-transparent bg-orbit-panel text-left shadow-[0_12px_28px_rgba(25,32,29,0.08)] data-[selected=true]:border-[#4391F5]"
      data-selected={selected ? "true" : "false"}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left focus-visible:outline-none">
        <div className="relative aspect-[16/10] overflow-hidden bg-orbit-soft">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={media?.alt || listing.title}
              loading="lazy"
              decoding="async"
              width={640}
              height={400}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : null}
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orbit-panel/85 px-2.5 py-1 text-xs font-black text-orbit-ink backdrop-blur">
            <Star className="h-3.5 w-3.5 fill-[#EFBF04] text-[#EFBF04]" aria-hidden="true" />
            {listing.rating.toFixed(1)}
          </span>
          <span className="kind-tag absolute right-3 top-3 rounded-full uppercase tracking-[0.08em]" data-kind={listing.kind}>
            {listingKindLabel(listing.kind)}
          </span>
        </div>
      </button>

      <div className="p-4">
        <p className="text-[11px] font-black uppercase text-[#705d00]">{listingKindLabel(listing.kind)}</p>
        <h4 className="mt-1 truncate text-sm font-black text-orbit-ink">{listing.title}</h4>
        <p className="mt-1 truncate text-xs font-semibold text-orbit-ink/58">
          {listing.location.generalArea}, {listing.location.county}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-orbit-ink/50">{rateLabel}</p>
            <p className="mt-1 truncate text-lg font-black text-orbit-ink">{kes(rate)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onSave}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                saved ? "bg-[#EFBF04] text-[#403301]" : "bg-orbit-field text-orbit-ink"
              }`}
              title={saved ? "Saved" : "Save item"}
            >
              <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="orbit-cta-gold flex h-10 w-10 items-center justify-center rounded-full"
              title="Open listing"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function MarketplaceMenuDrawer({
  onClose,
  children
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  function setDrawerDragOffset(nextOffset: number) {
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  }

  function startDrawerDrag(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, [role='button']")) {
      return;
    }

    dragStartXRef.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrawerDrag(event: React.PointerEvent<HTMLElement>) {
    if (dragStartXRef.current === null) {
      return;
    }

    setDrawerDragOffset(Math.min(0, event.clientX - dragStartXRef.current));
  }

  function finishDrawerDrag(event: React.PointerEvent<HTMLElement>) {
    if (dragStartXRef.current === null) {
      return;
    }

    const drawerWidth = drawerRef.current?.getBoundingClientRect().width ?? 1;
    const shouldClose = Math.abs(dragOffsetRef.current) > Math.min(120, drawerWidth * 0.3);

    dragStartXRef.current = null;
    setDragging(false);
    setDrawerDragOffset(0);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (shouldClose) {
      onClose();
    }
  }

  return (
    <div className="marketplace-menu-drawer-layer" role="presentation">
      <button
        type="button"
        className="marketplace-menu-drawer-backdrop"
        onClick={onClose}
        aria-label="Close marketplace menu"
      />
      <aside
        ref={drawerRef}
        className="marketplace-menu-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="RentOrbit menu"
        data-dragging={dragging ? "true" : "false"}
        style={dragOffset ? { transform: `translate3d(${dragOffset}px, 0, 0)` } : undefined}
        onPointerDown={startDrawerDrag}
        onPointerMove={moveDrawerDrag}
        onPointerUp={finishDrawerDrag}
        onPointerCancel={finishDrawerDrag}
      >
        <div className="marketplace-menu-drawer-grip" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-[clamp(0.95rem,4vw,1.25rem)] font-black text-orbit-ink">RentOrbit</h2>
          <button
            type="button"
            onClick={onClose}
            className="marketplace-header-search-button"
            aria-label="Close menu"
            title="Close menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto pt-4">{children}</div>
      </aside>
    </div>
  );
}

function MarketplaceFilterPopover({
  anchorRef,
  onClose,
  children
}: {
  anchorRef?: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [position, setPosition] = useState({
    arrowLeft: 32,
    left: 12,
    top: 72
  });

  useEffect(() => {
    function updatePosition() {
      const anchor = anchorRef?.current;
      if (!anchor) {
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const popoverWidth = Math.min(viewportWidth * 0.92, 420);
      const viewportMargin = 8;
      const anchorCenter = rect.left + rect.width / 2;
      const left = Math.min(
        Math.max(anchorCenter - popoverWidth / 2, viewportMargin),
        viewportWidth - popoverWidth - viewportMargin
      );
      const arrowLeft = Math.min(Math.max(anchorCenter - left - 8, 18), popoverWidth - 26);

      setPosition({
        arrowLeft,
        left,
        top: rect.bottom + 12
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
    };
  }, [anchorRef]);

  const popoverStyle = {
    "--marketplace-filter-popover-arrow-left": `${position.arrowLeft}px`,
    "--marketplace-filter-popover-left": `${position.left}px`,
    "--marketplace-filter-popover-top": `${position.top}px`
  } as CSSProperties;

  return (
    <div className="marketplace-filter-popover-layer" role="presentation">
      <button
        type="button"
        className="marketplace-filter-popover-dismiss"
        onClick={onClose}
        aria-label="Close search filters"
      />
      <section
        className="marketplace-filter-popover"
        role="dialog"
        aria-modal="false"
        aria-label="Search filters"
        style={popoverStyle}
      >
        <div className="marketplace-filter-popover-arrow" aria-hidden="true" />
        <div className="max-h-[min(70svh,34rem)] overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

function MarketplaceHeaderSearch({
  filters,
  patchFilters,
  searchBusy,
  settingsButtonRef,
  onOpenMobileMenu,
  onOpenMobileSettings,
  onSearchSubmit
}: {
  filters: FilterState;
  patchFilters: (next: Partial<FilterState>) => void;
  searchBusy: boolean;
  settingsButtonRef?: RefObject<HTMLButtonElement | null>;
  onOpenMobileMenu: () => void;
  onOpenMobileSettings: () => void;
  onSearchSubmit?: () => void;
}) {
  return (
    <div
      className="marketplace-header-search"
      data-searching={searchBusy ? "true" : "false"}
    >
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="marketplace-header-search-button"
        aria-label="Open marketplace menu"
        title="Open marketplace menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <label className="sr-only" htmlFor="marketplace-header-query">Search marketplace</label>
      <input
        id="marketplace-header-query"
        type="search"
        value={filters.query}
        onChange={(event) => patchFilters({ query: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSearchSubmit?.();
          }
        }}
        className="marketplace-header-search-input"
        placeholder="Search RentOrbit..."
        aria-label="Search marketplace"
      />
      <button
        ref={settingsButtonRef}
        type="button"
        onClick={onOpenMobileSettings}
        className="marketplace-header-search-button"
        aria-label="Open search settings"
        title="Open search settings"
      >
        <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function MarketplaceMobileMenu({
  isSignedIn,
  onClose,
  onOpenAuth,
  onSignOut
}: {
  isSignedIn: boolean;
  onClose: () => void;
  onOpenAuth: (mode: AccountMode) => void;
  onSignOut: () => void;
}) {
  const links = [
    { href: "/", label: "Home" },
    { href: "/marketplace", label: "Rent" },
    { href: "/account?mode=signup", label: "List Your Item" }
  ];

  return (
    <div className="grid gap-4">
      <nav className="grid gap-3" aria-label="Marketplace menu">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            onClick={onClose}
            className="marketplace-menu-link theme-body-border flex items-center justify-between rounded-full bg-orbit-panel font-black text-orbit-ink ring-1 ring-white/70"
          >
            {link.label}
            <ArrowUpRight className="h-4 w-4 text-[#806A00]" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <div className="marketplace-menu-actions rounded-[28px] bg-orbit-panel/72 p-3 ring-1 ring-white/60">
        <div className="marketplace-menu-theme-row">
          <span className="text-[clamp(0.72rem,3vw,0.82rem)] font-black uppercase text-orbit-ink/55">Theme</span>
          <ThemeSwitcher compact />
        </div>

        {isSignedIn ? (
          <div className="marketplace-menu-auth-grid">
            <Link
              href="/account"
              prefetch={false}
              onClick={onClose}
              className={cn(ui.panelPill, "marketplace-menu-auth-pill")}
            >
              Account
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className={cn(ui.goldPill, "marketplace-menu-auth-pill")}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="marketplace-menu-auth-grid">
            <button
              type="button"
              onClick={() => onOpenAuth("signin")}
              className={cn(ui.panelPill, "marketplace-menu-auth-pill")}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth("signup")}
              className={cn(ui.goldPill, "marketplace-menu-auth-pill")}
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketplaceSearchSurface({
  filters,
  patchFilters,
  aiTags,
  searchBusy,
  onToggleAiTag,
  onClearFilters,
  onSearchSubmit,
  onOpenMobileSettings,
  onOpenMobileMenu
}: {
  filters: FilterState;
  patchFilters: (next: Partial<FilterState>) => void;
  aiTags: AiTagState[];
  searchBusy: boolean;
  onToggleAiTag: (tagId: string) => void;
  onClearFilters: () => void;
  onSearchSubmit?: () => void;
  onOpenMobileSettings: () => void;
  onOpenMobileMenu: () => void;
}) {
  const queryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasAiTags = aiTags.length > 0;
  const showClearFilters = hasMarketplaceSearchChanges(filters, aiTags);

  useEffect(() => {
    const textarea = queryTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`;
  }, [filters.query]);

  return (
    <section
      className={cn(
        "marketplace-search-surface marketplace-search-surface--main rounded-[30px] bg-orbit-panel/72 p-3 text-orbit-ink backdrop-blur-xl sm:p-4",
        hasAiTags && "marketplace-search-surface--with-tags"
      )}
      data-searching={searchBusy ? "true" : "false"}
      aria-busy={searchBusy}
    >
      <div className="relative z-10 grid gap-4">
        <div className="grid min-w-0 gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="marketplace-search-icon-button xl:hidden"
              aria-label="Open marketplace menu"
              title="Open marketplace menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="marketplace-search-input-shell min-w-0 flex-1">
              <label className="sr-only" htmlFor="marketplace-search-query">Search marketplace</label>
              <textarea
                id="marketplace-search-query"
                ref={queryTextareaRef}
                value={filters.query}
                onChange={(event) => patchFilters({ query: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSearchSubmit?.();
                  }
                }}
                rows={2}
                wrap="soft"
                enterKeyHint="search"
                className="marketplace-search-textarea min-h-11 min-w-0 w-full resize-none bg-transparent px-1 py-2 text-[clamp(0.95rem,1.2vw,1.12rem)] font-semibold leading-6 text-orbit-ink outline-none placeholder:text-orbit-ink/45 focus:outline-none focus:ring-0 focus-visible:outline-none"
                style={{ outline: "none" }}
                placeholder="Suggest a camera under KES 15000 near me with a crew..."
                aria-label="Search marketplace"
              />
            </div>

            {hasAiTags ? (
              <AiTagCluster
                aiTags={aiTags}
                onToggleAiTag={onToggleAiTag}
                className="marketplace-ai-tags-inline hidden xl:block"
              />
            ) : null}

            <button
              type="button"
              onClick={onOpenMobileSettings}
              className="marketplace-search-icon-button xl:hidden"
              aria-label="Open search settings"
              title="Open search settings"
            >
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <SearchFilterControls
            filters={filters}
            patchFilters={patchFilters}
            className="marketplace-filter-row hidden xl:flex"
            showClearFilters={showClearFilters}
            onClearFilters={onClearFilters}
          />
        </div>
      </div>
    </section>
  );
}

function SearchSettingsPanel({
  filters,
  patchFilters,
  aiTags,
  onToggleAiTag,
  onClearFilters
}: {
  filters: FilterState;
  patchFilters: (next: Partial<FilterState>) => void;
  aiTags: AiTagState[];
  onToggleAiTag: (tagId: string) => void;
  onClearFilters: () => void;
}) {
  const showClearFilters = hasMarketplaceSearchChanges(filters, aiTags);

  return (
    <section className="marketplace-search-surface grid gap-4 overflow-visible rounded-[30px] p-4">
      <SearchFilterControls
        filters={filters}
        patchFilters={patchFilters}
        className="marketplace-filter-row marketplace-filter-row--popover flex"
        showClearFilters={showClearFilters}
        onClearFilters={onClearFilters}
      />
      <AiTagCluster aiTags={aiTags} onToggleAiTag={onToggleAiTag} />
    </section>
  );
}

function SearchFilterControls({
  filters,
  patchFilters,
  className,
  showClearFilters = false,
  onClearFilters
}: {
  filters: FilterState;
  patchFilters: (next: Partial<FilterState>) => void;
  className?: string;
  showClearFilters?: boolean;
  onClearFilters?: () => void;
}) {
  return (
    <div className={className}>
      <SearchFilterPill
        label="Category"
        value={filters.category}
        onChange={(value) => patchFilters({ category: value })}
        options={[
          { value: "all", label: "All Category" },
          ...marketplaceCategories.map((category) => ({ value: category.id, label: category.label }))
        ]}
      />
      <SearchFilterPill
        label="Location"
        value={filters.county}
        onChange={(value) => patchFilters({ county: value })}
        options={[
          { value: "all", label: "All Locations" },
          ...kenyaCounties.map((county) => ({ value: county, label: county }))
        ]}
      />
      <SearchFilterPill
        label="Mode"
        value={filters.operationMode}
        onChange={(value) => patchFilters({ operationMode: value })}
        options={[
          { value: "all", label: "All Modes" },
          { value: "self_operated", label: "Self-operated" },
          { value: "owner_operated", label: "Owner-operated" },
          { value: "operator_only", label: "Operator-only" }
        ]}
      />
      <RadiusFilterPopover value={filters.radiusKm} onChange={(value) => patchFilters({ radiusKm: value })} />
      <CountrywideDeliveryToggle
        checked={filters.includeCountrywide}
        onChange={(checked) => patchFilters({ includeCountrywide: checked })}
      />
      {showClearFilters && onClearFilters ? (
        <button type="button" onClick={onClearFilters} className="marketplace-clear-filter-pill">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function SearchFilterPill({
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
      className="marketplace-filter-control relative"
      labelClassName="sr-only"
      buttonClassName="marketplace-search-filter-pill"
      arrowClassName="marketplace-search-filter-arrow"
      menuClassName="absolute left-0 top-[calc(100%+8px)] z-[120] min-w-full overflow-hidden rounded-[24px] bg-orbit-panel p-2 shadow-[0_18px_42px_rgba(25,32,29,0.14)]"
    />
  );
}

function RadiusFilterPopover({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="marketplace-filter-control relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="marketplace-search-filter-pill"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="min-w-0 flex-1 truncate">{value >= initialFilters.radiusKm ? "Full radius" : `Radius ${value} km`}</span>
        <span className="marketplace-search-filter-arrow">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} aria-hidden="true" />
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-[120] w-[min(18rem,calc(100vw-2rem))] rounded-[24px] bg-orbit-panel p-4 shadow-[0_18px_42px_rgba(25,32,29,0.14)]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-orbit-ink/58">Radius</span>
            <span className="text-sm font-black text-orbit-ink">{value} km</span>
          </div>
          <input
            type="range"
            min="5"
            max="300"
            step="5"
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="mt-4 w-full accent-[#806A00]"
          />
          <div className="mt-2 flex justify-between text-[10px] font-black uppercase text-orbit-ink/45">
            <span>5 km</span>
            <span>300 km</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CountrywideDeliveryToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="marketplace-countrywide-toggle"
      aria-pressed={checked}
    >
      <span className="marketplace-countrywide-thumb" aria-hidden="true" />
      <span className="min-w-0 truncate">Delivery</span>
    </button>
  );
}

function AiTagCluster({
  aiTags,
  onToggleAiTag,
  className
}: {
  aiTags: AiTagState[];
  onToggleAiTag: (tagId: string) => void;
  className?: string;
}) {
  if (aiTags.length === 0) {
    return null;
  }

  const layout = radialTagLayout(aiTags);
  const clusterStyle = {
    "--radial-tag-columns": layout.columns,
    "--radial-tag-rows": layout.rows
  } as CSSProperties;

  return (
    <div className={cn("marketplace-ai-tag-cluster rounded-[24px] bg-orbit-field/45 p-4", className)}>
      <p className="marketplace-ai-tag-title mb-3 text-xs font-black uppercase tracking-wide text-orbit-ink/55">
        Click a tag to remove it from your search
      </p>
      <div className="marketplace-ai-tag-list marketplace-ai-tag-radial" style={clusterStyle}>
        {layout.tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggleAiTag(tag.id)}
            className="ai-filter-tag inline-flex min-h-9 items-center rounded-full px-4 text-xs font-black transition-colors focus-visible:outline-none"
            data-active={tag.active ? "true" : "false"}
            style={
              tag.active
                ? {
                    backgroundColor: tag.color,
                    color: tag.textColor,
                    gridColumn: tag.gridColumn,
                    gridRow: tag.gridRow,
                    transform: `translate3d(${tag.shiftX}, ${tag.shiftY}, 0)`
                  }
                : {
                    gridColumn: tag.gridColumn,
                    gridRow: tag.gridRow,
                    transform: `translate3d(${tag.shiftX}, ${tag.shiftY}, 0)`
                  }
            }
            title={tag.active ? `Remove ${tag.label} from this search` : `Add ${tag.label} back to this search`}
          >
            {tag.label}
          </button>
        ))}
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
  onDm,
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
  onDm: (listing: ResourceListing) => void;
  proposeBooking: () => void;
}) {
  return (
    <section className={cn(ui.surface, "max-h-full overflow-y-auto overflow-x-hidden p-5")}>
      <BookingDetailsContent
        listing={selectedListing}
        publicCoordinates={selectedPublicCoordinates}
        activeMode={activeMode}
        quote={quote}
        bookingQuantity={bookingQuantity}
        setBookingQuantity={setBookingQuantity}
        selectedQuantity={selectedQuantity}
        totalUnits={totalUnits}
        bookedUnits={bookedUnits}
        availableUnits={availableUnits}
        setSelectedMode={setSelectedMode}
        onDm={() => onDm(selectedListing)}
        proposeBooking={proposeBooking}
      />
    </section>
  );
}

function BookingDetailsContent({
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
    <div className="grid gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.04em]">
          <span className="orbit-tag rounded-full bg-orbit-soft px-[15px] py-[7px]">{listing.location.county}</span>
          <span className="orbit-tag rounded-full bg-orbit-soft px-[15px] py-[7px]">{listing.category}</span>
          <span className="kind-tag orbit-tag rounded-full" data-kind={listing.kind}>
            {listingKindLabel(listing.kind)}
          </span>
          <span className="availability-tag orbit-tag ml-auto shrink-0 rounded-full" data-status={availabilityTagStatus(bookedUnits, totalUnits)}>
            {bookedUnitsLabel(bookedUnits, totalUnits)}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <h2 className="min-w-0 text-[clamp(1.45rem,2vw,1.85rem)] font-black leading-tight text-orbit-ink">{listing.title}</h2>
          <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[12px] bg-orbit-soft px-3 text-sm font-black text-orbit-ink">
            <Star className="h-4 w-4 fill-[#806A00] text-[#806A00]" aria-hidden="true" />
            {listing.rating.toFixed(1)}
          </span>
        </div>
        <p className="mt-4 text-[clamp(0.95rem,1.2vw,1.08rem)] font-medium leading-7 text-[#403301] dark:text-orbit-ink/70">{listing.description}</p>
      </div>

      <ApproximateLocationPanel listing={listing} publicCoordinates={publicCoordinates} />

      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.06em] text-[#403301] dark:text-orbit-ink/65">Booking mode</p>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {listing.modeRules.map((rule) => (
            <button
              key={rule.mode}
              type="button"
              onClick={() => setSelectedMode(rule.mode)}
              className={`min-h-16 rounded-[16px] px-4 py-3 text-sm font-black leading-tight transition-colors ${
                activeMode === rule.mode
                  ? "border-2 border-[#806A00] bg-orbit-panel text-[#806A00]"
                  : "border border-[#806A00]/32 bg-orbit-panel text-orbit-ink"
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

      <BillingPanel
        listing={listing}
        quote={quote}
        selectedQuantity={selectedQuantity}
        rental={totalRental}
        platform={totalPlatform}
        deposit={totalDeposit}
        dueNow={totalDueNow}
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onDm}
          className="inline-flex min-h-16 items-center justify-center gap-2 rounded-full border border-orbit-line bg-orbit-panel px-4 text-base font-black text-orbit-ink"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          DM
        </button>
        <button
          type="button"
          onClick={proposeBooking}
          disabled={availableUnits <= 0}
          className="orbit-cta-gold inline-flex min-h-16 items-center justify-center gap-2 rounded-full px-4 text-base font-black shadow-[0_14px_28px_rgba(239,191,4,0.2)]"
        >
          <FileSignature className="h-5 w-5" aria-hidden="true" />
          Propose
        </button>
      </div>
    </div>
  );
}

function ApproximateLocationPanel({
  listing,
  publicCoordinates
}: {
  listing: ResourceListing;
  publicCoordinates?: Coordinates;
}) {
  return (
    <div className="marketplace-detail-surface rounded-[18px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.06em] text-[#403301] dark:text-orbit-ink/65">Approximate location</p>
          <p className="mt-1 text-sm font-black text-orbit-ink">
            {listing.location.generalArea}, {listing.location.county}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-panel text-[#806A00] shadow-[0_8px_22px_rgba(25,32,29,0.1)]">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div className="marketplace-map-surface relative mt-4 h-36 overflow-hidden rounded-[14px]">
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle,rgb(128_106_0_/_0.22)_1px,transparent_1.5px)] [background-size:18px_18px]" />
        <div className="absolute left-[14%] top-[20%] h-20 w-28 rounded-full border border-white/45 bg-white/20" />
        <div className="absolute bottom-[10%] right-[10%] h-24 w-32 rounded-full border border-white/35 bg-white/15" />
        <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orbit-panel shadow-[0_8px_22px_rgba(25,32,29,0.16)]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#806A00]" />
        </span>
        <span className="absolute bottom-3 left-4 rounded-full bg-orbit-panel/70 px-2 py-1 text-[10px] font-mono text-orbit-ink/75 backdrop-blur">
          {publicCoordinates ? `${publicCoordinates.latitude}, ${publicCoordinates.longitude}` : "Approximate area"}
        </span>
      </div>
    </div>
  );
}

function BillingPanel({
  listing,
  quote,
  selectedQuantity,
  rental,
  platform,
  deposit,
  dueNow
}: {
  listing: ResourceListing;
  quote: ReturnType<typeof calculateBookingQuote>;
  selectedQuantity: number;
  rental: number;
  platform: number;
  deposit: number;
  dueNow: number;
}) {
  return (
    <div className="marketplace-detail-surface rounded-[22px] p-5">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <SummaryLine label="Rental" value={kes(rental)} />
        <SummaryLine label="Platform" value={kes(platform)} />
        <SummaryLine label="Deposit" value={kes(deposit)} />
        <SummaryLine label="Due now" value={kes(dueNow)} strong />
      </div>
      <div className="mt-5 grid gap-2 border-t border-[#403301]/10 pt-4 text-sm font-black text-[#403301] dark:border-white/10 dark:text-orbit-ink/75">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{listing.logistics.deliveryModes.join(", ")} available</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{selectedQuantity} item(s), {quote.units} billed unit(s)</span>
        </div>
      </div>
    </div>
  );
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateTimeValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return new Date();
  }

  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function formatDateTimeValue(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join("-") + `T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function dateTimeValueToMs(value: string) {
  const parsed = parseDateTimeValue(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeFilterWindow(current: FilterState, next: Partial<FilterState>): FilterState {
  const merged = { ...current, ...next };
  const startTime = dateTimeValueToMs(merged.start);
  const endTime = dateTimeValueToMs(merged.end);

  if (startTime === null || endTime === null || startTime < endTime) {
    return merged;
  }

  if (next.end !== undefined && next.start === undefined) {
    const adjustedStart = parseDateTimeValue(merged.end);
    adjustedStart.setHours(adjustedStart.getHours() - 24);
    return { ...merged, start: formatDateTimeValue(adjustedStart) };
  }

  const adjustedEnd = parseDateTimeValue(merged.start);
  adjustedEnd.setHours(adjustedEnd.getHours() + 24);
  return { ...merged, end: formatDateTimeValue(adjustedEnd) };
}

function MarketplaceListingCard({
  result,
  selected,
  deferRendering,
  saved,
  onSelect,
  onOpen,
  onSave
}: {
  result: SearchResult;
  selected: boolean;
  deferRendering?: boolean;
  saved: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onSave: () => void;
}) {
  const listing = result.listing;
  const media = listing.media[0];
  const thumbnailUrl = media ? listingThumbnailUrl(media.url, 640, 360) : undefined;
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
      className={cn(
        "listing-card-shell grid min-h-[240px] w-full max-w-full min-w-0 cursor-pointer overflow-hidden rounded-[30px] border-2 border-transparent bg-orbit-panel p-4 text-left shadow-[0_2px_14px_rgba(25,32,29,0.12)] transition-shadow data-[selected=true]:border-orbit-green hover:shadow-[0_2px_14px_rgba(25,32,29,0.18)] focus-visible:border-orbit-green focus-visible:outline-none focus-visible:shadow-[0_2px_14px_rgba(25,32,29,0.12)] md:min-h-[clamp(220px,16vw,270px)] md:grid-cols-[minmax(0,1fr)_40%]",
        deferRendering ? "defer-below-fold" : null
      )}
    >
      <div className="flex min-w-0 flex-col justify-between gap-3 overflow-hidden pr-0 md:pr-3">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className="kind-tag orbit-tag rounded-full uppercase tracking-normal"
              data-kind={listing.kind}
            >
              {listingIcon(listing.kind)}
              {listingKindLabel(listing.kind)}
            </span>
            {unavailable ? (
              <span className="availability-tag orbit-tag rounded-full uppercase" data-status="booked">Booked</span>
            ) : (
              <span className="availability-tag orbit-tag rounded-full uppercase" data-status="available">
                Available
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-[clamp(1.05rem,1.45vw,1.35rem)] font-black leading-tight text-orbit-ink">{listing.title}</h3>
          <p className="mt-2 line-clamp-2 text-[clamp(0.8rem,0.95vw,0.95rem)] leading-5 text-neutral-500 2xl:line-clamp-1">{listing.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[clamp(9px,0.72vw,10px)] font-black text-orbit-ink">
          <span className="orbit-tag rounded-full bg-orbit-soft/85 px-[clamp(9px,0.9vw,11px)] py-[7px]">{listing.location.county}</span>
          <span className="orbit-tag rounded-full bg-orbit-soft/85 px-[clamp(9px,0.9vw,11px)] py-[7px]">{rate}</span>
        </div>
      </div>

      <div className="listing-card-media relative isolate mt-4 aspect-[16/9] min-h-[150px] self-stretch overflow-hidden rounded-[26px] bg-orbit-soft md:mt-0 md:h-full md:min-h-[clamp(180px,14vw,240px)] md:aspect-auto">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={media?.alt ?? listing.title}
            loading={selected ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={selected ? "high" : undefined}
            width={640}
            height={360}
            className={`absolute inset-0 z-0 h-full w-full object-cover ${unavailable ? "grayscale" : ""}`}
          />
        ) : null}
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
          className="listing-card-action-pill image-overlay-element image-overlay-surface absolute bottom-[clamp(6px,2vw,8px)] right-[clamp(6px,2vw,8px)] z-10 inline-flex items-center gap-1 rounded-full bg-[#c8bfb1]/90 font-semibold text-orbit-ink backdrop-blur-md"
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

function SearchProgressState() {
  return (
    <div className="grid min-h-[calc(100svh-260px)] place-items-center rounded-[28px] bg-orbit-field/45 px-5 py-14 text-center" role="status" aria-live="polite">
      <div className="grid place-items-center gap-5">
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-orbit-panel shadow-[0_16px_34px_rgba(25,32,29,0.1)]">
          <span className="absolute inset-2 animate-spin rounded-full [background:conic-gradient(from_0deg,#efbf04,#4391f5,#10b981,#8b5cf6,#efbf04)]" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-orbit-panel">
            <Search className="h-6 w-6 text-[#705d00]" aria-hidden="true" />
          </span>
        </span>
        <div>
          <h2 className="text-xl font-black text-orbit-ink sm:text-2xl">Searching marketplace</h2>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-orbit-ink/62">
            Matching listings to your search and filters.
          </p>
        </div>
      </div>
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
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.06em] text-[#403301] dark:text-orbit-ink/65">Booking quantity</p>
        <span className="text-sm font-black text-orbit-ink/75">
          Max {availableUnits}
        </span>
      </div>
      <div className="flex h-16 min-w-0 items-center rounded-[14px] bg-orbit-panel p-[4px] shadow-[inset_0_0_0_1px_rgb(128_106_0_/_0.12)]">
        <button
          type="button"
          onClick={() => updateQuantity(selectedQuantity - 1)}
          disabled={disabled || selectedQuantity <= 1}
          className="flex h-full aspect-square shrink-0 items-center justify-center rounded-[10px] bg-orbit-soft text-2xl font-medium text-[#403301] disabled:cursor-not-allowed disabled:opacity-35 dark:text-orbit-ink"
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
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-center text-2xl font-black text-orbit-ink outline-none focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => updateQuantity(selectedQuantity + 1)}
          disabled={disabled || selectedQuantity >= availableUnits}
          className="orbit-cta-gold flex h-full aspect-square shrink-0 items-center justify-center rounded-[10px] text-3xl font-medium disabled:opacity-35"
          title="Increase quantity"
        >
          +
        </button>
      </div>
      <p className="mt-2 text-xs font-black text-orbit-ink/58">
        {availableUnits} available • {bookedUnitsLabel(bookedUnits, totalUnits)}
      </p>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const strongSizeClass = value.length > 12
    ? "text-[clamp(1rem,1.8vw,1.32rem)] tracking-tight"
    : value.length > 9
      ? "text-[clamp(1.18rem,2.2vw,1.58rem)] tracking-tight"
      : "text-[clamp(1.55rem,2.8vw,2.05rem)]";

  return (
    <div className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.06em] text-[#403301] dark:text-orbit-ink/60">{label}</p>
      <p
        className={
          strong
            ? `mt-1 max-w-full whitespace-nowrap font-black leading-none text-[#806A00] ${strongSizeClass}`
            : "mt-1 max-w-full truncate text-base font-black text-orbit-ink"
        }
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
