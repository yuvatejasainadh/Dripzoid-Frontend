// src/components/Reviews.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Card, CardContent, Typography } from "@mui/material";
import { ThumbsUp, ThumbsDown, Send, Trash2, Paperclip } from "lucide-react";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import useUploader from "../hooks/useUploader"; // <-- ensure path is correct

const DEFAULT_API_BASE = process.env.REACT_APP_API_BASE;
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
const READ_MORE_LIMIT = 280;
const MAX_FILES = 6;
const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12MB

// Modern, responsive button base
const BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-shadow duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black/20 dark:focus:ring-white/20";

/* ---------- Helpers & small components ---------- */
function ReadMore({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  if (text.length <= READ_MORE_LIMIT) return <div className="text-black dark:text-white">{text}</div>;
  return (
    <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
      <div className="break-words">{open ? text : text.slice(0, READ_MORE_LIMIT) + "..."}</div>
      <button
        onClick={() => setOpen((s) => !s)}
        className="mt-2 text-xs underline decoration-black/30 dark:decoration-white/30"
        type="button"
        aria-expanded={open}
      >
        {open ? "Read less" : "Read more"}
      </button>
    </div>
  );
}

function Lightbox({ item, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (item) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
    return undefined;
  }, [item, onClose]);

  if (!item) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div onClick={(e) => e.stopPropagation()} className="max-w-[95vw] max-h-[95vh]">
        {item.type === "image" ? (
          // eslint-disable-next-line
          <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain rounded-xl shadow-lg" />
        ) : (
          <video src={item.url} controls className="max-w-full max-h-full rounded-xl shadow-lg" />
        )}
      </div>
      <button onClick={onClose} className="absolute top-6 right-6 text-white text-xl bg-black/40 rounded-full p-2" type="button" aria-label="Close">
        ✕
      </button>
    </div>
  );
}

function StarDisplay({ value = 0, size = 16 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (value >= i) stars.push(<FaStar key={i} size={size} className="text-yellow-400" />);
    else if (value >= i - 0.5) stars.push(<FaStarHalfAlt key={i} size={size} className="text-yellow-400" />);
    else stars.push(<FaRegStar key={i} size={size} className="text-yellow-400" />);
  }
  return <div className="flex items-center gap-1" aria-hidden="true">{stars}</div>;
}

function StarSelector({ value = 5, onChange, size = 20 }) {
  function handleClick(starIndex) {
    onChange?.(starIndex);
  }

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const key = `star-${i}`;
    const el = value >= i ? <FaStar key={key} size={size} className="text-yellow-400" /> : <FaRegStar key={key} size={size} className="text-yellow-400" />;
    stars.push(
      <button
        key={key}
        onClick={() => handleClick(i)}
        type="button"
        className="p-1 rounded-md hover:scale-110 transition-transform"
        aria-label={`Set rating to ${i}`}
      >
        {el}
      </button>
    );
  }
  return <div className="flex items-center gap-1">{stars}</div>;
}

// deterministic HSL color generator for avatar backgrounds
function stringToHslColor(str = "", s = 65, l = 45) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

function formatRelativeTime(isoOrDate) {
  if (!isoOrDate) return "";
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return String(isoOrDate);
  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }
  try {
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return date.toLocaleString();
  }
}

function HistogramBar({ pct = 0 }) {
  const pctNum = Number(pct) || 0;
  const foregroundWidth = pctNum > 0 ? `${pctNum}%` : "6px";
  return (
    <div
      className="relative flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={pctNum}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${pctNum}%`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-600"
        style={{
          width: foregroundWidth,
          background: "linear-gradient(90deg,#4b5563,#111827)",
          boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.08)"
        }}
      />
    </div>
  );
}

/* ---------- MAIN Reviews component with duplicate-instance protection ---------- */
export default function Reviews({ productId, apiBase = DEFAULT_API_BASE, currentUser = null, showToast = () => {} }) {
  /**
   * Rendering strategy:
   * - Keep the duplicate-instance protection logic to avoid two visible <Reviews /> copies (mobile vs desktop).
   * - Render the histogram **once** per breakpoint:
   *    - mobile: show histogram inline in the header (top)
   *    - desktop: show histogram in the sticky side column
   */

  const isClient = typeof window !== "undefined" && typeof window.innerWidth === "number";
  const isMobileInitial = isClient ? window.innerWidth < 1024 : false; // Tailwind 'lg' ~ 1024
  const initialShouldRender = (() => {
    if (!isClient) return true;
    if (!window.__REVIEWS_RENDER_TRACKER) window.__REVIEWS_RENDER_TRACKER = { mobileRendered: false, desktopRendered: false };
    const tracker = window.__REVIEWS_RENDER_TRACKER;
    if (isMobileInitial) {
      if (tracker.mobileRendered) return false;
      tracker.mobileRendered = true;
      return true;
    } else {
      if (tracker.desktopRendered) return false;
      tracker.desktopRendered = true;
      return true;
    }
  })();

  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1024 : true));
  useEffect(() => {
    const onResize = () => {
      try {
        setIsDesktop(window.innerWidth >= 1024);
      } catch {}
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [shouldRender] = useState(initialShouldRender);

  useEffect(() => {
    return () => {
      try {
        if (typeof window !== "undefined" && window.__REVIEWS_RENDER_TRACKER) {
          if (isMobileInitial) window.__REVIEWS_RENDER_TRACKER.mobileRendered = false;
          else window.__REVIEWS_RENDER_TRACKER.desktopRendered = false;
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  /* ---------- regular state/hooks ---------- */
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewPreviews, setReviewPreviews] = useState([]);
  const previewsRef = useRef([]);
  const [fileWarning, setFileWarning] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [canReviewFlag, setCanReviewFlag] = useState(null);
  const [voteCache, setVoteCache] = useState(() => {
    try {
      if (typeof window === "undefined") return {};
      return JSON.parse(localStorage.getItem("vote_cache_v1") || "{}");
    } catch {
      return {};
    }
  });
  const [lightboxItem, setLightboxItem] = useState(null);
  const [userCanReview, setUserCanReview] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const toastTimerRef = useRef(null);

  function internalToast(msg, ttl = 4000) {
    showToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => showToast(null), ttl);
  }

  const { upload, isUploading: isUploadingFiles, error: uploadError } = useUploader(apiBase, {
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
  });

  function normalizeReviewsPayload(payload) {
    if (!payload) return [];
    let arr = [];
    if (Array.isArray(payload)) arr = payload;
    else if (Array.isArray(payload.data)) arr = payload.data;
    else if (Array.isArray(payload.reviews)) arr = payload.reviews;
    else {
      try {
        const vals = Object.values(payload).filter((v) => v && typeof v === "object" && ("id" in v || "productId" in v));
        if (vals.length) arr = vals;
      } catch {
        arr = [];
      }
    }

    return arr.map((r) => {
      const clone = { ...r };
      clone.userName = clone.userName || clone.user_name || clone.username || clone.name || clone.fullName || clone.full_name || null;

      const imagesField = clone.imageUrls || clone.images || clone.media || clone.imageUrl || clone.image || null;
      let mediaArr = [];
      if (Array.isArray(imagesField)) mediaArr = imagesField;
      else if (typeof imagesField === "string" && imagesField.trim()) {
        try {
          const parsed = JSON.parse(imagesField);
          if (Array.isArray(parsed)) mediaArr = parsed;
          else if (typeof parsed === "string") mediaArr = [parsed];
          else mediaArr = [];
        } catch {
          mediaArr = imagesField.split(",").map((s) => s.trim()).filter(Boolean);
        }
      } else if (imagesField && typeof imagesField === "object" && imagesField.url) {
        mediaArr = [imagesField.url];
      }

      clone.media = (mediaArr || []).map((m) => {
        if (!m) return null;
        const url = (typeof m === "object" && m.url) ? m.url : String(m);
        const lower = url.split("?")[0].toLowerCase();
        const isVideo = /\.(mp4|webm|ogg|mov|m4v)$/i.test(lower) || lower.includes("video") || lower.includes("/video/");
        return { url, type: isVideo ? "video" : "image", name: url.split("/").pop() };
      }).filter(Boolean);

      if (!clone.imageUrl && clone.media && clone.media.length > 0) clone.imageUrl = clone.media[0].url;

      clone.likes = typeof clone.likes === "number" ? clone.likes : (typeof clone.like === "number" ? clone.like : 0);
      clone.dislikes = typeof clone.dislikes === "number" ? clone.dislikes : (typeof clone.dislike === "number" ? clone.dislike : 0);

      return clone;
    });
  }

  async function fetchReviews() {
    try {
      const r = await fetch(`${apiBase}/api/reviews/product/${productId}`);
      if (r.ok) {
        const rjson = await r.json();
        const normalized = normalizeReviewsPayload(rjson);
        setReviews(normalized);
        await fetchVotesForReviews(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn("fetchReviews failed", err);
    }
    return reviews;
  }

  async function fetchVotesForReviews(revs = []) {
    if (!Array.isArray(revs) || revs.length === 0) return;
    const ids = revs.map((r) => r.id).filter(Boolean);
    if (ids.length === 0) return;
    try {
      const q = `${apiBase}/api/votes?entityType=review&entityIds=${ids.join(",")}`;
      const res = await fetch(q);
      if (res.ok) {
        const json = await res.json();
        const map = {};
        let votesNode = null;
        if (json && typeof json === "object") {
          if (json.votes && typeof json.votes === "object") votesNode = json.votes;
          else votesNode = json;
        } else {
          votesNode = json;
        }
        if (Array.isArray(votesNode)) {
          votesNode.forEach((it) => {
            const id = String(it.entityId ?? it.id ?? it._id);
            if (!id) return;
            const likes = Number(it.like ?? it.likes ?? it.countLikes ?? it.likesCount ?? 0);
            const dislikes = Number(it.dislike ?? it.dislikes ?? it.countDisCounts ?? it.dislikesCount ?? 0);
            map[id] = { likes, dislikes };
          });
        } else if (votesNode && typeof votesNode === "object") {
          Object.keys(votesNode).forEach((k) => {
            if (!/^\d+$/.test(String(k))) return;
            const it = votesNode[k] || {};
            const likes = Number(it.like ?? it.likes ?? it.countLikes ?? it.likesCount ?? 0);
            const dislikes = Number(it.dislike ?? it.dislikes ?? it.countDiscounts ?? it.dislikesCount ?? 0);
            map[String(k)] = { likes, dislikes };
          });
        }
        if (Object.keys(map).length > 0) {
          setReviews((prev) =>
            (Array.isArray(prev) ? prev : []).map((r) => {
              const m = map[String(r.id)];
              if (!m) return r;
              return { ...r, likes: m.likes, dislikes: m.dislikes };
            })
          );
          return;
        }
      }
    } catch (err) {
      console.warn("Batch votes fetch failed", err);
    }
    for (const r of revs) {
      try {
        const url = `${apiBase}/api/votes/review/${r.id}`;
        const res2 = await fetch(url);
        if (!res2.ok) continue;
        const j = await res2.json();
        const votesObj = (j && typeof j === "object" && (j.votes || j.data)) ? (j.votes || j.data) : j;
        const likes = Number(votesObj?.like ?? votesObj?.likes ?? votesObj?.countLikes ?? votesObj?.likesCount ?? 0);
        const dislikes = Number(votesObj?.dislike ?? votesObj?.dislikes ?? votesObj?.countDisLikes ?? votesObj?.dislikesCount ?? 0);
        setReviews((prev) => (Array.isArray(prev) ? prev.map((x) => (String(x.id) === String(r.id) ? { ...x, likes, dislikes } : x)) : prev));
      } catch (err) {
        // ignore
      }
    }
  }

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    async function checkEligibility() {
      const actingUser = currentUser || (() => {
        try { return (typeof window !== "undefined") ? JSON.parse(localStorage.getItem("current_user") || "null") : null; } catch { return null; }
      })();
      if (!actingUser) {
        setUserCanReview(false);
        setUserHasReviewed(false);
        return;
      }

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const q = `${apiBase}/api/user/orders/verify?userId=${actingUser.id}&productId=${productId}`;
        const res = await fetch(q, {
          method: "GET",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (res.ok) {
          const json = await res.json();
          if (json && (typeof json.canReview === "boolean" || typeof json.hasReviewed === "boolean")) {
            if (typeof json.canReview === "boolean") setUserCanReview(Boolean(json.canReview));
            if (typeof json.hasReviewed === "boolean") setUserHasReviewed(Boolean(json.hasReviewed));
            return;
          }
        }
      } catch (err) {
        // fallthrough to fallback logic below
      }

      try {
        const purchased = await userHasPurchased(productId, actingUser);
        setUserCanReview(Boolean(purchased));
      } catch {
        setUserCanReview(false);
      }

      const has = (reviews || []).some((r) => String(r.userId) === String(actingUser.id));
      setUserHasReviewed(Boolean(has));
    }
    checkEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, currentUser, reviews.length]);

  useEffect(() => {
    async function enrich() {
      const need = reviews.filter((r) => (!r.userName || r.userName === null) && (r.userId || r.user_id));
      if (!need.length) return;
      for (const r of need) {
        const uid = r.userId || r.user_id;
        try {
          const res = await fetch(`${apiBase}/api/users/${uid}`);
          if (!res.ok) continue;
          const j = await res.json();
          const uname = j?.name || j?.fullName || j?.username || j?.email || null;
          if (uname) {
            setReviews((prev) => (prev || []).map((x) => (String(x.id) === String(r.id) ? { ...x, userName: uname } : x)));
          }
        } catch {
          // ignore
        }
      }
    }
    enrich();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews.length]);

  useEffect(() => {
    return () => {
      try {
        (previewsRef.current || []).forEach((p) => {
          if (p && p.url && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
        });
      } catch {}
    };
  }, []);

  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;
    const nextFiles = [...reviewFiles];
    const nextPreviews = [...reviewPreviews];
    for (const file of files) {
      if (nextFiles.length >= MAX_FILES) {
        setFileWarning(`Maximum ${MAX_FILES} attachments allowed`);
        break;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileWarning(`Each file must be <= ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB`);
        continue;
      }
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        setFileWarning("Only image and video files are allowed");
        continue;
      }
      nextFiles.push(file);
      const url = URL.createObjectURL(file);
      nextPreviews.push({ url, type: file.type.startsWith("video/") ? "video" : "image", name: file.name || `${Date.now()}` });
    }
    setReviewFiles(nextFiles);
    setReviewPreviews(nextPreviews);
    previewsRef.current = nextPreviews;
    e.target.value = "";
  }

  function removeAttachment(index) {
    setReviewFiles((prev) => {
      const arr = Array.isArray(prev) ? prev.slice() : [];
      arr.splice(index, 1);
      return arr;
    });
    setReviewPreviews((prev) => {
      const arr = Array.isArray(prev) ? prev.slice() : [];
      const removed = arr.splice(index, 1);
      if (removed && removed[0] && removed[0].url && removed[0].url.startsWith("blob:")) {
        try { URL.revokeObjectURL(removed[0].url); } catch {}
      }
      previewsRef.current = arr;
      return arr;
    });
  }

  function displayNameForUser(user) {
    if (!user) return null;
    return user.name || user.fullName || user.full_name || user.firstName || user.first_name || user.email || null;
  }

  async function userHasPurchased(productIdToCheck, user) {
    if (!user || !user.id) return false;
    try {
      const token = (typeof window !== "undefined") ? localStorage.getItem("token") : null;
      const res = await fetch(`${apiBase}/api/user/orders/verify?userId=${user.id}&productId=${productIdToCheck}`, {
        method: "GET",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json === "boolean") return json;
        if (typeof json?.canReview === "boolean") return json.canReview;
        if (typeof json?.purchased === "boolean") return json.purchased;
        if (Array.isArray(json) && json.length > 0) return true;
        if (json && (json.found || json.count > 0)) return true;
      }
    } catch { /* ignore */ }
    try {
      const token = (typeof window !== "undefined") ? localStorage.getItem("token") : null;
      const res = await fetch(`${apiBase}/api/user/orders/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId: user.id, productId: productIdToCheck }),
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json === "boolean") return json;
        if (typeof json?.canReview === "boolean") return json.canReview;
        if (typeof json?.purchased === "boolean") return json.purchased;
        if (Array.isArray(json) && json.length > 0) return true;
        if (json && (json.found || json.count > 0)) return true;
      }
    } catch { /* ignore */ }
    try {
      const orders = (typeof window !== "undefined") ? JSON.parse(localStorage.getItem("orders_v1") || "[]") : [];
      return orders.some((o) => String(o.productId) === String(productIdToCheck) && String(o.userId) === String(user.id));
    } catch {
      return false;
    }
  }

  async function handleSubmitReview() {
    const actingUser = currentUser || (() => {
      try { return (typeof window !== "undefined") ? JSON.parse(localStorage.getItem("current_user") || "null") : null; } catch { return null; }
    })();

    if (!actingUser) {
      internalToast("Please sign in to submit a review.");
      return;
    }
    if (!reviewText.trim() && !reviewRating && reviewFiles.length === 0) {
      setFileWarning("Please provide a rating, text, or attach a photo/video.");
      return;
    }

    setIsSubmittingReview(true);

    if (canReviewFlag === false) {
      setIsSubmittingReview(false);
      alert("You did not buy this product — only verified buyers can leave reviews.");
      return;
    }

    const purchased = await userHasPurchased(productId, actingUser);
    if (!purchased) {
      setIsSubmittingReview(false);
      alert("You did not buy this product — only verified buyers can leave reviews.");
      setCanReviewFlag(false);
      return;
    }

    const tempId = -Date.now();
    const tempReview = {
      id: tempId,
      userId: actingUser.id,
      name: displayNameForUser(actingUser) || actingUser.email || "Anonymous",
      title: reviewTitle || null,
      rating: reviewRating,
      text: reviewText || "",
      likes: 0,
      dislikes: 0,
      created_at: new Date().toISOString(),
      pending: true,
      media: reviewPreviews.map((p) => ({ url: p.url, type: p.type, name: p.name })),
      imageUrl: reviewPreviews[0]?.url || null,
    };

    setReviews((prev) => [tempReview, ...(Array.isArray(prev) ? prev : [])]);
    setShowReviewForm(true);
    setReviewSubmitted(false);

    try {
      let uploaded = [];
      if (reviewFiles && reviewFiles.length > 0) {
        try {
          uploaded = await upload(reviewFiles);
          if (!Array.isArray(uploaded) || uploaded.length === 0) {
            throw new Error("Upload returned no urls");
          }
        } catch (upErr) {
          console.error("Upload failed:", upErr);
          internalToast("Attachment upload failed. Please try again.");
          setIsSubmittingReview(false);
          setReviews((prev) => (Array.isArray(prev) ? prev.filter((r) => String(r.id) !== String(tempId)) : []));
          return;
        }
      }

      const payload = {
        productId,
        userId: actingUser.id,
        userName: tempReview.name,
        title: tempReview.title,
        rating: tempReview.rating,
        text: tempReview.text,
        imageUrls: uploaded.map((u) => u.url),
        images: uploaded.map((u) => u.url),
        imageUrl: uploaded.length ? uploaded[0].url : "",
      };

      const token = (typeof window !== "undefined") ? localStorage.getItem("token") : null;
      const res = await fetch(`${apiBase}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errText = "";
        try { errText = await res.text(); } catch {}
        throw new Error(`Review POST failed (${res.status}) ${errText}`);
      }

      const created = await res.json();

      const createdNormalized = {
        ...created,
        id: created?.id || created?._id || tempId,
        userId: created?.userId || created?.user_id || tempReview.userId,
        userName: created?.userName || created?.name || created?.username || tempReview.name,
        title: created?.title ?? tempReview.title,
        rating: created?.rating ?? tempReview.rating,
        text: created?.text ?? tempReview.text,
        pending: false,
        media: (() => {
          const inputArr =
            created.imageUrls || created.images || created.media ||
            (typeof created.imageUrl === "string" && created.imageUrl ? created.imageUrl.split(",") : []);
          const arr = Array.isArray(inputArr) ? inputArr : [];
          const urls = arr.length ? arr : uploaded.map((u) => u.url || String(u));
          return urls.map((m) => {
            const url = typeof m === "object" && m.url ? m.url : String(m || "");
            const lower = url.split("?")[0].toLowerCase();
            const isVideo = /\.(mp4|webm|ogg|mov|m4v)$/i.test(lower) || lower.includes("video") || lower.includes("/video/");
            return { url, type: isVideo ? "video" : "image", name: url.split("/").pop() };
          });
        })(),
      };

      setReviews((prev) => (Array.isArray(prev) ? prev.map((r) => (String(r.id) === String(tempId) ? createdNormalized : r)) : [createdNormalized]));
      await fetchReviews();

      setUserHasReviewed(true);

      setReviewRating(5);
      setReviewTitle("");
      setReviewText("");
      setReviewFiles([]);
      reviewPreviews.forEach((p) => { if (p.url && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url); });
      setReviewPreviews([]);
      previewsRef.current = [];
      setFileWarning("");
      setReviewSubmitted(true);
      internalToast("Review submitted — thanks!");
    } catch (err) {
      console.error("Review POST failed:", err);
      internalToast("Review could not be uploaded.");
      await fetchReviews();
    } finally {
      setIsSubmittingReview(false);
    }
  }

  async function deleteReview(reviewId) {
    if (!reviewId) return;
    const actingUser = currentUser || (() => {
      try { return (typeof window !== "undefined") ? JSON.parse(localStorage.getItem("current_user") || "null") : null; } catch { return null; }
    })();

    setReviews((prev) => (Array.isArray(prev) ? prev.filter((r) => String(r.id) !== String(reviewId)) : []));
    try {
      const token = (typeof window !== "undefined") ? localStorage.getItem("token") : null;
      const res = await fetch(`${apiBase}/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        await fetchReviews();
        internalToast("Could not delete on server; refreshed reviews.");
      } else {
        internalToast("Review deleted");
        await fetchReviews();
        setUserHasReviewed(false);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      internalToast("Delete failed; try again.");
      await fetchReviews();
    }
  }

  async function toggleVote(entityId, voteType) {
    const key = `review_${entityId}`;
    const existing = voteCache[key];
    const newVote = existing === voteType ? "none" : voteType;

    setReviews((prev) =>
      (prev || []).map((r) => {
        if (String(r.id) !== String(entityId)) return r;
        let nl = r.likes || 0;
        let nd = r.dislikes || 0;
        if (existing === "like") nl = Math.max(0, nl - 1);
        if (existing === "dislike") nd = Math.max(0, nd - 1);
        if (newVote === "like") nl = nl + 1;
        if (newVote === "dislike") nd = nd + 1;
        return { ...r, likes: nl, dislikes: nd };
      })
    );

    setVoteCache((prev) => {
      const clone = { ...(prev || {}) };
      if (newVote === "none") delete clone[key];
      else clone[key] = newVote;
      try { if (typeof window !== "undefined") localStorage.setItem("vote_cache_v1", JSON.stringify(clone)); } catch {}
      return clone;
    });

    try {
      const token = (typeof window !== "undefined") ? localStorage.getItem("token") : null;
      const res = await fetch(`${apiBase}/api/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ entityType: "review", entityId, vote: newVote, userId: currentUser?.id || "anonymous" }),
      });
      if (!res.ok) throw new Error("vote failed");
    } catch (err) {
      console.error("Vote API failed:", err);
    }
  }

  const overall = useMemo(() => {
    const arr = Array.isArray(reviews) ? reviews : [];
    const ratingsCount = arr.length;
    const sum = arr.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    const avg = ratingsCount ? +(sum / ratingsCount).toFixed(2) : 0;
    const hist = [5, 4, 3, 2, 1].map((star) => arr.filter((r) => Number(r.rating) === star).length);
    const total = hist.reduce((a, b) => a + b, 0) || 0;
    const pct = hist.map((c) => (total ? Math.round((c / total) * 100) : 0));
    return { avg, ratingsCount, hist, pct };
  }, [reviews]);

  const displayedReviews = useMemo(() => {
    const arr = Array.isArray(reviews) ? reviews : [];
    return arr.filter((r) => {
      const hasText = r.text && String(r.text).trim().length > 0;
      const hasMedia = Array.isArray(r.media) && r.media.length > 0;
      return hasText || hasMedia;
    });
  }, [reviews]);

  function resetForm() {
    setReviewTitle("");
    setReviewText("");
    setReviewFiles([]);
    reviewPreviews.forEach((p) => { if (p.url && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url); });
    setReviewPreviews([]);
    previewsRef.current = [];
    setFileWarning("");
    setReviewRating(5);
  }

  const pctArray = Array.isArray(overall.pct) && overall.pct.length === 5 ? overall.pct : [0, 0, 0, 0, 0];

  const showThanksMessage = Boolean(userHasReviewed) || Boolean(reviewSubmitted);

  // FINAL render gating: avoid showing anything until both:
  //  - this instance is allowed to render (shouldRender)
  //  - we are on the client and have mounted (hasMounted)
  if (!shouldRender || !hasMounted) return null;

  return (
    <section id="reviews-section" className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 rounded-2xl bg-gradient-to-br from-white/80 to-gray-50 dark:from-gray-900/80 dark:to-gray-900/60 p-4 sm:p-6 border border-gray-200/60 dark:border-gray-700/60">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-semibold text-black dark:text-white">Rate & review</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Share your experience with the product</p>

          {/* Mobile histogram: show only when NOT desktop — this ensures histogram appears once on mobile */}
          {hasMounted && !isDesktop && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-900/30 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-black dark:text-white">{overall.avg || 0}</div>
                <div>
                  <StarDisplay value={overall.avg} size={18} />
                  <div className="text-sm text-gray-500">{overall.ratingsCount} review{overall.ratingsCount !== 1 ? "s" : ""}</div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {[5, 4, 3, 2, 1].map((s, i) => (
                  <div key={`hist-mobile-top-${s}`} className="flex items-center gap-3 text-sm mb-2">
                    <div className="w-8 text-right text-gray-700 dark:text-gray-300">{s}★</div>
                    <HistogramBar pct={pctArray[i]} />
                    <div className="w-12 text-right text-gray-700 dark:text-gray-300">
                      {pctArray[i] || 0}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-44 hidden sm:flex flex-col items-end gap-2">
          <div className="text-sm text-gray-500">Guidelines apply</div>
          {!showThanksMessage ? (
            <button
              onClick={async () => {
                const actingUser = currentUser || (() => {
                  try { return (typeof window !== "undefined") ? JSON.parse(localStorage.getItem("current_user") || "null") : null; } catch { return null; }
                })();
                if (!actingUser) {
                  internalToast("Please sign in to rate.");
                  return;
                }
                if (!userCanReview) {
                  alert("You did not buy this product — only verified buyers can write reviews.");
                  setCanReviewFlag(false);
                  return;
                }
                if (userHasReviewed) {
                  internalToast("You already left a review. Delete it to submit a new one.");
                  return;
                }
                setShowReviewForm(true);
                setTimeout(() => window.scrollTo({ top: window.scrollY + 300, behavior: "smooth" }), 200);
              }}
              disabled={!userCanReview || userHasReviewed}
              className={`${BUTTON_CLASS} bg-black text-white hover:bg-black/90`}
              type="button"
              aria-disabled={!userCanReview || userHasReviewed}
            >
              Rate product
            </button>
          ) : (
            <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded px-3 py-2 text-center">Thanks for reviewing</div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* main column */}
        <div className="lg:col-span-9">
          <div className="p-4 sm:p-6 rounded-md bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl sm:text-4xl font-bold text-black dark:text-white">{overall.avg || 0}</div>
                <div>
                  <StarDisplay value={overall.avg} size={20} />
                  <div className="text-sm text-gray-500">{overall.ratingsCount} review{overall.ratingsCount !== 1 ? "s" : ""}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                {showThanksMessage ? (
                  <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded px-4 py-2">Thanks for your feedback</div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-300">Only verified buyers can leave reviews.</div>
                )}
              </div>
            </div>
          </div>

          {/* review form / prompt */}
          {!showReviewForm ? (
            <div className="mt-4 p-4 rounded-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              {showThanksMessage ? (
                <div className="text-sm text-green-700 dark:text-green-300">Thank you — your review is recorded.</div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Only verified buyers can leave reviews. Click{" "}
                  <button
                    onClick={async () => {
                      const actingUser = currentUser || (() => {
                        try { return (typeof window !== "undefined") ? JSON.parse(localStorage.getItem("current_user") || "null") : null; } catch { return null; }
                      })();
                      if (!actingUser) {
                        internalToast("Please sign in to rate.");
                        return;
                      }
                      if (!userCanReview) {
                        alert("You did not buy this product — only verified buyers can write reviews.");
                        setCanReviewFlag(false);
                        return;
                      }
                      if (userHasReviewed) {
                        internalToast("You already left a review. Delete it to submit a new one.");
                        return;
                      }
                      setShowReviewForm(true);
                      setTimeout(() => window.scrollTo({ top: window.scrollY + 300, behavior: "smooth" }), 200);
                    }}
                    disabled={!userCanReview || userHasReviewed}
                    className={`${!userCanReview || userHasReviewed ? "underline opacity-50 cursor-not-allowed" : "underline text-black dark:text-white"}`}
                    type="button"
                  >
                    Rate product
                  </button>{" "}
                  to start writing.
                </div>
              )}
            </div>
          ) : reviewSubmitted || userHasReviewed ? (
            <div className="mt-4 p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="text-sm text-green-800 dark:text-green-200">{userHasReviewed ? "You have already submitted a review for this product." : "Review submitted successfully. Thank you!"}</div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:w-48">
                  <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">Your rating</div>
                  <StarSelector value={reviewRating} onChange={(v) => setReviewRating(v)} size={22} />
                </div>

                <div className="flex-1">
                  <div className="mb-3">
                    <label htmlFor="review-title" className="font-semibold text-sm text-black dark:text-white">Title</label>
                    <input id="review-title" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Review title (optional)" className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 text-black dark:text-white mt-1" />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="review-text" className="font-semibold text-sm text-black dark:text-white">Review</label>
                    <textarea id="review-text" placeholder="Write your review..." rows={6} value={reviewText} onChange={(e) => setReviewText(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 text-black dark:text-white mt-1 resize-y" />
                  </div>

                  <div className="mb-3">
                    <label className="font-semibold text-sm text-black dark:text-white">Photos & videos (optional)</label>
                    <div className="mt-2 flex gap-2 items-center">
                      <label className={`${BUTTON_CLASS} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer`}>
                        <Paperclip size={14} /> Attach
                        <input type="file" accept="image/*,video/*" multiple onChange={onFilesSelected} className="hidden" />
                      </label>
                      <div className="text-sm text-gray-500">Up to {MAX_FILES} files, max {Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB each</div>
                    </div>

                    {fileWarning && <div className="text-sm text-red-600 mt-2">{fileWarning}</div>}

                    {reviewPreviews.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {reviewPreviews.map((p, idx) => (
                          <div key={`${p.name || idx}-${idx}`} className="relative border rounded overflow-hidden bg-gray-50 flex items-center justify-center h-28">
                            {p.type === "image" ? (
                              // eslint-disable-next-line
                              <img
                                src={p.url}
                                alt={p.name}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setLightboxItem({ url: p.url, type: "image", name: p.name })}
                              />
                            ) : (
                              <video
                                src={p.url}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setLightboxItem({ url: p.url, type: "video", name: p.name })}
                                muted
                                playsInline
                              />
                            )}
                            <button onClick={() => removeAttachment(idx)} type="button" className={`${BUTTON_CLASS} absolute top-2 right-2 bg-white/90 rounded-full p-1`} aria-label="Remove attachment">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* reviews list */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedReviews.length === 0 && <div className="text-gray-500">No reviews yet — be the first to review.</div>}
            {displayedReviews.map((r) => {
              const authorName = r.userName || r.user_name || r.name || "Anonymous";
              const createdAt = r.created_at || r.createdAt || new Date().toISOString();
              const avatarSrc = r.avatar || r.userAvatar || null;
              const initials = (authorName || "A").split(" ").map((p) => p?.[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";

              return (
                <Card key={r.id} className="w-full bg-white dark:bg-gray-900 shadow-sm">
                  <div className="mx-0 flex items-start gap-4 pb-4 pt-4 px-4">
                    <Avatar
                      variant="rounded"
                      alt={authorName || "user"}
                      src={avatarSrc || undefined}
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: avatarSrc ? undefined : stringToHslColor(authorName || initials),
                        color: "#fff",
                        fontWeight: 600,
                      }}
                    >
                      {!avatarSrc ? initials : null}
                    </Avatar>

                    <div className="flex w-full flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <Typography variant="subtitle2" className="!text-sm font-semibold text-black dark:text-white">
                            {authorName}
                          </Typography>
                          <div className="text-xs text-gray-500">{formatRelativeTime(createdAt)}</div>
                        </div>

                        <div className="flex items-center gap-2 text-black dark:text-white">
                          <div className="flex items-center gap-2">
                            <StarDisplay value={Number(r.rating) || 0} />
                            <div className="text-xs font-medium">{r.rating}★</div>
                          </div>

                          {(currentUser && (String(currentUser.id) === String(r.userId) || currentUser.role === "admin" || currentUser.isAdmin)) && (
                            <button onClick={() => deleteReview(r.id)} className={`${BUTTON_CLASS} ml-3 bg-red-50 text-red-700 border border-red-100`} type="button" aria-label="Delete review"><Trash2 size={12} /> Delete</button>
                          )}
                        </div>
                      </div>
                      {r.title && <Typography className="text-sm font-medium mt-2 text-black dark:text-white">{r.title}</Typography>}
                    </div>
                  </div>

                  <CardContent className="p-4 pt-0 bg-white dark:bg-gray-900">
                    <Typography className="text-black dark:text-white text-sm">
                      <ReadMore text={r.text} />
                    </Typography>

                    {Array.isArray(r.media) && r.media.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {r.media.map((m, mi) => (
                          <div key={`${String(r.id)}-media-${mi}`} className="relative border rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                            {m.type === "image" ? (
                              // eslint-disable-next-line
                              <img
                                src={m.url}
                                alt={m.name || "media"}
                                className="w-full h-28 object-cover cursor-pointer bg-gray-100"
                                onClick={() => setLightboxItem({ url: m.url, type: "image", name: m.name })}
                                style={{ maxHeight: 112 }}
                              />
                            ) : (
                              <video
                                src={m.url}
                                className="w-full h-28 object-cover cursor-pointer bg-gray-100"
                                onClick={() => setLightboxItem({ url: m.url, type: "video", name: m.name })}
                                muted
                                playsInline
                                style={{ maxHeight: 112 }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <button onClick={() => toggleVote(r.id, "like")} className={`${BUTTON_CLASS} bg-white border border-gray-100`} type="button" aria-pressed={voteCache[`review_${r.id}`] === "like"} aria-label="Like review"><ThumbsUp size={14} /> <span className="ml-1">{r.likes || 0}</span></button>
                      <button onClick={() => toggleVote(r.id, "dislike")} className={`${BUTTON_CLASS} bg-white border border-gray-100`} type="button" aria-pressed={voteCache[`review_${r.id}`] === "dislike"} aria-label="Dislike review"><ThumbsDown size={14} /> <span className="ml-1">{r.dislikes || 0}</span></button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* side column */}
        <div className="lg:col-span-3 flex flex-col items-stretch gap-4">
          <div className="text-sm text-gray-500">Reviews that follow guidelines help everyone.</div>

          {/* sticky summary on large screens: render only on desktop to avoid duplication */}
          {hasMounted && isDesktop && (
            <div className="lg:sticky lg:top-20 p-4 rounded-md bg-white dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-black dark:text-white">{overall.avg || 0}</div>
                <div>
                  <StarDisplay value={overall.avg} size={18} />
                  <div className="text-sm text-gray-500">{overall.ratingsCount} review{overall.ratingsCount !== 1 ? "s" : ""}</div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {[5, 4, 3, 2, 1].map((s, i) => (
                  <div key={`hist-desktop-side-${s}`} className="flex items-center gap-3 text-sm mb-2">
                    <div className="w-8 text-gray-700 dark:text-gray-300">{s}★</div>
                    <HistogramBar pct={pctArray[i]} />
                    <div className="w-10 text-right text-gray-700 dark:text-gray-300">{pctArray[i] || 0}%</div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                {showThanksMessage ? (
                  <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded px-3 py-2 text-center">You Reviewed This Product</div>
                ) : (
                  <button onClick={() => { setShowReviewForm(true); setTimeout(() => window.scrollTo({ top: window.scrollY + 300, behavior: "smooth" }), 200); }} className={`${BUTTON_CLASS} w-full bg-black text-white justify-center`} type="button">Write review</button>
                )}
              </div>
            </div>
          )}

          <div className="w-full">
            {showReviewForm && !reviewSubmitted && !userHasReviewed && (
              <>
                <button onClick={handleSubmitReview} disabled={isSubmittingReview || canReviewFlag === false || isUploadingFiles} className={`${BUTTON_CLASS} justify-center w-full mb-2 bg-black text-white`} type="button" aria-label="Submit review">
                  {isSubmittingReview || isUploadingFiles ? (<><Send size={16} /> Submitting...</>) : (<><Send size={16} /> Submit</>)}
                </button>
                <button onClick={() => { resetForm(); }} className={`${BUTTON_CLASS} justify-center w-full bg-white border border-gray-100`} type="button" aria-label="Reset review"><Trash2 size={16} /> Reset</button>
                {uploadError && <div className="text-xs text-red-600 mt-2">Upload error: {String(uploadError)}</div>}
              </>
            )}
          </div>
        </div>
      </div>

      <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />

      {showReviewForm && !reviewSubmitted && !userHasReviewed && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t p-3">
          <div className="max-w-screen-xl mx-auto px-4 flex gap-2">
            <button onClick={handleSubmitReview} disabled={isSubmittingReview || canReviewFlag === false || isUploadingFiles} className="flex-1 py-3 rounded-full bg-black text-white flex items-center justify-center gap-2" type="button" aria-label="Submit review (mobile)">
              {isSubmittingReview || isUploadingFiles ? (<><Send size={16} /> Submitting...</>) : (<><Send size={16} /> Submit</>)}
            </button>
            <button onClick={() => { resetForm(); }} className="flex-1 py-3 rounded-full border bg-white text-black flex items-center justify-center gap-2" type="button" aria-label="Reset review (mobile)">
              <Trash2 size={16} /> Reset
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
