"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ui } from "@/lib/ui";

export type CustomSelectOption = {
  value: string;
  label: string;
  helper?: string;
  icon?: React.ReactNode;
};

export type CustomSelectProps = {
  label: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  labelClassName?: string;
  buttonClassName?: string;
  menuClassName?: string;
  leadingIcon?: React.ReactNode;
  leadingIconClassName?: string;
  arrowClassName?: string;
};

const defaultLabelClass = ui.label;
const defaultButtonClass =
  "flex min-h-10 w-full items-center gap-3 rounded-[18px] bg-orbit-panel py-2 pl-3 pr-2 text-left text-sm font-semibold text-orbit-ink outline-none shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22)] transition-colors hover:bg-orbit-soft/45 focus:outline-none focus:ring-0 focus-visible:outline-none";
const defaultArrowClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-panel/75 text-orbit-ink";
const defaultMenuClass =
  "absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-[24px] bg-orbit-panel p-2 shadow-[0_18px_42px_rgba(25,32,29,0.14)]";

export function CustomSelect({
  label,
  value,
  options,
  onChange,
  className = "block",
  labelClassName = defaultLabelClass,
  buttonClassName = defaultButtonClass,
  menuClassName = defaultMenuClass,
  leadingIcon,
  leadingIconClassName = "flex h-full aspect-square shrink-0 items-center justify-center rounded-full bg-orbit-field text-orbit-green",
  arrowClassName = defaultArrowClass
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonId = useId();
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  function handleButtonKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <span id={`${buttonId}-label`} className={labelClassName}>
        {label}
      </span>
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleButtonKeyDown}
        className={buttonClassName}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${buttonId}-label ${buttonId}`}
        aria-controls={listboxId}
      >
        {leadingIcon ? <span className={leadingIconClassName}>{leadingIcon}</span> : null}
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? "Choose"}</span>
        <span className={arrowClassName}>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div id={listboxId} role="listbox" aria-labelledby={`${buttonId}-label`} className={menuClassName}>
          <div className="grid gap-1">
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectOption(option.value)}
                  className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-black transition-colors hover:bg-orbit-field ${
                    selected ? "bg-orbit-field" : "bg-transparent"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      selected
                        ? "bg-orbit-sky text-orbit-field"
                        : "bg-orbit-panel text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {option.icon ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orbit-soft text-orbit-green">
                      {option.icon}
                    </span>
                  ) : null}
                  <span className="min-w-0">
                    <span className="block truncate text-orbit-ink">{option.label}</span>
                    {option.helper ? (
                      <span className="mt-0.5 block truncate text-xs font-semibold text-orbit-ink/55">{option.helper}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
