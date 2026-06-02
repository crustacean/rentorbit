type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export const ui = {
  surface:
    "theme-body-border m-[2px] min-w-0 rounded-[36px] bg-orbit-panel/92 ring-1 ring-white/70",
  searchShell:
    "theme-body-border flex items-center gap-2 rounded-full bg-orbit-panel p-2 shadow-[0_2px_14px_rgba(25,32,29,0.08)] transition-colors focus-within:outline-none focus-within:ring-0",
  field:
    "w-full rounded-[18px] bg-orbit-field px-3 py-2 text-sm font-semibold text-orbit-ink outline-none shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.24)] transition placeholder:text-orbit-ink/42 focus:outline-none focus:ring-0 focus-visible:outline-none",
  label:
    "mb-1 block text-xs font-semibold uppercase text-orbit-ink/55",
  goldPill:
    "orbit-cta-gold inline-flex items-center justify-center gap-2 rounded-full font-black transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
  panelPill:
    "inline-flex items-center justify-center rounded-full bg-orbit-panel font-black text-orbit-ink ring-1 ring-orbit-line/70 transition-colors hover:bg-orbit-soft focus-visible:outline-none",
  iconButton:
    "inline-flex shrink-0 items-center justify-center rounded-full bg-orbit-panel text-orbit-ink transition-colors hover:bg-orbit-soft focus-visible:outline-none"
} as const;
