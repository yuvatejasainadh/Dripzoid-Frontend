// src/components/ProductDetailsPage.jsx
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar } from "@mui/material";
import {
  ShoppingCart,
  CreditCard,
  Share2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";

import Reviews from "./Reviews";
import ProductCard from "./ProductCard";
import ColorDisplay from "./ColorDisplay";
import ProductGallery from "./ProductGallery";
import Lightbox from "./Lightbox";

import { useCart } from "../contexts/CartContext.jsx";
import { useWishlist } from "../contexts/WishlistContext.jsx";
import { UserContext } from "../contexts/UserContext.js";

import QandA from "./QandA";
import RelatedProducts from "./RelatedProducts";

const API_BASE = process.env.REACT_APP_API_BASE || "";

/* ---------- helpers (same as before) ---------- */
function stringToHslColor(str = "", s = 65, l = 45) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

function sanitizeColorNameForLookup(name = "") {
  return String(name || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
}

function resolveColor(input) {
  if (!input && input !== 0) return "#ddd";
  if (typeof input === "object") {
    if (input.hex) return input.hex;
    if (input.color) return input.color;
    if (input.name) return stringToHslColor(String(input.name));
  }
  const s = String(input).trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s;
  if (/^rgb\(/i.test(s)) return s;
  return stringToHslColor(s);
}

function colorEquals(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return sanitizeColorNameForLookup(String(a)) === sanitizeColorNameForLookup(String(b));
}

function sizeEquals(a, b) {
  if (a === b) return true;
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function formatRelativeIST(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ---------- Small inline Wishlist icon (outline & filled) ---------- */
/* Using an inline SVG ensures color changes via Tailwind text-* classes (currentColor). */
function WishlistIcon({ filled = false, className = "", title = "Wishlist" }) {
  // Path data adapted for a heart shape (standard 24x24)
  const pathD =
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4 8 4 9.5 5 12 7.5 14.5 5 16 4 17.5 4 20 4 22 6 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

  if (filled) {
    return (
      <svg
        aria-hidden="true"
        role="img"
        viewBox="0 0 24 24"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
      >
        <title>{title}</title>
        <path d={pathD} fill="currentColor" />
      </svg>
    );
  }

  // outline
  return (
    <svg
      aria-hidden="true"
      role="img"
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
    >
      <title>{title}</title>
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------- Component ---------- */
export default function ProductDetailsPage() {
  const { id: routeProductId } = useParams();
  const productId = routeProductId || "";
  const navigate = useNavigate();

  const { addToCart, cart = [], fetchCart } = useCart() || {};
  const wishlistCtx = useWishlist() || {};
  const { user: currentUser } = useContext(UserContext) || {};

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  // single source of truth for wishlist state comes from wishlistCtx
  const [wlBusyTop, setWlBusyTop] = useState(false);

  const [descExpanded, setDescExpanded] = useState(false);
  const [zipRaw, setZipRaw] = useState("");
  const [zipDisplay, setZipDisplay] = useState("");
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [deliveryMsg, setDeliveryMsg] = useState(null);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* Q&A & related products moved to separate components */
  const [relatedProducts, setRelatedProducts] = useState([]);

  function showToast(msg, ttl = 3500) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (msg) toastTimerRef.current = setTimeout(() => setToast(null), ttl);
  }

  /* ---------- load product + related ---------- */
  useEffect(() => {
    if (!productId) return;
    const ac = new AbortController();
    let mounted = true;

    async function loadAll() {
      try {
        const [pRes] = await Promise.all([fetch(`${API_BASE}/api/products/${productId}`, { signal: ac.signal })]);

        if (!pRes.ok) throw new Error(`Product fetch failed (${pRes.status})`);
        const pjson = await pRes.json();
        if (!mounted) return;

        setProduct(pjson || null);
        setSelectedImage(0);

        const firstColor = (pjson?.colors && pjson.colors.length && pjson.colors[0]) || "";
        let firstSize = "";
        try {
          if (pjson?.sizeStock && typeof pjson.sizeStock === "object" && Object.keys(pjson.sizeStock).length) {
            firstSize = Object.keys(pjson.sizeStock)[0];
          } else if (Array.isArray(pjson?.sizeRows) && pjson.sizeRows.length) {
            firstSize = pjson.sizeRows[0].size;
          } else if (Array.isArray(pjson?.sizes) && pjson.sizes.length) {
            firstSize = pjson.sizes[0];
          } else if (pjson?.sizes && typeof pjson.sizes === "string") {
            firstSize = pjson.sizes.split(",").map((s) => s.trim()).filter(Boolean)[0] || "";
          }
        } catch {}
        setSelectedColor(firstColor || "");
        setSelectedSize(firstSize || "");

        // related products (lightweight fetch)
        try {
          let list = [];
          const rr = await fetch(`${API_BASE}/api/products/related/${productId}`, { signal: ac.signal });
          if (rr.ok) list = await rr.json();
          if ((!Array.isArray(list) || list.length === 0) && pjson?.category) {
            const fallback = await fetch(
              `${API_BASE}/api/products?category=${encodeURIComponent(pjson.category)}&limit=8`,
              { signal: ac.signal }
            );
            if (fallback.ok) {
              const fb = await fallback.json();
              list = fb?.data || fb || [];
            }
          }
          const filtered = Array.isArray(list)
            ? list.filter((x) => String(x.id || x._id || x.productId) !== String(productId)).slice(0, 8)
            : [];
          if (mounted) setRelatedProducts(filtered);
        } catch (err) {
          console.warn("related fetch failed", err);
        }
      } catch (err) {
        console.error("loadAll failed:", err);
        showToast("Could not load product");
      }
    }

    loadAll();
    return () => {
      mounted = false;
      ac.abort();
    };
  }, [productId]);

  /* ---------- derived helpers (same as before) ---------- */
  const sizeStockMap = useMemo(() => {
    if (!product) return {};
    if (product.sizeStock && typeof product.sizeStock === "object" && !Array.isArray(product.sizeStock)) {
      const out = {};
      Object.keys(product.sizeStock).forEach((k) => (out[String(k)] = Number(product.sizeStock[k] || 0)));
      return out;
    }
    if (Array.isArray(product.sizeRows) && product.sizeRows.length) {
      const out = {};
      product.sizeRows.forEach((r) => {
        if (r && (r.size || r.size === 0)) out[String(r.size)] = Number(r.stock || 0);
      });
      return out;
    }
    if (product.size_stock && typeof product.size_stock === "string") {
      try {
        const parsed = JSON.parse(product.size_stock);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const out = {};
          Object.keys(parsed).forEach((k) => (out[String(k)] = Number(parsed[k] || 0)));
          return out;
        }
      } catch {}
    }
    return {};
  }, [product]);

  const requiresSize = useMemo(() => {
    if (sizeStockMap && Object.keys(sizeStockMap).length) return true;
    if (Array.isArray(product?.sizes) && product.sizes.length) return true;
    if (product?.sizes && typeof product.sizes === "string" && product.sizes.trim()) return true;
    return false;
  }, [product, sizeStockMap]);

  const requiresColor = useMemo(() => {
    return Array.isArray(product?.colors) && product.colors.length > 0;
  }, [product]);

  const colorImageMap = useMemo(() => {
    const imgs = Array.isArray(product?.images) ? product.images.slice() : [];
    const colors = Array.isArray(product?.colors) ? product.colors.slice() : [];
    const map = {};
    if (!imgs.length) {
      map.__all__ = ["/placeholder.png"];
      return map;
    }
    if (!colors.length) {
      map.__all__ = imgs;
      return map;
    }

    const nImgs = imgs.length;
    const nColors = colors.length;
    if (nImgs <= nColors) {
      for (let i = 0; i < nColors; i++) {
        const key = sanitizeColorNameForLookup(String(colors[i] || ""));
        map[key] = i < nImgs ? [imgs[i]] : [];
      }
      return map;
    }

    const base = Math.floor(nImgs / nColors);
    let remainder = nImgs % nColors;
    let idx = 0;
    for (let i = 0; i < nColors; i++) {
      const extra = remainder > 0 ? 1 : 0;
      const count = base + extra;
      const key = sanitizeColorNameForLookup(String(colors[i] || ""));
      map[key] = imgs.slice(idx, idx + count);
      idx += count;
      if (remainder > 0) remainder -= 1;
    }
    if (idx < nImgs) {
      const lastKey = sanitizeColorNameForLookup(String(colors[colors.length - 1] || ""));
      map[lastKey] = (map[lastKey] || []).concat(imgs.slice(idx));
    }
    return map;
  }, [product]);

  const galleryImages = useMemo(() => {
    const imgsAll = colorImageMap.__all__ || [];
    if (!requiresColor) {
      return imgsAll.length ? imgsAll : ["/placeholder.png"];
    }
    const key = sanitizeColorNameForLookup(String(selectedColor || ""));
    let imgs = colorImageMap[key];
    if (!imgs) {
      const colors = Array.isArray(product?.colors) ? product.colors : [];
      const firstKey = sanitizeColorNameForLookup(String(colors[0] || ""));
      imgs = colorImageMap[firstKey] || imgsAll;
    }
    return imgs && imgs.length ? imgs : ["/placeholder.png"];
  }, [colorImageMap, requiresColor, selectedColor, product]);

  useEffect(() => {
    setSelectedImage((s) => {
      if (!galleryImages || galleryImages.length === 0) return 0;
      return Math.min(s, galleryImages.length - 1);
    });
  }, [galleryImages.length, selectedColor]);

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return variants.find((v) => {
      const vColor = v.color ?? v.colour ?? v.variantColor ?? v.attributes?.color;
      const vSize = v.size ?? v.variantSize ?? v.attributes?.size;
      const okColor = requiresColor ? colorEquals(vColor, selectedColor) : true;
      const okSize = requiresSize ? sizeEquals(vSize, selectedSize) : true;
      return okColor && okSize;
    }) || null;
  }, [variants, selectedColor, selectedSize, requiresColor, requiresSize]);

  const availableStock = useMemo(() => {
    if (selectedVariant && selectedVariant.stock != null) return Number(selectedVariant.stock || 0);
    if (requiresSize && selectedSize) {
      const v = sizeStockMap && typeof sizeStockMap === "object" ? sizeStockMap[String(selectedSize)] : undefined;
      return Number(v ?? 0);
    }
    if (requiresSize && (!selectedSize || selectedSize === "")) {
      const total = Object.values(sizeStockMap || {}).reduce((acc, x) => acc + Number(x || 0), 0);
      return total || Number(product?.stock ?? product?.totalStock ?? 0);
    }
    const s = product?.stock ?? product?.inventory ?? product?.quantity ?? product?.totalStock ?? 0;
    return Number(s || 0);
  }, [selectedVariant, requiresSize, selectedSize, sizeStockMap, product]);

  useEffect(() => {
    if (availableStock <= 0) {
      setQuantity(0);
      return;
    }
    setQuantity((q) => {
      const curr = Number(q || 0);
      if (curr <= 0) return 1;
      return Math.min(curr, availableStock);
    });
  }, [availableStock]);

  const disablePurchase = useMemo(() => {
    return availableStock <= 0 || (requiresColor && !selectedColor) || (requiresSize && !selectedSize);
  }, [availableStock, requiresColor, requiresSize, selectedColor, selectedSize]);

  const addedToCart = useMemo(() => {
    try {
      const pid = product?.id ?? product?._id ?? product?.product_id;
      return Array.isArray(cart) && cart.some((it) => {
        if (!it) return false;
        const p = it.product ?? it.item ?? it;
        const itemPid = p?.id ?? p?._id ?? p?.product_id;
        if (!itemPid) return false;
        if (String(itemPid) !== String(pid)) return false;
        const sameColor = !selectedColor || !it.selectedColor || colorEquals(it.selectedColor, selectedColor);
        const sameSize = !selectedSize || !it.selectedSize || sizeEquals(it.selectedSize, selectedSize);
        return sameColor && sameSize;
      });
    } catch {
      return false;
    }
  }, [cart, product, selectedColor, selectedSize]);

  /* ---------- product actions ---------- */
  function prevImage() {
    setSelectedImage((s) => (s - 1 + galleryImages.length) % galleryImages.length);
  }
  function nextImage() {
    setSelectedImage((s) => (s + 1) % galleryImages.length);
  }

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i + 1) % galleryImages.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, galleryImages.length]);

  const openLightbox = (index = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);

  /* ---------- AUTH modal state ---------- */
  const [authPrompt, setAuthPrompt] = useState(null);

  // Unified auth prompt: always show "Please Login"
  function requireAuth() {
    setAuthPrompt({ message: "Please Login" });
  }
  function closeAuthPrompt() {
    setAuthPrompt(null);
  }
  function goToLogin() {
    // redirect to external login page
    window.location.href = "https://dripzoid.com/login";
  }

  /* ---------- derive isWishlisted from wishlist context (single source of truth) ---------- */
  // NOTE: include wishlistCtx.items in dependencies so this recomputes when wishlist updates.
  const isWishlisted = useMemo(() => {
    try {
      if (!product) return false;
      // If context exposes helper, prefer it
      const pid = product?.id ?? product?._id ?? product?.product_id ?? product;
      if (typeof wishlistCtx?.isWishlisted === "function") {
        return Boolean(wishlistCtx.isWishlisted(pid));
      }
      // Else use items array
      if (Array.isArray(wishlistCtx?.items)) {
        if (!pid) return false;
        return wishlistCtx.items.some((it) => {
          if (!it) return false;
          const p = it.product ?? it;
          const itemPid = p?.id ?? p?._id ?? p?.product_id;
          if (!itemPid) return false;
          return String(itemPid) === String(pid);
        });
      }
      return false;
    } catch {
      return false;
    }
  }, [wishlistCtx, wishlistCtx?.items, product]);

  /* ---------- wishlist toggle (top button) ---------- */
  async function handleTopWishlistToggle() {
    if (!wishlistCtx || typeof wishlistCtx.toggle !== "function") {
      showToast("Wishlist not available");
      return;
    }
    if (!currentUser) {
      requireAuth();
      return;
    }
    setWlBusyTop(true);
    try {
      // toggle will add or remove depending on state in wishlist context
      await wishlistCtx.toggle(product?.id ?? product?._id ?? product?.product_id ?? product);
      // Do not flip local state: isWishlisted is derived from wishlistCtx (single source of truth).
      // Ensure wishlistCtx updates after toggle so isWishlisted memo re-evaluates.
      if (typeof wishlistCtx?.fetch === "function") {
        // optional refresh if your context exposes a fetch helper
        try { wishlistCtx.fetch(); } catch {}
      }
    } catch (err) {
      console.warn("wishlist toggle failed", err);
      showToast("Could not update wishlist");
    } finally {
      setWlBusyTop(false);
    }
  }

  /* ---------- add to cart & buy now require login as requested ---------- */
  async function addToCartHandler() {
    if (!addToCart) {
      showToast("Cart not available");
      return;
    }
    if (!currentUser) {
      requireAuth();
      return;
    }
    if (disablePurchase && !addedToCart) {
      showToast("Please select size and color");
      return;
    }
    try {
      const payload = {
        product: product,
        quantity: Number(quantity || 1),
        product_id: product?.id ?? product?._id ?? null,
        price: product?.price ?? product?.cost ?? 0,
        images: Array.isArray(product?.images) ? product.images.join(",") : product?.images ?? product?.image ?? "",
        selectedColor: selectedColor || null,
        selectedSize: selectedSize || null,
        variantId: selectedVariant?.id || selectedVariant?._id || null,
      };
      await addToCart(payload);
      showToast("Added to cart");
      if (fetchCart) fetchCart();
    } catch (err) {
      console.error("addToCart failed", err);
      showToast("Could not add to cart");
    }
  }

  function goToCart() {
    navigate("/cart");
  }

  function buyNowHandler() {
    if (!currentUser) {
      requireAuth();
      return;
    }
    const needSelectionError = (requiresColor && !selectedColor) || (requiresSize && !selectedSize);
    if (needSelectionError) {
      showToast("Select size and color");
      return;
    }
    if (availableStock <= 0) {
      showToast("Out of stock");
      return;
    }
    if (quantity > availableStock) {
      showToast(`Only ${availableStock} left in stock`);
      setQuantity(availableStock);
      return;
    }

    const itemForCheckout = {
      product: product,
      quantity: Number(quantity || 1),
      product_id: product?.id ?? product?._id ?? null,
      price: product?.price ?? product?.cost ?? 0,
      images: Array.isArray(product?.images) ? product.images.join(",") : product?.images ?? product?.image ?? "",
      selectedColor: selectedColor || null,
      selectedSize: selectedSize || null,
      variantId: selectedVariant?.id || selectedVariant?._id || null,
    };

    navigate("/checkout", {
      state: {
        items: [itemForCheckout],
        mode: "buy-now",
        fromCart: false,
      },
    });
    showToast("Proceeding to checkout...");
  }

  async function handleShare() {
    try {
      const shareUrl = window.location.href;
      const title = product?.name || "Check this product";
      const text = (product?.description || "").slice(0, 140);
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url: shareUrl });
          showToast("Shared");
          return;
        } catch {}
      }
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedText = encodeURIComponent(`${title} — ${text}`);
      const twitter = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      window.open(twitter, "_blank", "noopener,noreferrer,width=600,height=400");
      showToast("Opened share options");
    } catch (err) {
      console.error("share failed", err);
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Link copied to clipboard");
      } catch {
        showToast("Could not share");
      }
    }
  }

  function formatZipInput(val) {
    const digits = String(val || "").replace(/\D/g, "").slice(0, 6);
    setZipRaw(digits);
    if (digits.length <= 3) setZipDisplay(digits);
    else setZipDisplay(digits.slice(0, 3) + " " + digits.slice(3));
  }

  async function checkDelivery() {
    const pin = zipRaw.trim();
    if (!/^\d{6}$/.test(pin)) {
      setDeliveryMsg({ ok: false, text: "Please enter a valid 6-digit PIN" });
      return;
    }
    setIsCheckingDelivery(true);
    try {
      const url = `${API_BASE}/api/shipping/estimate?pin=${encodeURIComponent(pin)}&cod=0`;
      const res = await fetch(url);

      if (!res.ok) {
        setDeliveryMsg({ ok: false, text: "Could not fetch delivery estimate" });
        return;
      }

      const json = await res.json();
      const companies = json?.estimate || [];

      if (Array.isArray(companies) && companies.length > 0) {
        const sorted = companies.filter((c) => c && c.etd).sort((a, b) => new Date(a.etd) - new Date(b.etd));
        const best = sorted[0] || companies[0];
        const etdRaw = best.etd || best.estimated_delivery;

        if (etdRaw) {
          const date = new Date(etdRaw);
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const dayName = days[date.getDay()];
          const day = String(date.getDate()).padStart(2, "0");
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          setDeliveryMsg({ ok: true, text: `Delivery Expected by ${dayName}, ${day}-${month}-${year}` });
          return;
        }
      }

      setDeliveryMsg({ ok: false, text: "Sorry, delivery is not available to this PIN" });
    } catch (err) {
      console.warn("shipping estimate failed", err);
      setDeliveryMsg({ ok: false, text: "Could not fetch delivery estimate" });
    } finally {
      setIsCheckingDelivery(false);
    }
  }

  if (!product) {
    return <div className="p-8 text-center text-black dark:text-white">Loading product...</div>;
  }

  const formatINR = (val) => {
    try {
      const n = Number(val || 0);
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `₹${val}`;
    }
  };

  /* ---------- UI rendering (fixed description JSX and unified auth behavior) ---------- */

  return (
    <div className="bg-white dark:bg-black min-h-screen text-black dark:text-white pb-24">
      <div className="container mx-auto p-4 md:p-6 space-y-8">
        {/* Gallery + details */}
        <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border border-gray-200/60 dark:border-gray-700/60">
          <div>
            <div className="relative">
              <button onClick={() => openLightbox(selectedImage)} className="w-full block rounded-xl overflow-hidden" aria-label="Open image">
                <img
                  src={galleryImages[selectedImage]}
                  alt={`${product.name} - image ${selectedImage + 1}`}
                  className="w-full h-[48vw] sm:h-[380px] md:h-[460px] lg:h-[520px] object-cover rounded-xl shadow transition-transform duration-300 hover:scale-[1.01]"
                />
              </button>

              <div className="absolute top-3 left-3 bg-black/80 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
                {selectedImage + 1}/{galleryImages.length}
              </div>

              <button onClick={prevImage} type="button" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-black dark:text-white p-2 rounded-full shadow z-30" aria-label="Previous image">
                <ChevronLeft />
              </button>
              <button onClick={nextImage} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-black dark:text-white p-2 rounded-full shadow z-30" aria-label="Next image">
                <ChevronRight />
              </button>
            </div>

            <div className="flex gap-3 mt-3 overflow-x-auto thumbs-container py-1 snap-x snap-mandatory">
              {galleryImages.map((g, i) => {
                const isActive = i === selectedImage;
                return (
                  <button
                    key={`${g}-${i}`}
                    onClick={() => setSelectedImage(i)}
                    aria-selected={isActive}
                    aria-label={`Image ${i + 1}`}
                    title={`Image ${i + 1}`}
                    type="button"
                    className="relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden focus:outline-none snap-start"
                    style={{ scrollSnapAlign: "center" }}
                  >
                    <div className={`w-full h-full rounded-md border transition-all duration-200 overflow-hidden ${isActive ? "border-2 border-black dark:border-white shadow-md" : "border border-gray-300 dark:border-gray-700 hover:border-gray-500"}`}>
                      <img src={g} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-start justify-between">
              <div className="pr-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-black dark:text-white">{product.name}</h1>

                <div className="mb-3">
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    {(!product.description || product.description.trim().length === 0) ? (
                      "No description available."
                    ) : product.description.length <= 160 ? (
                      product.description
                    ) : descExpanded ? (
                      <>
                        {product.description}
                        <button onClick={() => setDescExpanded(false)} className="ml-2 text-sm font-medium underline underline-offset-2" aria-expanded="true" type="button">Read less</button>
                      </>
                    ) : (
                      <>
                        {product.description.slice(0, 160).trim()}.
                        <button onClick={() => setDescExpanded(true)} className="ml-2 text-sm font-medium underline underline-offset-2" aria-expanded="false" type="button">Read more</button>
                      </>
                    )}
                  </p>
                </div>

                <div className="text-2xl font-semibold mb-2">{formatINR(product.price)}</div>
              </div>

              <div className="flex flex-col items-end gap-3">
                {/* Wishlist button */}
                <button
                  onClick={handleTopWishlistToggle}
                  disabled={wlBusyTop}
                  aria-pressed={isWishlisted}
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-full border hover:shadow focus:outline-none transition ${
                    isWishlisted
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {/* ensure svg color explicitly set so it updates even if parent context mutates */}
                  <WishlistIcon
                    filled={isWishlisted}
                    className={`w-5 h-5 ${isWishlisted ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-300"}`}
                    title={isWishlisted ? "Wishlisted" : "Add to wishlist"}
                  />
                </button>
              </div>
            </div>

            <div className="mb-4">
              {availableStock <= 0 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-black text-white text-sm font-semibold">Out of stock</div>
              ) : availableStock <= 10 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-white text-black border text-sm font-semibold">Only {availableStock} left</div>
              ) : availableStock <= 20 ? (
                <div className="inline-block px-3 py-1 rounded-full bg-white text-black border text-sm font-semibold">Only a few left</div>
              ) : (
                <div className="inline-block px-3 py-1 rounded-full bg-white text-black border text-sm font-semibold">In stock</div>
              )}
            </div>

            {/* Colors */}
            {requiresColor && (
              <div className="mb-4">
                <div className="font-medium mb-2">Color</div>
                <div className="flex gap-3 items-center flex-wrap">
                  {(product.colors || []).map((c, idx) => {
                    const label = typeof c === "string" ? c : (c && (c.label || c.name)) || String(c || "");
                    const isSelectedFlag = colorEquals(c, selectedColor);
                    return (
                      <button
                        key={`${String(label)}-${idx}`}
                        onClick={() => setSelectedColor(c)}
                        aria-pressed={isSelectedFlag}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${isSelectedFlag ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white" : "bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sizes */}
            {requiresSize && (
              <div className="mb-4">
                <div className="font-medium mb-2">Size</div>
                <div className="flex gap-3 flex-wrap">
                  {(Array.isArray(product.sizes) ? product.sizes : Object.keys(sizeStockMap) || []).map((s) => {
                    const label = typeof s === "string" ? s : (s && (s.size || s.name)) || String(s || "");
                    const active = sizeEquals(label, selectedSize);
                    const avail = Number(sizeStockMap && sizeStockMap[String(label)] || 0);
                    return (
                      <button
                        key={String(label)}
                        onClick={() => {
                          setSelectedSize(label);
                          const a = avail || Number(product.stock || 0);
                          setQuantity(a > 0 ? 1 : 0);
                        }}
                        className={`px-3 py-2 rounded-lg border text-sm ${active ? "bg-black text-white dark:bg-white dark:text-black" : "bg-gray-100 dark:bg-gray-800"}`}
                        aria-pressed={active}
                        type="button"
                        disabled={avail === 0}
                      >
                        {String(label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <div className="font-medium mb-2">Quantity</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => {
                    if (!q || q <= 0) return 0;
                    return Math.max(1, q - 1);
                  })}
                  className="px-3 py-1 border rounded"
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="min-w-[36px] text-center" aria-live="polite">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => {
                    const avail = Number(availableStock || 0);
                    if (avail <= 0) return 0;
                    const curr = q || 0;
                    return Math.min(avail, curr + 1);
                  })}
                  className={`px-3 py-1 border rounded ${availableStock <= 0 || quantity >= availableStock ? "opacity-50 cursor-not-allowed" : ""}`}
                  type="button"
                  disabled={availableStock <= 0 || quantity >= availableStock}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 items-center flex-col md:flex-row">
              <motion.button onClick={addedToCart ? goToCart : addToCartHandler} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={disablePurchase && !addedToCart} className={`w-full md:flex-1 py-3 rounded-full flex items-center justify-center gap-2 transition ${disablePurchase && !addedToCart ? "opacity-50 cursor-not-allowed bg-gray-100 text-black" : "bg-black text-white"}`} aria-label={addedToCart ? "Go to cart" : "Add to cart"} type="button">
                <ShoppingCart /> <span className="label">{addedToCart ? "Go to Cart" : "Add to Cart"}</span>
              </motion.button>

              <motion.button onClick={buyNowHandler} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={disablePurchase} className={`w-full md:flex-1 py-3 rounded-full flex items-center justify-center gap-2 transition ${disablePurchase ? "opacity-50 cursor-not-allowed bg-white text-black border" : "bg-white text-black border"}`} aria-label="Buy now" type="button">
                <CreditCard /> <span className="label">Buy Now</span>
              </motion.button>

              <button onClick={handleShare} type="button" className="p-2 rounded-full border ml-0 md:ml-1 hover:scale-105 transition" aria-label="Share product">
                <Share2 />
              </button>
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-start md:items-center gap-3">
              <input placeholder="PIN code (e.g. 123 456)" value={zipDisplay} onChange={(e) => formatZipInput(e.target.value)} className="p-3 border rounded-full w-full md:w-48 bg-white dark:bg-gray-900 text-black dark:text-white" inputMode="numeric" aria-label="PIN code" />
              <button onClick={checkDelivery} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border" type="button" disabled={isCheckingDelivery}>
                <MapPin size={16} />
                {isCheckingDelivery ? "Checking..." : "Check"}
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-300 ml-0 md:ml-4">
                {deliveryMsg ? <span className={`${deliveryMsg.ok ? "text-black dark:text-white" : "text-red-600 dark:text-red-400"}`}>{deliveryMsg.text}</span> : <span>Check estimated delivery</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <div className="w-full">
          <Reviews productId={productId} apiBase={API_BASE} currentUser={currentUser} showToast={showToast} isDesktop={isDesktop} />
        </div>

        {/* Q&A (separate component) */}
        <QandA productId={productId} showToast={showToast} />

        {/* Related products */}
        <RelatedProducts relatedProducts={relatedProducts} galleryImages={galleryImages} />
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80" onClick={closeLightbox} />
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative max-w-5xl w-full mx-4">
            <div className="relative">
              <img src={galleryImages[lightboxIndex]} alt={`Lightbox ${lightboxIndex + 1}`} className="w-full max-h-[80vh] object-contain rounded" />
              <button onClick={closeLightbox} className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800 text-black dark:text-white p-2 rounded-full" aria-label="Close lightbox"><X /></button>

              <button onClick={() => setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800 text-black dark:text-white p-2 rounded-full" aria-label="Previous in lightbox"><ChevronLeft /></button>

              <button onClick={() => setLightboxIndex((i) => (i + 1) % galleryImages.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800 text-black dark:text-white p-2 rounded-full" aria-label="Next in lightbox"><ChevronRight /></button>
            </div>
          </motion.div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
          <div className="px-4 py-2 bg-black text-white rounded-full shadow">{toast}</div>
        </div>
      )}

      {/* AUTH PROMPT modal */}
      {authPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Login required">
          <div className="absolute inset-0 bg-black/40" onClick={closeAuthPrompt} />
          <div className="relative bg-white dark:bg-gray-900 p-6 rounded-xl z-70 max-w-md mx-4 shadow-2xl ring-1 ring-black/5">
            <h4 className="text-lg font-semibold mb-2 text-black dark:text-white">Login required</h4>
            <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">{authPrompt.message || "Please Login"}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={closeAuthPrompt} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button onClick={goToLogin} className="px-4 py-2 rounded-lg bg-black text-white">Login</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
