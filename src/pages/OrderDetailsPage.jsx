// src/pages/OrderDetailsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package as PackageIcon,
  CheckCircle,
  Clock,
  Info,
  Download,
  Share2,
  XCircle,
} from "lucide-react";
import Reviews from "../components/Reviews";

/* ... unchanged helpers and constants (API_BASE, apiUrl, auth helpers, utils) ... */

const API_BASE = process.env.REACT_APP_API_BASE || "";
const apiUrl = (path = "") => {
  if (!path.startsWith("/")) path = `/${path}`;
  const combined = API_BASE ? `${API_BASE}${path}` : path;
  return combined.replace(/([^:]\/)\/+/g, "$1");
};
function getAuthToken() {
  if (typeof window === "undefined") return null;
  const ls = localStorage.getItem("token") || localStorage.getItem("authToken");
  if (ls) return ls;
  const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}
function authHeaders(hasJson = true) {
  const headers = {};
  if (hasJson) {
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
  } else {
    headers["Accept"] = "application/json";
  }
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}
function formatDateTime(iso) {
  if (!iso) return "";
  // Shiprocket timestamps are "YYYY-MM-DD HH:mm:ss" — convert to ISO-friendly if needed
  let d = iso;
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(iso)) {
    d = iso.replace(" ", "T");
  }
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(iso);
  }
}
function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

// smaller global buttons (reduced size per request)
const BTN =
  "transition-all duration-200 font-medium rounded-full px-3 py-1 " +
  "bg-black text-white dark:bg-white dark:text-black " +
  "hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white " +
  "hover:ring-2 hover:ring-black dark:hover:ring-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.12)] focus:outline-none";

const MARKER_SIZE_PX = 28;
const MARKER_INNER_OFFSET_PX = 6;
const LEFT_6_PX = 24;

// -------------------- Shiprocket normalizer --------------------
/**
 * Accepts:
 *  - an object like { tracking_data: {...} } or
 *  - an array [ { tracking_data: {...} }, ... ] or
 *  - the inner "tracking" object returned by your server (/api/shipping/track-order)
 *  - or a server-normalized object (will be returned unchanged if it already looks normalized)
 *
 * Returns a consistent normalized shape.
 */
function normalizeShiprocketResponse(resp) {
  // If already normalized (quick heuristic): has status + tracking as array of steps
  if (resp && typeof resp === "object" && !resp.tracking_data && Array.isArray(resp.tracking)) {
    return {
      status: resp.status ?? "confirmed",
      progressIndex: (() => {
        const map = { confirmed: 0, packed: 1, shipped: 2, "out for delivery": 3, delivered: 4 };
        return map[(resp.status || "confirmed").toLowerCase()] ?? 0;
      })(),
      tracking: resp.tracking,
      activities: resp.activities ?? [],
      courier: resp.courier ?? {},
      history: resp.history ?? [],
      raw: resp.raw ?? resp,
    };
  }

  // Accept either:
  // - resp.tracking_data (Shiprocket full response wrapper)
  // - resp.tracking (some servers return the shiprocket block under `tracking`)
  // - resp (if already the inner tracking block)
  const root = Array.isArray(resp)
    ? resp[0]?.tracking_data ?? resp[0] ?? {}
    : resp?.tracking_data ?? resp?.tracking ?? resp ?? {};
  const td = root || {};

  // shipment entry (Shiprocket uses shipment_track array)
  const shipment = Array.isArray(td.shipment_track) && td.shipment_track.length ? td.shipment_track[0] : td.shipment_track || {};

  // gather activities
  const activitiesRaw =
    Array.isArray(td.shipment_track_activities) ? td.shipment_track_activities : td.shipment_track?.[0]?.activities ?? td.shipment_track_activities ?? [];
  // normalize activities
  const activities = (activitiesRaw || []).map((a) => ({
    date: a.date || a.time || a.timestamp || a.updated_time_stamp || null,
    status: a.status || a.activity || a["sr-status-label"] || "",
    location: a.location || "",
    description: a.description || a.activity || "",
    raw: a,
  }));

  // helper to find latest activity matching regex (search from start which is typically latest-first)
  function findActivityDate(acts, re) {
    if (!Array.isArray(acts)) return null;
    for (const a of acts) {
      const combined = `${a.status || ""} ${a.activity || ""} ${a["sr-status-label"] || ""}`.toLowerCase();
      if (re.test(combined)) return a.date || a.time || a.timestamp || a.updated_time_stamp || null;
    }
    return null;
  }

  // determine status index
  let progressIndex = 0; // 0: confirmed, 1: packed, 2: shipped, 3: out for delivery, 4: delivered
  const latestAct = activities[0] || {};
  const lastSrLabel = (latestAct["sr-status-label"] || latestAct.status || "").toString();
  const lastSr = latestAct["sr-status"] ?? latestAct.sr_status ?? null;
  const current_status = (shipment.current_status || td.current_status || td.current_status || td.currentStatus || td.current_status || td.current_status || "").toString().toLowerCase();

  // delivered
  if (/delivered/i.test(current_status) || /delivered/i.test(lastSrLabel) || lastSr === 7 || td.shipment_status === 7) {
    progressIndex = 4;
  } else if (/out\s*for\s*delivery/i.test(current_status) || /out for delivery/i.test(lastSrLabel) || lastSr === 17) {
    progressIndex = 3;
  } else if (/arrivedatcarrierfacility|in transit/i.test(lastSrLabel.toLowerCase()) || /arrivedatcarrierfacility/i.test((latestAct.status || "").toString().toLowerCase()) || lastSr === 18 || lastSr === 38) {
    progressIndex = 2;
  } else if (/readyforreceive|ready for receive/i.test((latestAct.status || "").toString().toLowerCase())) {
    progressIndex = 1;
  } else if ((!shipment || !shipment.awb_code || !(shipment.current_status || "").trim()) && (td.track_status === 0 || td.track_status === "0" || td.error)) {
    progressIndex = 0;
  } else if (shipment.pickup_date) {
    // fallback: if pickup exists but no clearer status, treat as shipped
    progressIndex = 2;
  } else {
    progressIndex = 0;
  }

  // Build history entries that match TimelineCard step titles exactly so TimelineCard will find dates
  const history = [];
  // Packed
  const packedDate = findActivityDate(activitiesRaw, /readyforreceive|ready for receive|ready_for_receive/i);
  if (packedDate) history.push({ title: "Packed", time: packedDate });
  // Shipped
  if (shipment.pickup_date) history.push({ title: "Shipped", time: shipment.pickup_date });
  else {
    const shippedAct = findActivityDate(activitiesRaw, /arrivedatcarrierfacility|in transit|departed/i);
    if (shippedAct) history.push({ title: "Shipped", time: shippedAct });
  }
  // Out For Delivery
  const ofd = findActivityDate(activitiesRaw, /outfordelivery|out for delivery|out_for_delivery|outfor delivery/i);
  if (ofd) history.push({ title: "Out For Delivery", time: ofd });
  // Delivered
  if (shipment.delivered_date) history.push({ title: "Delivered", time: shipment.delivered_date });
  else {
    const delAct = findActivityDate(activitiesRaw, /delivered/i);
    if (delAct) history.push({ title: "Delivered", time: delAct });
  }
  // Return / RTO
  const returnAct = findActivityDate(activitiesRaw, /returninitiated|rto/i);
  if (returnAct) history.push({ title: "Return initiated", time: returnAct });

  // Build a lightweight tracking array matching your TimelineCard steps (used as fallback)
  const steps = [
    { step: "Order Confirmed", idx: 0, date: null },
    { step: "Packed", idx: 1, date: packedDate || null },
    { step: "Shipped", idx: 2, date: shipment.pickup_date || null },
    { step: "Out For Delivery", idx: 3, date: ofd || null },
    { step: "Delivered", idx: 4, date: shipment.delivered_date || null },
  ];
  const tracking = steps.map((s) => ({ step: s.step, done: s.idx <= progressIndex, date: s.date, detail: "" }));

  const courier = { name: shipment.courier_name || td.courier_name || shipment.courier || "", awb: shipment.awb_code || shipment.awb || "" };

  // user-friendly status strings that match your Timeline mapping keys (lowercased later)
  const statusName =
    progressIndex === 4
      ? "delivered"
      : progressIndex === 3
      ? "out for delivery"
      : progressIndex === 2
      ? "shipped"
      : progressIndex === 1
      ? "packed"
      : "confirmed";

  return {
    status: statusName,
    progressIndex,
    tracking,
    activities,
    courier,
    history,
    raw: td,
  };
}

// -------------------- Main component --------------------
export default function OrderDetailsPage({ orderId: propOrderId }) {
  const [orderId] = useState(() => {
    if (propOrderId) return String(propOrderId);
    if (typeof window === "undefined") return "38";
    const path = window.location.pathname || "";
    const m = path.match(/\/order-details\/(\d+)(?:\/|$)/i);
    if (m) return m[1];
    const parts = path.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    if (/^\d+$/.test(last)) return last;
    return "38";
  });

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showEditAddress, setShowEditAddress] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const invoiceRef = useRef(null);
  // removed infoModal state (no automatic modals after fetch)
  const [currentUser, setCurrentUser] = useState(null);
  const [openReviews, setOpenReviews] = useState({});
  // track modal data
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);

  function normalizeApiOrder(payload) {
    if (!payload) return null;

    const pricing = {
      total: payload.total_amount ?? (payload.pricing && payload.pricing.total) ?? 0,
      sellingPrice: (payload.total_amount ?? payload.pricing?.sellingPrice) ?? 0,
      listingPrice: payload.pricing?.listingPrice ?? payload.total_amount ?? 0,
      fees: payload.pricing?.fees ?? 0,
      extraDiscount: payload.pricing?.extraDiscount ?? 0,
      specialPrice: payload.pricing?.specialPrice ?? 0,
      otherDiscount: payload.pricing?.otherDiscount ?? 0,
      // ensure coupon discount is non-negative number — may be computed later if missing
      couponDiscount: payload.pricing?.couponDiscount ?? payload.pricing?.coupon ?? payload.pricing?.otherDiscount ?? 0,
    };

    const sa = payload.shipping_address || payload.shipping || null;
    const shipping = sa
      ? {
          id: sa.id ?? null,
          label: sa.label ?? null,
          name: sa.name ?? sa.label ?? payload.user_name ?? null,
          phone: sa.phone ?? null,
          address: [
            sa.line1 ?? sa.address_line1 ?? sa.address1 ?? null,
            sa.line2 ?? sa.address_line2 ?? sa.address2 ?? null,
            sa.city ?? sa.town ?? null,
            sa.state ?? null,
            sa.pincode ?? sa.postcode ?? sa.zip ?? null,
            sa.country ?? null,
          ]
            .filter(Boolean)
            .join(", "),
          raw: sa,
        }
      : { address: "", name: "", phone: "" };

    const items = Array.isArray(payload.items)
      ? payload.items.map((it) => {
          const firstImg = (it.image || it.images || "")
            .toString()
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)[0] || "";

          const opts = it.options || {};
          const optionsText =
            typeof opts === "string"
              ? opts
              : [opts.color ? `${opts.color}` : null, opts.size ? `${opts.size}` : null, opts.variant ? `${opts.variant}` : null].filter(Boolean).join(" • ");

          return {
            id: it.id,
            title: it.name ?? it.title ?? "",
            img: firstImg,
            qty: it.quantity ?? it.qty ?? 1,
            price: it.price ?? it.amount ?? 0,
            options: optionsText,
            seller: it.seller ?? "",
            raw: it,
          };
        })
      : [];

    return {
      id: payload.id,
      status: payload.status,
      created_at: payload.created_at ?? payload.placedAt ?? payload.createdAt,
      user_name: payload.user_name ?? payload.userName ?? null,
      paymentMethod: payload.payment_method ?? payload.paymentMethod ?? null,
      shipping,
      pricing,
      items,
      tracking: payload.tracking ?? payload.tracking_info ?? payload.tracking ?? [],
      courier: payload.courier ?? null,
      history: payload.history ?? [],
      raw: payload,
    };
  }

  // ------------------ fetch order from backend ------------------
  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const url = apiUrl(`/api/user/orders/${encodeURIComponent(orderId)}`);
        const res = await fetch(url, {
          method: "GET",
          headers: authHeaders(false),
          credentials: "same-origin",
          signal: ac.signal,
        });

        const payload = await parseJsonSafe(res);
        if (!res.ok) {
          // don't open a modal; log and bail
          console.error("Failed to fetch order:", payload?.message || `HTTP ${res.status}`);
          throw new Error(payload?.message || `Failed to fetch order: ${res.status}`);
        }

        const normalized = normalizeApiOrder(payload);
        if (!mounted) return;
        setOrder(normalized);

        // --- Immediately try to fetch tracking and merge into order for UI (non-modal) ---
        // This uses the same /api/shipping/track-order endpoint your frontend already calls for modal.
        // Purpose: show latest status on page load (user requested behavior).
        (async function prefetchTracking() {
          try {
            const turl = apiUrl(`/api/shipping/track-order`);
            const tRes = await fetch(turl, {
              method: "POST",
              headers: {
                ...authHeaders(true),
                "Content-Type": "application/json",
              },
              credentials: "same-origin",
              body: JSON.stringify({ order_id: normalized.id }),
              signal: ac.signal,
            });

            const tPayload = await parseJsonSafe(tRes);
            if (!tRes.ok) {
              // non-fatal — just log
              console.warn("Prefetch track failed:", tPayload?.message || `HTTP ${tRes.status}`);
              return;
            }

            // Detect shiprocket-like payloads:
            const looksLikeShiprocket =
              (tPayload && (tPayload.tracking_data || tPayload.shipment_track || tPayload.shipment_track_activities || tPayload.tracking || Array.isArray(tPayload))) ||
              false;

            let trackNormalized;
            if (looksLikeShiprocket) {
              // If the server returned `{ tracking: { shipment_track: [...] } }` then pass inner block
              const inner = tPayload.tracking ?? tPayload.tracking_data ?? tPayload;
              trackNormalized = normalizeShiprocketResponse(inner);
            } else {
              // server-returned normalized-ish structure: try to map key variants
              trackNormalized = {
                status:
                  tPayload.status ??
                  tPayload.tracking?.current_status ??
                  tPayload.tracking?.shipment_status ??
                  tPayload.tracking?.status ??
                  normalized.status,
                tracking: Array.isArray(tPayload.tracking) ? tPayload.tracking : tPayload.tracking ?? normalized.tracking ?? [],
                activities: tPayload.activities ?? tPayload.shipment_track_activities ?? [],
                courier: tPayload.courier ?? (tPayload.tracking && { name: tPayload.tracking.courier_name, awb: tPayload.tracking.awb_code }) ?? normalized.courier ?? null,
                history: tPayload.history ?? [],
                raw: tPayload,
              };
            }

            // Merge tracking info into order (server wins)
            setOrder((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                tracking: trackNormalized.tracking ?? prev.tracking,
                status: trackNormalized.status ?? prev.status,
                courier: { ...(prev.courier || {}), ...(trackNormalized.courier || {}) },
                history: trackNormalized.history ? [...trackNormalized.history, ...(prev.history || [])] : prev.history,
                raw_tracking: trackNormalized.raw ?? prev.raw_tracking,
              };
            });
          } catch (err) {
            if (err.name === "AbortError") return;
            console.warn("Prefetch tracking error:", err);
          }
        })();
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error loading order:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      ac.abort();
    };
  }, [orderId]);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("current_user") || "null");
      setCurrentUser(u);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // derived pricing: product price (sum of items), shipping charge (cod -> 25), coupon discount (if present else compute by diff), computed total
  const computedPricing = useMemo(() => {
    if (!order) return null;
    const productPrice = (order.items || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0);
    const fees = Number(order.pricing?.fees || 0);

    // shippingCharge calculated by paymentMethod (COD -> 25)
    const shippingCharge = (order.paymentMethod || "").toString().toLowerCase() === "cod" ? 25 : 0;

    // 1) If backend provided a couponDiscount, use it.
    let couponDiscount = Math.max(0, Number(order.pricing?.couponDiscount ?? order.pricing?.otherDiscount ?? 0));

    // 2) If couponDiscount is zero/missing, try to infer it from final total sent by server
    if (!couponDiscount) {
      // Try possible total fields
      const serverTotal = Number(order.pricing?.total ?? order.pricing?.sellingPrice ?? order.raw?.total_amount ?? order.raw?.total ?? 0);
      if (serverTotal > 0) {
        const inferred = productPrice + fees + shippingCharge - serverTotal;
        if (inferred > 0) couponDiscount = inferred;
      }
    }

    // Ensure numeric and non-negative
    couponDiscount = Math.max(0, Number(couponDiscount || 0));

    const total = productPrice + fees + shippingCharge - couponDiscount;

    return {
      productPrice,
      fees,
      couponDiscount,
      shippingCharge,
      total,
    };
  }, [order]);

  // ------------------ backend-integrated actions ------------------
  async function handleCancel() {
    if (!order) return;
    const prevOrder = order;
    const nowIso = new Date().toISOString();
    const optimistic = {
      ...order,
      status: "cancelled",
      history: [...(order.history || []), { title: "Cancelled", time: nowIso }],
      tracking: [...(order.tracking || []), { step: "Cancelled", done: true, time: nowIso }],
    };
    setOrder(optimistic);
    setShowCancel(false);
    setLoading(true);

    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/cancel`);
      const res = await fetch(url, {
        method: "PUT",
        headers: authHeaders(true),
        credentials: "same-origin",
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) {
        console.error("Cancel failed:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Cancel failed (${res.status})`);
      }

      const normalized = normalizeApiOrder(payload?.order ?? payload) ?? { ...order, status: payload?.status ?? "cancelled" };
      setOrder((o) => ({ ...o, ...normalized }));
      // no modal shown after fetch
    } catch (err) {
      console.error("Cancel error:", err);
      setOrder(prevOrder);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReturn() {
    if (!order) return;
    setLoading(true);
    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/return`);
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(true),
        credentials: "same-origin",
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) {
        console.error("Return failed:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Return failed (${res.status})`);
      }

      const normalized = normalizeApiOrder(payload?.order ?? payload) ?? order;
      setOrder((o) => ({ ...o, ...normalized }));
    } catch (err) {
      console.error("Return error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAddress(shippingObj) {
    if (!order) return;
    setLoading(true);
    try {
      const url = apiUrl(`/api/user/orders/${encodeURIComponent(order.id)}/address`);
      const res = await fetch(url, {
        method: "PUT",
        headers: authHeaders(true),
        credentials: "same-origin",
        body: JSON.stringify(shippingObj),
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) {
        console.error("Address update failed:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Address update failed (${res.status})`);
      }

      setOrder((o) => ({
        ...o,
        shipping: {
          ...o.shipping,
          name: shippingObj.name ?? o.shipping.name,
          phone: shippingObj.phone ?? o.shipping.phone,
          address: shippingObj.address ?? o.shipping.address,
        },
        history: payload?.history ? [...(payload.history || []), ...(o.history || [])] : o.history,
      }));
    } catch (err) {
      console.error("Update address error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ------------------ track-order (updated to show modal with details) ------------------
  async function handleTrackOrder() {
    if (!order?.id) {
      console.warn("Track order: no order to track");
      return;
    }

    setLoading(true);
    try {
      const url = apiUrl(`/api/shipping/track-order`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...authHeaders(true),
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ order_id: order.id }),
      });

      const payload = await parseJsonSafe(res);
      if (!res.ok) {
        console.error("Track API error:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Track API error (${res.status})`);
      }

      // server might return raw Shiprocket payload, or already-normalized structure.
      // IMPORTANT: many servers wrap shiprocket under `tracking`, not at root.
      const isShiprocketRaw =
        payload &&
        (payload.tracking_data ||
          payload.shipment_track ||
          payload.shipment_track_activities ||
          payload.tracking ||
          Array.isArray(payload));

      let normalized;
      if (isShiprocketRaw) {
        // If server returned `{ tracking: { ... } }` we want the inner object.
        const inner = payload.tracking ?? payload.tracking_data ?? payload;
        normalized = normalizeShiprocketResponse(inner);
      } else {
        // assume server already returned normalized shape (but be flexible with keys)
        normalized = {
          status:
            payload.status ??
            payload.tracking?.current_status ??
            payload.tracking?.shipment_status ??
            payload.tracking?.status ??
            order.status,
          tracking: Array.isArray(payload.tracking) ? payload.tracking : payload.tracking ?? order.tracking ?? [],
          activities: payload.activities ?? payload.shipment_track_activities ?? [],
          courier:
            payload.courier ??
            (payload.tracking && { name: payload.tracking.courier_name ?? "", awb: payload.tracking.awb_code ?? "" }) ??
            order.courier ??
            null,
          history: payload.history ?? [],
          raw: payload,
        };
      }

      // Merge tracking info into order (server wins)
      setOrder((prev) => ({
        ...prev,
        tracking: normalized.tracking ?? prev.tracking,
        status: normalized.status ?? prev.status,
        courier: { ...(prev.courier || {}), ...(normalized.courier || {}) },
        history: normalized.history ? [...normalized.history, ...(prev.history || [])] : prev.history,
        raw_tracking: normalized.raw ?? prev.raw_tracking,
      }));

      // set data for the track modal and open it
      // ensure we look into both normalized.raw and possible nested `tracking` key
      const rawRoot = normalized.raw ?? payload;
      const shipmentTrack =
        rawRoot?.shipment_track ??
        rawRoot?.tracking?.shipment_track ??
        (Array.isArray(rawRoot) ? rawRoot[0]?.shipment_track : undefined) ??
        [];
      const shipmentTrackActivities =
        rawRoot?.shipment_track_activities ?? rawRoot?.tracking?.shipment_track_activities ?? normalized.activities ?? [];

      const infoForModal = {
        shipment_track: shipmentTrack,
        shipment_track_activities: shipmentTrackActivities,
        courier_name: normalized.courier?.name || rawRoot?.courier_name || "",
        awb_code: normalized.courier?.awb || rawRoot?.awb_code || "",
        current_status: normalized.status || rawRoot?.current_status || "",
        origin: (shipmentTrack?.[0]?.origin) || rawRoot?.origin || "",
        destination: (shipmentTrack?.[0]?.destination) || rawRoot?.destination || "",
        etd: rawRoot?.etd || shipmentTrack?.[0]?.edd || "",
        raw: rawRoot || payload,
        status: normalized.status,
      };

      setTrackInfo(infoForModal);
      setShowTrackModal(true);
    } catch (err) {
      console.error("Track order failed:", err);
      // still open modal with any available tracking info in order
      if (order?.raw?.shipment_track || order?.raw_tracking || order?.raw?.tracking) {
        const raw = order.raw_tracking || order.raw;
        const shipmentTrack =
          raw?.shipment_track ?? raw?.tracking?.shipment_track ?? (Array.isArray(raw) ? raw[0]?.shipment_track : undefined) ?? [];
        const activities = raw?.shipment_track_activities ?? raw?.tracking?.shipment_track_activities ?? [];
        const fallback = {
          shipment_track: shipmentTrack,
          shipment_track_activities: activities,
          courier_name: raw?.courier_name || order.courier?.name || "",
          awb_code: shipmentTrack?.[0]?.awb_code || order.courier?.awb || "",
          current_status: order.status || "",
          raw,
        };
        setTrackInfo(fallback);
        setShowTrackModal(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        // close UI overlays that are user-initiated
        setShowCancel(false);
        setShowReturn(false);
        setShowEditAddress(false);
        setShowTrackModal(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleShare() {
    if (!order) return;
    const shareText = `Order ${order.id} • ${order.items?.length ?? 0} items • ${currency(computedPricing?.total ?? order.pricing?.total)}`;
    if (navigator.share) {
      navigator.share({ title: `Order ${order.id}`, text: shareText }).catch(() => {
        // silent fallback; no modal
        console.warn("Sharing cancelled or not supported");
      });
    } else {
      navigator.clipboard
        ?.writeText(`${shareText}\nView in your orders`)
        .then(() => console.log("Order summary copied to clipboard"))
        .catch(() => console.warn("Share not available"));
    }
  }

  function contactCourier() {
    if (!order?.courier?.phone) {
      console.warn("Courier phone not available");
      return;
    }
    // no modal — just use window.open tel: for action or console
    window.location.href = `tel:${order.courier.phone}`;
  }

  // UPDATED: use POST /api/shipping/download-invoice
  async function handleDownloadInvoice() {
    if (!order?.id) {
      console.warn("No order available to download invoice.");
      return;
    }
    setLoading(true);
    try {
      const url = apiUrl(`/api/shipping/download-invoice`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...authHeaders(true),
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ order_id: order.id }),
      });

      if (!res.ok) {
        const payload = await parseJsonSafe(res);
        console.error("Invoice download failed:", payload?.message || `HTTP ${res.status}`);
        throw new Error(payload?.message || `Invoice download failed (${res.status})`);
      }

      const blob = await res.blob();
      const filename = `invoice-${order.id}.pdf`;
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      console.log("Invoice downloaded.");
    } catch (err) {
      console.error("Download invoice failed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <SkeletonPage />
        </div>
      </div>
    );
  }

  const isDelivered =
    (order.status || "").toString().toLowerCase() === "delivered" ||
    order.tracking?.some?.((t) => (t.step || t.status)?.toString().toLowerCase() === "delivered" && (t.done || t.status === "delivered"));
  const isPacked = (order.status || "").toString().toLowerCase() === "packed";
  const isCancelled = (order.status || "").toString().toLowerCase() === "cancelled";

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      <div className="bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
          Home &gt; My Account &gt; My Orders &gt; <span className="font-mono">{order.id}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <TimelineCard
            order={order}
            onCancel={() => setShowCancel(true)}
            onRequestReturn={() => setShowReturn(true)}
            onTrackAll={handleTrackOrder}
            isDelivered={isDelivered}
          />

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Items in this order</h3>
              <div className="text-sm text-neutral-500">{order.items?.length ?? 0} item(s)</div>
            </div>

            <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.items?.map((it) => (
                <div key={it.id || `${it.title}-${Math.random()}`} className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-full sm:w-auto flex items-center gap-4">
                      <div className="w-20 h-20 flex-shrink-0 rounded overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-gray-50">
                        <img
                          src={it.img || "/placeholder.png"}
                          alt={it.title}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{it.title}</div>
                        <div className="text-sm text-neutral-500">{it.options || "—"}</div>
                        <div className="text-sm text-neutral-500 mt-1">Seller: {it.seller || "—"}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <div className="font-semibold">{currency(it.price)}</div>
                        <div className="text-sm text-neutral-500">Qty: {it.qty}</div>
                      </div>

                      {isDelivered && !isCancelled && (
                        <div className="flex-shrink-0">
                          <button
                            onClick={() =>
                              setOpenReviews((prev) => ({ ...(prev || {}), [String(it.id)]: !Boolean(prev?.[String(it.id)]) }))
                            }
                            className={`${BTN} text-sm px-3 py-1`}
                          >
                            Submit review
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {openReviews[String(it.id)] && (
                    <div className="mt-4">
                      <Reviews productId={it.id} apiBase={API_BASE} currentUser={currentUser} showToast={(m) => console.log("Review:", m)} />
                    </div>
                  )}
                </div>
              )) ?? null}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Delivery details</div>
              <div className="text-sm text-neutral-400">AWB: {order.courier?.awb ?? "—"}</div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3">
                <div className="text-sm text-neutral-500">Home</div>
                <div className="text-sm text-neutral-700 dark:text-neutral-200 break-words">{order.shipping?.address || "—"}</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-neutral-500">
                    {order.shipping?.name || "—"} • {order.shipping?.phone || "—"}
                  </div>
                  <div>
                    {!isPacked && !isCancelled && (
                      <button onClick={() => setShowEditAddress(true)} className={BTN + " text-sm px-3 py-1"}>
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-neutral-500">Courier</div>
                  <div className="text-sm font-medium">{order.courier?.name ?? "—"}</div>
                  <div className="text-sm text-neutral-500">
                    {order.courier?.exec?.name ?? ""} • {order.courier?.exec?.phone ?? ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{order.courier?.exec?.eta ?? ""}</div>
                  <div className="mt-2 flex flex-col gap-2">
                    <button onClick={contactCourier} className={BTN + " text-sm px-3 py-1"}>
                      Call
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Price details</div>
              <div className="text-sm text-neutral-400">Items: {order.items?.length ?? 0}</div>
            </div>

            <div className="mt-3 text-sm space-y-2">
              {/* Product price as sum of items */}
              <div className="flex justify-between">
                <div>Product price</div>
                <div>{currency(computedPricing?.productPrice ?? 0)}</div>
              </div>

              <div className="flex justify-between text-neutral-500">
                <div>Fees</div>
                <div>{currency(computedPricing?.fees ?? order.pricing?.fees ?? 0)}</div>
              </div>

              {/* shipping charge if COD */}
              <div className="flex justify-between">
                <div>Shipping</div>
                <div>{currency(computedPricing?.shippingCharge ?? 0)}</div>
              </div>

              {/* coupon discount if available */}
              {computedPricing?.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <div>Coupon discount</div>
                  <div>-{currency(computedPricing?.couponDiscount ?? 0)}</div>
                </div>
              )}

              <div className="mt-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 flex items-center justify-between">
                <div className="font-semibold">Total amount</div>
                <div className="font-semibold">{currency(computedPricing?.total ?? order.pricing?.total)}</div>
              </div>

              <div className="mt-3 text-sm text-neutral-500">
                Paid by <strong className="ml-1">{order.paymentMethod ?? "—"}</strong>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-2">
                <button onClick={handleShare} className={BTN + " flex-1 py-2 flex items-center justify-center gap-2 text-sm"}>
                  <Share2 size={16} /> Share
                </button>
                <button onClick={handleDownloadInvoice} className={BTN + " flex-1 py-2 px-3 flex items-center justify-center gap-2 text-sm"}>
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          </div>
        </aside>

        {showInvoice && (
          <div className="hidden" aria-hidden>
            <div ref={invoiceRef}>
              <InvoiceTemplate order={order} pricing={computedPricing} />
            </div>
          </div>
        )}

        <ConfirmModal
          open={!!showCancel}
          title="Cancel order"
          message="Are you sure you want to cancel this order?"
          confirmLabel="Yes, cancel"
          onClose={() => setShowCancel(false)}
          onConfirm={async () => {
            setShowCancel(false);
            await handleCancel();
          }}
        />

        <ConfirmModal
          open={!!showReturn}
          title="Return order"
          message="Do you want to return this order?"
          confirmLabel="Return"
          onClose={() => setShowReturn(false)}
          onConfirm={async () => {
            setShowReturn(false);
            await handleRequestReturn();
          }}
        />

        <InputModal
          open={!!showEditAddress}
          title="Edit shipping address"
          initialShipping={order.shipping}
          onClose={() => setShowEditAddress(false)}
          onConfirm={async (newShipping) => {
            setShowEditAddress(false);
            await handleSaveAddress(newShipping);
          }}
        />

        <TrackModal open={showTrackModal} info={trackInfo} onClose={() => setShowTrackModal(false)} />
      </main>
    </div>
  );
}

// -------------------- Subcomponents --------------------

function SkeletonPage() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-36 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-56 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
        <aside className="space-y-4">
          <div className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-56 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </aside>
      </div>
    </div>
  );
}

function ProductHeader({ order }) {
  const item = order.items?.[0] || { title: "", options: "", seller: "", price: 0, img: "" };
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-6">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-lg font-semibold leading-tight">{item.title}</h1>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{item.options}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">Seller: {item.seller}</div>

          <div className="mt-4 flex items-center gap-4">
            <div className="text-2xl font-bold">{currency(item.price)}</div>
            <div className="text-sm text-emerald-600">1 offer</div>
          </div>
        </div>

        <div className="w-28 h-28 flex-shrink-0 rounded overflow-hidden border border-neutral-200 dark:border-neutral-800">
          <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}

/**
 * TimelineCard (updated messages)
 */
function TimelineCard({ order, onCancel, onRequestReturn, onTrackAll, isDelivered }) {
  const timelineRef = useRef(null);
  const markersRef = useRef([]);
  const [overlayRect, setOverlayRect] = useState(null);

  const innerSize = MARKER_SIZE_PX - MARKER_INNER_OFFSET_PX;
  const isCancelled = order.status && order.status.toLowerCase() === "cancelled";

  const allSteps = isCancelled ? ["Order Confirmed", "Cancelled"] : ["Order Confirmed", "Packed", "Shipped", "Out For Delivery", "Delivered"];

  const progressMap = {
    pending: 0,
    confirmed: 0,
    processing: 1,
    packed: 1,
    shipped: 2,
    "out for delivery": 3,
    delivered: 4,
    cancelled: isCancelled ? 1 : 0,
  };

  const normalizedStatus = (order.status || "").toLowerCase();
  const progressIndex = progressMap[normalizedStatus] ?? 0;

  // Use only the current step to show date and detail. Previous steps should not show date/detail (as requested).
  const trackingToUse = allSteps.map((step, idx) => {
    const done = idx <= progressIndex;

    // choose a nice detail message per step
    const detailRaw =
      step.toLowerCase().includes("cancel")
        ? "Order cancelled"
        : step.toLowerCase().includes("confirmed")
        ? "Order placed successfully."
        : step.toLowerCase().includes("packed")
        ? "Order packed and waiting for shipping partner to pickup."
        : step.toLowerCase().includes("shipped")
        ? "Shipped successfully — waiting for delivery partner to pick up."
        : step.toLowerCase().includes("out for delivery")
        ? "Out for delivery — with delivery partner."
        : step.toLowerCase().includes("delivered")
        ? "Delivered successfully. Share your feedback through review."
        : "";

    // Show date only for the current step index (progressIndex). When a step is crossed, its date/detail disappears.
    const date =
      idx === progressIndex
        ? order.history?.find((h) => (h.title || "").toString().toLowerCase().includes(step.toLowerCase()))?.time ||
          order.created_at ||
          null
        : null;

    const detail = idx === progressIndex && done ? detailRaw : "";

    return {
      step,
      done,
      date,
      detail,
    };
  });

  const lastDoneIndex = trackingToUse.map((t) => t.done).lastIndexOf(true);

  useEffect(() => {
    // ensure markersRef length matches steps
    markersRef.current = new Array(trackingToUse.length);

    function measure() {
      const container = timelineRef.current;
      const nodes = markersRef.current || [];
      if (!container || !nodes.length) {
        setOverlayRect(null);
        return;
      }

      if (lastDoneIndex < 0) {
        setOverlayRect(null);
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const firstNode = nodes[0];
      const lastNode = nodes[lastDoneIndex] || firstNode;
      if (!firstNode || !lastNode) {
        setOverlayRect(null);
        return;
      }

      const firstRect = firstNode.getBoundingClientRect();
      const lastRect = lastNode.getBoundingClientRect();

      const firstCenter = firstRect.top - containerRect.top + MARKER_SIZE_PX / 2;
      const lastCenter = lastRect.top - containerRect.top + MARKER_SIZE_PX / 2;

      const topPx = Math.round(firstCenter - 2);
      const heightPx = Math.max(4, Math.round(lastCenter - firstCenter) + 4);

      const spineLeftPx = LEFT_6_PX + MARKER_SIZE_PX / 2 - 2;
      setOverlayRect({ leftPx: Math.round(spineLeftPx), topPx, heightPx });
    }

    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (timelineRef.current) ro.observe(timelineRef.current);
    markersRef.current.forEach((el) => el && ro.observe(el));
    return () => {
      window.removeEventListener("resize", measure);
      try {
        ro.disconnect();
      } catch (e) {}
    };
  }, [trackingToUse, lastDoneIndex, order.status]);

  const spineLeftForCSS = LEFT_6_PX + MARKER_SIZE_PX / 2 - 2;
  const markerLeftPx = spineLeftForCSS - MARKER_SIZE_PX / 2;

  const showActions = !isCancelled;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="text-neutral-600 dark:text-neutral-300" />
          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Tracking status</div>
            <div className="font-semibold capitalize">{order.status || "Order Confirmed"}</div>
          </div>
        </div>

        <div className="text-sm text-neutral-500 hidden sm:block">Order placed: {formatDateTime(order.created_at)}</div>
      </div>

      <div className="mt-6 relative" ref={timelineRef}>
        <div className="absolute top-0 bottom-0 w-[4px] bg-neutral-100 dark:bg-neutral-800 z-0" style={{ left: `${spineLeftForCSS}px` }} />

        {overlayRect && (
          <motion.div
            key={`overlay-${overlayRect.heightPx}-${overlayRect.topPx}-${isCancelled ? "cancel" : "ok"}`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.42, ease: [0.2, 0.9, 0.2, 1] }}
            aria-hidden
            style={{
              position: "absolute",
              left: `${overlayRect.leftPx}px`,
              top: `${overlayRect.topPx}px`,
              width: 4,
              height: `${overlayRect.heightPx}px`,
              backgroundColor: isCancelled ? "rgb(239,68,68)" : "rgb(16,185,129)",
              zIndex: 5,
              borderRadius: 2,
              transformOrigin: "top center",
            }}
          />
        )}

        <div className="space-y-6 relative z-10">
          {trackingToUse.map((t, idx) => {
            const done = t.done;
            const nextDone = trackingToUse[idx + 1]?.done;
            const isCancelStep = t.step?.toLowerCase().includes("cancel");

            const outerClasses = isCancelStep
              ? "rounded-full bg-red-600"
              : done
              ? "rounded-full bg-emerald-600"
              : nextDone
              ? "rounded-full bg-white border border-neutral-300 dark:border-neutral-700"
              : "rounded-full bg-white border border-neutral-200 dark:border-neutral-800";

            const iconColorDone = done ? "text-white" : "text-neutral-500 dark:text-neutral-400";

            return (
              <div key={t.step + "-" + idx} className="pl-14 relative">
                <div
                  ref={(el) => (markersRef.current[idx] = el)}
                  style={{ position: "absolute", left: `${markerLeftPx}px`, top: 0, width: MARKER_SIZE_PX, height: MARKER_SIZE_PX }}
                >
                  <div style={{ width: "100%", height: "100%" }} className={`z-10 ${outerClasses}`} />

                  <div
                    style={{
                      position: "absolute",
                      left: `${MARKER_INNER_OFFSET_PX / 2}px`,
                      top: `${MARKER_INNER_OFFSET_PX / 2}px`,
                      width: innerSize,
                      height: innerSize,
                      zIndex: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "9999px",
                      background: "transparent",
                    }}
                  >
                    {isCancelStep ? (
                      <XCircle size={Math.max(12, innerSize - 8)} className={"text-white"} />
                    ) : done ? (
                      <CheckCircle size={Math.max(12, innerSize - 8)} className={iconColorDone} />
                    ) : nextDone ? (
                      <Clock size={Math.max(12, innerSize - 8)} className={iconColorDone} />
                    ) : (
                      <PackageIcon size={Math.max(12, innerSize - 8)} className={iconColorDone} />
                    )}
                  </div>
                </div>

                <div>
                  <div className={`font-medium ${done ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-500"}`}>{t.step}</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {t.date ? formatDateTime(t.date) : done ? "" : "Pending"}
                  </div>
                  {t.detail && <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t.detail}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-4 text-sm text-neutral-500">
        Delivery Executive details will be available once the order is out for delivery
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex gap-3 w-full">
          {showActions && !isDelivered && (
            <>
              <button onClick={onCancel} className={BTN + " flex-1 py-2 flex items-center justify-center gap-2 text-sm"}>
                Cancel
              </button>
              <button onClick={onTrackAll} className={BTN + " flex-1 py-2 flex items-center justify-center gap-2 text-sm"}>
                <Truck size={16} /> Track order
              </button>
            </>
          )}
          {showActions && isDelivered && (
            <button onClick={onRequestReturn} className={BTN + " flex-1 py-2 flex items-center justify-center gap-2 text-sm"}>
              Return
            </button>
          )}

          {isCancelled && <div className="text-sm text-red-600 italic px-2">This order has been cancelled.</div>}
        </div>
        <div className="w-full sm:w-44" />
      </div>
    </div>
  );
}

// InvoiceTemplate converted to Tailwind
function InvoiceTemplate({ order, pricing }) {
  // pricing: computedPricing (productPrice, fees, couponDiscount, shippingCharge, total)
  const productPrice = pricing?.productPrice ?? order.pricing?.sellingPrice ?? 0;
  const fees = pricing?.fees ?? order.pricing?.fees ?? 0;
  const couponDiscount = pricing?.couponDiscount ?? order.pricing?.couponDiscount ?? 0;
  const shippingCharge = pricing?.shippingCharge ?? 0;
  const total = pricing?.total ?? order.pricing?.total ?? productPrice + fees + shippingCharge - couponDiscount;

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-xl font-semibold">Invoice</h2>
      <div className="mt-4 flex justify-between">
        <div>
          <div>
            <strong>Order ID:</strong> {order.id}
          </div>
          <div>
            <strong>Placed:</strong> {formatDateTime(order.created_at)}
          </div>
        </div>
        <div>
          <div>
            <strong>Ship to:</strong>
          </div>
          <div className="font-medium">{order.shipping?.name}</div>
          <div className="max-w-xs break-words">{order.shipping?.address}</div>
        </div>
      </div>

      <div className="mt-6 border-t border-neutral-200 pt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pb-2">Item</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((it) => (
              <tr key={it.id}>
                <td className="py-2 border-t border-neutral-100">{it.title}</td>
                <td className="py-2 border-t border-neutral-100 text-right">{it.qty}</td>
                <td className="py-2 border-t border-neutral-100 text-right">{currency(Number(it.price) * Number(it.qty || 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 text-sm">
            <div className="flex justify-between">
              <div>Subtotal</div>
              <div>{currency(productPrice)}</div>
            </div>
            <div className="flex justify-between">
              <div>Fees</div>
              <div>{currency(fees)}</div>
            </div>
            <div className="flex justify-between">
              <div>Shipping</div>
              <div>{currency(shippingCharge)}</div>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <div>Coupon discount</div>
                <div>-{currency(couponDiscount)}</div>
              </div>
            )}
            <div className="flex justify-between font-semibold mt-3">
              <div>Total</div>
              <div>{currency(total)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel = "Confirm", onClose = () => {}, onConfirm = () => {} }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    return () => prev?.focus?.();
  }, [open]);

  if (!open) return null;
  // NOTE: backdrop is pointer-events-none so it won't block outside clicks.
  return (
    <div className="fixed inset-0 z-50 pointer-events-none p-4">
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="pointer-events-auto mx-auto relative top-1/4 bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700">
            <Info />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">{message}</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={onClose} className={BTN + " text-sm px-3 py-1"}>
                Cancel
              </button>
              <button onClick={() => onConfirm()} className="px-3 py-1 rounded-full bg-emerald-600 text-white text-sm">
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InputModal({ open, title, initialShipping = { name: "", phone: "", address: "" }, onClose = () => {}, onConfirm = (val) => {} }) {
  const [name, setName] = useState(initialShipping?.name || "");
  const [phone, setPhone] = useState(initialShipping?.phone || "");
  const [address, setAddress] = useState(initialShipping?.address || "");

  useEffect(() => {
    setName(initialShipping?.name || "");
    setPhone(initialShipping?.phone || "");
    setAddress(initialShipping?.address || "");
  }, [initialShipping, open]);

  if (!open) return null;
  // non-blocking backdrop pattern used here too
  return (
    <div className="fixed inset-0 z-50 pointer-events-none p-4">
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pointer-events-auto mx-auto relative top-1/6 bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-semibold">{title}</h3>

        <div className="mt-3 grid grid-cols-1 gap-3">
          <label className="text-sm">
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipient full name" className="mt-1 w-full p-2 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900" />
          </label>

          <label className="text-sm">
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" className="mt-1 w-full p-2 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900" />
          </label>

          <label className="text-sm">
            Address
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat / House no., Street, Area, Landmark, City, State, PIN" className="mt-1 w-full p-2 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900" rows={4} />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className={BTN + " text-sm px-3 py-1"}>
            Cancel
          </button>
          <button onClick={() => onConfirm({ name: name.trim(), phone: phone.trim(), address: address.trim() })} className={BTN + " text-sm px-3 py-1"}>
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* TrackModal: shows shipment_track and shipment_track_activities (pure Tailwind) */
function TrackModal({ open, info, onClose }) {
  if (!open) return null;

  const shipmentTrack = info?.shipment_track ?? info?.shipmentTrack ?? [];
  const activities = info?.shipment_track_activities ?? info?.shipment_track_activities ?? info?.shipmentTrackActivities ?? [];
  const rawError = info?.raw?.error ?? info?.error ?? "";

  // non-blocking backdrop (so links and navigation can still be clicked if needed)
  return (
    <div className="fixed inset-0 z-50 pointer-events-none p-4">
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto mx-auto relative top-8 bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Track order</h3>
            <div className="text-sm text-neutral-500">Latest shipment information</div>
          </div>
          <div>
            <button onClick={onClose} className="text-sm underline text-neutral-500">Close</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-4">
            <div className="text-sm text-neutral-500">Courier</div>
            <div className="font-medium">{info?.courier_name ?? info?.courier?.name ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">AWB</div>
            <div className="font-medium">{info?.awb_code ?? info?.courier?.awb ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">Current status</div>
            <div className="font-medium">{info?.current_status ?? info?.status ?? "-"}</div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-4">
            <div className="text-sm text-neutral-500">Origin</div>
            <div className="font-medium">{info?.origin ?? info?.shipment?.origin ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">Destination</div>
            <div className="font-medium">{info?.destination ?? info?.shipment?.destination ?? "-"}</div>
            <div className="text-sm text-neutral-500 mt-2">ETD</div>
            <div className="font-medium">{info?.etd ?? "-"}</div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium">Shipment activities</h4>
          <div className="mt-3 space-y-3">
            {Array.isArray(activities) && activities.length > 0 ? (
              activities.map((act, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{act.status || act.activity || "Activity"}</div>
                    <div className="text-xs text-neutral-500">{formatDateTime(act.time || act.timestamp || act.updated_time_stamp || act.date)}</div>
                  </div>
                  {act.description && <div className="text-sm text-neutral-500 mt-1">{act.description}</div>}
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-4 text-sm text-neutral-600">
                No activities found.
                {rawError ? <div className="mt-2 text-xs text-neutral-500">{rawError}</div> : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium">Shipment track entries</h4>
          <div className="mt-3 space-y-3">
            {Array.isArray(shipmentTrack) && shipmentTrack.length > 0 ? (
              shipmentTrack.map((s, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{s.courier_name || s.awb_code || `Entry ${i + 1}`}</div>
                    <div className="text-xs text-neutral-500">{formatDateTime(s.updated_time_stamp || s.pickup_date || s.delivered_date)}</div>
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">Pickup: {s.pickup_date || "-"}</div>
                  <div className="text-sm text-neutral-500">Delivered: {s.delivered_date || "-"}</div>
                  <div className="text-sm text-neutral-500">POD: {s.pod || s.pod_status || "-"}</div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded p-4 text-sm text-neutral-600">
                No shipment track entries found.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className={BTN + " text-sm px-3 py-1"}>
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// -------------------- small helpers --------------------
async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch (e) {
    const txt = await res.text().catch(() => "");
    return { message: txt || `HTTP ${res.status}` };
  }
}
