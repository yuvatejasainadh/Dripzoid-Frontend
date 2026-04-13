import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Search, X, Check } from "lucide-react";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.API_BASE ||
  "https://api.dripzoid.com";

export default function ProductSearchBar({
  onToggle,
  selectedIds = new Set(),
  placeholder = "Search products...",
  debounceMs = 250,
  allProducts = [], // 👈 Added for local array lookup
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const failedQueries = useRef(new Set()); // 👈 cache failed queries to prevent spam

  /* -------------------- Debounced search -------------------- */
  useEffect(() => {
    let canceled = false;
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    const isNumeric = /^\d+$/.test(trimmed); // 👈 check for numeric input
    setLoading(true);

    const id = setTimeout(async () => {
      try {
        let backendResults = [];
        let localMatches = [];

        // 🧠 Always try local match if numeric
        if (isNumeric && Array.isArray(allProducts)) {
          localMatches = allProducts.filter((p) =>
            String(p.id || "")
              .toLowerCase()
              .includes(trimmed.toLowerCase())
          );
        }

        // 🛑 If backend previously failed for same numeric query, skip API
        if (!isNumeric || !failedQueries.current.has(trimmed)) {
          try {
            const res = await axios.get(`${API_BASE}/api/products/search`, {
              params: { query: trimmed },
            });
            const arr = Array.isArray(res.data)
              ? res.data
              : res.data?.data || [];
            backendResults = arr;
            if (arr.length === 0 && isNumeric) {
              failedQueries.current.add(trimmed);
            }
          } catch (err) {
            console.error("Product search error:", err);
            if (isNumeric) failedQueries.current.add(trimmed);
          }
        }

        // 🔄 Merge results (unique by ID)
        const merged = [...backendResults, ...localMatches].reduce((acc, cur) => {
          if (cur && !acc.find((p) => p.id === cur.id)) acc.push(cur);
          return acc;
        }, []);

        if (!canceled) {
          setResults(merged);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      canceled = true;
      clearTimeout(id);
    };
  }, [query, debounceMs, allProducts]);

  /* -------------------- Click outside to close -------------------- */
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
        setHighlight(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* -------------------- Keyboard navigation -------------------- */
  useEffect(() => {
    function onKey(e) {
      if (!showDropdown) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, -1));
      } else if (e.key === "Enter") {
        if (highlight >= 0 && results[highlight]) {
          onToggle?.(results[highlight].id);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlight(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showDropdown, highlight, results, onToggle]);

  /* -------------------- Render -------------------- */
  return (
    <div className="relative w-full max-w-xl" ref={wrapperRef}>
      {/* Search bar */}
      <div className="relative">
        <div
          className="flex items-center rounded-full 
          bg-gray-50 dark:bg-gray-900 
          border border-gray-300 dark:border-gray-800 
          shadow-sm transition 
          focus-within:ring-2 focus-within:ring-offset-1 
          focus-within:ring-black dark:focus-within:ring-gray-700"
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search size={18} className="text-gray-500 dark:text-gray-400" />
          </div>

          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setHighlight(-1);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full pl-11 pr-10 py-2 rounded-full 
              bg-transparent outline-none 
              text-gray-900 dark:text-white 
              placeholder-gray-500"
            aria-label="Product search"
          />

          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full 
                hover:bg-gray-200 dark:hover:bg-gray-800 transition"
              aria-label="Clear search"
            >
              <X size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 mt-3 w-full 
          bg-white dark:bg-gray-900 
          border border-gray-200 dark:border-gray-800 
          rounded-2xl shadow-xl max-h-[420px] overflow-auto z-50 animate-fadeIn"
        >
          <div className="p-2">
            {query.trim() ? (
              <>
                <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {loading
                      ? "Searching..."
                      : `${results.length} result${results.length !== 1 ? "s" : ""}`}
                  </span>
                </div>

                {results.length === 0 && !loading ? (
                  <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No products found
                  </p>
                ) : (
                  results.map((product, idx) => {
                    const selected = selectedIds.has(product.id);
                    return (
                      <div
                        key={product.id}
                        onMouseEnter={() => setHighlight(idx)}
                        onMouseLeave={() => setHighlight(-1)}
                        onClick={() => onToggle?.(product.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition 
                          ${
                            selected
                              ? "ring-2 ring-black dark:ring-white bg-gray-100/50 dark:bg-gray-800/50"
                              : "hover:bg-gray-100 dark:hover:bg-gray-800"
                          }
                          ${highlight === idx ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          readOnly
                          className="accent-black dark:accent-white"
                        />
                        <img
                          src={
                            product.image ||
                            product.image_url ||
                            "https://via.placeholder.com/80"
                          }
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-md border border-gray-200 dark:border-gray-800"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium truncate text-gray-900 dark:text-white">
                              {product.name}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ₹{product.price ?? "—"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {product.shortDescription ||
                              product.subcategory ||
                              ""}
                          </p>
                        </div>
                        {selected && (
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                    );
                  })
                )}
              </>
            ) : (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                Type to search products...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
