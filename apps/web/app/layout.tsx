import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentOrbit",
  description: "Countrywide Kenyan marketplace for renting goods, services, and personnel.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#295485",
  width: "device-width",
  initialScale: 1
};

const themeInitScript = `
(() => {
  const key = "rentorbit:theme-mode";
  const getSystemTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const applyTheme = (mode) => {
    const normalized = mode === "light" || mode === "dark" || mode === "system" ? mode : "system";
    const resolved = normalized === "system" ? getSystemTheme() : normalized;
    document.documentElement.dataset.mode = normalized;
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#1A1A1A" : "#F3F6FB");
  };

  try {
    applyTheme(window.localStorage.getItem(key) || "system");
  } catch {
    applyTheme("system");
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
