// src/components/OrdersSection.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X, Trash2, RefreshCw } from "lucide-react";

/**
 * OrdersSection — simplified & modernized
 * - Removed reorder and all tracking-related logic (SSE/poll/checkpoints)
 * - Keeps: status filter, invoice download (POST /api/shipping/download-invoice), cancel order, pagination
 * - Modern black & white Tailwind UI supporting light/dark themes and mobile responsiveness
 */

const API_BASE = process.env.REACT_APP_API_BASE || "";

/* ---------- small helpers ---------- */
const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
};
const fmtCurrency = (n) => `₹${Number(Number(n || 0)).toLocaleString()}`;

const safeParseJSON = (s) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

const getImageFromItem = (item) => {
  if (!item) return "/placeholder.jpg";
  if (typeof item === "string" && item.startsWith("http")) return item;
  const directFields = ["image", "image_url", "img", "picture", "photo", "thumbnail", "thumbnail_url"];
  for (const f of directFields) {
    const v = item[f];
    if (typeof v === "string" && v.trim()) {
      const first = v.split(",").map((s) => s.trim()).find(Boolean);
      if (first) return first;
    }
    if (v && typeof v === "object" && v.url) return v.url;
  }
  if (item.images) {
    if (Array.isArray(item.images) && item.images.length > 0) {
      const first = item.images[0];
      if (typeof first === "string") return first.split(",").map((s) => s.trim()).find(Boolean) || first;
      if (first && first.url) return first.url;
    } else if (typeof item.images === "string") {
      return item.images.split(",").map((s) => s.trim()).find(Boolean) || item.images;
    } else if (item.images.url) {
      return item.images.url;
    }
  }
  if (item.media && Array.isArray(item.media) && item.media[0]) {
    const m = item.media[0];
    if (typeof m === "string") return m.split(",").map((s) => s.trim()).find(Boolean) || m;
    if (m.url) return m.url;
  }
  if (item.variant) {
    if (typeof item.variant === "string" && item.variant.startsWith("http")) return item.variant;
    if (item.variant.image) return Array.isArray(item.variant.image) ? item.variant.image[0] : item.variant.image;
    if (Array.isArray(item.variant.images) && item.variant.images[0]) {
      const v = item.variant.images[0];
      if (typeof v === "string") return v;
      if (v.url) return v.url;
    }
  }
  if (item.product) {
    if (item.product.image) return Array.isArray(item.product.image) ? item.product.image[0] : item.product.image;
    if (Array.isArray(item.product.images) && item.product.images[0]) {
      const v = item.product.images[0];
      if (typeof v === "string") return v;
      if (v.url) return v.url;
    }
    if (item.product.thumbnail) return item.product.thumbnail;
  }
  return "/placeholder.jpg";
};

const normalizeOrder = (o = {}) => {
  const total = Number(o.total ?? o.total_amount ?? o.total_price ?? o.order_total ?? o.amount ?? 0) || 0;
  let items = [];
  if (Array.isArray(o.items)) items = o.items;
  else if (Array.isArray(o.order_items)) items = o.order_items;
  else if (Array.isArray(o.products)) items = o.products;
  else if (o.items && typeof o.items === "object") items = [o.items];
  else if (o.order_items && typeof o.order_items === "object") items = [o.order_items];

  const shipping_address = o.shipping_address != null ? (typeof o.shipping_address === "string" ? safeParseJSON(o.shipping_address) : o.shipping_address) : safeParseJSON(o.address) ?? null;

  return {
    id: o.id ?? o.order_id ?? o._id ?? null,
    status: (o.status ?? o.order_status ?? "").toString(),
    total,
    created_at: o.created_at || o.date || o.createdAt || o.order_date || null,
    items,
    shipping_address,
    subtotal: Number(o.subtotal ?? o.amount_subtotal ?? o.sub_total ?? total),
    shipping: Number(o.shipping ?? o.shipping_cost ?? 0),
    tax: Number(o.tax ?? o.tax_amount ?? 0),
    discount: Number(o.discount ?? o.discount_amount ?? 0),
    raw: o,
  };
};

export default function OrdersSection() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const abortRef = useRef(null);

  const fetchOrders = async () => {
    try {
      abortRef.current?.abort?.();
    } catch {}
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));
      if (statusFilter && statusFilter !== "All") params.append("status", String(statusFilter).toLowerCase());

      const url = `${API_BASE}/api/user/orders${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = "Failed fetching orders";
        try {
          const j = txt ? JSON.parse(txt) : null;
          msg = j?.message || j?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const text = await res.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = null; }

      const arr = body?.data ?? (Array.isArray(body) ? body : body?.orders ?? body?.results ?? []);
      const meta = body?.meta ?? body?.pagination ?? { total: Number(body?.total ?? (Array.isArray(arr) ? arr.length : 0)), page, pages: Math.max(1, Math.ceil(Number(body?.total ?? (Array.isArray(arr) ? arr.length : 0)) / (limit || 12))), limit };

      const normalized = Array.isArray(arr) ? arr.map(normalizeOrder) : [];
      setOrders(normalized);
      setTotal(Number(meta.total ?? normalized.length ?? 0));
      setPage(Number(meta.page ?? page));
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("fetchOrders error:", err);
        setOrders([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // when filter changes, reset to page 1 then fetch
    setPage(1);
    // microtask to ensure reset applied
    setTimeout(() => fetchOrders(), 0);
    return () => abortRef.current?.abort?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshKey, statusFilter]);

  const pages = Math.max(1, Math.ceil((total || 0) / (limit || 12)));

  const visibleOrders = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (!statusFilter || statusFilter === "All") return copy;
    const want = String(statusFilter).toLowerCase();
    return copy.filter((o) => (String(o.status || "").toLowerCase() === want));
  }, [orders, statusFilter]);

  const performCancel = async (orderId) => {
    if (!orderId) return;
    setCanceling(true);
    setActionLoadingId(orderId);

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, cancelling: true } : o)));

    try {
      const res = await fetch(`${API_BASE}/api/user/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      const text = await res.text().catch(() => "");
      let body = {};
      try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text || "" }; }

      if (!res.ok) throw new Error(body.message || body.error || `Cancel failed (status ${res.status})`);

      await fetchOrders();
      alert(body.message || "Order cancelled successfully");
    } catch (err) {
      console.error("Cancel error:", err);
      await fetchOrders();
      alert(err.message || "Could not cancel order. See console.");
    } finally {
      setActionLoadingId(null);
      setCanceling(false);
      setOrderToCancel(null);
    }
  };

  const downloadInvoice = async (order) => {
    if (!order?.id) return;
    setActionLoadingId(order.id);
    try {
      const payload = { orderId: order.id, order_id: order.id, id: order.id };
      const res = await fetch(`${API_BASE}/api/shipping/download-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let body = {};
        try { body = txt ? JSON.parse(txt) : {}; } catch { body = { message: txt || "" }; }
        throw new Error(body.message || `Invoice download failed (status ${res.status})`);
      }

      const blob = await res.blob();
      const filename = `invoice-${order.id}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Invoice download error:", err);
      alert(err.message || "Unable to download invoice. See console.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onCardClick = (order) => {
    if (!order?.id) return;
    window.location.href = `https://dripzoid.com/order-details/${encodeURIComponent(order.id)}`;
  };

  return (
    <div className="p-6 bg-white dark:bg-black min-h-screen text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">My Orders</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Professional, minimal black & white layout — click a card to view details.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
            <label htmlFor="status" className="sr-only">Status</label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-sm w-full sm:w-auto"
              title="Filter by status"
            >
              <option value="All">All</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black"
              title="Refresh"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900" />
              ))}
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-3">No orders found</p>
              <button onClick={() => setRefreshKey((k) => k + 1)} className="px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">Refresh</button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {visibleOrders.map((order) => (
                <article
                  key={order.id ?? Math.random().toString(36).slice(2, 8)}
                  onClick={() => onCardClick(order)}
                  role="button"
                  className="w-full flex flex-col sm:flex-row gap-4 items-start p-4 hover:shadow-lg transition-shadow bg-white dark:bg-gray-900 cursor-pointer rounded-lg"
                >
                  <div className="w-full sm:w-36 h-36 bg-gray-50 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={getImageFromItem(order.items && order.items[0])}
                      alt={order.items?.[0]?.name || `order-${order.id}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }}
                    />
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{fmtDate(order.created_at)}</p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{order.items?.[0]?.name ? `${order.items[0].name}${order.items.length > 1 ? ` + ${order.items.length - 1} more` : ""}` : "—"}</p>
                      </div>

                      <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800">
                          <span className="capitalize">{order.status || "—"}</span>
                        </div>
                        <div className="mt-2 text-lg font-bold">{fmtCurrency(order.total)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                          className="text-sm underline"
                          title="Details"
                        >
                          Details
                        </button>

                        <button
                          onClick={async (e) => { e.stopPropagation(); await downloadInvoice(order); }}
                          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Download Invoice"
                        >
                          <Download size={14} /> {actionLoadingId === order.id ? "Downloading..." : "Invoice"}
                        </button>

                        {!( (order.status || "").toLowerCase() === "cancelled") && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setOrderToCancel(order.id); }}
                            className="flex items-center gap-2 px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                          >
                            <Trash2 size={14} /> Cancel
                          </button>
                        )}
                      </div>

                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {/* Removed tracking details to keep UI minimal */}
                        <span>Delivery & payment details are available in the order details view.</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {/* Pagination */}
              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-2 py-2">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {total === 0 ? (
                    <>Showing 0 orders</>
                  ) : (
                    <>Showing <strong>{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> orders</>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"><ChevronLeft size={16} /></button>
                  <div className="text-sm">Page <strong>{page}</strong> / {pages}</div>
                  <button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800"><h3 className="font-semibold">Cancel Order</h3></div>
            <div className="p-4">
              <p>Are you sure you want to cancel order <strong>#{orderToCancel}</strong>?</p>
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => setOrderToCancel(null)} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700">No</button>
                <button onClick={() => performCancel(orderToCancel)} disabled={canceling || actionLoadingId === orderToCancel} className="px-4 py-2 rounded-md bg-rose-600 text-white disabled:opacity-50">
                  {canceling || actionLoadingId === orderToCancel ? "Cancelling..." : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/40">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-auto max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold">Order #{selectedOrder.id}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadInvoice(selectedOrder)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800" title="Download Invoice"><Download size={16} /></button>
                <button onClick={() => setRefreshKey((k) => k + 1)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800" title="Refresh"><RefreshCw size={16} /></button>
                <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" title="Close"><X size={18} /></button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold mb-2">Items</h4>
                <ul className="space-y-4">
                  {(selectedOrder.items || []).map((it, idx) => {
                    const key = it?.id ?? it?.sku ?? `item-${idx}`;
                    const img = getImageFromItem({ ...it, image: it.image ?? it.img ?? it.picture ?? it.photo });
                    const qty = it.quantity ?? it.qty ?? it.count ?? 1;
                    const price = Number(it.price ?? it.unit_price ?? it.price_per_unit ?? 0);
                    const totalLine = Number(price) * Number(qty);

                    return (
                      <li key={key} className="flex items-center gap-4 border-b pb-3">
                        <div className="w-16 h-16 rounded overflow-hidden bg-gray-50 dark:bg-gray-800">
                          <img src={img} alt={it.name || "item"} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }} />
                        </div>

                        <div className="flex-1">
                          <div className="font-medium">{it.name || it.title || "Item"}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Qty: <strong>{qty}</strong> × {fmtCurrency(price)}</div>
                        </div>

                        <div className="text-right font-semibold">{fmtCurrency(totalLine)}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Summary</h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between"><span>Subtotal</span><span>{fmtCurrency(selectedOrder.subtotal ?? selectedOrder.total)}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span>{fmtCurrency(selectedOrder.shipping ?? 0)}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span>{fmtCurrency(selectedOrder.tax ?? 0)}</span></div>
                  {selectedOrder.discount != null && selectedOrder.discount !== 0 && (<div className="flex justify-between text-green-600"><span>Discount</span><span>-{fmtCurrency(selectedOrder.discount)}</span></div>)}
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg"><span>Total</span><span>{fmtCurrency(selectedOrder.total)}</span></div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">Delivery</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">{selectedOrder.shipping_address?.name || "—"}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedOrder.shipping_address ? (
                      <>
                        {selectedOrder.shipping_address.line1 || ""}{selectedOrder.shipping_address.line2 ? `, ${selectedOrder.shipping_address.line2}` : ""}<br />
                        {(selectedOrder.shipping_address.city ? `${selectedOrder.shipping_address.city}, ` : "")}{selectedOrder.shipping_address.state || ""} {selectedOrder.shipping_address.pincode || selectedOrder.shipping_address.postcode || ""}<br />
                        {selectedOrder.shipping_address.country || ""}<br />
                        {selectedOrder.shipping_address.phone ? `Phone: ${selectedOrder.shipping_address.phone}` : ""}
                      </>
                    ) : (
                      selectedOrder.shipping_address?.address || "—"
                    )}
                  </div>

                </div>

                <div className="mt-6 flex gap-2">
                  {!( (selectedOrder.status || "").toLowerCase() === "cancelled") && (
                    <button onClick={() => setOrderToCancel(selectedOrder.id)} className="px-3 py-2 rounded-md bg-rose-50 text-rose-600">Cancel</button>
                  )}
                  <button onClick={() => { window.location.href = `/checkout?reorder=${encodeURIComponent(selectedOrder.id)}`; }} className="px-3 py-2 rounded-md bg-black text-white">Buy Again</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
