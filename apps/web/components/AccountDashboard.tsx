"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  FileSignature,
  Grip,
  Heart,
  ImagePlus,
  LoaderCircle,
  MapPin,
  MessageCircle,
  PackageCheck,
  PencilLine,
  Plus,
  Scissors,
  Send,
  ShieldCheck,
  Star,
  Tag,
  Truck,
  Upload,
  WalletCards,
  ZoomIn,
  ZoomOut,
  X
} from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "@/components/CustomSelect";
import { ResilientFocusedImage } from "@/components/ResilientFocusedImage";
import { SiteHeader } from "@/components/SiteHeader";
import {
  formatImageBytes,
  processListingImageFile,
  type ListingImageCropFocus
} from "@/lib/listingImageUpload";
import { cn, ui } from "@/lib/ui";
import { calculateBookingQuote, publicLocationOffset, seededListings, type Coordinates, type OperationMode, type ResourceListing } from "@rentorbit/shared";
import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";

export type AccountDashboardProps = {
  email: string;
  onSignOut: () => void;
};

type ListingKind = "good" | "service" | "personnel";
type MessageAuthor = "me" | "them" | "system";
type ActivityKey = "activeRentals" | "ownerListings" | "savedItems" | "pendingSignatures";
type ActivityTone = "yellow" | "green" | "blue" | "red";
type AccountMobilePanel = "create" | "activity" | "details";
type FocusedAccountPanel = "details" | "chat";

type ListingPhoto = {
  id: string;
  name: string;
  previewUrl: string;
  width?: number;
  height?: number;
  mimeType?: string;
  originalSizeBytes?: number;
  compressedSizeBytes?: number;
};

type ListingMobility = "mobile" | "transportable" | "fixed_in_place";

type PendingPhotoUpload = {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  cropFocus: ListingImageCropFocus;
  originalSizeBytes: number;
};

type OwnerListing = {
  id: string;
  title: string;
  kind: ListingKind;
  county: string;
  price: string;
  description: string;
  photos: ListingPhoto[];
  status: string;
  mobility: ListingMobility;
  quantity: number;
  bookedCount: number;
};

type ChatMessage = {
  id: string;
  author: MessageAuthor;
  text: string;
  time: string;
};

type ChatThread = {
  id: string;
  participant: string;
  listing: string;
  status: string;
  unread: number;
  messages: ChatMessage[];
};

type ChatWindowSize = {
  width: number;
  height: number;
};

type ChatResizeState = {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
};

type AccountStat = {
  key: ActivityKey;
  label: string;
  value: string;
  tone: ActivityTone;
  icon: React.ReactNode;
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  meta: string[];
  actionLabel?: "Edit" | "Open";
  editableListing?: OwnerListing;
  marketplaceListingId?: string;
};

type SavedMarketplaceListing = {
  id: string;
  title: string;
  description: string;
  county: string;
  price: string;
  kind: ListingKind;
  category: string;
};

const marketplaceThreadsKey = "rentorbit:marketplace-chat-threads";
const marketplaceThreadsUpdatedEvent = "rentorbit:marketplace-chats-updated";
const savedListingsKey = "rentorbit:saved-marketplace-listings";
const savedListingsUpdatedEvent = "rentorbit:saved-listings-updated";

function readMarketplaceThreads(): ChatThread[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(marketplaceThreadsKey) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ChatThread[]) : [];
  } catch {
    return [];
  }
}

function mergeThreads(baseThreads: ChatThread[]) {
  const marketplaceThreads = readMarketplaceThreads();
  return [
    ...marketplaceThreads,
    ...baseThreads.filter((thread) => !marketplaceThreads.some((marketplaceThread) => marketplaceThread.id === thread.id))
  ];
}

function writeMarketplaceThreads(threads: ChatThread[]) {
  window.localStorage.setItem(marketplaceThreadsKey, JSON.stringify(threads));
  window.dispatchEvent(new Event(marketplaceThreadsUpdatedEvent));
}

function marketplaceThreadForListing(listing: ResourceListing): ChatThread {
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

function upsertMarketplaceThread(listing: ResourceListing, message?: ChatMessage) {
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

function readSavedMarketplaceListings(): SavedMarketplaceListing[] {
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

function readSavedMarketplaceActivityItems(): ActivityItem[] {
  return readSavedMarketplaceListings().map((listing) => {
    const marketplaceListing = seededListings.find((item) => item.id === listing.id);
    const totalCount = marketplaceListing ? listingInventoryTotal(marketplaceListing) : 1;
    const bookedCount = marketplaceListing ? initialBookedUnitsForListingId(marketplaceListing.id) : 0;

    return {
      id: `saved-marketplace-${listing.id}`,
      title: listing.title,
      description: listing.description || "Saved from the marketplace for follow-up.",
      status: "Saved",
      meta: [
        listing.county,
        listing.price,
        marketplaceListing ? mobilityLabel(listingMobility(marketplaceListing)) : listing.kind,
        bookedUnitsLabel(bookedCount, totalCount)
      ],
      actionLabel: "Open",
      marketplaceListingId: listing.id
    };
  });
}

function writeSavedMarketplaceListings(listings: SavedMarketplaceListing[]) {
  window.localStorage.setItem(savedListingsKey, JSON.stringify(listings));
  window.dispatchEvent(new Event(savedListingsUpdatedEvent));
}

function mobilityLabel(mobility: ListingMobility): string {
  if (mobility === "mobile") return "Mobile";
  if (mobility === "fixed_in_place") return "Fixed in place";
  return "Transportable";
}

function listingKindLabel(kind: ListingKind): string {
  if (kind === "good") return "Goods";
  if (kind === "service") return "Services";
  return "Personnel";
}

function kindFromTagText(value: string): ListingKind | null {
  const normalized = value.toLowerCase();
  if (normalized === "good" || normalized === "goods") return "good";
  if (normalized === "service" || normalized === "services") return "service";
  if (normalized === "personnel") return "personnel";
  return null;
}

function bookedUnitsLabel(bookedCount: number, totalCount: number): string {
  const total = Math.max(1, Math.floor(totalCount));
  const booked = Math.min(total, Math.max(0, Math.floor(bookedCount)));
  return `${booked}:${total} BOOKED`;
}

function positiveInteger(value: string | number, fallback = 1): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
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

function listingInventoryTotal(listing: ResourceListing): number {
  const metadataTotal = listing.metadata.inventoryTotal;
  if (typeof metadataTotal === "number" && metadataTotal > 0) {
    return Math.floor(metadataTotal);
  }

  return seededInventoryTotals[listing.id] ?? 1;
}

function initialBookedUnitsForListingId(listingId: string): number {
  return activeRentalItems.filter((item) => item.marketplaceListingId === listingId).length;
}

function listingMobility(listing: ResourceListing): ListingMobility {
  const metadataMobility = listing.metadata.mobility;
  if (metadataMobility === "mobile" || metadataMobility === "transportable" || metadataMobility === "fixed_in_place") {
    return metadataMobility;
  }

  if (listing.kind === "personnel" || listing.logistics.providesOwnTransport || listing.location.maxTravelRadiusKm) {
    return "mobile";
  }

  if (listing.logistics.deliveryModes.some((mode) => mode.endsWith("_delivery")) || listing.location.countrywideAvailable) {
    return "transportable";
  }

  return "fixed_in_place";
}

function makePhoto(name: string): ListingPhoto {
  const label = name
    .replace(/\.[^/.]+$/, "")
    .split(/[-_\s]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "RO";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="350" viewBox="0 0 250 350"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8e6e3"/><stop offset="1" stop-color="#c8bfb1"/></linearGradient></defs><rect width="250" height="350" rx="34" fill="url(#g)"/><circle cx="125" cy="156" r="44" fill="#ffffff" fill-opacity="0.62"/><text x="125" y="171" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="800" fill="#295485">${label}</text><text x="125" y="236" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700" fill="#353A3E">RentOrbit</text></svg>`;

  return {
    id: name,
    name,
    previewUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    width: 250,
    height: 350,
    mimeType: "image/svg+xml",
    originalSizeBytes: svg.length,
    compressedSizeBytes: svg.length
  };
}

function makePhotos(names: string[]) {
  return names.map((name) => makePhoto(name));
}

function accountStats(activeRentalsCount: number, ownerListingsCount: number, savedItemsCount: number) {
  return [
    { key: "activeRentals", label: "Active rentals", value: String(activeRentalsCount), tone: "yellow", icon: <PackageCheck className="h-5 w-5" aria-hidden="true" /> },
    { key: "ownerListings", label: "Owner listings", value: String(ownerListingsCount), tone: "green", icon: <BadgeCheck className="h-5 w-5" aria-hidden="true" /> },
    { key: "savedItems", label: "Saved items", value: String(savedItemsCount), tone: "blue", icon: <Heart className="h-5 w-5" aria-hidden="true" /> },
    { key: "pendingSignatures", label: "Pending signatures", value: "2", tone: "red", icon: <FileSignature className="h-5 w-5" aria-hidden="true" /> }
  ] satisfies AccountStat[];
}

const activeRentalItems: ActivityItem[] = [
  {
    id: "rental-sony-fx3",
    title: "Sony FX3 cinema kit",
    description: "Owner-operated camera kit currently booked for a two-day product shoot.",
    status: "Active now",
    meta: ["Kilimani", "KES 7,500/day", bookedUnitsLabel(1, 3)],
    actionLabel: "Open",
    marketplaceListingId: "lst_electronics_camera_nairobi_007"
  },
  {
    id: "rental-generator",
    title: "7.5kVA silent generator",
    description: "Site rental with refundable deposit captured and return photos pending.",
    status: "Return review",
    meta: ["Thika", "KES 6,000/day", bookedUnitsLabel(1, 2)],
    actionLabel: "Open",
    marketplaceListingId: "lst_tools_generator_kisumu_002"
  },
  {
    id: "rental-crew",
    title: "Verified event setup crew",
    description: "Three-person event crew booked with operator-only delivery terms.",
    status: "In progress",
    meta: ["Westlands", "KES 12,000", bookedUnitsLabel(1, 4)],
    actionLabel: "Open",
    marketplaceListingId: "lst_personnel_loader_mombasa_003"
  }
];

const initialOwnerListings: OwnerListing[] = [
  { id: "owner-pa", title: "JBL PA sound system with stands", description: "Two powered tops, mixer, cables, and setup support.", status: "Available", county: "Nairobi", price: "KES 4,500/day", kind: "good", mobility: "transportable", quantity: 2, bookedCount: 0, photos: makePhotos(["jbl-pa-main.jpg", "mixer-cables.jpg"]) },
  { id: "owner-generator", title: "7.5kVA silent generator", description: "Event and site generator with local delivery.", status: "2 inquiries", county: "Kiambu", price: "KES 6,000/day", kind: "good", mobility: "transportable", quantity: 2, bookedCount: 1, photos: makePhotos(["generator-front.jpg", "generator-panel.jpg"]) },
  { id: "owner-crew", title: "Verified event setup crew", description: "Three-person crew for tents, staging, lights, and teardown.", status: "Available", county: "Nairobi", price: "KES 12,000", kind: "personnel", mobility: "mobile", quantity: 4, bookedCount: 0, photos: makePhotos(["crew-setup.jpg", "stage-build.jpg"]) },
  { id: "owner-podcast", title: "Podcast and product shoot studio", description: "Small studio with lights, microphones, and engineer support.", status: "Booked tomorrow", county: "Kilimani", price: "KES 9,500/day", kind: "service", mobility: "fixed_in_place", quantity: 3, bookedCount: 1, photos: makePhotos(["studio-wide.jpg", "mic-desk.jpg"]) },
  { id: "owner-chairs", title: "Chiavari event chairs", description: "Stackable chairs with covers and regional delivery.", status: "Available", county: "Nakuru", price: "KES 120/chair", kind: "good", mobility: "transportable", quantity: 120, bookedCount: 0, photos: makePhotos(["chiavari-stack.jpg", "chair-cover.jpg"]) },
  { id: "owner-tent", title: "Outdoor stretch tent", description: "Weather-rated tent with installation crew.", status: "Quote requested", county: "Machakos", price: "KES 18,000/day", kind: "good", mobility: "fixed_in_place", quantity: 5, bookedCount: 2, photos: makePhotos(["stretch-tent.jpg", "tent-rigging.jpg"]) },
  { id: "owner-makeup", title: "Bridal makeup artist", description: "Owner-operated glam package with travel radius.", status: "Available", county: "Mombasa", price: "KES 8,000", kind: "service", mobility: "mobile", quantity: 1, bookedCount: 0, photos: makePhotos(["makeup-kit.jpg", "bridal-finish.jpg"]) },
  { id: "owner-bike", title: "Delivery motorbike rider", description: "Verified rider available for errands and dispatch blocks.", status: "Available", county: "Kisumu", price: "KES 600/hr", kind: "personnel", mobility: "mobile", quantity: 3, bookedCount: 0, photos: makePhotos(["rider-bike.jpg", "delivery-box.jpg"]) },
  { id: "owner-projector", title: "Conference projector kit", description: "Projector, screen, HDMI adapters, and backup cables.", status: "1 inquiry", county: "Eldoret", price: "KES 3,500/day", kind: "good", mobility: "transportable", quantity: 4, bookedCount: 1, photos: makePhotos(["projector-kit.jpg", "screen-stand.jpg"]) },
  { id: "owner-cleaning", title: "Post-event cleaning team", description: "Casual labor team for cleanup and waste handling.", status: "Available", county: "Nairobi", price: "KES 7,000", kind: "personnel", mobility: "mobile", quantity: 6, bookedCount: 0, photos: makePhotos(["cleaning-team.jpg", "cleanup-tools.jpg"]) },
  { id: "owner-drone", title: "Licensed drone operator", description: "Aerial footage service with licensed pilot and editing add-on.", status: "Pending review", county: "Naivasha", price: "KES 15,000", kind: "service", mobility: "mobile", quantity: 2, bookedCount: 0, photos: makePhotos(["drone-kit.jpg", "operator-field.jpg"]) },
  { id: "owner-catering", title: "Mobile catering station", description: "Chafing dishes, service tables, and two attendants.", status: "Available", county: "Mombasa", price: "KES 10,000/day", kind: "service", mobility: "transportable", quantity: 3, bookedCount: 0, photos: makePhotos(["catering-station.jpg", "service-table.jpg"]) }
];

const savedItemNames = [
  "MacBook Pro M3 editing kit",
  "Toyota Hiace van with driver",
  "DSLR beginner camera bundle",
  "Soundproof meeting room",
  "Cold room storage space",
  "Commercial sewing machine",
  "Luxury picnic setup",
  "Camping gear bundle",
  "Pressure washer kit",
  "Executive suit rental",
  "Live stream technician",
  "Home nurse day shift",
  "Mountain bike pair",
  "Mobile DJ booth",
  "Construction laser level",
  "Corporate emcee",
  "Baby car seat",
  "Foldable exhibition booth"
];

const savedMarketplaceListingIds = [
  "lst_electronics_laptops_nairobi_028",
  "lst_vehicle_moving_truck_mombasa_009",
  "lst_electronics_camera_nairobi_007",
  "lst_spaces_meeting_room_nairobi_015",
  "lst_spaces_storage_yard_machakos_016",
  "lst_home_carpet_cleaner_kiambu_012",
  "lst_events_tent_nairobi_005",
  "lst_sports_camping_nakuru_018",
  "lst_tools_garden_meru_013",
  "lst_fashion_gown_uasingishu_011",
  "lst_operator_camera_nairobi_026",
  "lst_domestic_chef_mombasa_022",
  "lst_sports_bikes_nyeri_017",
  "lst_events_lighting_kisumu_029",
  "lst_tools_generator_kisumu_002",
  "lst_service_barber_nairobi_031",
  "lst_home_baby_seats_kiambu_032",
  "lst_spaces_kiosk_mombasa_033"
];

const savedActivityItems: ActivityItem[] = savedItemNames.map((title, index) => {
  const counties = ["Nairobi", "Kiambu", "Mombasa", "Nakuru", "Kisumu", "Machakos"];
  const rates = ["KES 2,500/day", "KES 6,000/day", "KES 900/hr", "Quote ready"];
  const marketplaceListingId = savedMarketplaceListingIds[index % savedMarketplaceListingIds.length];
  const marketplaceListing = seededListings.find((listing) => listing.id === marketplaceListingId);
  const totalCount = marketplaceListing ? listingInventoryTotal(marketplaceListing) : 1;
  const bookedCount = marketplaceListing ? initialBookedUnitsForListingId(marketplaceListing.id) : 0;

  return {
    id: `saved-${index}`,
    title,
    description: "Saved for comparison before sending a proposal or direct message.",
    status: index % 3 === 0 ? "Price watched" : "Saved",
    meta: [
      counties[index % counties.length] ?? "Kenya",
      rates[index % rates.length] ?? "Quote ready",
      marketplaceListing ? mobilityLabel(listingMobility(marketplaceListing)) : "Transportable",
      bookedUnitsLabel(bookedCount, totalCount)
    ],
    actionLabel: "Open",
    marketplaceListingId
  };
});

const pendingSignatureItems: ActivityItem[] = [
  {
    id: "signature-camera",
    title: "Sony FX3 pickup amendment",
    description: "New pickup time requires both parties to sign before payment lock updates.",
    status: "Needs your signature",
    meta: ["Amina Wanjiku", "Expires today", "Amendment"],
    actionLabel: "Open",
    marketplaceListingId: "lst_electronics_camera_nairobi_007"
  },
  {
    id: "signature-crew",
    title: "Event setup crew contract",
    description: "Contract summary is ready after owner accepted the booking proposal.",
    status: "Waiting on renter",
    meta: ["Maua Events", "6-hour window", "Contract"],
    actionLabel: "Open",
    marketplaceListingId: "lst_personnel_loader_mombasa_003"
  }
];

const initialThreads: ChatThread[] = [
  {
    id: "sony-fx3",
    participant: "Amina Wanjiku",
    listing: "Sony FX3 cinema kit",
    status: "Proposal pending",
    unread: 2,
    messages: [
      { id: "sony-1", author: "them", text: "Can we extend pickup to 8:30 AM in Kilimani?", time: "09:24" },
      { id: "sony-2", author: "me", text: "That works. I will update the proposal window.", time: "09:28" },
      { id: "sony-3", author: "system", text: "Booking proposal expires today at 6:00 PM.", time: "09:29" }
    ]
  },
  {
    id: "generator",
    participant: "Brian Otieno",
    listing: "7.5kVA silent generator",
    status: "Return review",
    unread: 0,
    messages: [
      { id: "generator-1", author: "them", text: "Return photos are uploaded from the site handover.", time: "Yesterday" },
      { id: "generator-2", author: "me", text: "I can see them. I am checking the fuel level now.", time: "Yesterday" }
    ]
  },
  {
    id: "setup-crew",
    participant: "Maua Events",
    listing: "Verified event setup crew",
    status: "Signature needed",
    unread: 1,
    messages: [
      { id: "crew-1", author: "system", text: "Contract summary is ready for both parties.", time: "Mon" },
      { id: "crew-2", author: "them", text: "Please confirm the 6-hour setup window before signing.", time: "Mon" }
    ]
  }
];

const panelClass = "theme-body-border rounded-[36px] bg-orbit-panel/92 ring-1 ring-white/70";
const fieldClass = cn(ui.field, "bg-orbit-panel shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22)]");
const labelClass = ui.label;
const listingKindOptions: CustomSelectOption[] = [
  { value: "good", label: "Goods" },
  { value: "service", label: "Services" },
  { value: "personnel", label: "Personnel" }
];
const listingMobilityOptions: CustomSelectOption[] = [
  { value: "transportable", label: "Transportable", helper: "Small enough to move or deliver" },
  { value: "mobile", label: "Mobile", helper: "Travels with renter, owner, or operator" },
  { value: "fixed_in_place", label: "Fixed in place", helper: "Used where it is located" }
];
const defaultChatWindowSize: ChatWindowSize = { width: 420, height: 520 };
const minimizedChatWindowSize: ChatWindowSize = { width: 400, height: 56 };
const compactChatWindowBreakpoint = 1024;
const accountBookingStart = "2026-06-16T09:00";
const accountBookingEnd = "2026-06-17T09:00";

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

function focusedGalleryForListing(listing: ResourceListing) {
  const relatedMedia = seededListings
    .filter((candidate) => candidate.id !== listing.id && candidate.category === listing.category)
    .flatMap((candidate) => candidate.media)
    .slice(0, 4);

  return [...listing.media, ...relatedMedia].slice(0, 6);
}

export function AccountDashboard({ email, onSignOut }: AccountDashboardProps) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ListingKind>("good");
  const [county, setCounty] = useState("Nairobi");
  const [price, setPrice] = useState("");
  const [mobility, setMobility] = useState<ListingMobility>("transportable");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [pendingPhotoUploads, setPendingPhotoUploads] = useState<PendingPhotoUpload[]>([]);
  const [photoUploadBusy, setPhotoUploadBusy] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [ownerListings, setOwnerListings] = useState<OwnerListing[]>(initialOwnerListings);
  const [completedRentalItems, setCompletedRentalItems] = useState<ActivityItem[]>([]);
  const [bookedUnitCounts, setBookedUnitCounts] = useState<Record<string, number>>(() =>
    activeRentalItems.reduce<Record<string, number>>((counts, item) => {
      if (!item.marketplaceListingId) {
        return counts;
      }

      counts[item.marketplaceListingId] = (counts[item.marketplaceListingId] ?? 0) + 1;
      return counts;
    }, {})
  );
  const [savedMarketplaceItems, setSavedMarketplaceItems] = useState<ActivityItem[]>([]);
  const [threads, setThreads] = useState(() => mergeThreads(initialThreads));
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState<ActivityKey>("ownerListings");
  const [selectedActivityItemId, setSelectedActivityItemId] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [focusedListingId, setFocusedListingId] = useState<string | null>(null);
  const [focusedImageIndex, setFocusedImageIndex] = useState(0);
  const [focusedZoom, setFocusedZoom] = useState(1);
  const [focusedPanel, setFocusedPanel] = useState<FocusedAccountPanel>("details");
  const [focusedSelectedMode, setFocusedSelectedMode] = useState<OperationMode>("self_operated");
  const [focusedDraft, setFocusedDraft] = useState("");
  const [focusedThread, setFocusedThread] = useState<ChatThread | null>(null);
  const [focusedQuantity, setFocusedQuantity] = useState("1");
  const [chatWindowSize, setChatWindowSize] = useState<ChatWindowSize>(defaultChatWindowSize);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [mobilePanel, setMobilePanel] = useState<AccountMobilePanel | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  );
  const requestedOwnerQuantity = positiveInteger(quantity, 1);
  const canCreate = title.trim().length > 2 && description.trim().length > 12 && requestedOwnerQuantity >= 1;
  const activeRentalsCount = activeRentalItems.length + completedRentalItems.length;
  const savedItemsCount = savedActivityItems.length + savedMarketplaceItems.length;
  const focusedListing = focusedListingId ? seededListings.find((listing) => listing.id === focusedListingId) ?? null : null;
  const focusedMode = focusedListing?.modeRules.find((rule) => rule.mode === focusedSelectedMode)?.mode ?? focusedListing?.modeRules[0]?.mode ?? "self_operated";
  const focusedQuote = focusedListing
    ? calculateBookingQuote({
        listing: focusedListing,
        mode: focusedMode,
        start: accountBookingStart,
        end: accountBookingEnd
      })
    : null;
  const focusedGallery = focusedListing ? focusedGalleryForListing(focusedListing) : [];
  const focusedImage = focusedGallery[focusedImageIndex] ?? focusedGallery[0];
  const focusedPublicCoordinates = focusedListing ? publicLocationOffset(focusedListing) : undefined;
  const focusedTotalUnits = focusedListing ? listingInventoryTotal(focusedListing) : 1;
  const focusedBookedUnits = focusedListing ? Math.min(focusedTotalUnits, bookedUnitCounts[focusedListing.id] ?? 0) : 0;
  const focusedAvailableUnits = Math.max(0, focusedTotalUnits - focusedBookedUnits);
  const focusedSelectedQuantity = Math.min(positiveInteger(focusedQuantity, 1), Math.max(1, focusedAvailableUnits));
  const focusedListingActiveForAccount = [...activeRentalItems, ...completedRentalItems].some((item) => item.marketplaceListingId === focusedListing?.id);
  const focusedListingBooked = focusedListingActiveForAccount || focusedAvailableUnits <= 0;

  useEffect(() => {
    function refreshMarketplaceThreads() {
      setThreads(mergeThreads(initialThreads));
    }

    window.addEventListener("storage", refreshMarketplaceThreads);
    window.addEventListener(marketplaceThreadsUpdatedEvent, refreshMarketplaceThreads);

    return () => {
      window.removeEventListener("storage", refreshMarketplaceThreads);
      window.removeEventListener(marketplaceThreadsUpdatedEvent, refreshMarketplaceThreads);
    };
  }, []);

  useEffect(() => {
    function refreshSavedListings() {
      setSavedMarketplaceItems(readSavedMarketplaceActivityItems());
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
    if (!mobilePanel) {
      return;
    }

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
    if (!focusedListingId) {
      return;
    }

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

  function resetCreateForm() {
    setTitle("");
    setKind("good");
    setCounty("Nairobi");
    setPrice("");
    setMobility("transportable");
    setQuantity("1");
    setDescription("");
    setPhotos([]);
    setEditingListingId(null);
  }

  function saveListing() {
    if (!canCreate) {
      return;
    }

    const listing: OwnerListing = {
      id: editingListingId ?? `listing-${Date.now()}`,
      title: title.trim(),
      kind,
      county: county.trim() || "Kenya",
      price: price.trim() || "Price on request",
      description: description.trim(),
      photos,
      status: editingListingId ? (ownerListings.find((item) => item.id === editingListingId)?.status ?? "Available") : "Available",
      mobility,
      quantity: requestedOwnerQuantity,
      bookedCount: Math.min(
        requestedOwnerQuantity,
        editingListingId ? (ownerListings.find((item) => item.id === editingListingId)?.bookedCount ?? 0) : 0
      )
    };

    setOwnerListings((current) =>
      editingListingId
        ? current.map((item) => (item.id === editingListingId ? listing : item))
        : [listing, ...current]
    );
    setActiveActivity("ownerListings");
    setSelectedActivityItemId(listing.id);
    resetCreateForm();
  }

  function preparePhotoUploads(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    setPhotoUploadError("");
    setPhotoUploadBusy(false);
    setPendingPhotoUploads(
      selectedFiles
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}`,
          file,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
          cropFocus: { x: 0.5, y: 0.5 },
          originalSizeBytes: file.size
        }))
    );

    if (selectedFiles.some((file) => !file.type.startsWith("image/"))) {
      setPhotoUploadError("Only image files can be added to a listing");
    }
  }

  function cancelPreparedPhotoUploads() {
    pendingPhotoUploads.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPendingPhotoUploads([]);
    setPhotoUploadBusy(false);
    setPhotoUploadError("");
  }

  function updatePendingPhotoCrop(photoId: string, cropFocus: ListingImageCropFocus) {
    setPendingPhotoUploads((current) =>
      current.map((photo) => (photo.id === photoId ? { ...photo, cropFocus } : photo))
    );
  }

  async function confirmPreparedPhotoUploads() {
    if (!pendingPhotoUploads.length) {
      return;
    }

    setPhotoUploadBusy(true);
    setPhotoUploadError("");

    try {
      const preparedPhotos = await Promise.all(
        pendingPhotoUploads.map((photo) => processListingImageFile(photo.file, photo.cropFocus))
      );
      const nextPhotos: ListingPhoto[] = preparedPhotos.map((photo) => ({
        id: photo.id,
        name: photo.fileName,
        previewUrl: photo.previewUrl,
        width: photo.width,
        height: photo.height,
        mimeType: photo.mimeType,
        originalSizeBytes: photo.originalSizeBytes,
        compressedSizeBytes: photo.compressedSizeBytes
      }));

      setPhotos((current) => [
        ...current,
        ...nextPhotos.filter((photo) => !current.some((currentPhoto) => currentPhoto.id === photo.id))
      ]);
      pendingPhotoUploads.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPendingPhotoUploads([]);
    } catch (error) {
      setPhotoUploadError(error instanceof Error ? error.message : "Could not prepare selected images");
    } finally {
      setPhotoUploadBusy(false);
    }
  }

  function openThread(threadId: string) {
    setActiveThreadId(threadId);
    setChatDraft("");
    setChatMinimized(false);
    setThreads((current) =>
      current.map((thread) => (thread.id === threadId ? { ...thread, unread: 0 } : thread))
    );
  }

  function selectActivity(activity: ActivityKey) {
    setActiveActivity(activity);
    setSelectedActivityItemId(null);
  }

  function editOwnerListing(listing: OwnerListing) {
    setTitle(listing.title);
    setKind(listing.kind);
    setCounty(listing.county);
    setPrice(listing.price);
    setMobility(listing.mobility);
    setQuantity(String(listing.quantity));
    setDescription(listing.description);
    setPhotos(listing.photos);
    setEditingListingId(listing.id);
    setActiveActivity("ownerListings");
    setSelectedActivityItemId(listing.id);

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setMobilePanel("create");
    }
  }

  function openMarketplaceListing(listingId: string) {
    const listing = seededListings.find((item) => item.id === listingId);

    if (!listing) {
      return;
    }

    setFocusedListingId(listing.id);
    setFocusedImageIndex(0);
    setFocusedZoom(1);
    setFocusedPanel("details");
    setFocusedSelectedMode(listing.modeRules[0]?.mode ?? "self_operated");
    setFocusedDraft("");
    setFocusedThread(null);
    setFocusedQuantity("1");
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
      id: `account-marketplace-message-${Date.now()}`,
      author: "me",
      text,
      time: "Now"
    });
    setFocusedThread(thread);
    setThreads(mergeThreads(initialThreads));
    setFocusedDraft("");
  }

  function proposeFocusedBooking() {
    if (!focusedListing || !focusedQuote || focusedListingBooked || focusedAvailableUnits <= 0) {
      return;
    }

    const quantityToPropose = Math.min(focusedSelectedQuantity, focusedAvailableUnits);
    const thread = upsertMarketplaceThread(focusedListing, {
      id: `account-marketplace-proposal-${Date.now()}`,
      author: "system",
      text: `Booking proposal prepared for ${quantityToPropose} item(s): ${kes(focusedQuote.totalDueNow.amount * quantityToPropose)} due now.`,
      time: "Now"
    });
    setFocusedThread(thread);
    setThreads(mergeThreads(initialThreads));
    setFocusedPanel("chat");
  }

  function completeFocusedBooking() {
    if (!focusedListing || !focusedQuote || focusedListingBooked || focusedAvailableUnits <= 0) {
      return;
    }

    const quantityToBook = Math.min(focusedSelectedQuantity, focusedAvailableUnits);
    const nextBookedUnits = Math.min(focusedTotalUnits, focusedBookedUnits + quantityToBook);
    const nextRental: ActivityItem = {
      id: `active-marketplace-${focusedListing.id}`,
      title: focusedListing.title,
      description: `Booking completed for ${quantityToBook} item(s). Total due now ${kes(focusedQuote.totalDueNow.amount * quantityToBook)}.`,
      status: "Active now",
      meta: [
        focusedListing.location.county,
        kes(focusedQuote.rentalFee.amount * quantityToBook),
        bookedUnitsLabel(nextBookedUnits, focusedTotalUnits)
      ],
      actionLabel: "Open",
      marketplaceListingId: focusedListing.id
    };

    setBookedUnitCounts((current) => ({
      ...current,
      [focusedListing.id]: nextBookedUnits
    }));
    setCompletedRentalItems((current) => [
      nextRental,
      ...current.filter((item) => item.marketplaceListingId !== focusedListing.id)
    ]);
    writeSavedMarketplaceListings(readSavedMarketplaceListings().filter((listing) => listing.id !== focusedListing.id));
    setSavedMarketplaceItems(readSavedMarketplaceActivityItems());
    setActiveActivity("activeRentals");
    setSelectedActivityItemId(nextRental.id);
    setFocusedListingId(null);
  }

  function deletePhoto(photoId: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  function sendMessage() {
    const text = chatDraft.trim();

    if (!activeThread || !text) {
      return;
    }

    const nextMessage: ChatMessage = {
      id: `message-${Date.now()}`,
      author: "me",
      text,
      time: "Now"
    };

    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              messages: [...thread.messages, nextMessage]
            }
          : thread
      )
    );

    if (activeThread.id.startsWith("marketplace-")) {
      const marketplaceThreads = readMarketplaceThreads();
      writeMarketplaceThreads(
        marketplaceThreads.map((thread) =>
          thread.id === activeThread.id ? { ...thread, messages: [...thread.messages, nextMessage] } : thread
        )
      );
    }

    setChatDraft("");
  }

  const createListingPanel = (
    <CreateListingPanel
      title={title}
      kind={kind}
      county={county}
      price={price}
      mobility={mobility}
      quantity={quantity}
      description={description}
      photos={photos}
      canCreate={canCreate}
      editingListingId={editingListingId}
      setTitle={setTitle}
      setKind={setKind}
      setCounty={setCounty}
      setPrice={setPrice}
      setMobility={setMobility}
      setQuantity={setQuantity}
      setDescription={setDescription}
      deletePhoto={deletePhoto}
      photoUploadBusy={photoUploadBusy}
      photoUploadError={photoUploadError}
      preparePhotoUploads={preparePhotoUploads}
      saveListing={saveListing}
    />
  );

  const mobileMetricsPanel = (
    <AccountMetricsPanel
      activeActivity={activeActivity}
      activeRentalsCount={activeRentalsCount}
      ownerListingsCount={ownerListings.length}
      savedItemsCount={savedItemsCount}
      setActiveActivity={(activity) => {
        selectActivity(activity);
        setMobilePanel(null);
      }}
    />
  );

  const sidePanel = <AccountSidePanel email={email} threads={threads} openThread={openThread} />;

  return (
    <main className="min-h-screen overflow-x-hidden bg-orbit-field text-orbit-ink">
      <SiteHeader active="account" sessionEmail={email} onSignOut={onSignOut} />

      <AccountMobilePanelBar onOpen={setMobilePanel} />

      {mobilePanel ? (
        <AccountMobilePanelOverlay title={accountPanelTitle(mobilePanel)} onClose={() => setMobilePanel(null)}>
          {mobilePanel === "create" ? createListingPanel : null}
          {mobilePanel === "activity" ? mobileMetricsPanel : null}
          {mobilePanel === "details" ? sidePanel : null}
        </AccountMobilePanelOverlay>
      ) : null}

      <div className="grid min-h-[calc(100svh-81px)] min-w-0 w-full gap-3 px-3 py-3 xl:h-[calc(100svh-81px)] xl:grid-cols-[300px_minmax(0,1fr)_390px] xl:overflow-hidden 2xl:grid-cols-[320px_minmax(0,1fr)_400px]">
        <aside className="hidden min-w-0 h-fit self-start xl:sticky xl:top-0 xl:block xl:max-h-full xl:overflow-x-hidden xl:overflow-y-visible">
          {createListingPanel}
        </aside>

        <section className="grid min-w-0 content-start gap-3 xl:h-full xl:overflow-y-auto xl:pr-1">
          <AccountMetricsPanel
            activeActivity={activeActivity}
            activeRentalsCount={activeRentalsCount}
            ownerListingsCount={ownerListings.length}
            savedItemsCount={savedItemsCount}
            setActiveActivity={selectActivity}
            className="hidden xl:grid"
          />
          <ActivityEntriesPanel
            activeActivity={activeActivity}
            ownerListings={ownerListings}
            completedRentalItems={completedRentalItems}
            savedMarketplaceItems={savedMarketplaceItems}
            selectedActivityItemId={selectedActivityItemId}
            setSelectedActivityItemId={setSelectedActivityItemId}
            editOwnerListing={editOwnerListing}
            openMarketplaceListing={openMarketplaceListing}
          />
        </section>

        <aside className="hidden min-w-0 h-fit self-start xl:sticky xl:top-0 xl:block xl:max-h-full xl:overflow-x-hidden xl:overflow-y-visible">
          {sidePanel}
        </aside>
      </div>

      {activeThread ? (
        <FloatingChatWindow
          thread={activeThread}
          draft={chatDraft}
          minimized={chatMinimized}
          size={chatWindowSize}
          setDraft={setChatDraft}
          sendMessage={sendMessage}
          setMinimized={setChatMinimized}
          setSize={setChatWindowSize}
          onClose={() => {
            setActiveThreadId(null);
            setChatDraft("");
            setChatMinimized(false);
            setChatWindowSize(defaultChatWindowSize);
          }}
        />
      ) : null}

      {focusedListing && focusedQuote ? (
        <AccountFocusedListingOverlay
          listing={focusedListing}
          gallery={focusedGallery}
          image={focusedImage}
          imageIndex={focusedImageIndex}
          setImageIndex={setFocusedImageIndex}
          zoom={focusedZoom}
          setZoom={setFocusedZoom}
          activeMode={focusedMode}
          quote={focusedQuote}
          bookingQuantity={focusedQuantity}
          setBookingQuantity={setFocusedQuantity}
          selectedQuantity={focusedSelectedQuantity}
          totalUnits={focusedTotalUnits}
          bookedUnits={focusedBookedUnits}
          availableUnits={focusedAvailableUnits}
          publicCoordinates={focusedPublicCoordinates}
          setSelectedMode={setFocusedSelectedMode}
          panel={focusedPanel}
          setPanel={setFocusedPanel}
          thread={focusedThread ?? marketplaceThreadForListing(focusedListing)}
          draft={focusedDraft}
          setDraft={setFocusedDraft}
          sendMessage={sendFocusedMessage}
          onDm={() => focusDmForListing(focusedListing)}
          proposeBooking={proposeFocusedBooking}
          completeBooking={completeFocusedBooking}
          booked={focusedListingBooked}
          onClose={() => setFocusedListingId(null)}
        />
      ) : null}

      {photoUploadBusy || pendingPhotoUploads.length > 0 || photoUploadError ? (
        <ImageUploadReviewModal
          busy={photoUploadBusy}
          error={photoUploadError}
          photos={pendingPhotoUploads}
          onCropChange={updatePendingPhotoCrop}
          onCancel={cancelPreparedPhotoUploads}
          onConfirm={confirmPreparedPhotoUploads}
        />
      ) : null}
    </main>
  );
}

function accountPanelTitle(panel: AccountMobilePanel): string {
  if (panel === "create") return "Create Listing";
  if (panel === "activity") return "Marketplace Activity";
  return "Account Details";
}

function AccountMobilePanelBar({ onOpen }: { onOpen: (panel: AccountMobilePanel) => void }) {
  return (
    <div className="theme-body-border sticky top-0 z-40 grid grid-cols-3 gap-2 border-b border-white/70 bg-orbit-field/95 px-3 py-2 backdrop-blur xl:hidden">
      <button
        type="button"
        onClick={() => onOpen("create")}
        className="theme-body-border inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orbit-panel/92 px-3 text-xs font-black text-orbit-ink ring-1 ring-white/70"
      >
        <Plus className="h-4 w-4 text-orbit-green" aria-hidden="true" />
        Create
      </button>
      <button
        type="button"
        onClick={() => onOpen("activity")}
        className="theme-body-border inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orbit-panel/92 px-3 text-xs font-black text-orbit-ink ring-1 ring-white/70"
      >
        <PackageCheck className="h-4 w-4 text-orbit-green" aria-hidden="true" />
        Activity
      </button>
      <button
        type="button"
        onClick={() => onOpen("details")}
        className="theme-body-border inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orbit-panel/92 px-3 text-xs font-black text-orbit-ink ring-1 ring-white/70"
      >
        <CircleUserRound className="h-4 w-4 text-orbit-green" aria-hidden="true" />
        Details
      </button>
    </div>
  );
}

function AccountMobilePanelOverlay({
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

function ImageUploadReviewModal({
  busy,
  error,
  photos,
  onCropChange,
  onCancel,
  onConfirm
}: {
  busy: boolean;
  error: string;
  photos: PendingPhotoUpload[];
  onCropChange: (photoId: string, cropFocus: ListingImageCropFocus) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const totalOriginalSize = photos.reduce((total, photo) => total + photo.originalSizeBytes, 0);
  const hasPreparedPhotos = photos.length > 0;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/62 p-3 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Review prepared listing images">
      <section className="grid max-h-[min(760px,calc(100svh-24px))] w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[34px] bg-orbit-panel/95 text-orbit-ink shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-orbit-green">
              <Scissors className="h-4 w-4" aria-hidden="true" />
              Image preparation
            </div>
            <h2 className="mt-2 text-2xl font-black">Review upload</h2>
            <p className="mt-1 text-sm font-semibold text-orbit-ink/62">
              Drag each photo inside the 5:7 window to choose the best angle before compression.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orbit-field text-orbit-ink"
            aria-label="Close image review"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 pb-5">
          {busy ? (
            <div className="grid min-h-80 place-items-center rounded-[28px] bg-orbit-field text-center">
              <div>
                <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-orbit-green" aria-hidden="true" />
                <p className="mt-4 text-sm font-black">Compressing images</p>
                <p className="mt-1 text-xs font-semibold text-orbit-ink/60">Applying your crop positions and preparing upload files.</p>
              </div>
            </div>
          ) : null}

          {!busy && error ? (
            <div className="rounded-[28px] bg-[#FF5F57]/12 p-5 text-sm font-bold text-[#FF5F57]">{error}</div>
          ) : null}

          {!busy && hasPreparedPhotos ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-[22px] bg-orbit-field p-4">
                  <p className="text-xs font-black uppercase text-orbit-ink/55">Images</p>
                  <p className="mt-1 text-xl font-black">{photos.length}</p>
                </div>
                <div className="rounded-[22px] bg-orbit-field p-4">
                  <p className="text-xs font-black uppercase text-orbit-ink/55">Before</p>
                  <p className="mt-1 text-xl font-black">{formatImageBytes(totalOriginalSize)}</p>
                </div>
                <div className="rounded-[22px] bg-orbit-field p-4">
                  <p className="text-xs font-black uppercase text-orbit-ink/55">Output</p>
                  <p className="mt-1 text-xl font-black">5:7</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo) => (
                  <article key={photo.id} className="overflow-hidden rounded-[24px] bg-orbit-field p-2">
                    <DraggableCropPreview photo={photo} onCropChange={onCropChange} />
                    <div className="px-1 py-2">
                      <p className="truncate text-xs font-black">{photo.name}</p>
                      <p className="mt-1 text-[10px] font-bold text-orbit-ink/58">
                        1000x1400 • {formatImageBytes(photo.originalSizeBytes)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 p-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex min-h-12 items-center justify-center rounded-full bg-orbit-field px-5 text-sm font-black text-orbit-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !hasPreparedPhotos}
            className="orbit-cta-gold flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Compress and upload
          </button>
        </div>
      </section>
    </div>
  );
}

function DraggableCropPreview({
  photo,
  onCropChange
}: {
  photo: PendingPhotoUpload;
  onCropChange: (photoId: string, cropFocus: ListingImageCropFocus) => void;
}) {
  const [dragState, setDragState] = useState<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startFocusX: number;
    startFocusY: number;
    width: number;
    height: number;
  } | null>(null);
  const isDragging = Boolean(dragState);

  function clampCropFocus(value: number) {
    return Math.min(1, Math.max(0, value));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFocusX: photo.cropFocus.x,
      startFocusY: photo.cropFocus.y,
      width: bounds.width,
      height: bounds.height
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = (event.clientX - dragState.startClientX) / dragState.width;
    const deltaY = (event.clientY - dragState.startClientY) / dragState.height;
    onCropChange(photo.id, {
      x: clampCropFocus(dragState.startFocusX - deltaX),
      y: clampCropFocus(dragState.startFocusY - deltaY)
    });
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragState(null);
    }
  }

  return (
    <div
      className={`relative aspect-[5/7] touch-none overflow-hidden rounded-[20px] bg-orbit-soft ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      title="Drag to reposition crop"
    >
      <img
        src={photo.previewUrl}
        alt={photo.name}
        draggable={false}
        className="h-full w-full select-none object-cover"
        style={{ objectPosition: `${photo.cropFocus.x * 100}% ${photo.cropFocus.y * 100}%` }}
      />
      <span className="pointer-events-none absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#EFBF04] text-[#403301]">
        <Check className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-full bg-black/55 px-2 py-1 text-center text-[10px] font-black text-white backdrop-blur">
        Drag to reposition
      </span>
    </div>
  );
}

function AccountMetricsPanel({
  activeActivity,
  activeRentalsCount,
  ownerListingsCount,
  savedItemsCount,
  setActiveActivity,
  className = "grid"
}: {
  activeActivity: ActivityKey;
  activeRentalsCount: number;
  ownerListingsCount: number;
  savedItemsCount: number;
  setActiveActivity: (activity: ActivityKey) => void;
  className?: string;
}) {
  return (
    <div className={`${panelClass} ${className} m-[2px] gap-3 p-5 2xl:grid-cols-[1fr_520px]`}>
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-orbit-green">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Account command center
        </div>
        <h2 className="mt-2 text-2xl font-black text-orbit-ink">Marketplace activity</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-orbit-ink/65">
          Listings, rentals, saved resources, and pending contract actions.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
        {accountStats(activeRentalsCount, ownerListingsCount, savedItemsCount).map((stat) => (
          <AccountMetric
            key={stat.key}
            stat={stat}
            active={activeActivity === stat.key}
            onSelect={() => setActiveActivity(stat.key)}
          />
        ))}
      </div>
    </div>
  );
}

function AccountMetric({
  stat,
  active,
  onSelect
}: {
  stat: AccountStat;
  active: boolean;
  onSelect: () => void;
}) {
  const tones = {
    yellow: "text-[#FFBD2E]",
    green: "text-[#28C840]",
    blue: "text-[#4391F5]",
    red: "text-[#FF5F57]"
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-[18px] border bg-orbit-field p-3 text-center transition hover:bg-orbit-soft/60 ${
        active ? "border-[#4391F5]" : "border-orbit-line"
      }`}
      aria-pressed={active}
    >
      <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-orbit-panel ${tones[stat.tone]}`}>
        {stat.icon}
      </div>
      <p className={`text-xl font-black ${tones[stat.tone]}`}>{stat.value}</p>
      <p className="mt-1 font-semibold text-orbit-ink/65">{stat.label}</p>
    </button>
  );
}

function CreateListingPanel({
  title,
  kind,
  county,
  price,
  mobility,
  quantity,
  description,
  photos,
  canCreate,
  editingListingId,
  setTitle,
  setKind,
  setCounty,
  setPrice,
  setMobility,
  setQuantity,
  setDescription,
  deletePhoto,
  photoUploadBusy,
  photoUploadError,
  preparePhotoUploads,
  saveListing
}: {
  title: string;
  kind: ListingKind;
  county: string;
  price: string;
  mobility: ListingMobility;
  quantity: string;
  description: string;
  photos: ListingPhoto[];
  canCreate: boolean;
  editingListingId: string | null;
  setTitle: (value: string) => void;
  setKind: (value: ListingKind) => void;
  setCounty: (value: string) => void;
  setPrice: (value: string) => void;
  setMobility: (value: ListingMobility) => void;
  setQuantity: (value: string) => void;
  setDescription: (value: string) => void;
  deletePhoto: (photoId: string) => void;
  photoUploadBusy: boolean;
  photoUploadError: string;
  preparePhotoUploads: (files: FileList | null) => void;
  saveListing: () => void;
}) {
  return (
    <section className={`${panelClass} max-h-full min-w-0 overflow-y-auto overflow-x-hidden p-5`}>
      <div className="mb-5 grid min-h-[76px] grid-cols-[minmax(0,1fr)_56px] items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-orbit-green">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="truncate">Create marketplace listing</span>
          </div>
          <h2 className="mt-2 h-8 truncate text-2xl font-black leading-8">{editingListingId ? "Edit resource" : "New resource"}</h2>
        </div>
        <span className="orbit-tag flex h-10 w-14 shrink-0 items-center justify-center rounded-full bg-orbit-soft px-0 text-[11px] font-black uppercase text-orbit-green">
          {editingListingId ? "EDIT" : "DRAFT"}
        </span>
      </div>

      <div className="grid gap-4">
        <label className="block">
          <span className={labelClass}>Listing title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} type="text" />
        </label>

        <CustomSelect
          label="Type"
          value={kind}
          options={listingKindOptions}
          onChange={(value) => setKind(value as ListingKind)}
          labelClassName={labelClass}
        />

        <CustomSelect
          label="Mobility"
          value={mobility}
          options={listingMobilityOptions}
          onChange={(value) => setMobility(value as ListingMobility)}
          labelClassName={labelClass}
        />

        <label className="block">
          <span className={labelClass}>County</span>
          <input value={county} onChange={(event) => setCounty(event.target.value)} className={fieldClass} type="text" />
        </label>

        <label className="block">
          <span className={labelClass}>Price</span>
          <input value={price} onChange={(event) => setPrice(event.target.value)} className={fieldClass} type="text" />
        </label>

        <label className="block">
          <span className={labelClass}>Number of items</span>
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            onBlur={() => setQuantity(String(positiveInteger(quantity, 1)))}
            className={fieldClass}
            type="number"
            min={1}
            inputMode="numeric"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-28 w-full resize-none rounded-[18px] bg-orbit-panel px-3 py-2 text-sm font-semibold leading-6 text-orbit-ink outline-none shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22)] focus:outline-none focus:ring-0 focus-visible:outline-none"
          />
        </label>

        <label className="block cursor-pointer">
          <span className={labelClass}>Pictures</span>
          <div className="grid min-h-28 place-items-center rounded-[18px] bg-orbit-panel p-3 text-center shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22)] transition hover:bg-orbit-soft/50">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orbit-field text-orbit-green">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="mt-2 min-w-0">
              <p className="text-sm font-black">Add photos</p>
              <p className="mt-1 truncate text-xs font-semibold text-orbit-ink/60">
                {photoUploadBusy ? "Preparing 5:7 compressed images" : photos.length ? `${photos.length} photo(s) ready` : "JPG, PNG, or WebP"}
              </p>
            </div>
            <Upload className="mt-2 h-4 w-4 text-orbit-green" aria-hidden="true" />
            <input
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                preparePhotoUploads(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
        </label>

        {photoUploadError ? (
          <p className="rounded-[18px] bg-[#FF5F57]/12 px-3 py-2 text-xs font-bold text-[#FF5F57]">{photoUploadError}</p>
        ) : null}

        {photos.length ? (
          <div className="grid gap-2">
            <span className={labelClass}>Existing pictures</span>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative aspect-[5/7] overflow-hidden rounded-[18px] bg-orbit-panel ring-1 ring-orbit-line">
                  <img src={photo.previewUrl} alt={photo.name} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-orbit-panel/90 px-2 py-1 text-[10px] font-black text-orbit-ink">
                    {photo.name}
                  </span>
                  {photo.width && photo.height ? (
                    <span className="absolute left-1 top-1 rounded-full bg-orbit-panel/90 px-2 py-1 text-[9px] font-black text-orbit-green">
                      {photo.width}:{photo.height}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-orbit-panel/95 text-orbit-ink shadow-[0_6px_16px_rgba(25,32,29,0.16)]"
                    title={`Delete ${photo.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={saveListing}
          disabled={!canCreate}
          className="orbit-cta-gold flex min-h-[64px] items-center justify-center gap-2 rounded-full px-6 text-sm font-black transition"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {editingListingId ? <PencilLine className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
          </span>
          <span className="w-14 text-center">{editingListingId ? "Edit" : "Create"}</span>
        </button>
      </div>
    </section>
  );
}

function ActivityEntriesPanel({
  activeActivity,
  ownerListings,
  completedRentalItems,
  savedMarketplaceItems,
  selectedActivityItemId,
  setSelectedActivityItemId,
  editOwnerListing,
  openMarketplaceListing
}: {
  activeActivity: ActivityKey;
  ownerListings: OwnerListing[];
  completedRentalItems: ActivityItem[];
  savedMarketplaceItems: ActivityItem[];
  selectedActivityItemId: string | null;
  setSelectedActivityItemId: (itemId: string) => void;
  editOwnerListing: (listing: OwnerListing) => void;
  openMarketplaceListing: (listingId: string) => void;
}) {
  const ownerActivityItems: ActivityItem[] = ownerListings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    status: listing.status,
    meta: [
      listing.county,
      listing.price,
      mobilityLabel(listing.mobility),
      bookedUnitsLabel(listing.bookedCount, listing.quantity)
    ],
    actionLabel: "Edit",
    editableListing: listing
  }));
  const activityItems: Record<ActivityKey, ActivityItem[]> = {
    activeRentals: [...completedRentalItems, ...activeRentalItems],
    ownerListings: ownerActivityItems,
    savedItems: [...savedMarketplaceItems, ...savedActivityItems],
    pendingSignatures: pendingSignatureItems
  };
  const activityMeta: Record<ActivityKey, { eyebrow: string; title: string; description: string }> = {
    activeRentals: {
      eyebrow: "Active rentals",
      title: "Current rentals",
      description: "Live bookings where funds, returns, or operations are still active."
    },
    ownerListings: {
      eyebrow: "Owner listings",
      title: "Marketplace listings",
      description: "Published and draft resources attached to this owner account."
    },
    savedItems: {
      eyebrow: "Saved items",
      title: "Saved resources",
      description: "Listings bookmarked for comparison, follow-up, or future booking."
    },
    pendingSignatures: {
      eyebrow: "Pending signatures",
      title: "Signature queue",
      description: "Contracts and amendments waiting for one or both parties to sign."
    }
  };
  const items = activityItems[activeActivity];
  const meta = activityMeta[activeActivity];

  return (
    <section className="rounded-[30px] bg-orbit-panel/35 p-3">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-orbit-green">
            <Tag className="h-4 w-4" aria-hidden="true" />
            {meta.eyebrow}
          </div>
          <h2 className="mt-1 text-2xl font-black text-orbit-ink">{meta.title}</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-orbit-ink/60">{meta.description}</p>
        </div>
        <span className="rounded-full bg-orbit-panel px-4 py-3 text-xs font-black shadow-panel">
          {items.length}
        </span>
      </div>

      {items.length ? (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => (
            <ActivityCard
              key={item.id}
              item={item}
              selected={selectedActivityItemId === item.id}
              onSelect={() => setSelectedActivityItemId(item.id)}
              onEdit={item.editableListing ? () => editOwnerListing(item.editableListing as OwnerListing) : undefined}
              onOpen={item.marketplaceListingId ? () => openMarketplaceListing(item.marketplaceListingId as string) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className={`${panelClass} grid min-h-72 place-items-center p-6 text-center`}>
          <div>
            <Tag className="mx-auto h-9 w-9 text-orbit-green" aria-hidden="true" />
            <p className="mt-3 text-lg font-black">No records yet</p>
            <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-orbit-ink/60">
              This section will populate as marketplace activity changes.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ActivityCard({
  item,
  selected,
  onSelect,
  onEdit,
  onOpen
}: {
  item: ActivityItem;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onOpen?: () => void;
}) {
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
      className={`listing-card-shell cursor-pointer rounded-[24px] border-2 bg-orbit-panel p-4 text-left transition-colors focus-visible:border-[#4391F5] focus-visible:outline-none ${
        selected ? "border-[#4391F5]" : "border-orbit-field"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-orbit-ink/60">{item.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="orbit-tag rounded-full bg-orbit-soft px-[11px] py-[7px] text-[10px] font-black uppercase">
            {item.status}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-2 text-xs font-black text-orbit-ink/70">
          {item.meta.map((detail, index) => {
            const detailKind = kindFromTagText(detail);

            return detailKind ? (
              <span key={`${item.id}-${detail}-${index}`} className="kind-tag orbit-tag rounded-full px-[11px] py-[7px]" data-kind={detailKind}>
                {listingKindLabel(detailKind)}
              </span>
            ) : (
              <span key={`${item.id}-${detail}-${index}`} className="rounded-full bg-orbit-field px-3 py-2">
                {detail}
              </span>
            );
          })}
        </div>
        {item.actionLabel ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (onEdit) {
                onEdit();
                return;
              }
              if (onOpen) {
                onSelect();
                onOpen();
                return;
              }
              onSelect();
            }}
            className="listing-card-action-pill image-overlay-element image-overlay-surface z-10 inline-flex shrink-0 items-center justify-between gap-3 rounded-full bg-[#c8bfb1]/90 font-semibold text-orbit-ink shadow-[0_8px_22px_rgba(25,32,29,0.12)] backdrop-blur-md"
          >
            {item.actionLabel}
            <span className="image-overlay-element image-overlay-strong flex h-full aspect-square items-center justify-center rounded-full bg-black text-white">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        ) : null}
      </div>
    </article>
  );
}

function AccountFocusedListingOverlay({
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
  completeBooking,
  booked,
  onClose
}: {
  listing: ResourceListing;
  gallery: ResourceListing["media"];
  image?: ResourceListing["media"][number];
  imageIndex: number;
  setImageIndex: Dispatch<SetStateAction<number>>;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
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
  panel: FocusedAccountPanel;
  setPanel: (panel: FocusedAccountPanel) => void;
  thread: ChatThread;
  draft: string;
  setDraft: (value: string) => void;
  sendMessage: () => void;
  onDm: () => void;
  proposeBooking: () => void;
  completeBooking: () => void;
  booked: boolean;
  onClose: () => void;
}) {
  const hasMultipleImages = gallery.length > 1;
  const adjacentImageUrls = hasMultipleImages
    ? [
        gallery[(imageIndex + 1) % gallery.length]?.url,
        gallery[(imageIndex - 1 + gallery.length) % gallery.length]?.url
      ].filter((url): url is string => Boolean(url))
    : [];

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
    <div className="fixed inset-0 z-[80] bg-orbit-field p-3 text-orbit-ink sm:p-5" role="dialog" aria-modal="true" aria-label={listing.title}>
      <div className="relative grid h-full min-w-0 overflow-hidden rounded-[34px] border-2 border-[#4391F5] bg-orbit-panel shadow-[0_24px_70px_rgba(25,32,29,0.18)] lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        <section className="relative min-h-[52svh] overflow-hidden bg-orbit-field p-5 sm:p-8 lg:min-h-0">
            <button
              type="button"
              onClick={onClose}
              className="focused-view-close-button absolute z-30 flex items-center justify-center rounded-full bg-orbit-panel text-orbit-ink shadow-[0_12px_30px_rgba(25,32,29,0.18)] transition-colors hover:bg-orbit-soft"
              title="Close"
            >
              <X aria-hidden="true" />
              <span className="sr-only">Close focused listing</span>
            </button>

          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[26px] bg-orbit-field">
            {image ? (
              <ResilientFocusedImage
                src={image.url}
                alt={image.alt || listing.title}
                zoom={zoom}
                preloadUrls={adjacentImageUrls}
              />
            ) : null}
          </div>

          <div className="absolute bottom-8 right-8 z-20 flex flex-wrap justify-end gap-3">
            <div className="flex h-12 items-center rounded-[14px] bg-orbit-panel p-1 text-orbit-ink shadow-[0_10px_24px_rgba(25,32,29,0.12)]">
              <button
                type="button"
                onClick={() => updateZoom(zoom - 0.2)}
                disabled={zoom <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Zoom out</span>
              </button>
              <button
                type="button"
                onClick={() => updateZoom(zoom + 0.2)}
                disabled={zoom >= 2.5}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Zoom in</span>
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="h-10 rounded-[10px] px-3 text-xs font-black"
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
            </div>

            <div className="flex h-12 items-center rounded-[14px] bg-orbit-panel p-1 text-orbit-ink shadow-[0_10px_24px_rgba(25,32,29,0.12)]">
              <button
                type="button"
                onClick={() => shiftImage("previous")}
                disabled={!hasMultipleImages}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] disabled:cursor-not-allowed disabled:opacity-35"
                title="Previous image"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Previous image</span>
              </button>
              <button
                type="button"
                onClick={() => shiftImage("next")}
                disabled={!hasMultipleImages}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] disabled:cursor-not-allowed disabled:opacity-35"
                title="Next image"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Next image</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="min-h-0 min-w-0 overflow-hidden bg-orbit-panel">
          {panel === "details" ? (
            <AccountFocusedDetailsPanel
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
              completeBooking={completeBooking}
              booked={booked}
            />
          ) : (
            <AccountFocusedChatPanel
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

function AccountFocusedDetailsPanel({
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
  proposeBooking,
  completeBooking,
  booked
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
  completeBooking: () => void;
  booked: boolean;
}) {
  const totalRental = quote.rentalFee.amount * selectedQuantity;
  const totalPlatform = quote.platformFee.amount * selectedQuantity;
  const totalDeposit = quote.deposit.amount * selectedQuantity;
  const totalDueNow = quote.totalDueNow.amount * selectedQuantity;

  return (
    <section className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-5">
      <div className="grid gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.04em]">
            <span className="orbit-tag rounded-full bg-orbit-soft px-[15px] py-[7px]">{listing.location.county}</span>
            <span className="orbit-tag rounded-full bg-orbit-soft px-[15px] py-[7px]">{listing.category}</span>
            <span className="kind-tag orbit-tag rounded-full px-[15px] py-[7px]" data-kind={listing.kind}>
              {listingKindLabel(listing.kind)}
            </span>
            <span className="orbit-tag rounded-full bg-orbit-soft px-[15px] py-[7px]">{mobilityLabel(listingMobility(listing))}</span>
            <span className="orbit-tag ml-auto inline-flex min-h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-orbit-soft px-[15px] py-[7px] text-orbit-ink">
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

        <AccountApproximateLocationPanel listing={listing} publicCoordinates={publicCoordinates} />

        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.06em] text-[#403301] dark:text-orbit-ink/65">Booking mode</p>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {listing.modeRules.map((rule) => (
              <button
                key={rule.mode}
                type="button"
                onClick={() => setSelectedMode(rule.mode)}
                disabled={booked}
                className={`min-h-16 rounded-[16px] px-4 py-3 text-sm font-black leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
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

        <AccountBookingQuantityControl
          quantityValue={bookingQuantity}
          setQuantityValue={setBookingQuantity}
          selectedQuantity={selectedQuantity}
          totalUnits={totalUnits}
          bookedUnits={bookedUnits}
          availableUnits={availableUnits}
          disabled={booked}
        />

        <AccountBillingPanel
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
            disabled={booked}
            className="orbit-cta-gold inline-flex min-h-16 items-center justify-center gap-2 rounded-full px-4 text-base font-black shadow-[0_14px_28px_rgba(239,191,4,0.2)] disabled:opacity-50"
          >
            <FileSignature className="h-5 w-5" aria-hidden="true" />
            Propose
          </button>
        </div>

        <button
          type="button"
          onClick={completeBooking}
          disabled={booked}
          className="orbit-cta-gold inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-4 text-sm font-black disabled:opacity-50"
        >
          <PackageCheck className="h-4 w-4" aria-hidden="true" />
          {booked ? (availableUnits <= 0 ? "Unavailable" : "Already active") : `Complete ${selectedQuantity} item(s)`}
        </button>
      </div>
    </section>
  );
}

function AccountApproximateLocationPanel({
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

function AccountBookingQuantityControl({
  quantityValue,
  setQuantityValue,
  selectedQuantity,
  totalUnits,
  bookedUnits,
  availableUnits,
  disabled
}: {
  quantityValue: string;
  setQuantityValue: (value: string) => void;
  selectedQuantity: number;
  totalUnits: number;
  bookedUnits: number;
  availableUnits: number;
  disabled: boolean;
}) {
  function updateQuantity(nextValue: number) {
    const maxQuantity = Math.max(1, availableUnits);
    setQuantityValue(String(Math.min(maxQuantity, Math.max(1, Math.floor(nextValue)))));
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.06em] text-[#403301] dark:text-orbit-ink/65">Booking quantity</p>
        <span className="text-sm font-black text-orbit-ink/75">Max {availableUnits}</span>
      </div>
      <div className="flex h-16 min-w-0 items-center rounded-[14px] bg-orbit-panel p-[4px] shadow-[inset_0_0_0_1px_rgb(128_106_0_/_0.12)]">
        <button
          type="button"
          onClick={() => updateQuantity(selectedQuantity - 1)}
          disabled={disabled || availableUnits <= 0 || selectedQuantity <= 1}
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
          disabled={disabled || availableUnits <= 0}
          type="text"
          inputMode="numeric"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-center text-2xl font-black text-orbit-ink outline-none focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => updateQuantity(selectedQuantity + 1)}
          disabled={disabled || availableUnits <= 0 || selectedQuantity >= availableUnits}
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

function AccountBillingPanel({
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

function AccountFocusedChatPanel({
  thread,
  draft,
  setDraft,
  sendMessage,
  backToDetails
}: {
  thread: ChatThread;
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
          className="rounded-full bg-orbit-clay px-4 py-2 text-xs font-black text-orbit-field transition-colors hover:opacity-90 dark:text-[#1a1a1a]"
        >
          Exit Chat
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
        <div className="flex items-center gap-2 rounded-full bg-orbit-field p-[3px] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.18)] focus-within:outline-none focus-within:ring-0">
          <label className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-orbit-panel text-orbit-ink" title="Add image">
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Add image</span>
            <input type="file" accept="image/*" multiple className="sr-only" />
          </label>
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
            className="orbit-cta-gold flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            title="Send message"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

function AccountSidePanel({
  email,
  threads,
  openThread
}: {
  email: string;
  threads: ChatThread[];
  openThread: (threadId: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className={`${panelClass} p-5`}>
        <ShieldCheck className="mb-4 h-7 w-7 text-orbit-green" aria-hidden="true" />
        <h2 className="text-lg font-black">Verified access</h2>
        <p className="mt-2 text-sm leading-6 text-orbit-ink/65">{email}</p>
      </div>

      <div className={`${panelClass} p-5`}>
        <WalletCards className="mb-4 h-7 w-7 text-orbit-sky" aria-hidden="true" />
        <h2 className="text-lg font-black">Payments</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <IconFact icon={<Banknote className="h-4 w-4" aria-hidden="true" />} label="M-Pesa/card" />
          <IconFact icon={<FileSignature className="h-4 w-4" aria-hidden="true" />} label="Ledger ready" />
        </div>
      </div>

      <div className={`${panelClass} p-5`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-orbit-green">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Conversations
            </div>
            <h2 className="mt-2 text-lg font-black">DM threads</h2>
          </div>
          <span className="rounded-full bg-orbit-soft px-3 py-2 text-xs font-black">
            {threads.length}
          </span>
        </div>

        <div className="grid gap-2">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => openThread(thread.id)}
              className="grid gap-2 rounded-[24px] bg-orbit-field p-4 text-left ring-1 ring-orbit-line transition hover:bg-orbit-soft/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{thread.participant}</p>
                  <p className="truncate text-xs font-semibold text-orbit-ink/60">{thread.listing}</p>
                </div>
                {thread.unread ? (
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#FF5F57] px-2 text-xs font-black text-white">
                    {thread.unread}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs font-bold text-orbit-green">{thread.status}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatingChatWindow({
  thread,
  draft,
  minimized,
  size,
  setDraft,
  sendMessage,
  setMinimized,
  setSize,
  onClose
}: {
  thread: ChatThread;
  draft: string;
  minimized: boolean;
  size: ChatWindowSize;
  setDraft: (value: string) => void;
  sendMessage: () => void;
  setMinimized: (minimized: boolean) => void;
  setSize: Dispatch<SetStateAction<ChatWindowSize>>;
  onClose: () => void;
}) {
  const [resizeState, setResizeState] = useState<ChatResizeState | null>(null);
  const visibleSize = minimized ? minimizedChatWindowSize : size;
  const chatWindowStyle = {
    "--chat-window-width": `${visibleSize.width}px`,
    height: visibleSize.height
  } as CSSProperties;

  useEffect(() => {
    if (!resizeState || minimized) {
      return;
    }

    const currentResize = resizeState;

    function handlePointerMove(event: PointerEvent) {
      const smallWindow = window.innerWidth < compactChatWindowBreakpoint;
      const maxWidth = Math.max(defaultChatWindowSize.width, window.innerWidth - 24);
      const maxHeight = Math.max(defaultChatWindowSize.height, window.innerHeight - (smallWindow ? 0 : 24));

      setSize({
        width: smallWindow
          ? currentResize.startWidth
          : Math.min(maxWidth, Math.max(defaultChatWindowSize.width, currentResize.startWidth + currentResize.startX - event.clientX)),
        height: Math.min(maxHeight, Math.max(defaultChatWindowSize.height, currentResize.startHeight + currentResize.startY - event.clientY))
      });
    }

    function handlePointerUp() {
      setResizeState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [minimized, resizeState, setSize]);

  return (
    <section
      className={`${panelClass} floating-chat-window fixed bottom-0 right-3 z-50 flex flex-col overflow-hidden rounded-b-none`}
      style={chatWindowStyle}
      aria-label={`Chat with ${thread.participant}`}
    >
      <div className="theme-body-border flex min-h-14 items-center justify-between gap-3 border-b border-white/70 bg-orbit-panel/95 px-4">
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={minimized}
            onPointerDown={(event) => {
              if (minimized) {
                return;
              }
              event.preventDefault();
              setResizeState({
                startX: event.clientX,
                startY: event.clientY,
                startWidth: size.width,
                startHeight: size.height
              });
            }}
            className="flex h-6 w-6 cursor-nwse-resize items-center justify-center rounded-full bg-orbit-soft text-orbit-ink disabled:cursor-default disabled:opacity-45"
            title="Resize chat"
          >
            <Grip className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Resize chat</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-3.5 w-3.5 rounded-full bg-[#FF5F57]"
            title="Close chat"
          >
            <span className="sr-only">Close chat</span>
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="h-3.5 w-3.5 rounded-full bg-[#FFBD2E]"
            title="Minimize chat"
          >
            <span className="sr-only">Minimize chat</span>
          </button>
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="h-3.5 w-3.5 rounded-full bg-[#28C840]"
            title="Maximize chat"
          >
            <span className="sr-only">Maximize chat</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="min-w-0 flex-1 text-left"
          title={minimized ? "Open chat" : undefined}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{thread.participant}</p>
            <p className="truncate text-xs font-semibold text-orbit-ink/60">{thread.listing}</p>
          </div>
        </button>
      </div>

      {!minimized ? (
        <>
          <div className="chat-thread-body flex-1 overflow-auto bg-[#ffffff] p-4">
            <div className="grid gap-3">
              {thread.messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[82%] rounded-[24px] px-4 py-3 text-sm font-semibold leading-6 ${
                    message.author === "me"
                      ? "ml-auto bg-[#07777a] text-white"
                    : message.author === "system"
                      ? "mr-auto bg-[#2a2836] text-white"
                      : "mr-auto bg-[#2a2836] text-white"
                  }`}
                >
                  <p>{message.text}</p>
                  <p className="mt-1 text-[10px] font-black uppercase text-white/60">
                    {message.time}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="theme-body-border border-t border-white/70 bg-orbit-panel p-4">
            <div className="flex items-center gap-2 rounded-full bg-orbit-field p-[3px] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.18)] focus-within:outline-none focus-within:ring-0">
              <label className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-orbit-panel text-orbit-ink" title="Add image">
                <Plus className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Add image</span>
                <input type="file" accept="image/*" multiple className="sr-only" />
              </label>
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
                className="orbit-cta-gold flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                title="Send message"
              >
                <Send className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function IconFact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-[18px] border border-orbit-line bg-orbit-field px-3 py-2 text-xs font-bold">
      <span className="text-orbit-green">{icon}</span>
      <span className="truncate">{label}</span>
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
