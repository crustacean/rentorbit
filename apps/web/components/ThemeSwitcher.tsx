"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const themeKey = "rentorbit:theme-mode";

const modeOrder: ThemeMode[] = ["light", "dark", "system"];
const modeDetails: Record<ThemeMode, { mode: ThemeMode; label: string; icon: React.ReactNode }> = {
  light: { mode: "light", label: "Light", icon: <Sun className="h-4 w-4" aria-hidden="true" /> },
  dark: { mode: "dark", label: "Dark", icon: <Moon className="h-4 w-4" aria-hidden="true" /> },
  system: { mode: "system", label: "System", icon: <Monitor className="h-4 w-4" aria-hidden="true" /> }
};

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

export function ThemeSwitcher({ compact: _compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [expanded, setExpanded] = useState(false);

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
    setExpanded(false);
  }

  const activeMode = modeDetails[mode];
  const inactiveModes = modeOrder.filter((item) => item !== activeMode.mode).map((item) => modeDetails[item]);
  const expandedClass = expanded ? "w-[132px]" : "w-11";
  const optionsClass = expanded ? "max-w-[84px] opacity-100" : "max-w-0 opacity-0";

  return (
    <div
      className={`inline-flex h-11 ${expandedClass} items-center overflow-hidden rounded-full border border-orbit-line bg-orbit-panel/90 p-[3px] text-orbit-ink shadow-panel backdrop-blur transition-[width] duration-300 ease-out`}
      role="group"
      aria-label="Theme mode"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setExpanded(false);
        }
      }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => selectMode(activeMode.mode)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orbit-sky text-orbit-field transition-colors focus-visible:outline-none"
          aria-pressed="true"
          title={`${activeMode.label} mode`}
          aria-label={`${activeMode.label} mode selected`}
        >
          {activeMode.icon}
        </button>

        <div className={`flex ${optionsClass} items-center gap-1 overflow-hidden transition-[max-width,opacity] duration-300 ease-out`}>
          {inactiveModes.map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => selectMode(item.mode)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-orbit-ink transition-colors hover:bg-orbit-soft/70 focus-visible:outline-none"
              aria-pressed={false}
              title={`${item.label} mode`}
              aria-label={`Switch to ${item.label} mode`}
              tabIndex={expanded ? 0 : -1}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
