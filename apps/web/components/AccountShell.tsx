"use client";

import type { AccountDashboardProps } from "@/components/AccountDashboard";
import { AuthModal, type AccountMode as AuthModalMode } from "@/components/AuthModal";
import { SiteHeader } from "@/components/SiteHeader";
import { accountSessionUpdatedEvent, clearAccountSession, readAccountSession } from "@/lib/accountSession";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";

export type AccountMode = AuthModalMode;

type DashboardComponent = ComponentType<AccountDashboardProps>;

let dashboardImport: Promise<{ AccountDashboard: DashboardComponent }> | null = null;

function preloadDashboard() {
  dashboardImport ??= import("@/components/AccountDashboard");
  return dashboardImport;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function AccountLoading({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  useEffect(() => {
    console.info("[RentOrbit] Account workspace loading in background.");
  }, []);

  return (
    <main className="min-h-screen bg-orbit-field text-orbit-ink">
      <SiteHeader active="account" sessionEmail={email} onSignOut={onSignOut} />
      <section className="min-h-[calc(100svh-77px)]" aria-hidden="true" />
    </main>
  );
}

export function AccountShell({ initialMode, returnTo }: { initialMode: AccountMode; returnTo?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [Dashboard, setDashboard] = useState<DashboardComponent | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(true);
  const authenticatedFromModalRef = useRef(false);

  useEffect(() => {
    setMode(initialMode);
    setAuthModalOpen(true);
    authenticatedFromModalRef.current = false;
  }, [initialMode]);

  useEffect(() => {
    function refreshSession() {
      const saved = readAccountSession();
      setSessionEmail(saved && isValidEmail(saved) ? saved : null);
    }

    refreshSession();
    window.addEventListener("storage", refreshSession);
    window.addEventListener(accountSessionUpdatedEvent, refreshSession);

    return () => {
      window.removeEventListener("storage", refreshSession);
      window.removeEventListener(accountSessionUpdatedEvent, refreshSession);
    };
  }, []);

  useEffect(() => {
    if (!sessionEmail) {
      setDashboard(null);
      return;
    }

    void preloadDashboard().then((module) => {
      setDashboard(() => module.AccountDashboard);
    });
  }, [sessionEmail]);

  function signOut() {
    clearAccountSession();
    setSessionEmail(null);
    setDashboard(null);
    router.push("/");
  }

  if (sessionEmail && Dashboard) {
    return <Dashboard email={sessionEmail} onSignOut={signOut} />;
  }

  if (sessionEmail && !Dashboard) {
    return <AccountLoading email={sessionEmail} onSignOut={signOut} />;
  }

  return (
    <main className="min-h-screen bg-orbit-field text-orbit-ink">
      <SiteHeader active="account" sessionEmail={null} />
      <section className="min-h-[calc(100svh-77px)]" aria-hidden="true" />
      <AuthModal
        open={authModalOpen}
        initialMode={mode}
        onClose={() => {
          setAuthModalOpen(false);
          if (authenticatedFromModalRef.current) {
            authenticatedFromModalRef.current = false;
            return;
          }

          if (returnTo) {
            router.push(returnTo);
          }
        }}
        onAuthenticated={(email) => {
          authenticatedFromModalRef.current = true;
          setSessionEmail(email);
          setAuthModalOpen(false);
        }}
      />
    </main>
  );
}
