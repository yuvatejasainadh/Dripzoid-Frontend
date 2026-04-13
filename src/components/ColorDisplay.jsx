// src/components/ColorDisplay.jsx
import React from "react";

/**
 * ColorDisplay
 * ----------------
 * Displays ONLY the color name as a pill.
 * - No color swatch
 * - No color picker
 * - No hex / nearest color
 * - Auto-selected by default
 * - Supports light & dark themes
 */
export default function ColorDisplay({ color }) {
  // Normalize color name
  const label =
    typeof color === "string"
      ? color
      : color?.label || color?.name || String(color || "");

  if (!label) return null;

  return (
    <div className="inline-flex items-center">
      <span
        className="
          px-3 py-1
          rounded-full
          text-xs font-semibold uppercase tracking-wide
          bg-black text-white
          dark:bg-white dark:text-black
          border border-black dark:border-white
          select-none
        "
        aria-label={`Color ${label}`}
      >
        {label}
      </span>
    </div>
  );
}
