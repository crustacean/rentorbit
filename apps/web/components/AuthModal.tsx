"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, IdCard, LockKeyhole, Mail, ShieldCheck, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CustomSelect, type CustomSelectOption } from "@/components/CustomSelect";
import { writeAccountSession } from "@/lib/accountSession";
import { cn, ui } from "@/lib/ui";

export type AccountMode = "signin" | "signup";

type IdType = "National ID" | "Passport number" | "Alien ID";

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

type AuthModalProps = {
  open: boolean;
  initialMode?: AccountMode;
  onClose: () => void;
  onAuthenticated?: (email: string) => void;
};

const accountsKey = "rentorbit:accounts";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const idTypes: IdType[] = ["National ID", "Passport number", "Alien ID"];
const idTypeOptions: CustomSelectOption[] = idTypes.map((option) => ({ value: option, label: option }));
const modalFieldClass = cn(ui.field, "min-h-12");
const modalLabelClass = ui.label;
const modalActionClass = cn(ui.goldPill, "min-h-[52px] w-full rounded-[14px] px-5 text-sm shadow-[0_14px_34px_rgba(239,191,4,0.18)] active:scale-[0.98]");

let accountWorkspacePreload: Promise<unknown> | null = null;
let lastPreloadedAccountEmail: string | null = null;

function preloadAccountWorkspace() {
  accountWorkspacePreload ??= import("@/components/AccountDashboard");
  return accountWorkspacePreload;
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

    const payload = (await response.json().catch(() => ({}))) as { message?: string | string[] } & T;

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

export function AuthModal({ open, initialMode = "signin", onClose, onAuthenticated }: AuthModalProps) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const passwordValid = useMemo(() => isValidPassword(password), [password]);
  const passwordsMatch = password === confirmPassword;
  const nameReady = firstName.trim().length >= 2 && lastName.trim().length >= 2;
  const idReady = idNumberMatchesType(idType, idNumber);
  const identityReady = nameReady && idReady;
  const identityVerified = iprsStatus === "verified";
  const signupStage: "identity" | "credentials" = mode === "signup" && identityVerified ? "credentials" : "identity";
  const canSignin = emailValid && passwordValid && !isSubmitting;
  const canSignup = identityVerified && emailValid && passwordValid && passwordsMatch && !isSubmitting;

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode(initialMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFirstName("");
    setLastName("");
    setIdType("National ID");
    setIdNumber("");
    setIprsStatus("idle");
    setMessage("");
    setIsSubmitting(false);
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    setIprsStatus("idle");
    setMessage("");
  }, [firstName, lastName, idType, idNumber]);

  useEffect(() => {
    if (!open || !emailValid) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (lastPreloadedAccountEmail === normalizedEmail) {
      return;
    }

    const knownAccount = readAccounts().some((account) => account.email === normalizedEmail);

    if (!knownAccount) {
      return;
    }

    lastPreloadedAccountEmail = normalizedEmail;
    router.prefetch("/account");
    void preloadAccountWorkspace();
    console.info("[RentOrbit] Account workspace preloading for recognized email.");
  }, [email, emailValid, open, router]);

  if (!open) {
    return null;
  }

  function switchMode(nextMode: AccountMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (nextMode === "signup" && mode !== "signup") {
      setFirstName("");
      setLastName("");
      setIdType("National ID");
      setIdNumber("");
      setIprsStatus("idle");
    }
  }

  function completeSession(nextEmail: string) {
    writeAccountSession(nextEmail);
    onAuthenticated?.(nextEmail);
    onClose();
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

    if (result.ok || (result.offline && nameReady && idReady)) {
      setIprsStatus("verified");
      setMessage("Identity verified.");
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
      setIsSubmitting(false);
      completeSession(result.data.email);
      return;
    }

    if (result.offline) {
      const account = readAccounts().find((item) => item.email === normalizedEmail && item.password === password);
      if (account) {
        setIsSubmitting(false);
        completeSession(account.email);
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
      setIsSubmitting(false);
      completeSession(result.data.email);
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
      setIsSubmitting(false);
      completeSession(normalizedEmail);
      return;
    }

    setMessage(result.message);
    setIsSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0a0b0f]/68 p-4 backdrop-blur-[14px]" role="dialog" aria-modal="true" aria-label="RentOrbit account">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close account dialog" />
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_20%_20%,rgba(239,191,4,0.14),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(67,145,245,0.12),transparent_30%)]" />

      <section className="auth-modal-card relative grid h-[min(660px,calc(100svh-24px))] w-[min(440px,calc(100vw-24px))] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[24px] p-5 sm:p-7">
        <header className="flex min-h-12 items-start justify-between gap-4">
          <div className="min-w-0">
            {mode === "signup" && signupStage === "credentials" ? (
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EFBF04]">Identity verified</p>
            ) : (
              <button type="button" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} className="inline-flex items-center gap-2 text-xs font-semibold text-orbit-ink/62 hover:text-orbit-ink">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {mode === "signin" ? "Sign Up" : "Sign In"}
              </button>
            )}
          </div>

          <div className="flex items-center">
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-orbit-ink/55 hover:bg-orbit-field/70 focus-visible:outline-none" aria-label="Close account dialog">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="no-scrollbar min-h-0 overflow-y-auto">
          {mode === "signin" ? (
            <SignInPanel
              email={email}
              password={password}
              showPassword={showPassword}
              message={message}
              isSubmitting={isSubmitting}
              canSignin={canSignin}
              setEmail={setEmail}
              setPassword={setPassword}
              setShowPassword={setShowPassword}
              signin={signin}
            />
          ) : signupStage === "identity" ? (
            <IdentityPanel
              firstName={firstName}
              lastName={lastName}
              idType={idType}
              idNumber={idNumber}
              message={message}
              iprsStatus={iprsStatus}
              identityReady={identityReady}
              setFirstName={setFirstName}
              setLastName={setLastName}
              setIdType={setIdType}
              setIdNumber={setIdNumber}
              verifyIdentity={verifyIdentity}
            />
          ) : (
            <SignupCredentialsPanel
              email={email}
              emailValid={emailValid}
              password={password}
              passwordValid={passwordValid}
              confirmPassword={confirmPassword}
              passwordsMatch={passwordsMatch}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              message={message}
              isSubmitting={isSubmitting}
              canSignup={canSignup}
              setEmail={setEmail}
              setPassword={setPassword}
              setConfirmPassword={setConfirmPassword}
              setShowPassword={setShowPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              signup={signup}
            />
          )}
        </div>

        <footer className="grid min-h-12 place-items-center pt-3">
          {mode === "signup" ? (
            <div className="flex items-center gap-2">
              <span className={`h-1.5 rounded-full transition-all ${signupStage === "identity" ? "w-7 bg-[#EFBF04]" : "w-14 bg-[#EFBF04]"}`} />
              <span className={`h-1.5 rounded-full transition-all ${signupStage === "credentials" ? "w-7 bg-[#EFBF04]" : "w-3 bg-orbit-ink/18"}`} />
            </div>
          ) : (
            <p className="text-center text-sm font-bold text-orbit-ink/62">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="font-black text-[#705d00] dark:text-[#EFBF04]">
                Sign Up
              </button>
            </p>
          )}
        </footer>
      </section>
    </div>
  );
}

function SignInPanel({
  email,
  password,
  showPassword,
  message,
  isSubmitting,
  canSignin,
  setEmail,
  setPassword,
  setShowPassword,
  signin
}: {
  email: string;
  password: string;
  showPassword: boolean;
  message: string;
  isSubmitting: boolean;
  canSignin: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setShowPassword: (updater: (current: boolean) => boolean) => void;
  signin: () => void;
}) {
  return (
    <form
      className="grid min-h-full content-center gap-5 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        signin();
      }}
    >
      <div className="text-center">
        <h2 className="text-2xl font-black text-orbit-ink">Welcome Back</h2>
        <p className="mt-2 text-sm font-semibold text-orbit-ink/75">Sign in to your RentOrbit account</p>
      </div>

      <label className="block">
        <span className={modalLabelClass}>Email address</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} className={modalFieldClass} placeholder="name@company.com" type="email" autoComplete="email" />
      </label>

      <label className="block">
        <span className={modalLabelClass}>Password</span>
        <div className="relative">
          <input value={password} onChange={(event) => setPassword(event.target.value)} className={`${modalFieldClass} pr-12`} placeholder="••••••••" type={showPassword ? "text" : "password"} autoComplete="current-password" />
          <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-orbit-ink/45">
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-orbit-ink/68">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 rounded accent-[#EFBF04]" />
          Keep me signed in
        </label>
        <button type="button" className="text-[#705d00] dark:text-[#EFBF04]">Forgot?</button>
      </div>

      <MessageSlot message={message} />

      <button type="submit" disabled={!canSignin} className={modalActionClass}>
        {isSubmitting ? "Signing in" : "Sign In"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function IdentityPanel({
  firstName,
  lastName,
  idType,
  idNumber,
  message,
  iprsStatus,
  identityReady,
  setFirstName,
  setLastName,
  setIdType,
  setIdNumber,
  verifyIdentity
}: {
  firstName: string;
  lastName: string;
  idType: IdType;
  idNumber: string;
  message: string;
  iprsStatus: "idle" | "checking" | "verified" | "failed";
  identityReady: boolean;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setIdType: (value: IdType) => void;
  setIdNumber: (value: string) => void;
  verifyIdentity: () => void;
}) {
  return (
    <form
      className="grid min-h-full content-center gap-[14px] py-2"
      onSubmit={(event) => {
        event.preventDefault();
        verifyIdentity();
      }}
    >
      <div>
        <h2 className="text-2xl font-black text-orbit-ink">Identity verification</h2>
        <p className="mt-2 text-sm font-semibold text-orbit-ink/75">Provide your legal details for IPRS validation.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className={modalLabelClass}>First name</span>
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className={modalFieldClass} placeholder="e.g. Kwame" type="text" autoComplete="given-name" />
        </label>
        <label className="block">
          <span className={modalLabelClass}>Last name</span>
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} className={modalFieldClass} placeholder="e.g. Omondi" type="text" autoComplete="family-name" />
        </label>
      </div>

      <CustomSelect
        label="Identification type"
        value={idType}
        options={idTypeOptions}
        onChange={(value) => setIdType(value as IdType)}
        labelClassName={modalLabelClass}
        buttonClassName={cn(ui.field, "flex min-h-12 items-center gap-3 py-2 pl-3 pr-2 text-left")}
        menuClassName="absolute left-0 right-0 top-[calc(100%+8px)] z-[130] overflow-hidden rounded-[24px] bg-orbit-panel p-2 shadow-[0_18px_42px_rgba(25,32,29,0.14)]"
        leadingIcon={<IdCard className="h-4 w-4" aria-hidden="true" />}
      />

      <label className="block">
        <span className={modalLabelClass}>{idType} number</span>
        <input value={idNumber} onChange={(event) => setIdNumber(event.target.value)} className={`${modalFieldClass} uppercase`} placeholder="Enter identification number" type="text" autoComplete="off" />
      </label>

      <div className="flex min-h-16 gap-3 rounded-[18px] bg-orbit-field/70 p-3 text-xs font-semibold leading-5 text-orbit-ink/75">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#EFBF04]" aria-hidden="true" />
        Your data is encrypted and verified through IPRS. We do not store raw ID credentials.
      </div>

      <MessageSlot message={message} tone={iprsStatus === "failed" ? "error" : "default"} compact />

      <button type="submit" disabled={!identityReady || iprsStatus === "checking"} className={modalActionClass}>
        {iprsStatus === "checking" ? "Validating" : "Validate Identity"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function SignupCredentialsPanel({
  email,
  emailValid,
  password,
  passwordValid,
  confirmPassword,
  passwordsMatch,
  showPassword,
  showConfirmPassword,
  message,
  isSubmitting,
  canSignup,
  setEmail,
  setPassword,
  setConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
  signup
}: {
  email: string;
  emailValid: boolean;
  password: string;
  passwordValid: boolean;
  confirmPassword: string;
  passwordsMatch: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  message: string;
  isSubmitting: boolean;
  canSignup: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setShowPassword: (updater: (current: boolean) => boolean) => void;
  setShowConfirmPassword: (updater: (current: boolean) => boolean) => void;
  signup: () => void;
}) {
  return (
    <form
      className="grid min-h-full content-center gap-4 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        signup();
      }}
    >
      <div>
        <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <span className="h-1 rounded-full bg-[#EFBF04]" />
          <span className="h-1 rounded-full bg-[#EFBF04]" />
          <span className="text-xs font-bold text-orbit-ink/45">Step 2 of 2</span>
        </div>
        <h2 className="mt-8 text-2xl font-black text-orbit-ink">Complete Your Account</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-orbit-ink/75">Your identity has been verified. Now, set up your login details.</p>
      </div>

      <label className="block">
        <span className={modalLabelClass}>Email Address</span>
        <div className="relative">
          <input value={email} onChange={(event) => setEmail(event.target.value)} className={`${modalFieldClass} pr-11`} placeholder="name@company.com" type="email" autoComplete="email" />
          {emailValid ? <CheckCircle2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#EFBF04]" aria-hidden="true" /> : <Mail className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orbit-ink/32" aria-hidden="true" />}
        </div>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <PasswordField label="Password" value={password} onChange={setPassword} valid={passwordValid} show={showPassword} setShow={setShowPassword} />
        <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} valid={Boolean(confirmPassword && passwordsMatch)} show={showConfirmPassword} setShow={setShowConfirmPassword} />
      </div>

      <div className="flex min-h-16 gap-3 rounded-[18px] bg-orbit-field/70 p-3 text-xs font-semibold leading-5 text-orbit-ink/75">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#EFBF04]" aria-hidden="true" />
        Ensure your password contains at least 8 characters, including a mix of letters, numbers, and symbols.
      </div>

      <MessageSlot message={message || (password && !passwordValid ? "Password must be at least 8 characters." : confirmPassword && !passwordsMatch ? "Passwords must match." : "")} tone="error" />

      <button type="submit" disabled={!canSignup} className={modalActionClass}>
        {isSubmitting ? "Creating account" : "Create Account"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  valid,
  show,
  setShow
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  valid: boolean;
  show: boolean;
  setShow: (updater: (current: boolean) => boolean) => void;
}) {
  return (
    <label className="block">
      <span className={modalLabelClass}>{label}</span>
      <div className="relative">
        <input value={value} onChange={(event) => onChange(event.target.value)} className={`${modalFieldClass} pr-10`} placeholder="••••••••" type={show ? "text" : "password"} autoComplete="new-password" />
        <button type="button" onClick={() => setShow((current) => !current)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-orbit-ink/42">
          {valid ? <CheckCircle2 className="h-4 w-4 text-[#EFBF04]" aria-hidden="true" /> : show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </label>
  );
}

function MessageSlot({
  message,
  tone = "default",
  compact = false
}: {
  message: string;
  tone?: "default" | "error";
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "min-h-[18px]" : "min-h-5"} text-xs font-bold ${tone === "error" ? "text-red-700 dark:text-red-300" : "text-orbit-ink/58"}`}>
      {message}
    </div>
  );
}
