import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RECENT_KEY = "global_search_recent";
const MAX_RECENT = 8;
const API_BASE = process.env.REACT_APP_API_BASE;

export default function GlobalSearch() {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [highlight, setHighlight] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  /* ================= RECENT ================= */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      setRecent(Array.isArray(saved) ? saved : []);
    } catch {
      setRecent([]);
    }
  }, []);

  /* ================= SEARCH API ================= */
  useEffect(() => {
    let canceled = false;

    if (!expanded || !query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/products/search`, {
          params: { query: query.trim() },
        });
        if (!canceled) setResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Search error:", err);
        if (!canceled) setResults([]);
      } finally {
        if (!canceled) setLoading(false);
      }
    }, 250);

    return () => {
      canceled = true;
      clearTimeout(id);
    };
  }, [query, expanded]);

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        collapse();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= KEYBOARD ================= */
  useEffect(() => {
    function onKey(e) {
      if (!expanded) return;

      if (e.key === "Escape") {
        collapse();
      } else if (showDropdown) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlight((h) => Math.min(h + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlight((h) => Math.max(h - 1, -1));
        } else if (e.key === "Enter") {
          if (highlight >= 0 && results[highlight]) {
            openProduct(results[highlight]);
          } else if (query.trim()) {
            applyFullSearch();
          }
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, showDropdown, highlight, results, query]);

  /* ================= HELPERS ================= */
  const expand = () => {
    setExpanded(true);
    setShowDropdown(true);
    // focus next tick
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const collapse = () => {
    setExpanded(false);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setHighlight(-1);
  };

  const saveRecent = (term) => {
    if (!term?.trim()) return;
    const list = [term.trim(), ...recent.filter((r) => r !== term.trim())].slice(
      0,
      MAX_RECENT
    );
    setRecent(list);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  };

  const openProduct = (product) => {
    saveRecent(query.trim() || product.name);
    collapse();
    navigate(`/product/${product.id}`);
  };

  const applyFullSearch = () => {
    if (!query.trim()) return;
    saveRecent(query.trim());
    collapse();
    navigate(`/search?search=${encodeURIComponent(query.trim())}`);
  };

  const onRecentClick = (term) => {
    setQuery(term);
    setShowDropdown(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  /* ================= RENDER ================= */
  return (
    // wrapper is relative so expanded absolute box anchors to the icon's right edge
    <div ref={wrapperRef} className="relative">
      {/* COLLAPSED ICON: sits inline where you place <GlobalSearch /> (e.g. next to theme toggle) */}
      {!expanded && (
        <button
          onClick={expand}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open search"
        >
          <Search size={20} />
        </button>
      )}

      {/* EXPANDED — absolutely anchored to the right so it grows left and won't cover theme toggle */}
      {expanded && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 z-50 w-[220px] sm:w-[300px] transition-all duration-150"
          role="search"
        >
          <div className="relative">
            {/* Input ring */}
            <div
              className="relative flex items-center rounded-full
                bg-gray-50 dark:bg-gray-900
                border border-gray-300 dark:border-gray-800
                focus-within:ring-2 focus-within:ring-black
                px-3 py-1"
            >
              {/* TEXT INPUT — full width, padded for icons */}
              <input
                ref={inputRef}
                type="text"
                value={query}
                placeholder="Search products..."
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowDropdown(true);
                  setHighlight(-1);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-transparent outline-none text-sm py-2 pr-12 pl-2 text-gray-900 dark:text-white placeholder-gray-500"
                aria-label="Global product search"
              />

              {/* SEARCH ICON — inside input on the right (left of the close X) */}
              <Search
                size={16}
                className="absolute right-10 text-gray-500 pointer-events-none"
              />

              {/* CLOSE (X) — far right inside the ring, won't overflow */}
              <button
                onClick={collapse}
                className="absolute right-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                aria-label="Close search"
              >
                <X size={14} />
              </button>
            </div>

            {/* DROPDOWN */}
            {showDropdown && (
              <div
                className="absolute top-full left-0 mt-2 w-full
                  bg-white dark:bg-gray-900
                  border border-gray-200 dark:border-gray-800
                  rounded-xl shadow-xl z-50 max-h-[420px] overflow-auto"
              >
                <div className="p-2">
                  {query.trim() ? (
                    <>
                      <div className="px-3 py-2 text-xs text-gray-500">
                        {loading ? "Searching..." : `${results.length} results`}
                      </div>

                      {results.length === 0 && !loading ? (
                        <p className="p-4 text-center text-sm text-gray-500">
                          No results found
                        </p>
                      ) : (
                        results.map((product, idx) => (
                          <div
                            key={product.id}
                            onMouseEnter={() => setHighlight(idx)}
                            className={`flex gap-3 p-3 rounded-lg cursor-pointer
                              hover:bg-gray-100 dark:hover:bg-gray-800
                              ${
                                highlight === idx
                                  ? "bg-gray-100 dark:bg-gray-800"
                                  : ""
                              }`}
                            onClick={() => openProduct(product)}
                          >
                            <img
                              src={product.image || "https://via.placeholder.com/80"}
                              alt={product.name}
                              className="w-12 h-12 rounded-md object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {product.category}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between px-3 py-2 text-xs text-gray-500">
                        <span>Recent</span>
                        <button onClick={clearRecent} className="underline">
                          Clear
                        </button>
                      </div>

                      {recent.length === 0 ? (
                        <p className="p-4 text-center text-sm text-gray-500">
                          No recent searches
                        </p>
                      ) : (
                        recent.map((r) => (
                          <button
                            key={r}
                            onClick={() => onRecentClick(r)}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                          >
                            {r}
                          </button>
                        ))
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
