type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export const ui = {
  surface:
    "theme-body-border m-[2px] min-w-0 rounded-[32px] bg-orbit-panel/88 ring-1 ring-orbit-line/35 backdrop-blur-xl",
  searchShell:
    "theme-body-border flex items-center gap-2 rounded-[14px] bg-orbit-panel/88 p-2 ring-1 ring-orbit-line/45 backdrop-blur-xl transition-colors focus-within:outline-none focus-within:ring-1 focus-within:ring-orbit-sky/70",
  field:
    "w-full rounded-[12px] bg-orbit-field px-3 py-2 text-sm font-semibold text-orbit-ink outline-none ring-1 ring-orbit-line/25 transition placeholder:text-orbit-ink/42 focus:outline-none focus:ring-1 focus:ring-orbit-sky/70 focus-visible:outline-none",
  label:
    "mb-1 block text-xs font-semibold uppercase text-orbit-ink/55",
  goldPill:
    "orbit-cta-gold inline-flex items-center justify-center gap-2 rounded-full font-black shadow-[0_16px_36px_rgb(255_215_0_/_0.22)] transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
  panelPill:
    "inline-flex items-center justify-center rounded-full bg-orbit-panel/72 font-black text-orbit-ink ring-1 ring-orbit-line/45 backdrop-blur-xl transition-colors hover:bg-orbit-soft focus-visible:outline-none",
  iconButton:
    "inline-flex shrink-0 items-center justify-center rounded-full bg-orbit-panel text-orbit-ink transition-colors hover:bg-orbit-soft focus-visible:outline-none"
} as const;
