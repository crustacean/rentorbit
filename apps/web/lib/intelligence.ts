import type { ListingLifecycleSignalType, SearchFilters, SearchIntelligenceSession } from "@rentorbit/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const sessionStorageKey = "rentorbit:intelligence-search-session";

type StartSearchIntelligenceInput = {
  query: string;
  filters?: SearchFilters;
  source: "home" | "marketplace";
};

type ListingSignalInput = {
  type: ListingLifecycleSignalType;
  value?: string | number | boolean;
  note?: string;
};

export async function startSearchIntelligenceSession(input: StartSearchIntelligenceInput): Promise<SearchIntelligenceSession | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const activeSession = readSearchIntelligenceSession();

  if (activeSession && isActiveSearchSession(activeSession)) {
    const continuedSession = await continueSearchIntelligenceSession(activeSession.id, input);

    if (continuedSession) {
      return continuedSession;
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 900);

  try {
    const response = await fetch(`${apiBaseUrl}/intelligence/search/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rentorbit-search-source": input.source
      },
      body: JSON.stringify({
        query: input.query,
        filters: input.filters ?? {}
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const session = (await response.json()) as SearchIntelligenceSession;
    window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
    return session;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function readSearchIntelligenceSession(): SearchIntelligenceSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSession = window.sessionStorage.getItem(sessionStorageKey);
    return rawSession ? (JSON.parse(rawSession) as SearchIntelligenceSession) : null;
  } catch {
    return null;
  }
}

export async function recordListingIntelligenceSignal(
  listingId: string,
  input: ListingSignalInput
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 800);

  try {
    await fetch(`${apiBaseUrl}/intelligence/listings/${encodeURIComponent(listingId)}/signals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...input,
        occurredAt: new Date().toISOString()
      }),
      signal: controller.signal
    });
  } catch {
    // Intelligence should never block the rental flow.
  } finally {
    window.clearTimeout(timeout);
  }
}

async function continueSearchIntelligenceSession(
  sessionId: string,
  input: StartSearchIntelligenceInput
): Promise<SearchIntelligenceSession | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 900);

  try {
    const response = await fetch(`${apiBaseUrl}/intelligence/search/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rentorbit-search-source": input.source
      },
      body: JSON.stringify({
        message: `Search updated from ${input.source}: ${input.query || "marketplace filters changed"}`,
        query: input.query,
        filters: input.filters ?? {}
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      window.sessionStorage.removeItem(sessionStorageKey);
      return null;
    }

    const session = (await response.json()) as SearchIntelligenceSession;
    window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
    return session;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function isActiveSearchSession(session: SearchIntelligenceSession): boolean {
  const expiresAt = new Date(session.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
