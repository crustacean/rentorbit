export const accountSessionKey = "rentorbit:account-session";
export const accountSessionUpdatedEvent = "rentorbit:account-session-updated";

export function readAccountSession() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(accountSessionKey);
}

export function writeAccountSession(email: string) {
  window.localStorage.setItem(accountSessionKey, email);
  window.dispatchEvent(new Event(accountSessionUpdatedEvent));
}

export function clearAccountSession() {
  window.localStorage.removeItem(accountSessionKey);
  window.dispatchEvent(new Event(accountSessionUpdatedEvent));
}
