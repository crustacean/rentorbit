"use client";

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  MapPin,
  MessageCircle,
  Send,
  Star,
  Truck,
  ZoomIn,
  ZoomOut,
  X
} from "lucide-react";
import { ResilientFocusedImage } from "@/components/ResilientFocusedImage";
import type { Dispatch, SetStateAction } from "react";
import type { calculateBookingQuote, Coordinates, OperationMode, ResourceListing } from "@rentorbit/shared";

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

export type FocusedListingOverlayProps = {
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
  panel: FocusedPanel;
  setPanel: (panel: FocusedPanel) => void;
  thread: AccountChatThread;
  draft: string;
  setDraft: (value: string) => void;
  sendMessage: () => void;
  onDm: () => void;
  proposeBooking: () => void;
  onClose: () => void;
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

export function FocusedListingOverlay({
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
}: FocusedListingOverlayProps) {
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
  return (
    <section className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-5">
      <BookingDetailsContent
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
          <span className="kind-tag orbit-tag rounded-full px-[15px] py-[7px]" data-kind={listing.kind}>
            {listingKindLabel(listing.kind)}
          </span>
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
        {availableUnits} available - {bookedUnitsLabel(bookedUnits, totalUnits)}
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
