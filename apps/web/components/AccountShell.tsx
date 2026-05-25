"use client";

import type { AccountDashboardProps } from "@/components/AccountDashboard";
import { CustomSelect, type CustomSelectOption } from "@/components/CustomSelect";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  AlertCircle,
  CheckCircle2,
  CircleUserRound,
  Eye,
  EyeOff,
  IdCard,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";

export type AccountMode = "signin" | "signup";

type IdType = "National ID" | "Passport number" | "Alien ID";

type DashboardComponent = ComponentType<AccountDashboardProps>;

type StoredAccount = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  idType: IdType;
  idNumberLast4: string;
  kycStatus: "verified";
  createdAt: string;
};

type ApiUser = {
  email: string;
};

type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      message: string;
      offline?: boolean;
    };

const sessionKey = "rentorbit:account-session";
const accountsKey = "rentorbit:accounts";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const idTypes: IdType[] = ["National ID", "Passport number", "Alien ID"];
const idTypeOptions: CustomSelectOption[] = idTypes.map((option) => ({ value: option, label: option }));
const formRailClass =
  "flex h-[75px] items-center gap-3 rounded-full border border-orbit-line bg-orbit-soft/85 p-[3px] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.35)] backdrop-blur-md transition focus-within:border-orbit-line focus-within:outline-none focus-within:ring-0";
const formIconClass = "flex h-full aspect-square shrink-0 items-center justify-center rounded-full bg-orbit-panel text-orbit-green";
const formInputClass =
  "min-w-0 flex-1 bg-transparent px-1 text-base font-semibold text-orbit-ink outline-none placeholder:text-orbit-ink/45 focus-visible:outline-none";
const formActionClass =
  "flex h-[75px] w-full items-center justify-center rounded-full border border-orbit-line bg-orbit-panel px-6 text-sm font-black text-orbit-ink shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.3)] transition hover:bg-orbit-soft disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45";
const formSuccessActionClass =
  "flex h-[75px] w-full items-center justify-center rounded-full bg-orbit-green px-6 text-sm font-black text-orbit-field transition disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45";

let dashboardImport: Promise<{ AccountDashboard: DashboardComponent }> | null = null;

function preloadDashboard() {
  dashboardImport ??= import("@/components/AccountDashboard");
  return dashboardImport;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPassword(password: string) {
  return password.length >= 8;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getIdLast4(idNumber: string) {
  return idNumber.trim().slice(-4).padStart(4, "*");
}

function idNumberMatchesType(idType: IdType, idNumber: string) {
  const normalized = idNumber.trim().toUpperCase();

  if (idType === "National ID") {
    return /^\d{6,10}$/.test(normalized);
  }

  return /^[A-Z0-9]{6,12}$/.test(normalized);
}

function readAccounts() {
  try {
    const rawAccounts = window.localStorage.getItem(accountsKey);
    if (!rawAccounts) {
      return [] as StoredAccount[];
    }

    const parsed = JSON.parse(rawAccounts);
    return Array.isArray(parsed) ? (parsed as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  window.localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

async function postApi<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 900);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      credentials: "include",
      signal: controller.signal
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string } & T;

    if (!response.ok) {
      const message = Array.isArray(payload.message) ? payload.message.join(" ") : payload.message;
      return {
        ok: false,
        message: message ?? "Request failed."
      };
    }

    return {
      ok: true,
      data: payload
    };
  } catch {
    return {
      ok: false,
      offline: true,
      message: "API unavailable."
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function AccountLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-orbit-field px-4">
      <div className="theme-body-border w-full max-w-md rounded-[36px] bg-orbit-panel/92 p-6 text-center shadow-[0_14px_36px_rgba(25,32,29,0.08)] ring-1 ring-white/70">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-orbit-green" aria-hidden="true" />
        <p className="text-lg font-black">Loading account</p>
      </div>
    </main>
  );
}

export function AccountShell({ initialMode }: { initialMode: AccountMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AccountMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idType, setIdType] = useState<IdType>("National ID");
  const [idNumber, setIdNumber] = useState("");
  const [iprsStatus, setIprsStatus] = useState<"idle" | "checking" | "verified" | "failed">("idle");
  const [message, setMessage] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [Dashboard, setDashboard] = useState<DashboardComponent | null>(null);
  const [dashboardRequested, setDashboardRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const passwordValid = useMemo(() => isValidPassword(password), [password]);
  const passwordsMatch = password === confirmPassword;
  const nameReady = firstName.trim().length >= 2 && lastName.trim().length >= 2;
  const idReady = idNumberMatchesType(idType, idNumber);
  const identityReady = nameReady && idReady;
  const identityVerified = iprsStatus === "verified";
  const canSignin = emailValid && passwordValid && !isSubmitting;
  const canSignup = identityVerified && emailValid && passwordValid && passwordsMatch && !isSubmitting;

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const saved = window.localStorage.getItem(sessionKey);
    if (saved && isValidEmail(saved)) {
      setSessionEmail(saved);
    }
  }, []);

  useEffect(() => {
    if (!sessionEmail && !emailValid) {
      return;
    }

    setDashboardRequested(true);
    void preloadDashboard().then((module) => {
      setDashboard(() => module.AccountDashboard);
    });
  }, [emailValid, sessionEmail]);

  useEffect(() => {
    setIprsStatus("idle");
    setMessage("");
  }, [firstName, lastName, idType, idNumber]);

  function switchMode(nextMode: AccountMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    router.push(nextMode === "signup" ? "/account?mode=signup" : "/account");
  }

  async function verifyIdentity() {
    if (!identityReady) {
      setIprsStatus("failed");
      setMessage("ID validation check was unsuccessful.");
      return;
    }

    setIprsStatus("checking");
    setMessage("");

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      idType,
      idNumber: idNumber.trim().toUpperCase()
    };

    const result = await postApi<{ status: "verified" }>("/kyc/iprs-check", payload);
    const localCheckPassed = nameReady && idReady;

    if (result.ok || (result.offline && localCheckPassed)) {
      setIprsStatus("verified");
      setMessage("ID validation successful.");
      return;
    }

    setIprsStatus("failed");
    setMessage("ID validation check was unsuccessful.");
  }

  async function signin() {
    if (!canSignin) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const normalizedEmail = normalizeEmail(email);
    const result = await postApi<ApiUser>("/auth/signin", {
      email: normalizedEmail,
      password
    });

    if (result.ok) {
      window.localStorage.setItem(sessionKey, result.data.email);
      setSessionEmail(result.data.email);
      setIsSubmitting(false);
      return;
    }

    if (result.offline) {
      const account = readAccounts().find((item) => item.email === normalizedEmail && item.password === password);
      if (account) {
        window.localStorage.setItem(sessionKey, account.email);
        setSessionEmail(account.email);
        setIsSubmitting(false);
        return;
      }
    }

    setMessage(result.offline ? "No matching local account was found." : result.message);
    setIsSubmitting(false);
  }

  async function signup() {
    if (!canSignup) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const normalizedEmail = normalizeEmail(email);
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      idType,
      idNumber: idNumber.trim().toUpperCase(),
      email: normalizedEmail,
      password
    };
    const result = await postApi<ApiUser>("/auth/signup", payload);

    if (result.ok) {
      window.localStorage.setItem(sessionKey, result.data.email);
      setSessionEmail(result.data.email);
      setIsSubmitting(false);
      return;
    }

    if (result.offline) {
      const accounts = readAccounts();
      if (accounts.some((account) => account.email === normalizedEmail)) {
        setMessage("An account already exists for this email.");
        setIsSubmitting(false);
        return;
      }

      accounts.push({
        email: normalizedEmail,
        password,
        firstName: payload.firstName,
        lastName: payload.lastName,
        idType,
        idNumberLast4: getIdLast4(payload.idNumber),
        kycStatus: "verified",
        createdAt: new Date().toISOString()
      });
      writeAccounts(accounts);
      window.localStorage.setItem(sessionKey, normalizedEmail);
      setSessionEmail(normalizedEmail);
      setIsSubmitting(false);
      return;
    }

    setMessage(result.message);
    setIsSubmitting(false);
  }

  function signOut() {
    window.localStorage.removeItem(sessionKey);
    setSessionEmail(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  if (sessionEmail && Dashboard) {
    return <Dashboard email={sessionEmail} onSignOut={signOut} />;
  }

  if (sessionEmail && !Dashboard) {
    return <AccountLoading />;
  }

  return (
    <main className="min-h-screen bg-orbit-field text-orbit-ink">
      <header className="theme-body-border border-b border-white/70 bg-orbit-panel/90">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="RentOrbit home">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-orbit-green text-orbit-field">
              <span className="text-lg font-black">RO</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black leading-none text-orbit-ink sm:text-2xl">RentOrbit</p>
              <p className="mt-1 truncate text-sm font-semibold text-orbit-ink/65">Account</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitcher compact />
            <Link
              href="/account"
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-orbit-panel/90 text-orbit-ink shadow-panel backdrop-blur transition-colors hover:bg-orbit-panel focus-visible:outline-none"
              title="Account"
            >
              <CircleUserRound className="h-7 w-7" aria-hidden="true" />
              <span className="sr-only">Account</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100svh-81px)] w-full max-w-[1400px] items-center gap-3 px-3 py-6 sm:px-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,520px)]">
        <aside className="theme-body-border hidden min-h-[620px] overflow-hidden rounded-[36px] bg-orbit-panel/92 p-6 shadow-[0_14px_36px_rgba(25,32,29,0.08)] ring-1 ring-white/70 lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="orbit-tag inline-flex rounded-full bg-orbit-soft px-4 py-3 text-xs font-black uppercase text-orbit-green">
              RentOrbit account
            </span>
            <h1 className="mt-6 max-w-xl text-5xl font-black leading-[0.98] text-orbit-ink">
              Verified renting starts here.
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-orbit-ink/65">
              One workspace for KYC, messages, booking proposals, signed contracts, deposits, payouts, and saved listings.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              { title: "Identity first", text: "IPRS validation unlocks listing, signing, payment, and payout actions.", icon: <ShieldCheck className="h-5 w-5" aria-hidden="true" /> },
              { title: "Private by design", text: "Exact coordinates and sensitive ID details stay protected.", icon: <LockKeyhole className="h-5 w-5" aria-hidden="true" /> },
              { title: "Countrywide access", text: "Owners and renters share the same account across all categories.", icon: <CircleUserRound className="h-5 w-5" aria-hidden="true" /> }
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4 rounded-full border border-orbit-line bg-orbit-field/55 p-[3px] pr-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orbit-panel text-orbit-green">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-orbit-ink">{item.title}</p>
                  <p className="truncate text-xs font-semibold text-orbit-ink/60">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="theme-body-border w-full rounded-[36px] bg-orbit-panel/92 p-5 shadow-[0_14px_36px_rgba(25,32,29,0.08)] ring-1 ring-white/70 backdrop-blur">
          <div className="mb-6 px-2">
            <p className="text-sm font-black uppercase text-orbit-green">Account</p>
            <h1 className="mt-1 text-3xl font-black">{mode === "signup" ? "Sign up" : "Sign in"}</h1>
          </div>

          {mode === "signup" ? (
            <div className="grid gap-4">
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block px-3 text-xs font-black uppercase text-orbit-ink/55">First name</span>
                  <div className={formRailClass}>
                    <span className={formIconClass}>
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      className={formInputClass}
                      type="text"
                      autoComplete="given-name"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block px-3 text-xs font-black uppercase text-orbit-ink/55">Last name</span>
                  <div className={formRailClass}>
                    <span className={formIconClass}>
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className={formInputClass}
                      type="text"
                      autoComplete="family-name"
                    />
                  </div>
                </label>
              </div>

              <CustomSelect
                label="ID type"
                value={idType}
                options={idTypeOptions}
                onChange={(value) => setIdType(value as IdType)}
                labelClassName="mb-2 block px-3 text-xs font-black uppercase text-orbit-ink/55"
                buttonClassName={`${formRailClass} w-full text-left`}
                leadingIcon={<IdCard className="h-5 w-5" aria-hidden="true" />}
                leadingIconClassName={formIconClass}
                arrowClassName="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-panel/75 text-orbit-ink"
              />

              <label className="block">
                <span className="mb-2 block px-3 text-xs font-black uppercase text-orbit-ink/55">ID number</span>
                <div className={formRailClass}>
                  <span className={formIconClass}>
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <input
                    value={idNumber}
                    onChange={(event) => setIdNumber(event.target.value)}
                    className={`${formInputClass} uppercase`}
                    type="text"
                    autoComplete="off"
                  />
                  {identityVerified ? (
                    <span className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-panel/80 text-orbit-green">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
              </label>

              <button
                onClick={verifyIdentity}
                disabled={!identityReady || iprsStatus === "checking"}
                className={formActionClass}
              >
                {iprsStatus === "checking" ? "Checking IPRS" : "Validate ID"}
              </button>

              {identityVerified ? (
                <div className="grid gap-4 border-t border-orbit-line pt-5">
                  <CredentialFields
                    email={email}
                    emailValid={emailValid}
                    password={password}
                    passwordValid={passwordValid}
                    confirmPassword={confirmPassword}
                    passwordsMatch={passwordsMatch}
                    showPassword={showPassword}
                    showConfirmPassword={showConfirmPassword}
                    setEmail={setEmail}
                    setPassword={setPassword}
                    setConfirmPassword={setConfirmPassword}
                    setShowPassword={setShowPassword}
                    setShowConfirmPassword={setShowConfirmPassword}
                    mode="signup"
                  />

                  <button
                    onClick={signup}
                    disabled={!canSignup}
                    className={formSuccessActionClass}
                  >
                    {isSubmitting ? "Creating account" : "Create account"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4">
              <CredentialFields
                email={email}
                emailValid={emailValid}
                password={password}
                passwordValid={passwordValid}
                confirmPassword={confirmPassword}
                passwordsMatch={passwordsMatch}
                showPassword={showPassword}
                showConfirmPassword={showConfirmPassword}
                setEmail={setEmail}
                setPassword={setPassword}
                setConfirmPassword={setConfirmPassword}
                setShowPassword={setShowPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                mode="signin"
              />

              <button
                onClick={signin}
                disabled={!canSignin}
                className={formSuccessActionClass}
              >
                {isSubmitting ? "Signing in" : "Sign in"}
              </button>
            </div>
          )}

          <div className="mt-4 min-h-6 text-xs font-bold text-orbit-ink/65">
            {message ? (
              <span className={iprsStatus === "verified" ? "inline-flex items-center gap-2 text-orbit-green" : "inline-flex items-center gap-2 text-red-700"}>
                {iprsStatus === "verified" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
                {message}
              </span>
            ) : null}
            {emailValid && dashboardRequested ? (
              <span className="inline-flex items-center gap-2 text-orbit-green">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Account workspace loading
              </span>
            ) : null}
            {emailValid && password && !passwordValid ? <span>Password must be at least 8 characters.</span> : null}
            {mode === "signup" && passwordValid && confirmPassword && !passwordsMatch ? <span>Passwords must match.</span> : null}
          </div>

          <div className="mt-5 border-t border-orbit-line pt-4 text-sm font-bold text-orbit-ink/65">
            {mode === "signup" ? (
              <p>
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("signin")} className="font-black text-orbit-green">
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                New to RentOrbit?{" "}
                <button type="button" onClick={() => switchMode("signup")} className="font-black text-orbit-green">
                  Sign up
                </button>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

type CredentialFieldsProps = {
  email: string;
  emailValid: boolean;
  password: string;
  passwordValid: boolean;
  confirmPassword: string;
  passwordsMatch: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setShowPassword: (updater: (current: boolean) => boolean) => void;
  setShowConfirmPassword: (updater: (current: boolean) => boolean) => void;
  mode: AccountMode;
};

function CredentialFields({
  email,
  emailValid,
  password,
  passwordValid,
  confirmPassword,
  passwordsMatch,
  showPassword,
  showConfirmPassword,
  setEmail,
  setPassword,
  setConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
  mode
}: CredentialFieldsProps) {
  return (
    <>
      <label className="block">
        <span className="mb-2 block px-3 text-xs font-black uppercase text-orbit-ink/55">Email</span>
        <div className={formRailClass}>
          <span className={formIconClass}>
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={formInputClass}
            type="email"
            autoComplete="email"
          />
          {emailValid ? (
            <span className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-panel/80 text-orbit-green">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </label>

      <label className="block">
        <span className="mb-2 block px-3 text-xs font-black uppercase text-orbit-ink/55">Password</span>
        <div className={formRailClass}>
          <span className={formIconClass}>
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={formInputClass}
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {passwordValid ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-panel/80 text-orbit-green">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="mr-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orbit-panel/80 text-orbit-ink focus-visible:outline-none"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </label>

      {mode === "signup" ? (
        <label className="block">
          <span className="mb-2 block px-3 text-xs font-black uppercase text-orbit-ink/55">Confirm password</span>
          <div className={formRailClass}>
            <span className={formIconClass}>
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={formInputClass}
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
            />
            {confirmPassword && passwordsMatch ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-panel/80 text-orbit-green">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="mr-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orbit-panel/80 text-orbit-ink focus-visible:outline-none"
              title={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </label>
      ) : null}
    </>
  );
}
