"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthModal, type AccountMode } from "@/components/AuthModal";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { accountSessionUpdatedEvent, clearAccountSession, readAccountSession } from "@/lib/accountSession";
import { cn, ui } from "@/lib/ui";

type SiteHeaderActive = "home" | "rent" | "account";

type SiteHeaderProps = {
  active?: SiteHeaderActive;
  sessionEmail?: string | null;
  onSignOut?: () => void;
};

function navLinkClass(active: boolean) {
  return active
    ? "border-b-2 border-orbit-green pb-1 text-sm font-black text-orbit-green"
    : "text-sm font-bold text-orbit-ink/62 transition-colors hover:text-orbit-green";
}

export function SiteHeader({ active = "home", sessionEmail, onSignOut }: SiteHeaderProps) {
  const router = useRouter();
  const [detectedSessionEmail, setDetectedSessionEmail] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AccountMode>("signin");
  const [authSuccessDestination, setAuthSuccessDestination] = useState<"account" | "stay">(
    active === "home" ? "account" : "stay"
  );
  const controlled = sessionEmail !== undefined;
  const currentSessionEmail = controlled ? sessionEmail : detectedSessionEmail;
  const isSignedIn = Boolean(currentSessionEmail);

  useEffect(() => {
    if (controlled) {
      return;
    }

    function refreshSession() {
      setDetectedSessionEmail(readAccountSession());
    }

    refreshSession();
    window.addEventListener("storage", refreshSession);
    window.addEventListener(accountSessionUpdatedEvent, refreshSession);

    return () => {
      window.removeEventListener("storage", refreshSession);
      window.removeEventListener(accountSessionUpdatedEvent, refreshSession);
    };
  }, [controlled]);

  function handleSignOut() {
    if (onSignOut) {
      onSignOut();
    } else {
      clearAccountSession();
    }

    setDetectedSessionEmail(null);
  }

  function openAuthModal(nextMode: AccountMode, destination: "account" | "stay" = active === "home" ? "account" : "stay") {
    setAuthModalMode(nextMode);
    setAuthSuccessDestination(destination);
    setAuthModalOpen(true);
  }

  function handleAuthenticated(email: string) {
    setDetectedSessionEmail(email);

    if (authSuccessDestination === "account") {
      router.push("/account");
    }
  }

  return (
    <>
      <header className="theme-body-border sticky top-0 z-50 border-b border-white/70 bg-orbit-panel/82 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-4 sm:gap-4 sm:px-8 lg:px-16">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" className="shrink-0 text-xl font-black leading-none text-orbit-green sm:text-2xl" aria-label="RentOrbit home">
              RentOrbit
            </Link>

            <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
              <Link href="/marketplace" className={navLinkClass(active === "rent")}>
                Rent
              </Link>
              {isSignedIn ? (
                <Link href="/account" className={navLinkClass(active === "account")}>
                  List Your Item
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("signup", "account")}
                  className={`${navLinkClass(active === "account")} focus-visible:outline-none`}
                >
                  List Your Item
                </button>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
            <ThemeSwitcher compact />
            {isSignedIn ? (
              <Link
                href="/account"
                className={cn(ui.panelPill, "min-h-11 w-[74px] px-2 text-[11px] sm:w-[92px] sm:text-sm")}
              >
                Account
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("signin")}
                className={cn(ui.panelPill, "min-h-11 w-[74px] px-2 text-[11px] sm:w-[92px] sm:text-sm")}
              >
                Sign In
              </button>
            )}
            {isSignedIn ? (
              <button
                type="button"
                onClick={handleSignOut}
                className={cn(ui.goldPill, "min-h-11 w-[78px] px-2 text-[11px] sm:w-[92px] sm:text-sm")}
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                className={cn(ui.goldPill, "min-h-11 w-[74px] px-2 text-[11px] sm:w-[92px] sm:text-sm")}
              >
                Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </>
  );
}
