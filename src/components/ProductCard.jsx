import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import { AiOutlineTag, AiFillStar } from "react-icons/ai";
import { useWishlist } from "../contexts/WishlistContext.jsx"; // context

const API_BASE = process.env.REACT_APP_API_BASE;
const PLACEHOLDER = "https://via.placeholder.com/400";

function getHeaders(isJson = true) {
  const headers = {};
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("userToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (isJson) headers["Content-Type"] = "application/json";
  return headers;
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [wlBusy, setWlBusy] = useState(false);

  const { wishlist = [], addToWishlist, removeFromWishlist, fetchWishlist } = useWishlist() || {};

  const pid = String(
    product?.id ?? product?._id ?? product?.product_id ?? product?.productId ?? ""
  );

  const isWishlisted = useMemo(() => {
    if (!pid) return false;
    return (wishlist || []).some(
      (w) =>
        String(
          w.product_id ?? w.id ?? w.productId ?? (w.product && w.product.id) ?? ""
        ) === pid
    );
  }, [wishlist, pid]);

  // Reviews
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const avgRating = useMemo(() => {
    if (!reviewsList || reviewsList.length === 0) return 0;
    const sum = reviewsList.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return sum / reviewsList.length;
  }, [reviewsList]);
  const reviewsCount = reviewsList.length;

  useEffect(() => {
    if (!pid) {
      setReviewsList([]);
      return;
    }

    const ac = new AbortController();
    const fetchReviews = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const res = await fetch(
          `${API_BASE}/api/reviews/product/${encodeURIComponent(pid)}`,
          {
            method: "GET",
            signal: ac.signal,
            headers: getHeaders(false),
          }
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status} ${txt || res.statusText}`);
        }
        const rows = await res.json();
        setReviewsList(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn("Failed to fetch product reviews:", err);
        setReviewsError(err.message || "Failed to load reviews");
        setReviewsList([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
    return () => ac.abort();
  }, [pid]);

  // Images
  const images = useMemo(() => {
    const src = product?.images ?? product?.image ?? product?.thumbnail ?? "";
    if (Array.isArray(src)) return src.map(String).map((u) => u.trim()).filter(Boolean);
    if (typeof src === "string") {
      const trimmed = src.trim();
      if (!trimmed) return [];
      const parts = trimmed.includes(",") ? trimmed.split(",") : [trimmed];
      return parts.map((u) => u.trim()).filter(Boolean);
    }
    return [];
  }, [product]);

  useEffect(() => {
    setCurrent((idx) => (images.length && idx >= images.length ? 0 : idx));
  }, [images.length]);

  const [imageSrc, setImageSrc] = useState(() => images[0] || PLACEHOLDER);
  const [imageErrored, setImageErrored] = useState(false);

  useEffect(() => {
    const next = images[current] || PLACEHOLDER;
    setImageSrc(next);
    setImageErrored(false);
  }, [images, current]);

  const handleImgError = useCallback(() => {
    if (imageErrored) return;
    setImageErrored(true);
    setImageSrc(PLACEHOLDER);
  }, [imageErrored]);

  // Pricing
  const parsePrice = useCallback((value) => {
    if (value == null) return 0;
    if (typeof value === "number") return value;
    const cleaned = String(value).replace(/[^0-9.]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const stock =
    typeof product?.stock === "number"
      ? product.stock
      : typeof product?.stock === "string" && product.stock !== ""
      ? Number(product.stock)
      : null;

  const price = parsePrice(product?.price);
  const originalPrice = parsePrice(product?.originalPrice ?? product?.oldPrice);
  const hasDiscount = originalPrice > price && originalPrice > 0;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const getStockBadge = useCallback(() => {
    if (stock === null || stock === undefined) return null;
    if (stock <= 0) return { text: "Out of stock", tone: "bg-red-600 text-white" };
    if (stock <= 5) return { text: `Only ${stock} left`, tone: "bg-amber-600 text-black" };
    if (stock <= 20) return { text: "Low stock", tone: "bg-amber-500 text-black" };
    return { text: "In stock", tone: "bg-green-600 text-white" };
  }, [stock]);
  const stockBadge = getStockBadge();

  const handleNavigate = useCallback(() => {
    if (!pid) return;
    navigate(`/product/${pid}`);
  }, [navigate, pid]);

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();
    if (!pid || wlBusy) return;
    setWlBusy(true);
    try {
      if (isWishlisted) {
        if (typeof removeFromWishlist === "function") {
          await removeFromWishlist(pid);
          if (typeof fetchWishlist === "function") await fetchWishlist();
        }
      } else {
        if (typeof addToWishlist === "function") {
          await addToWishlist(pid);
          if (typeof fetchWishlist === "function") await fetchWishlist();
        }
      }
    } catch (err) {
      console.warn("Wishlist toggle failed:", err);
    } finally {
      setWlBusy(false);
    }
  };

  if (!product) return null;

  const avg = avgRating || 0;
  const avgRounded = Math.round(avg);
  const reviewsNum = reviewsCount;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      className="group relative w-full sm:w-auto bg-white dark:bg-neutral-900 border border-gray-100 dark:border-gray-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigate();
        }
      }}
      aria-label={`Open details for ${product?.name || "product"}`}
    >
      {/* Image area - MOBILE-FIRST compact sizing */}
      <div className="relative w-full bg-gray-50 dark:bg-gray-800 overflow-hidden">
        <div className="w-full h-40 sm:h-56 md:aspect-square md:h-auto overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={`${current}-${imageSrc}`}
              src={imageSrc}
              alt={product?.name || "product image"}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              loading="lazy"
              onError={handleImgError}
              decoding="async"
            />
          </AnimatePresence>
        </div>

        {/* Wishlist button */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={wlBusy}
          className="absolute top-3 right-3 bg-white/95 dark:bg-black/80 rounded-full p-2 shadow-sm hover:scale-105 transform transition disabled:opacity-60"
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <FiHeart size={18} className={isWishlisted ? "text-red-500" : "text-gray-500"} />
        </button>

        {/* Image dots compact */}
        {images.length > 1 && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            aria-hidden
          >
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrent(idx);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-transform ${idx === current ? "scale-110 bg-white" : "bg-white/60"}`}
                aria-label={`Show image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info - compact on mobile */}
      <div className="p-2.5 sm:p-4 flex flex-col gap-1">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{product?.name}</h3>
        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{product?.category}</p>

        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">₹{price.toLocaleString()}</span>

          {hasDiscount && (
            <>
              <span className="text-[10px] sm:text-xs line-through text-gray-500 dark:text-gray-400">₹{originalPrice.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-600 text-white">{discountPercent}% OFF</span>
            </>
          )}

          <AiOutlineTag className="text-green-500 ml-auto sm:ml-0" aria-hidden />
        </div>

        {/* Ratings */}
        {reviewsNum > 0 ? (
          <div className="flex items-center mt-1 sm:mt-2 gap-2" aria-label={`Rated ${avg.toFixed(1)} out of 5`}>
            <div className="flex items-center gap-0.5 text-yellow-500">
              {Array.from({ length: 5 }).map((_, idx) => (
                <AiFillStar
                  key={idx}
                  className={idx < avgRounded ? "opacity-100 text-yellow-500" : "opacity-30 text-yellow-400"}
                  style={{ fontSize: idx < 3 ? 12 : 11 }}
                  aria-hidden
                />
              ))}
            </div>
            <span className="ml-2 text-[11px] sm:text-xs font-medium text-gray-800 dark:text-gray-200">{avg.toFixed(1)}</span>
            <span className="ml-1 text-[11px] text-gray-600 dark:text-gray-400">({reviewsNum})</span>
          </div>
        ) : (
          <div className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 mt-1">No Ratings &amp; Reviews</div>
        )}

        {/* Stock & seller */}
        <div className="mt-2 flex items-center justify-between text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">
          <span className="truncate">{product?.seller || "Seller"}</span>
          {stockBadge && (
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${stockBadge.tone}`}>{stockBadge.text}</div>
          )}
        </div>
      </div>
    </div>
  );
}
