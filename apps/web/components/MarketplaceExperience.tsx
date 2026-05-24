"use client";

import {
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileSignature,
  Filter,
  Handshake,
  MapPin,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  UserRoundCheck,
  WalletCards,
  XCircle
} from "lucide-react";
import {
  calculateBookingQuote,
  createContractSummary,
  filterListings,
  kenyaCounties,
  marketplaceCategories,
  seededListings,
  type ContractSignature,
  type ContractSummary,
  type Coordinates,
  type OperationMode,
  type ResourceListing
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
  const [paymentCaptured, setPaymentCaptured] = useState(false);
  const [depositReleased, setDepositReleased] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  useEffect(registerServiceWorker, []);

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
  const selectedRule = selectedListing.modeRules.find((rule) => rule.mode === selectedMode) ?? selectedListing.modeRules[0];
  const activeMode = selectedRule?.mode ?? selectedListing.modeRules[0]?.mode ?? "self_operated";
  const quote = calculateBookingQuote({
    listing: selectedListing,
    mode: activeMode,
    start: filters.start,
    end: filters.end
  });

  const signatures = contract?.signatures ?? [];
  const renterSigned = signatures.some((signature) => signature.userId === "usr_renter_brian");
  const ownerSigned = signatures.some((signature) => signature.userId === selectedListing.ownerId);
  const fullySigned = contract?.status === "fully_executed";

  function patchFilters(next: Partial<FilterState>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function selectListing(listing: ResourceListing) {
    setSelectedId(listing.id);
    setSelectedMode(listing.modeRules[0]?.mode ?? "self_operated");
    setContract(null);
    setPaymentCaptured(false);
    setDepositReleased(false);
    setDisputeOpen(false);
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
    setPaymentCaptured(false);
    setDepositReleased(false);
    setDisputeOpen(false);
    setChatLines((current) => [
      ...current,
      {
        id: `msg_${Date.now()}`,
        from: "system",
        text: `Proposal created for ${readableMode(activeMode)}: ${kes(nextContract.quote.totalDueNow.amount)} due now.`
      }
    ]);
  }

  function sign(role: "owner" | "renter") {
    if (!contract || contract.status === "fully_executed" || contract.status === "voided") return;
    const nextSignature: ContractSignature = {
      userId: role === "owner" ? selectedListing.ownerId : "usr_renter_brian",
      printedName: role === "owner" ? ownerSignatureName : signatureName,
      ipAddress: "127.0.0.1",
      userAgent: "RentOrbit PWA preview",
      signedAt: new Date().toISOString()
    };
    if (contract.signatures.some((signature) => signature.userId === nextSignature.userId)) return;

    const nextSignatures = [...contract.signatures, nextSignature];
    const nextContract: ContractSummary = {
      ...contract,
      signatures: nextSignatures,
      status: nextSignatures.length === 2 ? "fully_executed" : "partially_signed"
    };
    setContract(nextContract);
    setChatLines((current) => [
      ...current,
      {
        id: `msg_${Date.now()}`,
        from: "system",
        text:
          nextContract.status === "fully_executed"
            ? "Contract fully executed. Payment collection is now enabled."
            : `${role === "owner" ? "Owner" : "Renter"} signature captured.`
      }
    ]);
  }

  function voidAndAmend() {
    if (!contract) return;
    const amendedStart = new Date(filters.start);
    amendedStart.setHours(amendedStart.getHours() + 3);
    const amendedEnd = new Date(filters.end);
    amendedEnd.setHours(amendedEnd.getHours() + 3);
    const nextStart = amendedStart.toISOString().slice(0, 16);
    const nextEnd = amendedEnd.toISOString().slice(0, 16);

    patchFilters({ start: nextStart, end: nextEnd });
    const amendedContract = createContractSummary({
      id: `ctr_amend_${Date.now()}`,
      threadId: contract.threadId,
      listing: selectedListing,
      owner: contract.owner,
      renter: contract.renter,
      mode: activeMode,
      bookingWindow: { start: nextStart, end: nextEnd },
      createdAt: new Date().toISOString()
    });
    amendedContract.voidedByContractId = contract.id;
    setContract(amendedContract);
    setPaymentCaptured(false);
    setDepositReleased(false);
    setChatLines((current) => [
      ...current,
      {
        id: `msg_${Date.now()}`,
        from: "system",
        text: `Previous contract voided. Amendment proposed for ${nextStart.replace("T", " ")}.`
      }
    ]);
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-orbit-line bg-white/90">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-orbit-green text-white">
              <span className="text-lg font-black">RO</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-orbit-ink sm:text-2xl">RentOrbit</h1>
              <p className="truncate text-sm text-neutral-600">Kenya rentals, services, personnel</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs sm:flex sm:flex-wrap sm:justify-end">
            <StatusPill icon={<ShieldCheck className="h-4 w-4" />} label="KYC required" tone="green" />
            <StatusPill icon={<MessageCircle className="h-4 w-4" />} label="Listing DMs" tone="sky" />
            <StatusPill icon={<WalletCards className="h-4 w-4" />} label="M-Pesa ledger" tone="amber" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 xl:grid-cols-[300px_minmax(0,1fr)_430px]">
        <aside className="h-fit border border-orbit-line bg-white p-4 shadow-panel">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Discovery</h2>
            <button className="rounded-md border border-orbit-line p-2 text-orbit-green" title="Filter listings">
              <Filter className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold uppercase text-neutral-500">Search</span>
            <div className="flex items-center gap-2 border border-orbit-line bg-orbit-field px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
              <input
                value={filters.query}
                onChange={(event) => patchFilters({ query: event.target.value })}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
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

            <FilterSelect
              label="Mode"
              value={filters.operationMode}
              onChange={(value) => patchFilters({ operationMode: value })}
            >
              <option value="all">Any mode</option>
              <option value="self_operated">Self-operated</option>
              <option value="owner_operated">Owner-operated</option>
              <option value="operator_only">Operator-only</option>
            </FilterSelect>

            <label className="block">
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

            <label className="flex items-center gap-3 border border-orbit-line bg-orbit-field px-3 py-2 text-sm">
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
        </aside>

        <section className="grid gap-4">
          <div className="grid gap-3 border border-orbit-line bg-white p-4 shadow-panel lg:grid-cols-[1fr_280px]">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-orbit-green">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {filters.county === "all" ? "Countrywide marketplace" : `${filters.county} marketplace`}
              </div>
              <h2 className="mt-2 text-2xl font-black text-orbit-ink">All-category availability board</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600">
                {results.length} matching resources across goods, services, and personnel.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <Metric label="Searches" value="1.8k" tone="sky" />
              <Metric label="Signed" value="64%" tone="green" />
              <Metric label="Disputes" value="2.1%" tone="clay" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {results.map((result) => (
                <button
                  key={result.listing.id}
                  onClick={() => selectListing(result.listing)}
                  className={`overflow-hidden border bg-white text-left shadow-panel transition hover:-translate-y-0.5 hover:border-orbit-green ${
                    selectedListing.id === result.listing.id ? "border-orbit-green" : "border-orbit-line"
                  }`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-neutral-200">
                    <img
                      src={result.listing.media[0]?.url}
                      alt={result.listing.media[0]?.alt ?? result.listing.title}
                      className={`h-full w-full object-cover ${result.availabilityState === "unavailable_for_window" ? "grayscale" : ""}`}
                    />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-bold">
                      {listingIcon(result.listing.kind)}
                      {result.listing.kind}
                    </span>
                    {result.availabilityState === "unavailable_for_window" ? (
                      <span className="absolute right-2 top-2 rounded-md bg-orbit-clay px-2 py-1 text-xs font-bold text-white">
                        Booked
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-3 p-3">
                    <div>
                      <h3 className="line-clamp-2 text-base font-black text-orbit-ink">{result.listing.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{result.listing.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-orbit-field px-2 py-1 font-bold">{result.listing.location.county}</span>
                      <span className="rounded-md bg-orbit-field px-2 py-1 font-bold">
                        {result.distanceKm === undefined ? "National" : `${result.distanceKm} km`}
                      </span>
                      {result.listing.location.countrywideAvailable ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-orbit-green">Ships Kenya</span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between border-t border-orbit-line pt-3">
                      <span className="text-sm font-black">{kes(result.listing.modeRules[0]?.pricing.rate.amount ?? 0)}</span>
                      <span className="text-xs font-semibold text-neutral-500">
                        {result.listing.rating.toFixed(1)} ({result.listing.reviewCount})
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="h-fit border border-orbit-line bg-white p-4 shadow-panel">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Approximate Map</h2>
                <button className="rounded-md border border-orbit-line p-2 text-orbit-green" title="Saved search alert">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {results.slice(0, 5).map((result) => (
                  <div key={result.listing.id} className="flex items-start gap-3 border-b border-orbit-line pb-3 last:border-0">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-orbit-green" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{result.listing.title}</p>
                      <p className="text-xs text-neutral-600">
                        {result.listing.location.generalArea} · {result.publicCoordinates.latitude},{" "}
                        {result.publicCoordinates.longitude}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 border border-dashed border-orbit-line bg-orbit-field p-3 text-sm">
                <p className="font-bold">Seeded counties</p>
                <p className="mt-1 text-neutral-600">Nairobi, Mombasa, Kisumu, Nakuru, Kiambu, Uasin Gishu</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="grid h-fit gap-4">
          <section className="border border-orbit-line bg-white shadow-panel">
            <img
              src={selectedListing.media[0]?.url}
              alt={selectedListing.media[0]?.alt ?? selectedListing.title}
              className="aspect-[16/8] w-full object-cover"
            />
            <div className="grid gap-4 p-4">
              <div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-md bg-orbit-field px-2 py-1">{selectedListing.location.county}</span>
                  <span className="rounded-md bg-orbit-field px-2 py-1">{selectedListing.category}</span>
                  <span className="rounded-md bg-orbit-field px-2 py-1">{selectedListing.kind}</span>
                </div>
                <h2 className="mt-3 text-xl font-black">{selectedListing.title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{selectedListing.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {selectedListing.modeRules.map((rule) => (
                  <button
                    key={rule.mode}
                    onClick={() => setSelectedMode(rule.mode)}
                    className={`min-h-14 rounded-md border px-2 py-2 text-xs font-bold ${
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
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-orbit-line px-3 py-3 text-sm font-bold"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  DM
                </button>
                <button
                  onClick={proposeBooking}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-orbit-green px-3 py-3 text-sm font-bold text-white"
                >
                  <FileSignature className="h-4 w-4" aria-hidden="true" />
                  Propose
                </button>
              </div>
            </div>
          </section>

          <section className="border border-orbit-line bg-white p-4 shadow-panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Thread</h2>
              <span className="rounded-md bg-orbit-field px-2 py-1 text-xs font-bold">Listing locked</span>
            </div>
            <div className="scrollbar-thin grid max-h-56 gap-2 overflow-auto pr-1">
              {chatLines.map((line) => (
                <div
                  key={line.id}
                  className={`rounded-md px-3 py-2 text-sm ${
                    line.from === "system"
                      ? "bg-amber-50 text-orbit-amber"
                      : line.from === "owner"
                        ? "bg-orbit-field text-orbit-ink"
                        : "bg-emerald-50 text-orbit-green"
                  }`}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </section>

          <section className="border border-orbit-line bg-white p-4 shadow-panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Contract</h2>
              {contract ? <StatusBadge status={contract.status} /> : <StatusBadge status="draft" />}
            </div>

            {contract ? (
              <div className="grid gap-3">
                <div className="rounded-md bg-orbit-field p-3 text-sm">
                  <p className="font-black">{selectedListing.title}</p>
                  <p className="mt-1 text-neutral-600">
                    {filters.start.replace("T", " ")} to {filters.end.replace("T", " ")}
                  </p>
                  <p className="mt-1 font-bold">{contract.payloadFingerprint}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-neutral-500">Renter</span>
                    <input
                      value={signatureName}
                      onChange={(event) => setSignatureName(event.target.value)}
                      className="w-full border border-orbit-line bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-neutral-500">Owner</span>
                    <input
                      value={ownerSignatureName}
                      onChange={(event) => setOwnerSignatureName(event.target.value)}
                      className="w-full border border-orbit-line bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <SignatureButton signed={renterSigned} label="Renter" onClick={() => sign("renter")} />
                  <SignatureButton signed={ownerSigned} label="Owner" onClick={() => sign("owner")} />
                </div>

                <button
                  disabled={!fullySigned}
                  onClick={() => setPaymentCaptured(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-orbit-sky px-3 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
                  Capture Payment
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <ActionButton
                    icon={<RotateCcw className="h-4 w-4" />}
                    label="Amend"
                    disabled={!contract}
                    onClick={voidAndAmend}
                  />
                  <ActionButton
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Return"
                    disabled={!paymentCaptured}
                    onClick={() => setDepositReleased(true)}
                  />
                  <ActionButton
                    icon={<XCircle className="h-4 w-4" />}
                    label="Dispute"
                    disabled={!paymentCaptured}
                    onClick={() => setDisputeOpen(true)}
                  />
                </div>

                <div className="grid gap-2 border-t border-orbit-line pt-3 text-sm">
                  <LedgerLine label="Payment" active={paymentCaptured} value={kes(quote.rentalFee.amount + quote.platformFee.amount)} />
                  <LedgerLine label="Deposit hold" active={paymentCaptured && quote.deposit.amount > 0} value={kes(quote.deposit.amount)} />
                  <LedgerLine label="Deposit refund" active={depositReleased} value={kes(quote.deposit.amount)} />
                  <LedgerLine label="Dispute hold" active={disputeOpen} value={quote.deposit.amount > 0 ? kes(quote.deposit.amount) : "N/A"} />
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-orbit-field p-4 text-sm text-neutral-600">
                <FileSignature className="mb-2 h-5 w-5 text-orbit-green" aria-hidden="true" />
                No active proposal in this listing thread.
              </div>
            )}
          </section>

          <section className="border border-orbit-line bg-white p-4 shadow-panel">
            <h2 className="mb-3 text-base font-bold">Operations</h2>
            <div className="grid gap-2 text-sm">
              <OpsLine icon={<ShieldCheck className="h-4 w-4" />} label="KYC/IPRS" value="Verified users only" />
              <OpsLine icon={<Filter className="h-4 w-4" />} label="Moderation" value="Admin-approved custom categories" />
              <OpsLine icon={<WalletCards className="h-4 w-4" />} label="Paystack" value="M-Pesa/card ledger" />
              <OpsLine icon={<Bell className="h-4 w-4" />} label="Alerts" value="Push, SMS, email fallbacks" />
            </div>
          </section>
        </aside>
      </div>
    </main>
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
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-orbit-line bg-white px-3 py-2 text-sm"
      >
        {children}
      </select>
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
        className="w-full border border-orbit-line bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}

function StatusPill({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: "green" | "sky" | "amber" }) {
  const tones = {
    green: "bg-emerald-50 text-orbit-green",
    sky: "bg-blue-50 text-orbit-sky",
    amber: "bg-amber-50 text-orbit-amber"
  };
  return (
    <span className={`inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 font-bold ${tones[tone]}`}>
      {icon}
      {label}
    </span>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "sky" | "clay" }) {
  const tones = {
    green: "text-orbit-green",
    sky: "text-orbit-sky",
    clay: "text-orbit-clay"
  };
  return (
    <div className="border border-orbit-line bg-orbit-field p-2">
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
    <div className="flex min-h-12 items-center gap-2 border border-orbit-line bg-orbit-field px-3 py-2 text-xs font-bold">
      <span className="shrink-0 text-orbit-green">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ContractSummary["status"] }) {
  const tone =
    status === "fully_executed"
      ? "bg-emerald-50 text-orbit-green"
      : status === "voided"
        ? "bg-red-50 text-orbit-clay"
        : "bg-amber-50 text-orbit-amber";
  return <span className={`rounded-md px-2 py-1 text-xs font-black ${tone}`}>{status.replace("_", " ")}</span>;
}

function SignatureButton({ signed, label, onClick }: { signed: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={signed}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-3 text-sm font-bold ${
        signed
          ? "border-emerald-100 bg-emerald-50 text-orbit-green"
          : "border-orbit-line bg-white text-orbit-ink hover:border-orbit-green"
      }`}
    >
      <FileSignature className="h-4 w-4" aria-hidden="true" />
      {signed ? `${label} signed` : `${label} sign`}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  disabled,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-orbit-line px-2 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
      title={label}
    >
      {icon}
      {label}
    </button>
  );
}

function LedgerLine({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-semibold text-neutral-600">{label}</span>
      <span className={`font-black ${active ? "text-orbit-green" : "text-neutral-400"}`}>{active ? value : "Pending"}</span>
    </div>
  );
}

function OpsLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-orbit-line py-2 last:border-0">
      <span className="inline-flex min-w-0 items-center gap-2 font-bold">
        <span className="shrink-0 text-orbit-green">{icon}</span>
        {label}
      </span>
      <span className="text-right text-xs font-semibold text-neutral-500">{value}</span>
    </div>
  );
}
