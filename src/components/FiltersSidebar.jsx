// src/components/FilterSidebar.jsx
import React, { useEffect, useRef, useMemo, useState } from "react";
import tinycolor from "tinycolor2";
import { X } from "lucide-react";

/* ---------- Color helpers ---------- */
const normalizeColor = (raw) => {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;

  let tc = tinycolor(s);
  if (tc.isValid()) return tc.toHexString().toLowerCase();

  const cleaned = s.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  tc = tinycolor(cleaned);
  if (tc.isValid()) return tc.toHexString().toLowerCase();

  const firstToken = cleaned.split(" ")[0];
  tc = tinycolor(firstToken);
  if (tc.isValid()) return tc.toHexString().toLowerCase();

  // fallback deterministic hash -> hex
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hex = ((hash >>> 0) & 0xffffff).toString(16).padStart(6, "0");
  return `#${hex}`.toLowerCase();
};

const colorIsLight = (cssColor) => {
  if (!cssColor) return false;
  try {
    return tinycolor(cssColor).isLight();
  } catch {
    return false;
  }
};

const swatchBorderStyle = (parsedColor, selected) => {
  if (selected) return `2px solid rgba(0,0,0,0.14)`;
  if (!parsedColor) return `1px solid rgba(0,0,0,0.12)`;
  return colorIsLight(parsedColor)
    ? `1px solid rgba(0,0,0,0.12)`
    : `1px solid rgba(255,255,255,0.12)`;
};

/* ---------- Component ---------- */
/**
 Props expected (controlled):
 - isOpen, isStatic, onClose, onApply
 - categoryData: [{ name, subcategories: [...] }]
 - colorsList, MIN, MAX
 - selectedSubcategories, setSelectedSubcategories
 - expandedCategories, setExpandedCategories
 - priceRange, setPriceRange
 - selectedColors, setSelectedColors
 - sortOption, setSortOption
 - clearFilters
*/
export default function FilterSidebar({
  isOpen = false,
  isStatic = false,
  onClose = () => {},
  onApply = () => {},
  categoryData = [],
  colorsList = [],
  MIN = 0,
  MAX = 10000,

  selectedSubcategories = [],
  setSelectedSubcategories = () => {},
  expandedCategories = [],
  setExpandedCategories = () => {},
  priceRange = [MIN, MAX],
  setPriceRange = () => {},
  selectedColors = [],
  setSelectedColors = () => {},
  sortOption = "",
  setSortOption = () => {},
  clearFilters = () => {},
}) {
  const closeBtnRef = useRef(null);
  const [showAllColors, setShowAllColors] = useState(false);

  useEffect(() => {
    if (!isStatic && isOpen) {
      setTimeout(() => closeBtnRef.current?.focus(), 60);
    }
  }, [isOpen, isStatic]);

  /* ---------- Normalize categories ---------- */
  const normalizeCategories = (raw) => {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : raw.categories ?? raw;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((c) => {
        const name = (c && c.name) ? String(c.name).trim() : String(c).trim();
        const subsRaw = c && c.subcategories ? c.subcategories : [];
        const subs = (Array.isArray(subsRaw) ? subsRaw : [])
          .map((s) => (typeof s === "string" ? s.trim() : (s && s.name ? String(s.name).trim() : String(s).trim())))
          .filter(Boolean);
        return { name: name || "Uncategorized", subcategories: subs };
      })
      .filter(Boolean);
  };

  const normalizedCategories = normalizeCategories(categoryData);

  // preferred order
  const categoryOrder = ["Men", "Women", "Kids"];
  const sortedCategories = useMemo(() => {
    return [...normalizedCategories].sort((a, b) => {
      const ia = categoryOrder.indexOf(a.name);
      const ib = categoryOrder.indexOf(b.name);
      const va = ia === -1 ? Number.POSITIVE_INFINITY : ia;
      const vb = ib === -1 ? Number.POSITIVE_INFINITY : ib;
      if (va !== vb) return va - vb;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [normalizedCategories]);

  /* ---------- Selection helpers ---------- */
  // special marker for "category-only" (no subcategory)
  const CATEGORY_ALL_MARKER = "__ALL__";

  const selectionEquals = (sel, categoryName, subName) => {
    if (!sel) return false;
    if (typeof sel === "string") {
      const raw = sel.trim().toLowerCase();
      if (raw === subName.trim().toLowerCase()) return true;
      const pair = `${categoryName}:${subName}`.trim().toLowerCase();
      if (raw === pair) return true;
      return false;
    }
    if (typeof sel === "object") {
      const cat = (sel.category ?? sel.categoryName ?? sel.categoryId ?? "").toString().trim().toLowerCase();
      const sub = (sel.subcategory ?? sel.sub ?? sel.subId ?? sel.name ?? "").toString().trim().toLowerCase();
      // treat "__ALL__" as category-only match for any subName
      if (String(sub).toLowerCase() === CATEGORY_ALL_MARKER.toLowerCase()) {
        return cat === categoryName.toString().trim().toLowerCase();
      }
      return cat === categoryName.toString().trim().toLowerCase() && sub === subName.toString().trim().toLowerCase();
    }
    return false;
  };

  const isSelected = (categoryName, subName) =>
    Array.isArray(selectedSubcategories) && selectedSubcategories.some((s) => selectionEquals(s, categoryName, subName));

  const toggleSubcategory = (categoryName, subName) => {
    const normalizedCategory = String(categoryName).trim();
    const normalizedSub = String(subName).trim();

    setSelectedSubcategories((prev = []) => {
      // remove category-only marker for this category if present
      const withoutCategoryOnly = prev.filter((s) => {
        const cat = (s?.category ?? "").toString().trim().toLowerCase();
        const sub = (s?.subcategory ?? "").toString().trim().toLowerCase();
        if (cat === normalizedCategory.toLowerCase() && sub === CATEGORY_ALL_MARKER.toLowerCase()) return false;
        return true;
      });

      const exists = withoutCategoryOnly.some((s) => selectionEquals(s, normalizedCategory, normalizedSub));
      if (exists) {
        return withoutCategoryOnly.filter((s) => !selectionEquals(s, normalizedCategory, normalizedSub));
      }
      return [...withoutCategoryOnly, { category: normalizedCategory, subcategory: normalizedSub }];
    });
  };

  const toggleCategoryExpand = (categoryName) =>
    setExpandedCategories((prev = []) =>
      prev.includes(categoryName) ? prev.filter((c) => c !== categoryName) : [...prev, categoryName]
    );

  /* ---------- Category-level selection (category-only) ---------- */
  const getSubcategoriesOf = (categoryName) => {
    const found = sortedCategories.find((c) => String(c.name).trim().toLowerCase() === String(categoryName).trim().toLowerCase());
    return Array.isArray(found?.subcategories) ? found.subcategories : [];
  };

  const isCategoryFullySelected = (categoryName) => {
    // category is "fully selected" if:
    // - category-only marker exists for the category OR
    // - every known subcategory is selected
    const subs = getSubcategoriesOf(categoryName);
    const markerExists = Array.isArray(selectedSubcategories) && selectedSubcategories.some((s) => {
      try {
        return (s?.category ?? "").toString().trim().toLowerCase() === categoryName.toString().trim().toLowerCase()
          && (s?.subcategory ?? "").toString().trim() === CATEGORY_ALL_MARKER;
      } catch {
        return false;
      }
    });
    if (markerExists) return true;
    if (subs.length === 0) {
      // if no known subs, treat category-only selection presence as "selected"
      return markerExists || Array.isArray(selectedSubcategories) && selectedSubcategories.some((s) => {
        try {
          return (s?.category ?? "").toString().trim().toLowerCase() === categoryName.toString().trim().toLowerCase();
        } catch {
          return false;
        }
      });
    }
    return subs.every((sub) => isSelected(categoryName, sub));
  };

  const toggleCategorySelection = (categoryName) => {
    const subs = getSubcategoriesOf(categoryName);
    setSelectedSubcategories((prev = []) => {
      const prevArr = Array.isArray(prev) ? [...prev] : [];
      const fully = isCategoryFullySelected(categoryName);

      if (fully) {
        // remove any selection for this category (category-only + subcategories)
        return prevArr.filter((s) => {
          try {
            const cat = (s.category ?? s.categoryName ?? "").toString().trim().toLowerCase();
            return cat !== String(categoryName).trim().toLowerCase();
          } catch {
            // keep if malformed
            return true;
          }
        });
      }

      // Not fully selected -> add "category-only" marker (this applies filter by category only)
      // Remove any per-subcategory entries for the category to avoid duplicates
      const withoutThisCategory = prevArr.filter((s) => {
        try {
          const cat = (s.category ?? s.categoryName ?? "").toString().trim().toLowerCase();
          return cat !== String(categoryName).trim().toLowerCase();
        } catch {
          return true;
        }
      });

      // Add single category-only object using CATEGORY_ALL_MARKER
      return [...withoutThisCategory, { category: String(categoryName).trim(), subcategory: CATEGORY_ALL_MARKER }];
    });
  };

  /* ---------- Color display: show only 6-8 main colors ---------- */
  const mainColorObjects = useMemo(() => {
    if (!Array.isArray(colorsList)) return [];
    const seen = new Set();
    const out = [];
    // Prefer to pick distinct visible colors (first pass)
    for (let i = 0; i < colorsList.length && out.length < 8; i++) {
      const raw = colorsList[i];
      const hex = normalizeColor(raw) || null;
      const key = hex || String(raw).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ raw, hex });
      }
    }
    // ensure at least 6 if possible
    if (out.length < 6) {
      for (let i = 0; i < colorsList.length && out.length < 6; i++) {
        const raw = colorsList[i];
        const hex = normalizeColor(raw) || null;
        const key = hex || String(raw).trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ raw, hex });
        }
      }
    }
    return out;
  }, [colorsList]);

  const isColorSelected = (rawColor) => Array.isArray(selectedColors) && selectedColors.includes(rawColor);

  const toggleColor = (rawColor) => {
    setSelectedColors((prev = []) => (prev.includes(rawColor) ? prev.filter((x) => x !== rawColor) : [...prev, rawColor]));
  };

  /* ---------- Price helpers ---------- */
  const leftPercent = useMemo(() => {
    const min = Number(MIN || 0);
    const max = Number(MAX || 10000);
    const cur = Number(priceRange?.[0] ?? min);
    if (max <= min) return 0;
    return Math.round(((cur - min) / (max - min)) * 100);
  }, [priceRange, MIN, MAX]);

  const rightPercent = useMemo(() => {
    const min = Number(MIN || 0);
    const max = Number(MAX || 10000);
    const cur = Number(priceRange?.[1] ?? max);
    if (max <= min) return 0;
    return 100 - Math.round(((cur - min) / (max - min)) * 100);
  }, [priceRange, MIN, MAX]);

  const handlePriceChange = (index, rawValue) => {
    const value = Number(rawValue);
    const next = Array.isArray(priceRange) ? [...priceRange] : [MIN, MAX];
    if (index === 0) next[0] = Math.min(Math.max(MIN, value), next[1]);
    else next[1] = Math.max(Math.min(MAX, value), next[0]);
    setPriceRange(next);
  };

  /* ---------- Inner panel UI ---------- */
  const Inner = (
    <div className="p-5 w-full sm:w-80 lg:w-80 h-full overflow-y-auto">
      {/* style for range thumbs (WebKit + Firefox) */}
      <style>{`
        /* WebKit */
        input[type="range"].rs {
          -webkit-appearance: none;
          appearance: none;
          height: 28px;
          background: transparent;
        }
        input[type="range"].rs:focus { outline: none; }
        input[type="range"].rs::-webkit-slider-runnable-track {
          height: 4px;
          background: transparent;
        }
        input[type="range"].rs::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: white;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.08);
          margin-top: -9px; /* center thumb on 4px track (thumb height 18 -> center 9) */
          cursor: pointer;
        }
        /* Firefox */
        input[type="range"].rs::-moz-range-track { height: 4px; background: transparent; }
        input[type="range"].rs::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 999px; background: white; box-shadow: 0 0 0 2px rgba(0,0,0,0.08); border: none;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        {!isStatic && (
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close filters"
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
          >
            <X />
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <h3 className="text-sm font-medium mb-3">Categories</h3>
        <div className="space-y-3">
          {sortedCategories.map((category) => {
            const catName = category.name;
            const subs = Array.isArray(category.subcategories) ? category.subcategories : [];
            const fullySelected = isCategoryFullySelected(catName);
            return (
              <div key={catName} className="group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 w-full">
                    {/* Category-level select button (toggles category-only) */}
                    <button
                      onClick={() => toggleCategorySelection(catName)}
                      aria-pressed={fullySelected}
                      aria-label={fullySelected ? `Deselect ${catName}` : `Select ${catName}`}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-sm border ${
                        fullySelected ? "bg-black text-white border-black dark:bg-white dark:text-black" : "bg-white dark:bg-transparent border-gray-200 dark:border-gray-700"
                      }`}
                      type="button"
                    >
                      {fullySelected ? "✓" : ""}
                    </button>

                    {/* Category expand button */}
                    <button
                      onClick={() => toggleCategoryExpand(catName)}
                      className="flex-1 text-left py-2 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition text-sm flex items-center justify-between"
                      aria-expanded={expandedCategories.includes(catName)}
                      type="button"
                    >
                      <span className="font-medium">{catName}</span>
                      <span className="text-sm font-bold select-none">{expandedCategories.includes(catName) ? "−" : "+"}</span>
                    </button>
                  </div>
                </div>

                {expandedCategories.includes(catName) && subs.length > 0 && (
                  <div className="mt-2 ml-12 flex flex-wrap gap-2">
                    {subs.map((sub) => {
                      const subLabel = typeof sub === "string" ? sub : String(sub?.name ?? sub).trim();
                      const active = isSelected(catName, subLabel);
                      return (
                        <button
                          key={`${catName}::${subLabel}`}
                          onClick={() => toggleSubcategory(catName, subLabel)}
                          className={`px-3 py-1 rounded-full text-sm border transition ${
                            active
                              ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                              : "bg-white dark:bg-transparent text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                          }`}
                          aria-pressed={active}
                        >
                          {subLabel}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {sortedCategories.length === 0 && <div className="text-sm text-gray-500">No categories available</div>}
        </div>
      </div>

      {/* Price */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-3">Price Range (₹)</h3>

        <div className="flex items-center justify-between mb-2 text-sm font-semibold">
          <div>₹{(priceRange?.[0] ?? MIN).toLocaleString()}</div>
          <div>₹{(priceRange?.[1] ?? MAX).toLocaleString()}</div>
        </div>

        <div className="relative py-2 px-1">
          {/* TRACK */}
          <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full relative">
            {/* selected range */}
            <div
              className="absolute h-2 rounded-full bg-black dark:bg-white"
              style={{
                left: `${leftPercent}%`,
                right: `${rightPercent}%`,
              }}
            />
          </div>

          {/* overlayed range inputs */}
          <div className="absolute inset-0 flex items-center">
            {/* NOTE: min input is above max input (zIndex) so the min thumb is draggable reliably */}
            <input
              className="rs absolute left-0 w-full"
              type="range"
              min={MIN}
              max={MAX}
              step={100}
              value={priceRange?.[0] ?? MIN}
              onChange={(e) => handlePriceChange(0, e.target.value)}
              aria-label="Minimum price"
              style={{ zIndex: 3 }}
            />
            <input
              className="rs absolute left-0 w-full"
              type="range"
              min={MIN}
              max={MAX}
              step={100}
              value={priceRange?.[1] ?? MAX}
              onChange={(e) => handlePriceChange(1, e.target.value)}
              aria-label="Maximum price"
              style={{ zIndex: 2 }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Min</span>
            <input
              type="number"
              min={MIN}
              max={priceRange?.[1] ?? MAX}
              value={priceRange?.[0] ?? MIN}
              onChange={(e) => handlePriceChange(0, Number(e.target.value || MIN))}
              className="w-full rounded-md border px-2 py-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Max</span>
            <input
              type="number"
              min={priceRange?.[0] ?? MIN}
              max={MAX}
              value={priceRange?.[1] ?? MAX}
              onChange={(e) => handlePriceChange(1, Number(e.target.value || MAX))}
              className="w-full rounded-md border px-2 py-1 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </label>
        </div>
      </div>

      {/* Colors */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-3">Colors</h3>

        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 items-center">
          {mainColorObjects.map(({ raw, hex }, i) => {
            const parsed = hex || null;
            const selected = isColorSelected(raw);
            const textClass = colorIsLight(parsed) ? "text-gray-900" : "text-white";
            return (
              <button
                key={`${String(raw)}-${i}`}
                onClick={() => toggleColor(raw)}
                aria-label={`color-${String(raw)}`}
                title={String(raw)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
                  selected ? "scale-105" : "hover:scale-105"
                }`}
                style={{
                  background: parsed || "linear-gradient(45deg,#e2e8f0,#cbd5e1)",
                  border: swatchBorderStyle(parsed, selected),
                }}
              >
                {selected ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={textClass}>
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            );
          })}

          {Array.isArray(colorsList) && colorsList.length > mainColorObjects.length && (
            <button
              onClick={() => setShowAllColors((s) => !s)}
              className="col-span-2 ml-1 px-2 py-1 rounded-md text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent"
              aria-expanded={showAllColors}
            >
              {showAllColors ? "Hide" : `+ More (${colorsList.length - mainColorObjects.length})`}
            </button>
          )}
        </div>

        {/* Expanded full color list (collapsible) */}
        {showAllColors && Array.isArray(colorsList) && (
          <div className="mt-3 p-2 rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 max-h-40 overflow-auto">
            <div className="flex flex-wrap gap-2">
              {colorsList.map((raw, i) => {
                const hex = normalizeColor(raw) || null;
                const sel = isColorSelected(raw);
                return (
                  <button
                    key={`full-${i}-${String(raw)}`}
                    onClick={() => toggleColor(raw)}
                    title={String(raw)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition ${sel ? "ring-2 ring-indigo-500" : "hover:scale-105"}`}
                    style={{ background: hex || "linear-gradient(45deg,#e2e8f0,#cbd5e1)", border: swatchBorderStyle(hex, sel) }}
                  >
                    {sel ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={colorIsLight(hex) ? "text-gray-900" : "text-white"}><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sort */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-3">Sort By</h3>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="w-full rounded-md px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        >
          <option value="">Select</option>
          <option value="low-high">Price: Low to High</option>
          <option value="high-low">Price: High to Low</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Actions (sticky) */}
      <div className="mt-6 pt-4 sticky bottom-0 bg-white dark:bg-black -mx-5 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-3">
          <button
            onClick={() => {
              onApply?.();
              if (!isStatic) onClose?.();
            }}
            className="flex-1 px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black font-medium shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
          >
            Apply filters
          </button>
          <button
            onClick={() => {
              clearFilters?.();
              if (!isStatic) onClose?.();
            }}
            className="px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );

  /* ---------- Render (static vs sliding) ---------- */
  if (isStatic) {
    return (
      <aside className="hidden lg:block w-80 border-r border-gray-200 dark:border-gray-700">
        {Inner}
      </aside>
    );
  }

  return (
    <>
      <div
        aria-hidden={!isOpen}
        className={`fixed inset-0 bg-black/40 transition-opacity z-40 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 bottom-0 transform z-50 w-full sm:w-96 bg-white dark:bg-black shadow-lg transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        id="filters-panel"
      >
        {Inner}
      </aside>
    </>
  );
}
