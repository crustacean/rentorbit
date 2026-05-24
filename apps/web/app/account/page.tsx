import { AccountShell, type AccountMode } from "@/components/AccountShell";

type AccountPageProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const initialMode: AccountMode = params?.mode === "signup" ? "signup" : "signin";

  return <AccountShell initialMode={initialMode} />;
}
