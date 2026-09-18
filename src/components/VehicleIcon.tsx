import type { CSSProperties } from "react";
import type { VehicleKind } from "@/lib/types";

interface VehicleIconProps {
  kind: VehicleKind;
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

// Small silhouette glyphs so a leg/trip reads as "tram" or "bus" at a glance
// instead of just a colored dot. Body uses currentColor (set by the caller to
// the vehicle's brand color); window cutouts use the surface color so they
// stay legible on whatever card background they're drawn on.
export function VehicleIcon({ kind, size = 16, className, style, title }: VehicleIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    className,
    style,
    role: title ? "img" : undefined,
    "aria-label": title,
    "aria-hidden": title ? undefined : true,
  };

  if (kind === "tram") {
    return (
      <svg {...props} fill="currentColor">
        <rect x="9.25" y="1.5" width="1.5" height="2.5" rx="0.5" />
        <rect x="3" y="4.5" width="14" height="9.5" rx="2" />
        <rect x="5" y="6.8" width="2.6" height="2.8" rx="0.5" fill="var(--surface-1)" />
        <rect x="8.2" y="6.8" width="2.6" height="2.8" rx="0.5" fill="var(--surface-1)" />
        <rect x="11.4" y="6.8" width="2.6" height="2.8" rx="0.5" fill="var(--surface-1)" />
        <circle cx="6.5" cy="16" r="1.5" />
        <circle cx="13.5" cy="16" r="1.5" />
      </svg>
    );
  }

  if (kind === "train") {
    return (
      <svg {...props} fill="currentColor">
        <path d="M4 6.5A3 3 0 0 1 7 3.5h6a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <rect x="6" y="6" width="3.2" height="3" rx="0.5" fill="var(--surface-1)" />
        <rect x="10.8" y="6" width="3.2" height="3" rx="0.5" fill="var(--surface-1)" />
        <circle cx="6.8" cy="16" r="1.5" />
        <circle cx="13.2" cy="16" r="1.5" />
      </svg>
    );
  }

  if (kind === "other") {
    return (
      <svg {...props} fill="currentColor">
        <circle cx="10" cy="10" r="4.5" />
      </svg>
    );
  }

  // citybus, regiobus, expressbus share one "bus" silhouette; color alone
  // (already applied by the caller) distinguishes the specific line category.
  return (
    <svg {...props} fill="currentColor">
      <rect x="3" y="4.5" width="14" height="9.5" rx="2.5" />
      <rect x="5" y="6.8" width="3.6" height="2.8" rx="0.5" fill="var(--surface-1)" />
      <rect x="9.6" y="6.8" width="5.4" height="2.8" rx="0.5" fill="var(--surface-1)" />
      <circle cx="6.5" cy="16" r="1.5" />
      <circle cx="13.5" cy="16" r="1.5" />
    </svg>
  );
}
