import type { ReactNode } from "react";

const shapes: Record<string, ReactNode> = {
  browser: <><rect x="3" y="3" width="26" height="26" rx="3" /><path d="M3 11h26M8 7h1m4 0h1M16 11v18M16 20h13" /></>,
  monitor: <><rect x="3" y="4" width="26" height="19" rx="2" /><path d="M12 23v5m8-5v5M9 28h14M15 19h2" /></>,
  cart: <><path d="M2 4h4l4 17h16l4-13H7M11 16h16" /><circle cx="12" cy="27" r="2" /><circle cx="25" cy="27" r="2" /></>,
  layers: <><path d="m16 3 13 7-13 7L3 10 16 3Zm-13 14 13 7 13-7M3 24l13 7 13-7" /></>,
  code: <><path d="m10 7-8 9 8 9m12-18 8 9-8 9M19 4l-6 24" /></>,
  headset: <><path d="M4 18v-4a12 12 0 0 1 24 0v10c0 4-5 5-10 5" /><rect x="2" y="14" width="6" height="11" rx="2" /><rect x="24" y="14" width="6" height="11" rx="2" /><path d="M15 29h4" /></>,
  analysis: <><path d="M14 3v15h15A14 14 0 1 1 14 3Z" /><path d="M20 2v10h10A12 12 0 0 0 20 2Z" /></>,
  design: <><rect x="3" y="7" width="22" height="22" rx="3" /><path d="m12 19 3-7L25 2l5 5-10 10-8 2Zm11-15 5 5M8 24h12" /></>,
  shield: <><path d="m16 2 12 5v10c0 6-6 10-12 13C10 27 4 23 4 17V7l12-5Z" /><path d="m10 15 4 4 8-8" /></>,
  rocket: <><path d="M12 20 7 15C12 5 20 2 29 3c1 9-2 17-12 22l-5-5ZM9 12H4l-2 9 8-1m10 3-1 7 9-2v-7M6 25l-3 5 6-3" /><circle cx="22" cy="10" r="3" /></>,
  calculator: <><rect x="5" y="2" width="22" height="28" rx="3" /><path d="M9 7h14v6H9zM10 18h1m5 0h1m5 0h1M10 24h1m5 0h1m5 0h1" /></>,
};

export function BriefIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}
