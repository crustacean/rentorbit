import { BadgeCheck, CalendarClock, CircleUserRound, FileSignature, Heart, PackageCheck, ShieldCheck, WalletCards } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import Link from "next/link";

export type AccountDashboardProps = {
  email: string;
  onSignOut: () => void;
};

const accountStats = [
  { label: "Active rentals", value: "3", icon: <PackageCheck className="h-5 w-5" aria-hidden="true" /> },
  { label: "Owner listings", value: "12", icon: <BadgeCheck className="h-5 w-5" aria-hidden="true" /> },
  { label: "Saved items", value: "18", icon: <Heart className="h-5 w-5" aria-hidden="true" /> },
  { label: "Pending signatures", value: "2", icon: <FileSignature className="h-5 w-5" aria-hidden="true" /> }
];

const accountTasks = [
  "Review Sony FX3 pickup amendment",
  "Confirm generator return photos",
  "Approve Mombasa crew booking proposal",
  "Complete payout account verification"
];

export function AccountDashboard({ email, onSignOut }: AccountDashboardProps) {
  return (
    <main className="min-h-screen bg-orbit-field text-orbit-ink">
      <header className="theme-body-border border-b border-white/70 bg-orbit-panel/90">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="RentOrbit home">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-orbit-green text-orbit-field">
              <span className="text-lg font-black">RO</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black leading-none text-orbit-ink sm:text-2xl">RentOrbit</p>
              <p className="mt-1 truncate text-sm font-semibold text-neutral-600">Account workspace</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitcher compact />
            <button onClick={onSignOut} className="rounded-full border border-orbit-line bg-orbit-panel/90 px-4 py-3 text-sm font-black">
              Sign out
            </button>
            <Link
              href="/account"
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-orbit-panel/90 text-orbit-ink shadow-[0_2px_14px_rgba(25,32,29,0.12)] backdrop-blur transition-colors hover:bg-orbit-panel focus-visible:outline-none"
              title="Account"
            >
              <CircleUserRound className="h-7 w-7" aria-hidden="true" />
              <span className="sr-only">Account</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1400px] gap-4 px-4 py-6 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {accountStats.map((stat) => (
              <div key={stat.label} className="rounded-md border border-orbit-line bg-orbit-panel p-4 shadow-panel">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-orbit-soft text-orbit-green">
                  {stat.icon}
                </div>
                <p className="text-3xl font-black">{stat.value}</p>
                <p className="mt-1 text-sm font-semibold text-neutral-600">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-orbit-line bg-orbit-panel p-5 shadow-panel">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Bookings timeline</h2>
              <CalendarClock className="h-5 w-5 text-orbit-green" aria-hidden="true" />
            </div>
            <div className="grid gap-3">
              {accountTasks.map((task, index) => (
                <div key={task} className="flex items-center justify-between gap-3 border-b border-orbit-line py-3 last:border-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orbit-field text-sm font-black">
                      {index + 1}
                    </span>
                    <p className="truncate text-sm font-bold">{task}</p>
                  </div>
                  <button className="rounded-md bg-orbit-green px-3 py-2 text-xs font-black text-orbit-field">Open</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-md border border-orbit-line bg-orbit-panel p-5 shadow-panel">
            <ShieldCheck className="mb-4 h-7 w-7 text-orbit-green" aria-hidden="true" />
            <h2 className="text-lg font-black">Verified access</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">KYC, contract signatures, deposits, and listing management are ready for this account.</p>
          </div>
          <div className="rounded-md border border-orbit-line bg-orbit-panel p-5 shadow-panel">
            <WalletCards className="mb-4 h-7 w-7 text-orbit-sky" aria-hidden="true" />
            <h2 className="text-lg font-black">Payments</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">M-Pesa/card ledger events, refundable deposits, and payout reconciliation will appear here.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
