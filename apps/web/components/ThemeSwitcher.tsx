"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn, ui } from "@/lib/ui";

type ThemeMode = "light" | "dark";

const themeKey = "rentorbit:theme-mode";

const modeDetails: Record<ThemeMode, { label: string; icon: React.ReactNode }> = {
  light: { label: "Light", icon: <Sun className="h-4 w-4" aria-hidden="true" /> },
  dark: { label: "Dark", icon: <Moon className="h-4 w-4" aria-hidden="true" /> }
};

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? "#1A1A1A" : "#F3F6FB");
}

export function ThemeSwitcher({ compact: _compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const resolvedTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setMode(resolvedTheme);
  }, []);

  function toggleMode() {
    const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(nextMode);
    window.localStorage.setItem(themeKey, nextMode);
    applyTheme(nextMode);
  }

  const activeMode = modeDetails[mode];
  const nextMode = mode === "dark" ? "light" : "dark";
  const nextLabel = modeDetails[nextMode].label;

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={cn(ui.iconButton, "h-10 w-10 border border-orbit-line bg-orbit-panel/90 p-[3px] shadow-panel backdrop-blur sm:h-11 sm:w-11")}
      aria-label={`Switch to ${nextLabel} mode`}
      title={`${activeMode.label} mode`}
    >
      <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-orbit-sky text-orbit-field">
        {activeMode.icon}
      </span>
    </button>
  );
}
