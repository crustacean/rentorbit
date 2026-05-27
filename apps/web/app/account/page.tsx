import { AccountShell, type AccountMode } from "@/components/AccountShell";

type AccountPageProps = {
  searchParams?: Promise<{
    mode?: string;
    returnTo?: string;
  }>;
};

function cleanReturnTo(returnTo?: string) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return undefined;
  }

  return returnTo;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const initialMode: AccountMode = params?.mode === "signup" ? "signup" : "signin";
  const returnTo = cleanReturnTo(params?.returnTo);

  return <AccountShell initialMode={initialMode} returnTo={returnTo} />;
}
