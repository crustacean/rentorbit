"use client";

import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateTimeValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return new Date();
  }

  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function formatDateTimeValue(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join("-") + `T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function formatDateTimeLabel(date: Date) {
  const hour = date.getHours();
  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";

  return `${monthLabels[date.getMonth()]} ${padDatePart(date.getDate())}, ${date.getFullYear()}, ${padDatePart(displayHour)}:${padDatePart(date.getMinutes())} ${period}`;
}

function sameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateTimeValue(value), [value]);
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonId = useId();
  const menuId = useId();

  useEffect(() => {
    if (open) {
      setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [open, selectedDate]);

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

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [viewDate]);

  function moveMonth(delta: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function selectDay(day: Date) {
    onChange(formatDateTimeValue(new Date(day.getFullYear(), day.getMonth(), day.getDate(), selectedDate.getHours(), selectedDate.getMinutes())));
    setViewDate(new Date(day.getFullYear(), day.getMonth(), 1));
  }

  function adjustHour(delta: number) {
    const next = new Date(selectedDate);
    next.setHours((selectedDate.getHours() + delta + 24) % 24);
    onChange(formatDateTimeValue(next));
  }

  function adjustMinute(delta: number) {
    const totalMinutes = selectedDate.getHours() * 60 + selectedDate.getMinutes();
    const nextTotal = (totalMinutes + delta * 5 + 24 * 60) % (24 * 60);
    const next = new Date(selectedDate);
    next.setHours(Math.floor(nextTotal / 60), nextTotal % 60);
    onChange(formatDateTimeValue(next));
  }

  function selectToday() {
    const now = new Date();
    onChange(formatDateTimeValue(new Date(now.getFullYear(), now.getMonth(), now.getDate(), selectedDate.getHours(), selectedDate.getMinutes())));
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <div ref={wrapperRef} className="relative block">
      <span id={`${buttonId}-label`} className="mb-1 block text-xs font-semibold uppercase text-neutral-500">
        {label}
      </span>
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center gap-3 rounded-[18px] bg-orbit-panel py-2 pl-3 pr-2 text-left text-sm text-orbit-ink outline-none shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.22)] transition hover:bg-orbit-soft/45 focus:outline-none focus:ring-0 focus-visible:outline-none"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        aria-labelledby={`${buttonId}-label ${buttonId}`}
      >
        <span className="flex h-full aspect-square shrink-0 items-center justify-center rounded-full bg-orbit-field text-orbit-green">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate">{formatDateTimeLabel(selectedDate)}</span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbit-panel/75 text-orbit-ink">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-labelledby={`${buttonId}-label`}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[90] overflow-hidden rounded-[24px] bg-orbit-panel p-2 shadow-[0_18px_42px_rgba(25,32,29,0.14)]"
        >
          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-orbit-field text-orbit-ink transition-colors hover:bg-orbit-soft"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-sm font-black text-orbit-ink">
              {monthLabels[viewDate.getMonth()]} {viewDate.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-orbit-field text-orbit-ink transition-colors hover:bg-orbit-soft"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 px-1 text-center text-[11px] font-black uppercase text-orbit-ink/55">
            {weekdayLabels.map((weekday, index) => (
              <span key={`${weekday}-${index}`} className="py-1">
                {weekday}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const selected = sameCalendarDay(day, selectedDate);
              const outsideMonth = day.getMonth() !== viewDate.getMonth();

              return (
                <button
                  key={formatDateTimeValue(day)}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition-colors ${
                    selected ? "bg-[#EFBF04] text-[#1a1a1a] hover:bg-[#EFBF04]" : "bg-transparent text-orbit-ink hover:bg-orbit-field"
                  } ${outsideMonth && !selected ? "opacity-35" : ""}`}
                  aria-pressed={selected}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2 rounded-[18px] bg-orbit-field p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-orbit-ink/55">Time</span>
              <span className="rounded-full bg-orbit-panel px-3 py-1 text-xs font-black text-orbit-ink">
                {formatDateTimeLabel(selectedDate).split(", ").at(-1)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TimeStepper label="Hour" value={padDatePart(selectedDate.getHours())} onDecrement={() => adjustHour(-1)} onIncrement={() => adjustHour(1)} />
              <TimeStepper label="Minute" value={padDatePart(selectedDate.getMinutes())} onDecrement={() => adjustMinute(-1)} onIncrement={() => adjustMinute(1)} />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={selectToday}
              className="flex min-h-10 items-center justify-center rounded-full bg-orbit-field px-4 text-xs font-black text-orbit-ink transition-colors hover:bg-orbit-soft"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="orbit-cta-gold flex min-h-10 items-center justify-center rounded-full px-5 text-xs font-black transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimeStepper({
  label,
  value,
  onDecrement,
  onIncrement
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="rounded-[16px] bg-orbit-panel p-1">
      <span className="block px-2 pb-1 text-[10px] font-black uppercase text-orbit-ink/55">{label}</span>
      <div className="flex h-10 items-center rounded-full bg-orbit-field p-[1px] shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.18)]">
        <button type="button" onClick={onDecrement} className="flex h-full aspect-square shrink-0 items-center justify-center rounded-full bg-orbit-panel text-sm font-black text-orbit-ink">
          -
        </button>
        <span className="min-w-0 flex-1 text-center text-sm font-black text-orbit-ink">{value}</span>
        <button type="button" onClick={onIncrement} className="orbit-cta-gold flex h-full aspect-square shrink-0 items-center justify-center rounded-full text-sm font-black">
          +
        </button>
      </div>
    </div>
  );
}
