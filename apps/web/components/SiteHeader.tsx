"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AccountMode } from "@/components/AuthModal";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { accountSessionUpdatedEvent, clearAccountSession, readAccountSession } from "@/lib/accountSession";
import { cn, ui } from "@/lib/ui";

const AuthModal = dynamic(() => import("@/components/AuthModal").then((module) => module.AuthModal), {
  ssr: false
});

type SiteHeaderActive = "home" | "rent" | "account";

type SiteHeaderProps = {
  active?: SiteHeaderActive;
  sessionEmail?: string | null;
  onSignOut?: () => void;
};

function navLinkClass(active: boolean) {
  return active
    ? "site-header-nav-link border-b-2 border-orbit-green pb-1 font-black text-orbit-green"
    : "site-header-nav-link font-bold text-orbit-ink/62 transition-colors hover:text-orbit-green";
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
      <header className="theme-body-border sticky top-0 z-50 border-b border-orbit-line/35 bg-orbit-field/78 backdrop-blur-xl">
        <div className="site-header-inner mx-auto grid w-full max-w-7xl items-center">
          <Link href="/" className="site-header-logo min-w-0 shrink font-black leading-none text-orbit-green" aria-label="RentOrbit home">
            RentOrbit
          </Link>

          <nav className="site-header-nav items-center justify-center" aria-label="Primary">
            <Link href="/marketplace" prefetch={false} className={navLinkClass(active === "rent")}>
              Rent
            </Link>
            {isSignedIn ? (
              <Link href="/account" prefetch={false} className={navLinkClass(active === "account")}>
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

          <div className="site-header-actions flex min-w-0 shrink-0 items-center">
            <ThemeSwitcher compact />
            {isSignedIn ? (
              <Link
                href="/account"
                prefetch={false}
                className={cn(ui.panelPill, "site-header-auth-pill")}
              >
                Account
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("signin")}
                className={cn(ui.panelPill, "site-header-auth-pill")}
              >
                Sign In
              </button>
            )}
            {isSignedIn ? (
              <button
                type="button"
                onClick={handleSignOut}
                className={cn(ui.goldPill, "site-header-auth-pill")}
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                className={cn(ui.goldPill, "site-header-auth-pill")}
              >
                Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {authModalOpen ? (
        <AuthModal
          open={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onAuthenticated={handleAuthenticated}
        />
      ) : null}
    </>
  );
}
