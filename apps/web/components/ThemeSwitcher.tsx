"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const themeKey = "rentorbit:theme-mode";

const modes: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
  { mode: "light", label: "Light", icon: <Sun className="h-4 w-4" aria-hidden="true" /> },
  { mode: "dark", label: "Dark", icon: <Moon className="h-4 w-4" aria-hidden="true" /> },
  { mode: "system", label: "System", icon: <Monitor className="h-4 w-4" aria-hidden="true" /> }
];

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  const resolved = mode === "system" ? getSystemTheme() : mode;
  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#1A1A1A" : "#F3F6FB");
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const savedMode = window.localStorage.getItem(themeKey);
    const initialMode: ThemeMode = savedMode === "light" || savedMode === "dark" || savedMode === "system" ? savedMode : "system";
    setMode(initialMode);
    applyTheme(initialMode);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemChange() {
      if (mode === "system") {
        applyTheme("system");
      }
    }

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [mode]);

  function selectMode(nextMode: ThemeMode) {
    setMode(nextMode);
    window.localStorage.setItem(themeKey, nextMode);
    applyTheme(nextMode);
  }

  return (
    <div
      className="inline-flex min-h-11 items-center rounded-full border border-orbit-line bg-orbit-panel/90 p-1 text-orbit-ink shadow-panel backdrop-blur"
      role="group"
      aria-label="Theme mode"
    >
      {modes.map((item) => {
        const active = mode === item.mode;

        return (
          <button
            key={item.mode}
            type="button"
            onClick={() => selectMode(item.mode)}
            className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-black transition-colors focus-visible:outline-none ${
              active ? "bg-orbit-sky text-orbit-field" : "text-orbit-ink hover:bg-orbit-soft/70"
            } ${compact ? "sm:px-3" : ""}`}
            aria-pressed={active}
            title={`${item.label} mode`}
          >
            {item.icon}
            <span className={compact ? "hidden sm:inline" : ""}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
