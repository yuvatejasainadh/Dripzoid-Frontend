// CouponManagerAdvanced.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Download,
  Copy,
  Check,
  X,
  Activity,
  BarChart2,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/*
  CouponManagerAdvanced.jsx (API-wired)
  - Connects to:
    GET  /api/coupons?perPage=1000        (list)
    POST /api/coupons                     (create)
    PUT  /api/coupons/:id                 (update)
    DELETE /api/coupons/:id               (delete)
    POST /api/coupons/bulk                (bulk actions)
    POST /api/coupons/import              (multipart csv upload -> 'file')
    GET  /api/coupons/export              (csv download)
    GET  /api/coupons/analytics           (analytics summary)
    GET  /api/coupons/audit               (audit logs)
  - Sends credentials (cookies) by default (credentials: 'include').
*/

const STORAGE_KEY = "coupons_v2_ui_state";
const AUDIT_KEY = "coupon_audit_v2_ui";

const API_BASE = "https://api.dripzoid.com"; // leave empty to hit same origin, or set to "https://api.dripzoid.com"

function uid(prefix = "c_") {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}
function nowISO() {
  return new Date().toISOString();
}

function csvEscape(val) {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Robust CSV parser supporting quoted fields. Returns array of rows (arrays)
function parseCSV(text) {
  const rows = [];
  let cur = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nxt = text[i + 1];
    if (ch === '"') {
      if (inQuotes && nxt === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur !== "" || row.length > 0) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      }
      if (ch === "\r" && nxt === "\n") i++;
      continue;
    }
    cur += ch;
  }
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

/* ----------------- Small UI primitives ----------------- */
function IconButton({ children, title, onClick, className = "" }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-700 ${className}`}
    >
      {children}
    </button>
  );
}

function Toasts({ list, onClose }) {
  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="max-w-sm w-full bg-white dark:bg-gray-800 border rounded-lg shadow p-3 flex items-start gap-3"
          >
            <div className="mt-0.5 text-sm text-gray-700 dark:text-gray-200 flex-1">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t.message}</div>
            </div>
            <button onClick={() => onClose(t.id)} className="p-1">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ConfirmDialog({ open, title, body, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
          <motion.div initial={{ y: 12 }} animate={{ y: 0 }} exit={{ y: 12 }} className="relative max-w-md w-full bg-white dark:bg-gray-900 border rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-600" />
              <div>
                <div className="font-medium text-lg">{title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{body}</div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onCancel} className="px-4 py-2 rounded-md border">Cancel</button>
              <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white">Delete</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ----------------- Coupon Form ----------------- */
function CouponForm({ editing, onCancel, onSave, pushToast }) {
  const [code, setCode] = useState(editing?.code || "");
  const [type, setType] = useState(editing?.type || "percentage");
  const [amount, setAmount] = useState(editing?.amount ?? 0);
  const [min, setMin] = useState(editing?.min_purchase ?? 0);
  const [limit, setLimit] = useState(editing?.usage_limit ?? 0);
  const [startsAt, setStartsAt] = useState(editing?.starts_at || new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(editing?.ends_at || "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [appliesTo, setAppliesTo] = useState(editing?.applies_to || "all");
  const [desc, setDesc] = useState(editing?.metadata?.description || "");
  const [prefix, setPrefix] = useState("");
  const [length, setLength] = useState(6);
  const [pattern, setPattern] = useState("alnum");

  function generateCode({ prefix = "", length = 6, pattern = "alnum" } = {}) {
    const alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    const pool = pattern === "alpha" ? alph : pattern === "num" ? nums : alph + nums;
    let s = "";
    for (let i = 0; i < length; i++) s += pool[Math.floor(Math.random() * pool.length)];
    return (prefix ? `${prefix.toUpperCase()}-` : "") + s;
  }

  function handleGenerate() {
    const g = generateCode({ prefix: prefix.trim(), length: Number(length) || 6, pattern });
    setCode(g);
    pushToast("Generated", `Code ${g} generated`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!code) return pushToast("Error", "Please enter a code");
    if (type === "percentage" && (amount <= 0 || amount > 100)) return pushToast("Error", "Percentage must be 1-100");
    const payload = {
      id: editing?.id,
      code: code.trim().toUpperCase(),
      type,
      amount: Number(amount),
      min_purchase: Number(min),
      usage_limit: Number(limit),
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      active,
      applies_to: appliesTo,
      metadata: { description: desc },
    };
    onSave(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{editing ? "Edit coupon" : "Create coupon"}</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">Define coupon details</div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigator.clipboard.writeText(code || "")} className="px-3 py-1 border rounded-md">Copy</button>
          <button type="button" onClick={() => { setCode(""); setPrefix(""); setLength(6); setPattern("alnum"); }} className="px-3 py-1 border rounded-md">Reset</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-shadow shadow-sm border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 focus:ring-gray-300 dark:focus:ring-gray-700" />
        </div>
        <div>
          <label className="text-sm">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Amount</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
        </div>

        <div>
          <label className="text-sm">Minimum purchase</label>
          <input type="number" value={min} onChange={(e) => setMin(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
        </div>

        <div>
          <label className="text-sm">Usage limit</label>
          <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
        </div>

        <div>
          <label className="text-sm">Applies to</label>
          <select value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm">
            <option value="all">All products</option>
            <option value="shipping">Shipping</option>
            <option value="category">Category</option>
            <option value="product">Specific products</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Starts</label>
          <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
        </div>

        <div>
          <label className="text-sm">Ends</label>
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="text-sm">Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
        </div>

        <div className="col-span-1 md:col-span-2 p-3 rounded-lg border bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Generator</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Quickly create a randomized code</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input placeholder="prefix (eg: SALE)" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" />
            <input type="number" value={length} onChange={(e) => setLength(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" />
            <select value={pattern} onChange={(e) => setPattern(e.target.value)} className="px-3 py-2 rounded-lg border text-sm">
              <option value="alnum">AlphaNumeric</option>
              <option value="alpha">Alphabetic</option>
              <option value="num">Numeric</option>
            </select>
            <button type="button" onClick={handleGenerate} className="px-3 py-2 rounded-lg border">Generate</button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md border">Cancel</button>
        <button type="submit" className="px-4 py-2 rounded-md bg-black text-white">Save</button>
      </div>
    </form>
  );
}

/* ----------------- Main Component (API-wired) ----------------- */
export default function CouponManagerAdvanced() {
  // data
  const [coupons, setCoupons] = useState([]);
  const [audit, setAudit] = useState([]);

  // UI state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, action: null });
  const [toasts, setToasts] = useState([]);
  const fileRef = useRef(null);
  const [sortBy, setSortBy] = useState({ key: "created_at", dir: "desc" });
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  // helper to include credentials/cookies
  const fetchOpts = (method = "GET", body = null, customHeaders = {}) => {
    const opts = { method, credentials: "include", headers: { Accept: "application/json", ...customHeaders } };
    if (body && !(body instanceof FormData)) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      opts.body = body;
    }
    return opts;
  };

  /* --- API calls --- */
  async function loadAll() {
    setLoading(true);
    try {
      // fetch coupons (request many results)
      const url = `${API_BASE || ""}/api/coupons?perPage=1000`;
      const r = await fetch(url, fetchOpts());
      if (!r.ok) throw new Error(`Failed to fetch coupons (${r.status})`);
      const payload = await r.json();
      // server returns { data, page, perPage, total } OR may return array. Handle both:
      const items = Array.isArray(payload) ? payload : (payload.data || payload);
      setCoupons(items.map(normalizeCoupon));
    } catch (e) {
      console.error("loadAll error", e);
      pushToast("Error", "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit() {
    try {
      const r = await fetch(`${API_BASE || ""}/api/coupons/audit`, fetchOpts());
      if (!r.ok) throw new Error("audit fetch failed");
      const rows = await r.json();
      setAudit(rows || []);
    } catch (e) {
      console.error("loadAudit", e);
    }
  }

  async function loadAnalytics() {
    try {
      const r = await fetch(`${API_BASE || ""}/api/coupons/analytics`, fetchOpts());
      if (!r.ok) throw new Error("analytics fetch failed");
      const d = await r.json();
      setAnalytics(d);
    } catch (e) {
      console.error("loadAnalytics", e);
    }
  }

  // CREATE
  async function createCouponAPI(payload) {
    try {
      const r = await fetch(`${API_BASE || ""}/api/coupons`, fetchOpts("POST", payload));
      if (!r.ok) {
        const txt = await r.json().catch(() => ({}));
        throw new Error(txt.error || txt.message || `create failed (${r.status})`);
      }
      const created = await r.json();
      pushToast("Created", `Coupon ${payload.code} created`);
      await reloadAll();
      return created;
    } catch (e) {
      console.error("createCouponAPI", e);
      pushToast("Error", String(e.message || e));
      throw e;
    }
  }

  // UPDATE
  async function updateCouponAPI(id, payload) {
    try {
      const r = await fetch(`${API_BASE || ""}/api/coupons/${id}`, fetchOpts("PUT", payload));
      if (!r.ok) {
        const txt = await r.json().catch(() => ({}));
        throw new Error(txt.error || txt.message || `update failed (${r.status})`);
      }
      const updated = await r.json();
      pushToast("Saved", `Coupon ${payload.code} updated`);
      await reloadAll();
      return updated;
    } catch (e) {
      console.error("updateCouponAPI", e);
      pushToast("Error", String(e.message || e));
      throw e;
    }
  }

  // DELETE
  async function deleteCouponAPI(id) {
    try {
      const r = await fetch(`${API_BASE || ""}/api/coupons/${id}`, fetchOpts("DELETE"));
      if (!r.ok) {
        const txt = await r.json().catch(() => ({}));
        throw new Error(txt.error || txt.message || `delete failed (${r.status})`);
      }
      pushToast("Deleted", "Coupon removed");
      await reloadAll();
      return true;
    } catch (e) {
      console.error("deleteCouponAPI", e);
      pushToast("Error", String(e.message || e));
      throw e;
    }
  }

  // BULK
  async function bulkActionAPI(action, ids) {
    try {
      const r = await fetch(`${API_BASE || ""}/api/coupons/bulk`, fetchOpts("POST", { action, ids }));
      if (!r.ok) {
        const txt = await r.json().catch(() => ({}));
        throw new Error(txt.error || txt.message || `bulk failed (${r.status})`);
      }
      pushToast("Updated", `Bulk action ${action} applied`);
      await reloadAll();
      return true;
    } catch (e) {
      console.error("bulkActionAPI", e);
      pushToast("Error", String(e.message || e));
      throw e;
    }
  }

  // IMPORT CSV (multipart)
  async function importCSVAPI(file) {
    try {
      const form = new FormData();
      form.append("file", file, file.name || "upload.csv");
      const r = await fetch(`${API_BASE || ""}/api/coupons/import`, fetchOpts("POST", form));
      if (!r.ok) {
        const txt = await r.json().catch(() => ({}));
        throw new Error(txt.error || txt.message || `import failed (${r.status})`);
      }
      const res = await r.json();
      pushToast("Imported", `Imported ${res.imported || "?"} coupons`);
      await reloadAll();
      return res;
    } catch (e) {
      console.error("importCSVAPI", e);
      pushToast("Error", String(e.message || e));
      throw e;
    }
  }

  // EXPORT CSV (download blob)
  async function exportCSVAPI(list = null) {
    try {
      // If the backend supports filtering/export query, you could call /api/coupons/export?ids=...
      // We'll fetch the export endpoint and download the returned CSV blob.
      const r = await fetch(`${API_BASE || ""}/api/coupons/export`, fetchOpts("GET"));
      if (!r.ok) throw new Error(`Export failed (${r.status})`);
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coupons_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      pushToast("Exported", "CSV exported to your downloads");
    } catch (e) {
      console.error("exportCSVAPI", e);
      pushToast("Error", String(e.message || e));
      throw e;
    }
  }

  async function reloadAll() {
    await Promise.all([loadAll(), loadAudit(), loadAnalytics()]);
  }

  useEffect(() => {
    // initial load
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // normalize coupon shape from server (ensure metadata field)
  function normalizeCoupon(c) {
    return {
      ...c,
      active: Boolean(Number(c.active ?? c.active ?? 0)),
      amount: Number(c.amount ?? 0),
      used: Number(c.used ?? 0),
      usage_limit: c.usage_limit ? Number(c.usage_limit) : 0,
      metadata: c.metadata || (c.description ? { description: c.description } : {}),
    };
  }

  /* Derived data */
  const filtered = useMemo(() => {
    return coupons
      .filter((c) => {
        if (filterActive === "active" && !c.active) return false;
        if (filterActive === "inactive" && c.active) return false;
        if (filterType !== "all" && c.type !== filterType) return false;
        if (!debouncedQuery) return true;
        return (
          (c.code || "").toLowerCase().includes(debouncedQuery) ||
          ((c.metadata && c.metadata.description) || "").toLowerCase().includes(debouncedQuery)
        );
      })
      .sort((a, b) => {
        const key = sortBy.key;
        const dir = sortBy.dir === "asc" ? 1 : -1;
        const va = a[key];
        const vb = b[key];
        if (va == null && vb == null) return 0;
        if (va == null) return 1 * dir;
        if (vb == null) return -1 * dir;
        if (typeof va === "string") return va.localeCompare(vb) * dir;
        return (va - vb) * dir;
      });
  }, [coupons, debouncedQuery, filterActive, filterType, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  // UI helpers
  function pushAuditLocal(id, message) {
    const item = { id: uid("a_"), coupon_id: id, message, at: nowISO() };
    setAudit((prev) => [item, ...prev].slice(0, 200));
  }

  function pushToast(title, message, ttl = 4000) {
    const t = { id: uid("t_"), title, message };
    setToasts((s) => [t, ...s]);
    setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== t.id));
    }, ttl);
  }

  /* Actions wired to API */
  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }
  function openEdit(c) {
    setEditing(c);
    setShowModal(true);
  }

  async function saveCoupon(payload) {
    try {
      if (payload.id) {
        // call update
        await updateCouponAPI(payload.id, payload);
        pushAuditLocal(payload.id, `Edited coupon ${payload.code}`);
      } else {
        await createCouponAPI(payload);
        pushAuditLocal(null, `Created coupon ${payload.code}`);
      }
      setShowModal(false);
    } catch (e) {
      // error already handled in API functions
    }
  }

  async function toggleActiveLocal(id) {
    const c = coupons.find((x) => x.id === id);
    if (!c) return;
    try {
      // update server
      await updateCouponAPI(id, { ...c, active: !c.active });
      pushAuditLocal(id, `Toggled active`);
    } catch (e) {
      // ignore
    }
  }

  async function softDeleteLocal(id) {
    try {
      await deleteCouponAPI(id);
      pushAuditLocal(id, `Deleted coupon`);
      setSelected(new Set());
    } catch (e) {
      // ignore
    }
  }

  async function bulkAction(action) {
    if (action === "delete") {
      setConfirm({ open: true, action: "delete" });
      return;
    }
    if (selected.size === 0) {
      pushToast("No selection", "Select coupons first");
      return;
    }
    try {
      await bulkActionAPI(action, Array.from(selected));
      pushAuditLocal(null, `Bulk ${action} ${selected.size}`);
      setSelected(new Set());
    } catch (e) {
      // handled
    }
  }

  async function confirmDeleteSelected() {
    if (selected.size === 0) {
      setConfirm({ open: false, action: null });
      return;
    }
    try {
      await bulkActionAPI("delete", Array.from(selected));
      pushAuditLocal(null, `Bulk deleted ${selected.size}`);
      setSelected(new Set());
      setConfirm({ open: false, action: null });
    } catch (e) {
      // handled
    }
  }

  async function handleImportCSV(file) {
    if (!file) return;
    try {
      await importCSVAPI(file);
    } catch (e) {
      // handled
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectPage(checked) {
    setSelected((prev) => {
      const n = new Set(prev);
      pageData.forEach((c) => {
        if (checked) n.add(c.id);
        else n.delete(c.id);
      });
      return n;
    });
  }

  function clearFilters() {
    setQuery("");
    setFilterActive("all");
    setFilterType("all");
  }

  function toggleSort(key) {
    setSortBy((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Coupon Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create, edit and analyze discount coupons</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button onClick={openCreate} className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg shadow hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-700">
              <Plus size={16} /> Create coupon
            </button>
            <div className="relative inline-flex">
              <button onClick={() => exportCSVAPI()} className="inline-flex items-center gap-2 bg-white border px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-800">
                <Download size={16} /> Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <Search size={16} className="text-gray-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code or description" className="bg-transparent outline-none flex-1 text-sm placeholder-gray-500 dark:placeholder-gray-400" />
              <button onClick={clearFilters} className="text-sm text-gray-500 dark:text-gray-400">Clear</button>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="px-3 py-2 rounded-lg border text-sm">
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg border text-sm">
                <option value="all">All types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
              <div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleImportCSV(e.target.files[0])} />
                <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg border text-sm">Import CSV</button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={18} />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Last 14 days</div>
                  <div className="font-medium">Redemptions</div>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total: {coupons.reduce((s, c) => s + (c.used || 0), 0)}</div>
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={(analytics && analytics.timeseries) || []}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="redemptions" stroke="#111827" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Summary</div>
                  <div className="font-medium">{coupons.length} coupons</div>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active: {coupons.filter((c) => c.active).length}</div>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <div>Top coupon: {coupons[0]?.code || "—"}</div>
              <div>Avg usage: {Math.round((coupons.reduce((s, c) => s + (c.used || 0), 0) / Math.max(1, coupons.length)) * 10) / 10}</div>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">Showing</div>
                <div className="px-3 py-1 rounded-md border text-sm">{filtered.length} results</div>
              </div>

              <div className="flex items-center gap-2">
                <select onChange={(e) => bulkAction(e.target.value)} className="px-3 py-2 rounded-lg border text-sm">
                  <option>Bulk actions</option>
                  <option value="enable">Enable</option>
                  <option value="disable">Disable</option>
                  <option value="delete">Delete</option>
                </select>
                <button onClick={() => exportCSVAPI(Array.from(selected).length ? coupons.filter((c) => selected.has(c.id)) : coupons)} className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-2">
                  <Download size={14} /> Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
                    <th className="py-3 pl-1 w-6">
                      <input type="checkbox" aria-label="Select page" checked={pageData.length > 0 && pageData.every((c) => selected.has(c.id))} onChange={(e) => selectPage(e.target.checked)} />
                    </th>
                    <th className="py-3 cursor-pointer" onClick={() => toggleSort("code")}>Code</th>
                    <th className="py-3 cursor-pointer" onClick={() => toggleSort("type")}>Type</th>
                    <th className="py-3 cursor-pointer" onClick={() => toggleSort("amount")}>Amount</th>
                    <th className="py-3">Used</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-3 pl-1">
                        <input type="checkbox" aria-label={`Select ${c.code}`} checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{c.code}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{c.metadata?.description || "—"}</div>
                      </td>
                      <td className="py-3 text-sm capitalize">{c.type}</td>
                      <td className="py-3 text-sm">{c.type === "percentage" ? `${c.amount}%` : `₹${c.amount}`}</td>
                      <td className="py-3 text-sm">{c.used}/{c.usage_limit || "—"}</td>
                      <td className="py-3 text-sm">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${c.active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-800/30" : "bg-gray-100 text-gray-600 dark:bg-gray-800"}`}>
                          {c.active ? <Check size={12} /> : <X size={12} />}
                          <span>{c.active ? "Active" : "Inactive"}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <IconButton title="Copy code" onClick={() => { navigator.clipboard.writeText(c.code); pushAuditLocal(c.id, `Copied code ${c.code}`); pushToast("Copied", `${c.code} copied to clipboard`); }}>
                            <Copy size={14} />
                          </IconButton>

                          <IconButton title="Edit coupon" onClick={() => openEdit(c)}>
                            <Edit3 size={14} />
                          </IconButton>

                          <button onClick={() => toggleActiveLocal(c.id)} className={`px-3 py-1 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${c.active ? "bg-emerald-700 text-white dark:bg-emerald-600" : "bg-gray-100 text-gray-700 dark:bg-gray-800"}`} title={c.active ? "Disable" : "Enable"}>
                            {c.active ? "Enabled" : "Enable"}
                          </button>

                          <IconButton title="Delete coupon" onClick={() => setConfirm({ open: true, action: { type: "single", id: c.id } })} className="text-red-600">
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div>
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 rounded-md border" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                <button className="px-3 py-1 rounded-md border" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Audit</div>
                  <div className="text-sm font-medium">Recent changes</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{audit.length} items</div>
            </div>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 max-h-48 overflow-y-auto">
              {audit.map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <div className="text-xs w-28 text-gray-400">{a.created_at ? a.created_at.slice(0, 19).replace("T", " ") : (a.at || "").slice(0,19).replace("T"," ")}</div>
                  <div>{a.message}</div>
                </div>
              ))}
              {audit.length === 0 && <div className="text-xs">No audit entries yet.</div>}
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <Modal onClose={() => setShowModal(false)}>
            <CouponForm editing={editing} onCancel={() => setShowModal(false)} onSave={saveCoupon} pushToast={pushToast} />
          </Modal>
        )}
      </AnimatePresence>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.action && confirm.action.type === "single" ? "Delete coupon?" : "Delete selected coupons?"}
        body={confirm.action && confirm.action.type === "single" ? "This will permanently remove the coupon." : `This will permanently remove ${selected.size} coupons.`}
        onCancel={() => setConfirm({ open: false, action: null })}
        onConfirm={() => {
          if (!confirm.action) return setConfirm({ open: false, action: null });
          if (confirm.action.type === "single") {
            softDeleteLocal(confirm.action.id);
            setConfirm({ open: false, action: null });
          } else {
            confirmDeleteSelected();
          }
        }}
      />

      <Toasts list={toasts} onClose={(id) => setToasts((s) => s.filter((t) => t.id !== id))} />
    </div>
  );
}

/* ----------------- Simple Modal used above ----------------- */
function Modal({ children, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-xl">
        {children}
      </motion.div>
    </motion.div>
  );
}
