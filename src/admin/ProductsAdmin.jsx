// src/pages/ProductsAdmin.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "../utils/api";
import BulkUpload from "./BulkUpload";
import {
  Plus,
  Upload,
  Eye,
  Search,
  Edit,
  Trash2,
  Package,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Layers,
  Tag,
  PlusCircle,
  Save,
} from "lucide-react";
import { motion } from "framer-motion";

/* ======= STYLE CONSTANTS (Tailwind utility strings) ======= */
const inputCls =
  "w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black dark:focus:ring-white transition";
const textareaCls = inputCls + " resize-none";
const btnPrimaryCls =
  "px-4 py-2 rounded-lg shadow-sm bg-black text-white dark:bg-white dark:text-black hover:scale-[1.02] transition-transform disabled:opacity-60";
const btnSecondaryCls =
  "px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition";
const cardCls =
  "p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition";

/* ======= Helpers ======= */
const normalizeResponse = (res) => {
  if (!res) return {};
  if (res.data && typeof res.data === "object") {
    if (res.data.data || typeof res.data.total !== "undefined") return res.data;
    return res.data;
  }
  return res;
};

const MAIN_CATEGORIES = ["Men", "Women", "Kids"];

/**
 * Helper: Decide if keys in an object *look like size labels* (S, M, L, XL, 30, 32 etc).
 * Avoid false positives for normal product fields.
 */
const isLikelySizeKey = (k) => {
  if (!k || typeof k !== "string") return false;
  const lower = k.toLowerCase();
  const forbidden = new Set([
    "id",
    "_id",
    "name",
    "price",
    "images",
    "rating",
    "colors",
    "originalprice",
    "original_price",
    "description",
    "subcategory",
    "stock",
    "updated_at",
    "updatedat",
    "sold",
    "featured",
    "actualprice",
    "actual_price",
    "category",
    "sizes",
  ]);
  if (forbidden.has(lower)) return false;
  // size keys are usually short (1-6 chars), alphanumeric, not purely numeric indexers like "0","1"
  if (k.length < 1 || k.length > 6) return false;
  if (!/^[A-Za-z0-9_\-\s]+$/.test(k)) return false;
  if (!isNaN(Number(k))) return false; // pure numbers are likely indexes, not labels
  return true;
};

/**
 * Robustly parse per-size stock from many possible backend shapes and ALWAYS return a mapping {S:10, M:5}
 *
 * Handles:
 * - product.size_stock (JSON string or object)
 * - product.sizes as array of objects [{size, stock}] (your backend sample)
 * - product.sizes as array of strings ["S","M"]
 * - product.product_sizes style arrays
 * - CSV-like strings "S:10,M:5"
 * - object mapping { S: 10, M: 5 } (but only if keys look like sizes)
 */
const parseSizeStockFromProduct = (p) => {
  if (!p) return {};

  // If the product contains `sizes` as an array of rows like your backend sample, parse that first
  try {
    if (p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
      // handle either [{size:"S",stock:10}, "S:10", "S"] etc.
      const result = {};
      for (const item of p.sizes) {
        if (!item) continue;
        if (typeof item === "string") {
          const part = item.trim();
          if (part.includes(":") || part.includes("=")) {
            const [size, qty] = part.split(/[:=]/).map((s) => s && s.trim());
            if (size) result[size] = Number(qty) || 0;
          } else {
            // just a size label -> leave qty 0 (or will be auto-distributed later)
            result[part] = result[part] || 0;
          }
        } else if (typeof item === "object") {
          const size = item.size ?? item.size_label ?? item.sizeName ?? item.size_name ?? item.name ?? item.label;
          const qty = Number(item.stock ?? item.qty ?? item.quantity ?? item.count ?? 0) || 0;
          if (size) result[String(size)] = qty;
        }
      }
      if (Object.keys(result).length) return result;
    }
  } catch (e) {
    // fallthrough to regular parsing below
  }

  const candidates = [
    "size_stock",
    "sizeStock",
    "stock_map",
    "stockMap",
    "sizes_map",
    "sizesMap",
    "size_stock_map",
    "product_sizes",
    "productSizes",
    "product_size_list",
    "sizes", // include sizes here as well (array or mapping)
    "size_list",
    "available_sizes",
  ];

  for (const k of candidates) {
    const val = p[k];
    if (val === undefined || val === null) continue;

    // If it's already an object mapping size->qty like { S: 10, M: 5 }
    if (typeof val === "object" && !Array.isArray(val)) {
      // Only treat as size->qty mapping if keys *look like sizes*
      const keys = Object.keys(val || {});
      if (keys.length > 0 && keys.every((kk) => isLikelySizeKey(kk))) {
        const result = {};
        for (const [kk, vv] of Object.entries(val)) {
          if (typeof vv === "object" && vv !== null && ("stock" in vv || "qty" in vv || "quantity" in vv)) {
            result[String(kk)] = Number(vv.stock ?? vv.qty ?? vv.quantity ?? 0) || 0;
          } else {
            result[String(kk)] = Number(vv) || 0;
          }
        }
        if (Object.keys(result).length) return result;
      }
    }

    // If it's an array (rows or objects) - handle arrays of rows (string or object)
    if (Array.isArray(val)) {
      const result = {};
      for (const item of val) {
        if (!item) continue;
        if (typeof item === "string") {
          const part = item.trim();
          if (part.includes(":") || part.includes("=")) {
            const [size, qty] = part.split(/[:=]/).map((s) => s && s.trim());
            if (size) result[size] = Number(qty) || 0;
          } else {
            result[part] = result[part] || 0;
          }
        } else if (typeof item === "object") {
          const size =
            item.size ?? item.size_label ?? item.sizeName ?? item.size_name ?? item.name ?? item.label;
          const qty = Number(item.stock ?? item.qty ?? item.quantity ?? item.count ?? 0) || 0;
          if (size) result[String(size)] = qty;
        }
      }
      if (Object.keys(result).length) return result;
    }

    // If it's a string: try JSON, then CSV / key:val parsing
    if (typeof val === "string") {
      const s = val.trim();
      // try parse JSON
      if (s.startsWith("{") || s.startsWith("[")) {
        try {
          const parsed = JSON.parse(s);
          const nested = parseSizeStockFromProduct(parsed);
          if (Object.keys(nested).length) return nested;
        } catch (e) {
          // fallthrough
        }
      }

      // parse "S:10,M:5" or "S=10|M=5"
      const obj = {};
      s.split(/[,|;]+/).forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        const [size, qty] = trimmed.split(/[:=]/).map((x) => x && x.trim());
        if (size) obj[size] = Number(qty) || 0;
      });
      if (Object.keys(obj).length) return obj;
    }
  }

  // final cautious fallback: if an object looks *entirely* like a sizes mapping (keys are likely size keys)
  if (typeof p === "object" && !Array.isArray(p)) {
    const keys = Object.keys(p || {});
    if (keys.length > 0 && keys.length <= 12 && keys.every((k) => isLikelySizeKey(k))) {
      const result = {};
      keys.forEach((k) => (result[k] = Number(p[k]) || 0));
      if (Object.keys(result).length) return result;
    }
  }

  // fallback array-of-rows shape e.g. [{size:'S',stock:10}]
  if (Array.isArray(p)) {
    const result = {};
    p.forEach((item) => {
      if (!item) return;
      const size = item.size ?? item.size_name ?? item.name ?? item.label;
      const qty = Number(item.stock ?? item.qty ?? item.quantity ?? 0) || 0;
      if (size) result[String(size)] = qty;
    });
    if (Object.keys(result).length) return result;
  }

  return {};
};

/**
 * Parse sizes list into a comma-separated string usable in the "Sizes" input.
 * Handles returned shapes like:
 * - sizes: ["S","M","L"]
 * - sizes: [{size:"S",stock:10}, ...] -> returns "S,M,L"
 * - sizes string "S,M,L" or JSON '["S","M"]'
 */
const parseSizesFromProduct = (p) => {
  if (!p) return "";

  const candidates = ["sizes", "size_list", "sizes_array", "available_sizes", "product_sizes", "sizesMap", "size_stock"];
  for (const k of candidates) {
    const val = p[k];
    if (val === undefined || val === null) continue;

    if (Array.isArray(val)) {
      // array of strings?
      if (val.every((x) => typeof x === "string")) {
        return val.map((s) => s.trim()).filter(Boolean).join(",");
      }
      // array of objects with known keys
      const mapped = val
        .map((it) => {
          if (!it) return null;
          if (typeof it === "string") return it.trim();
          return it.size ?? it.size_name ?? it.name ?? it.label ?? null;
        })
        .filter(Boolean);
      if (mapped.length) return mapped.join(",");
    }

    if (typeof val === "object" && !Array.isArray(val)) {
      // object mapping like { S: 10, M: 5 } -> keys are sizes (only if keys look like sizes)
      const keys = Object.keys(val).filter(Boolean).filter((k) => isLikelySizeKey(k));
      if (keys.length) return keys.join(",");
    }

    if (typeof val === "string") {
      const s = val.trim();
      // JSON array/string?
      if (s.startsWith("[") || s.startsWith("{")) {
        try {
          const parsed = JSON.parse(s);
          const nested = parseSizesFromProduct(parsed);
          if (nested) return nested;
        } catch (e) {
          // fallthrough to CSV parse
        }
      }
      // CSV-like
      if (s.includes(",")) {
        return s.split(",").map((x) => x.trim()).filter(Boolean).join(",");
      }
      // single size string
      if (s.length > 0) return s;
    }
  }

  // derive from size_stock keys
  const stockMap = parseSizeStockFromProduct(p);
  const keys = Object.keys(stockMap || {});
  if (keys.length) return keys.join(",");

  // If p itself is an array of strings or objects, try that
  if (Array.isArray(p)) {
    const mapped = p
      .map((it) => {
        if (!it) return null;
        if (typeof it === "string") return it.trim();
        return it.size ?? it.size_name ?? it.name ?? it.label ?? null;
      })
      .filter(Boolean);
    if (mapped.length) return mapped.join(",");
  }

  return "";
};

const sumSizeStock = (map) => Object.values(map || {}).reduce((s, v) => s + Number(v || 0), 0);

/* ======= CategoryFormModal ======= (unchanged behavior, kept for completeness) */
function CategoryFormModal({ editing, fixedCategory = null, categories = [], onClose, onSave }) {
  const defaultForm = {
    id: null,
    category: "Men",
    subcategory: "",
    slug: "",
    parent_id: null,
    status: "active",
    sort_order: 0,
    metadata: "",
  };

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing && typeof editing === "object" && Object.keys(editing).length > 0) {
      setForm({
        id: editing.id ?? null,
        category: editing.category ?? fixedCategory ?? "Men",
        subcategory: editing.subcategory ?? "",
        slug: editing.slug ?? "",
        parent_id: editing.parent_id ?? null,
        status: editing.status ?? "active",
        sort_order: Number(editing.sort_order ?? 0),
        metadata:
          editing.metadata && typeof editing.metadata === "string"
            ? editing.metadata
            : editing.metadata
            ? JSON.stringify(editing.metadata)
            : "",
      });
    } else {
      setForm((f) => ({ ...defaultForm, category: fixedCategory ?? defaultForm.category }));
    }
  }, [editing, fixedCategory]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        subcategory: form.subcategory,
        slug: form.slug || undefined,
        parent_id: form.parent_id ?? null,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
        metadata: form.metadata ? JSON.parse(form.metadata) : null,
      };

      let res;
      if (form.id) {
        res = await api.put(`/api/admin/products/categories/${form.id}`, payload, true);
      } else {
        res = await api.post("/api/admin/products/categories", payload, true);
      }

      if (typeof onSave === "function") {
        await onSave(normalizeResponse(res));
      }
      onClose && onClose();
    } catch (err) {
      console.error("Save category error:", err);
      alert("Failed to save category. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = (categories || [])
    .filter((c) => (c.category || c.category_name) === form.category && !c.parent_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose && onClose()} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-auto max-h-[92vh] border border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{form.id ? "Edit Subcategory" : "Add Subcategory"}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create or update subcategories (Men / Women / Kids).</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onClose && onClose()} className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700">
              Close
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-black text-white dark:bg-white dark:text-black">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className={inputCls}
            placeholder="Subcategory name"
            value={form.subcategory}
            onChange={(e) => setField("subcategory", e.target.value)}
            required
          />

          {/* Category selector - lock when opened from a section add button */}
          <select
            className={inputCls}
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
            disabled={!!fixedCategory && !form.id}
          >
            {MAIN_CATEGORIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <input className={inputCls} placeholder="Slug (optional)" value={form.slug} onChange={(e) => setField("slug", e.target.value)} />

          <select
            className={inputCls}
            value={form.parent_id ?? ""}
            onChange={(e) => setField("parent_id", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">No parent</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.subcategory}
              </option>
            ))}
          </select>

          <select className={inputCls} value={form.status} onChange={(e) => setField("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <input className={inputCls} placeholder="Sort order" type="number" value={form.sort_order} onChange={(e) => setField("sort_order", e.target.value)} />

          <textarea
            className={textareaCls + " sm:col-span-2"}
            placeholder='Metadata JSON (e.g. {"icon":"shirt.png"})'
            value={form.metadata}
            onChange={(e) => setField("metadata", e.target.value)}
            rows={4}
          />
        </div>
      </form>
    </div>
  );
}

/* ======= CategoryManagement Panel (full implementation) ======= */
function CategoryManagement({ categories = [], onRefresh }) {
  const [editing, setEditing] = useState(null); // object or null
  const [showForm, setShowForm] = useState(false);
  const [fixedCategory, setFixedCategory] = useState(null); // when creating from a section
  const [draggingItem, setDraggingItem] = useState(null);
  const [localCategories, setLocalCategories] = useState([]);
  const dragOverIdRef = useRef(null);

  useEffect(() => {
    setLocalCategories((categories || []).slice());
  }, [categories]);

  const openForEdit = (c) => {
    setEditing(c);
    setFixedCategory(null);
    setShowForm(true);
  };

  const handleCreateForMain = (main) => {
    setEditing({ category: main }); // seed form with category
    setFixedCategory(main);
    setShowForm(true);
  };

  const handleSave = async () => {
    await onRefresh();
    setShowForm(false);
    setEditing(null);
    setFixedCategory(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete subcategory? This cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/products/categories/${id}`, true);
      await onRefresh();
    } catch (err) {
      console.error("Delete category error:", err);
      alert("Failed to delete. See console.");
    }
  };

  const toggleStatus = async (c) => {
    try {
      await api.put(`/api/admin/products/categories/${c.id}/status`, { status: c.status === "active" ? "inactive" : "active" }, true);
      await onRefresh();
    } catch (err) {
      console.error("Toggle status error:", err);
      alert("Failed to toggle status. See console.");
    }
  };

  /* ======= Drag & Drop handlers (HTML5) ======= */
  const onDragStart = (e, itemId) => {
    setDraggingItem(String(itemId));
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(itemId));
    } catch (err) {
      // some browsers may throw; ignore
    }
  };

  const onDragOver = (e, overId) => {
    e.preventDefault();
    dragOverIdRef.current = String(overId);
  };

  const onDrop = async (e, targetMain) => {
    e.preventDefault();
    const draggedId = draggingItem ?? e.dataTransfer.getData("text/plain");
    if (!draggedId) return;
    const dragIdNum = Number(draggedId);
    const overId = dragOverIdRef.current ? Number(dragOverIdRef.current) : null;

    // build main column list (top-level only)
    const mainList = (localCategories || [])
      .filter((c) => (c.category || c.category_name) === targetMain && !c.parent_id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    // if dragged item not in this list => cross-column drop -> update category and append
    const draggedIndex = mainList.findIndex((i) => Number(i.id) === dragIdNum);
    if (draggedIndex === -1) {
      try {
        const lastSort = mainList.length > 0 ? (mainList[mainList.length - 1].sort_order ?? 0) : 0;
        await api.put(`/api/admin/products/categories/${dragIdNum}`, { category: targetMain, parent_id: null, sort_order: lastSort + 1 }, true);
        await onRefresh();
      } catch (err) {
        console.error("Failed cross-column drop:", err);
        alert("Failed to reorder. See console.");
      } finally {
        setDraggingItem(null);
        dragOverIdRef.current = null;
      }
      return;
    }

    const overIndex = overId != null ? mainList.findIndex((i) => Number(i.id) === overId) : null;
    if (overIndex === -1 && overIndex !== null) {
      setDraggingItem(null);
      dragOverIdRef.current = null;
      return;
    }

    const newList = mainList.slice();
    const [draggedItem] = newList.splice(draggedIndex, 1);
    let insertIndex = newList.length;
    if (overIndex !== null) insertIndex = overIndex;
    newList.splice(insertIndex, 0, draggedItem);

    try {
      await Promise.all(
        newList.map((itm, idx) =>
          api.put(`/api/admin/products/categories/${itm.id}`, { sort_order: idx }, true).catch((err) => {
            console.error("Failed to update order for", itm.id, err);
          })
        )
      );
      await onRefresh();
    } catch (err) {
      console.error("Persist order error:", err);
      alert("Failed to save new order. See console.");
    } finally {
      setDraggingItem(null);
      dragOverIdRef.current = null;
    }
  };

  /* ======= Tree helpers for nested display (parent/children) ======= */
  const treeRoots = useMemo(() => {
    const map = {};
    (categories || []).forEach((c) => (map[c.id] = { ...c, children: [] }));
    const roots = [];
    (categories || []).forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  }, [categories]);

  const renderNode = (node) => {
    return (
      <div
        key={node.id}
        draggable
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDrop={(e) => onDrop(e, node.category)}
        className="pl-2"
      >
        <div className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 grid place-items-center rounded bg-gray-100 dark:bg-gray-800">
              <Tag className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{node.subcategory}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{node.category}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              title="Toggle status"
              onClick={() => toggleStatus(node)}
              className={`px-2 py-1 rounded text-sm ${node.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
            >
              {node.status === "active" ? "Active" : "Inactive"}
            </button>

            <button onClick={() => openForEdit(node)} className="p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(node.id)} className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="ml-6 mt-2 space-y-2">
            {node.children
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((c) => renderNode(c))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="Text-lg font-semibold text-gray-900 dark:text-white">Category Management</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage subcategories, nesting, ordering and status across Men / Women / Kids.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MAIN_CATEGORIES.map((main) => (
            <div
              key={main}
              className="p-3 rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, main)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 grid place-items-center rounded bg-black text-white">{main[0]}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{main}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Main category</p>
                  </div>
                </div>

                <button onClick={() => handleCreateForMain(main)} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-black text-white dark:bg-white dark:text-black">
                  <PlusCircle className="w-4 h-4" /> Add
                </button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-auto">
                {categories.filter((c) => (c.category || c.category_name) === main && !c.parent_id).length === 0 ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400">No subcategories</div>
                ) : (
                  categories
                    .filter((c) => (c.category || c.category_name) === main && !c.parent_id)
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map((root) => (
                      <div
                        key={root.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, root.id)}
                        onDragOver={(e) => onDragOver(e, root.id)}
                        onDrop={(e) => onDrop(e, main)}
                        className="rounded-md p-1"
                      >
                        {renderNode(root)}
                      </div>
                    ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <CategoryFormModal
          editing={editing}
          fixedCategory={fixedCategory}
          categories={categories}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
            setFixedCategory(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ======= ProductFormModal (updated to use robust size parsing and strict coercion) ======= */
function ProductFormModal({ product, onClose, onSave, categories = [] }) {
  const defaultForm = {
    name: "",
    category: "Men",
    price: "",
    actualPrice: "",
    images: [],
    rating: "",
    sizes: "",
    colors: "",
    originalPrice: "",
    description: "",
    subcategory: "",
    stock: "",
    featured: 0,
  };

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [useCustomSub, setUseCustomSub] = useState(false);

  // sizeStocks is always the single source of truth for per-size values in the form UI
  const [sizeStocks, setSizeStocks] = useState({}); // { S: 10, M: 5 }

  // Keep the original parsed backend mapping in state so we can decide not to overwrite it
  const [backendSizeStocks, setBackendSizeStocks] = useState({}); // preserved parsed map
  const [initializedFromBackend, setInitializedFromBackend] = useState(false); // true if product had per-size map initially

  // Utility: distribute total evenly across sizes array
  const distribute = (total, sizesArr) => {
    const out = {};
    if (!sizesArr || sizesArr.length === 0) return out;
    const base = Math.floor(total / sizesArr.length);
    sizesArr.forEach((s, idx) => {
      out[s] = base + (idx === sizesArr.length - 1 ? total - base * sizesArr.length : 0);
    });
    return out;
  };

  // on product change, parse sizes & size_stock robustly
  useEffect(() => {
    if (product && typeof product === "object" && Object.keys(product).length > 0) {
      // parsedSizes always normalized to a string
      let parsedSizes = parseSizesFromProduct(product) || "";
      if (Array.isArray(parsedSizes)) parsedSizes = parsedSizes.join(",");
      parsedSizes = String(parsedSizes || "");

      const parsedSizeStocks = parseSizeStockFromProduct(product) || {};
      const computedStock = Number(sumSizeStock(parsedSizeStocks) || Number(product.stock || 0) || 0);

      const parsedImages = product.images ? String(product.images).split(",").filter(Boolean) : [];

      setForm({
        name: product.name ?? "",
        category: product.category ?? "Men",
        price: Number(product.price ?? 0),
        actualPrice: Number(product.actualPrice ?? product.price ?? 0),
        images: parsedImages,
        rating: Number(product.rating ?? 0),
        sizes: parsedSizes,
        colors: product.colors ?? "",
        originalPrice: Number(product.originalPrice ?? 0),
        description: product.description ?? "",
        subcategory: product.subcategory ?? "",
        stock: Number(computedStock || 0),
        featured: Number(product.featured ?? 0),
      });

      // normalize parsedSizeStocks and store it as backend mapping
      const normalized = {};
      Object.entries(parsedSizeStocks || {}).forEach(([k, v]) => {
        normalized[k] = Number(v || 0);
      });
      setBackendSizeStocks(normalized);

      // If backend provided per-size mapping, use it directly and mark as initializedFromBackend
      if (Object.keys(normalized).length > 0) {
        setSizeStocks(normalized);
        setInitializedFromBackend(true);
      } else {
        // If no backend per-size map but sizes list exists and product.stock > 0, auto-distribute ONCE now
        const sizesArr = String(parsedSizes || "").split(",").map((s) => s.trim()).filter(Boolean);
        if (sizesArr.length > 0 && Number(product.stock || 0) > 0) {
          const distributed = distribute(Number(product.stock || 0), sizesArr);
          setSizeStocks(distributed);
        } else {
          setSizeStocks({});
        }
        setInitializedFromBackend(false);
      }

      setUseCustomSub(false);
    } else {
      setForm(defaultForm);
      setSizeStocks({});
      setBackendSizeStocks({});
      setInitializedFromBackend(false);
      setUseCustomSub(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // Clear subcategory when main category changes (avoid stale selection)
  useEffect(() => {
    setField("subcategory", "");
    setUseCustomSub(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose && onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingCount((c) => c + files.length);

    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const fd = new FormData();
          fd.append("image", file);
          const res = await api.formPost("/api/upload", fd, true);
          const url =
            res?.url ||
            res?.secure_url ||
            res?.data?.url ||
            res?.data?.secure_url ||
            (res?.public_id && res?.secure_url);

          if (!url) {
            console.warn("Upload returned unexpected shape:", res);
            throw new Error("No URL returned from upload");
          }
          return url;
        })
      );

      setForm((s) => ({
        ...s,
        images: [...(s.images || []), ...uploads],
      }));
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Check console for details.");
    } finally {
      setUploadingCount((c) => Math.max(0, c - files.length));
      if (e.target) e.target.value = "";
    }
  };

  const removeImage = (url) => {
    setForm((s) => ({ ...s, images: s.images.filter((i) => i !== url) }));
  };

  // When the sizes string changes, adjust the sizeStocks map
  // NOTE: we *do not* overwrite backend-provided per-size mapping here.
  useEffect(() => {
    const sizesArr = String(form.sizes || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (sizesArr.length === 0) {
      setSizeStocks({});
      return;
    }

    setSizeStocks((prev) => {
      // If product originally had a backend mapping, preserve those values for matching sizes
      if (initializedFromBackend && Object.keys(backendSizeStocks || {}).length > 0) {
        const next = {};
        sizesArr.forEach((sz) => {
          next[sz] = Number(backendSizeStocks[sz] ?? prev[sz] ?? 0);
        });
        return next;
      }

      // Otherwise, try to keep existing prev values where possible
      const next = {};
      const prevKeys = Object.keys(prev || {});
      const totalPrev = sumSizeStock(prev);

      sizesArr.forEach((sz, idx) => {
        if (prev && typeof prev[sz] !== "undefined") {
          next[sz] = Number(prev[sz]);
        } else if (prevKeys.length === sizesArr.length && prevKeys[idx]) {
          // If prev had same number of keys, map by index (best effort)
          next[sz] = Number(prev[prevKeys[idx]] || 0);
        } else {
          // Distribute base from previously known total or from form.stock
          const base = prevKeys.length ? Math.floor(totalPrev / sizesArr.length) : Math.floor(Number(form.stock || 0) / sizesArr.length);
          next[sz] = Number(base || 0);
        }
      });

      // ensure sum equals form.stock if possible by adjusting last size
      const desiredTotal = Number(form.stock || 0);
      const currentTotal = sumSizeStock(next);
      if (desiredTotal > 0 && currentTotal !== desiredTotal) {
        const last = sizesArr[sizesArr.length - 1];
        next[last] = (next[last] || 0) + (desiredTotal - currentTotal);
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sizes, initializedFromBackend, backendSizeStocks]);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);

    try {
      // If user is in custom subcategory mode and typed something, ensure subcategory exists (create or reuse)
      let chosenSub = form.subcategory ? String(form.subcategory).trim() : "";

      if (useCustomSub && chosenSub) {
        const exists = (categories || []).find((c) => {
          const catName = (c.category || c.category_name || "").toString();
          const subName = (c.subcategory || c.name || "").toString();
          return catName === form.category && subName.toLowerCase() === chosenSub.toLowerCase();
        });

        if (exists) {
          chosenSub = exists.subcategory || exists.name || chosenSub;
        } else {
          try {
            const createRes = await api.post(
              "/api/admin/products/categories",
              { category: form.category, subcategory: chosenSub, parent_id: null, status: "active", sort_order: 0 },
              true
            );
            const created = normalizeResponse(createRes);
            const createdObj = created && typeof created === "object" && (created.subcategory || created.data) ? (created.subcategory ? created : created.data ?? created) : created;
            if (createdObj && (createdObj.subcategory || createdObj.name)) {
              chosenSub = createdObj.subcategory ?? createdObj.name ?? chosenSub;
            }
          } catch (err) {
            console.warn("Failed to create subcategory; proceeding with typed name.", err);
          }
        }
      }

      // Ensure sizes string is normalized (always a string)
      const sizesNormalized = String(form.sizes || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",");

      // finalize sizeStocks and total stock
      const finalSizeStocks = {};
      Object.entries(sizeStocks || {}).forEach(([k, v]) => (finalSizeStocks[k] = Number(v || 0)));
      const totalStock = Number(sumSizeStock(finalSizeStocks) || Number(form.stock || 0) || 0);

      // payload: keep backward-compatible 'stock' (total) and also include size_stock JSON mapping
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        actualPrice: Number(form.actualPrice) || Number(form.price) || 0,
        originalPrice: Number(form.originalPrice) || 0,
        rating: Number(form.rating) || 0,
        stock: Number(totalStock) || 0,
        featured: Number(form.featured) ? 1 : 0,
        images: (form.images || []).join(","),
        subcategory: chosenSub || form.subcategory || "",
        sizes: sizesNormalized,
        // front-end will send size_stock as JSON string. Backend can insert into product_sizes table during server-side migration/creation.
        size_stock: JSON.stringify(finalSizeStocks),
      };

      let resp;
      if (product && product.id) {
        resp = await api.put(`/api/admin/products/${product.id}`, payload, true);
      } else {
        resp = await api.post(`/api/admin/products`, payload, true);
      }

      if (typeof onSave === "function") {
        await onSave(normalizeResponse(resp));
      } else {
        onClose && onClose();
      }
    } catch (err) {
      console.error("Save product error:", err);
      alert("Failed to save product — check console");
    } finally {
      setSaving(false);
    }
  };

  // available subcategories for selected main category (top-level only)
  const availableSubcats = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    return categories
      .filter((c) => (c.category || c.category_name) === (form.category || "Men") && !c.parent_id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories, form.category]);

  useEffect(() => {
    if (form.subcategory === "__custom__") {
      setUseCustomSub(true);
      setField("subcategory", "");
    }
  }, [form.subcategory]);

  // helpers for UI
  const sizesArray = useMemo(() => String(form.sizes || "").split(",").map((s) => s.trim()).filter(Boolean), [form.sizes]);

  // Auto distribute only when user clicks the button (explicit)
  const autoDistribute = () => {
    const total = Number(form.stock || 0) || sumSizeStock(sizeStocks);
    const sizes = sizesArray;
    if (sizes.length === 0) return;
    // If there was backend mapping, we still allow the user to overwrite with auto-distribute
    const next = distribute(Number(total || 0), sizes);
    setSizeStocks(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose && onClose()} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-auto max-h-[92vh] border border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{product ? "Edit Product" : "Add Product"}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Fill product details. Images are uploaded to your configured upload route.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onClose && onClose()}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className={inputCls} placeholder="Product name" value={form.name || ""} onChange={(e) => setField("name", e.target.value)} required />

          <select className={inputCls} value={form.category || "Men"} onChange={(e) => setField("category", e.target.value)}>
            {MAIN_CATEGORIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <input className={inputCls} placeholder="Price (₹)" type="number" value={form.price ?? ""} onChange={(e) => setField("price", e.target.value)} />
          <input className={inputCls} placeholder="Actual Price (₹)" type="number" value={form.actualPrice ?? ""} onChange={(e) => setField("actualPrice", e.target.value)} />

          <input className={inputCls} placeholder="Original Price (₹)" type="number" value={form.originalPrice ?? ""} onChange={(e) => setField("originalPrice", e.target.value)} />
          <input className={inputCls} placeholder="Rating" type="number" step="0.1" value={form.rating ?? ""} onChange={(e) => setField("rating", e.target.value)} />

          {/* Ensure sizes is always a string */}
          <input className={inputCls} placeholder="Sizes (comma separated)" value={form.sizes ?? ""} onChange={(e) => setField("sizes", e.target.value)} />
          <input className={inputCls} placeholder="Colors (comma separated)" value={form.colors ?? ""} onChange={(e) => setField("colors", e.target.value)} />

          {/* Subcategory UI (unchanged) */}
          {availableSubcats.length > 0 && !useCustomSub ? (
            <div className="flex gap-2 items-center">
              <select
                className={inputCls + " flex-1"}
                value={form.subcategory}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__custom__") {
                    setUseCustomSub(true);
                    setField("subcategory", "");
                  } else {
                    setField("subcategory", val);
                  }
                }}
              >
                <option value="">-- Select Subcategory --</option>
                {availableSubcats.map((s) => (
                  <option key={s.id} value={s.subcategory}>
                    {s.subcategory}
                  </option>
                ))}
                <option value="__custom__">Other (Custom)</option>
              </select>
              <button type="button" onClick={() => setUseCustomSub(true)} className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                Custom
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <input className={inputCls + " flex-1"} placeholder="Subcategory (Custom)" value={form.subcategory ?? ""} onChange={(e) => setField("subcategory", e.target.value)} />
              <button
                type="button"
                onClick={() => {
                  setUseCustomSub(false);
                  setField("subcategory", "");
                }}
                className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700"
              >
                Choose
              </button>
            </div>
          )}

          {/* Stock controls: total and per-size mapping */}
          <div className="flex items-center gap-2">
            <input className={inputCls} placeholder="Total stock (will sum per-size)" type="number" value={form.stock ?? ""} onChange={(e) => setField("stock", Number(e.target.value))} />
            <button type="button" onClick={autoDistribute} className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700">Auto distribute</button>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Per-size stock</label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sizesArray.length === 0 ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">Define sizes above (e.g. S,M,L) to set per-size stock</div>
              ) : (
                sizesArray.map((sz) => (
                  <div key={sz} className="flex items-center gap-2">
                    <div className="w-16 text-sm text-gray-700 dark:text-gray-300">{sz}</div>
                    <input
                      type="number"
                      className={inputCls + " flex-1"}
                      value={Number(sizeStocks[sz] ?? 0)}
                      onChange={(e) => setSizeStocks((s) => ({ ...s, [sz]: Number(e.target.value) || 0 }))}
                    />
                  </div>
                ))
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">The UI will submit a <code>size_stock</code> JSON object (e.g. {"{"}"S":10,"M":15{"}"}) along with a backward-compatible <code>stock</code> total.</p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="featuredSwitch" className="flex items-center gap-2 cursor-pointer select-none">
              <div className={`w-11 h-6 flex items-center rounded-full p-1 transition ${form.featured ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow transform transition ${form.featured ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Featured</span>
            </label>
            <input id="featuredSwitch" type="checkbox" className="sr-only" checked={Number(form.featured) === 1} onChange={(e) => setField("featured", e.target.checked ? 1 : 0)} />
          </div>

          <textarea className={textareaCls + " sm:col-span-2"} rows={4} placeholder="Description" value={form.description ?? ""} onChange={(e) => setField("description", e.target.value)} />
        </div>

        {/* Images uploader */}
        <div className="mt-6">
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Product images</label>
          <div className="flex flex-wrap items-center gap-3">
            {(form.images || []).map((img) => (
              <div key={img} className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={img} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-7 h-7 grid place-items-center shadow"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            ))}

            <label
              className="flex items-center justify-center w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500"
              title="Upload images"
            >
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
              <div className="text-center">
                <div className="text-2xl">＋</div>
                <div className="text-xs mt-1">{uploadingCount ? `${uploadingCount} uploading...` : "Upload"}</div>
              </div>
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">You can upload multiple images. They will be saved as a comma-separated string to keep DB compatible with existing CSV/bulk upload.</p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button type="button" onClick={() => onClose && onClose()} className={btnSecondaryCls}>
            Cancel
          </button>
          <button type="submit" disabled={saving || uploadingCount > 0} className={btnPrimaryCls}>
            {saving ? "Saving..." : "Save product"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ======= ProductsAdmin main component (extended) ======= */
export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ total: 0, sold: 0, inStock: 0, outOfStock: 0 });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("newest");
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const [categories, setCategories] = useState([]);

  const DEBUG = false;

  const mapSortForBackend = (uiSort) => {
    const map = {
      newest: "newest",
      price_asc: "price_asc",
      price_desc: "price_desc",
      best_selling: "best_selling",
      out_of_stock: "out_of_stock",
      low_stock: "low_stock",
    };
    return map[uiSort] ?? uiSort;
  };

  const fetchProducts = useCallback(
    async () => {
      if (!showProducts) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q && String(q).trim() !== "") params.append("search", String(q).trim());
        if (page && Number(page) > 0) params.append("page", String(Number(page)));
        if (limit && Number(limit) > 0) params.append("limit", String(Number(limit)));
        const backendSort = mapSortForBackend(sortBy);
        if (backendSort) params.append("sort", String(backendSort));

        const queryString = params.toString();
        const url = queryString ? `/api/admin/products?${queryString}` : `/api/admin/products`;

        if (DEBUG) console.log("Fetching products URL:", url);

        const res = await api.get(url, {}, true);
        if (DEBUG) console.log("Products list raw:", res);
        const body = normalizeResponse(res);

        let list = [];
        let total = 0;
        if (Array.isArray(body)) {
          list = body;
        } else if (Array.isArray(body.data)) {
          list = body.data;
          total = Number(body.total ?? body.totalCount ?? 0);
        } else if (Array.isArray(body.products)) {
          list = body.products;
          total = Number(body.total ?? body.totalCount ?? 0);
        } else {
          const arr = Object.values(body).find((v) => Array.isArray(v));
          if (arr) list = arr;
        }

        // normalize each product: parse size_stock mappings if present and compute totalStock and normalized sizes
        const normList = (list || []).map((p) => {
          const sizeStock = parseSizeStockFromProduct(p);
          const sizesNormalized = parseSizesFromProduct(p) || "";
          const totalStock = Number(sumSizeStock(sizeStock) || Number(p.stock || 0) || 0);
          return {
            ...p,
            sizeStock,
            totalStock,
            sizes: String(sizesNormalized || ""),
            stock: Number(p.stock || 0),
          };
        });

        setProducts(normList || []);
        setTotalPages(limit === 999999 ? 1 : Math.max(1, Math.ceil((total || normList.length || 0) / (limit || 20))));
      } catch (err) {
        console.error("Fetch products error:", err);
        setProducts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [q, page, limit, sortBy, showProducts, DEBUG]
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/stats", {}, true);
      if (DEBUG) console.log("Stats raw:", res);
      const body = normalizeResponse(res);

      const total = Number((body.total ?? body.totalProducts) ?? 0);
      const sold = Number((body.sold ?? body.soldProducts) ?? 0);
      const inStock = Number((body.inStock ?? body.in_stock) ?? 0);
      const outOfStock = Number((body.outOfStock ?? body.out_of_stock) ?? 0);

      setStats({ total, sold, inStock, outOfStock });
    } catch (err) {
      console.error("Fetch stats error:", err);
      setStats({ total: 0, sold: 0, inStock: 0, outOfStock: 0 });
    }
  }, [DEBUG]);

  /* ======= Category API helpers ======= */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/products/categories", {}, true);
      const body = normalizeResponse(res);
      const list = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : body.categories ?? [];
      const norm = (list || []).map((c) => ({
        id: c.id ?? c._id ?? c.category_id ?? c.id,
        category: c.category ?? c.category_name ?? c.main_category ?? c.category,
        subcategory: c.subcategory ?? c.name ?? c.label ?? c.subcategory,
        parent_id: c.parent_id ?? c.parentId ?? c.parent ?? null,
        status: c.status ?? "active",
        sort_order: c.sort_order ?? c.order ?? 0,
        slug: c.slug ?? null,
        metadata: c.metadata ?? null,
        description: c.description ?? null,
        raw: c,
      }));

      setCategories(norm);
    } catch (err) {
      console.error("Fetch categories error:", err);
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCategories, fetchStats]);

  useEffect(() => {
    if (!showProducts) return;
    setPage(1);
  }, [q, limit, sortBy, showProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (showProducts) fetchStats();
  }, [showProducts, fetchStats]);

  useEffect(() => {
    if (showCategories) fetchCategories();
  }, [showCategories, fetchCategories]);

  const openEditor = async (p) => {
    if (!p?.id) return;
    try {
      const res = await api.get(`/api/admin/products/${p.id}`, {}, true);
      const body = normalizeResponse(res);
      const prod = body?.data && typeof body.data === "object" ? body.data : body;
      // ensure we include parsed sizeStock for the edit form
      const sizeStock = parseSizeStockFromProduct(prod);
      const totalStock = Number(sumSizeStock(sizeStock) || Number(prod.stock || 0) || 0);

      // pass through everything; ProductFormModal will parse sizes as needed
      const parsedProd = { ...prod, sizeStock, stock: totalStock };
      setEditing(parsedProd);
      setShowForm(true);
    } catch (err) {
      console.error("Failed to fetch product for edit:", err);
      alert("Failed to load product for editing. See console.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete product? This cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/products/${id}`, true);
      await Promise.all([fetchProducts(), fetchStats()]);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete product. See console.");
    }
  };

  const handleSave = async () => {
    await Promise.all([fetchProducts(), fetchStats(), fetchCategories()]);
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Products", value: stats.total, icon: Package, color: "bg-purple-500" },
          { label: "Sold Products", value: stats.sold, icon: ShoppingCart, color: "bg-green-500" },
          { label: "In Stock", value: stats.inStock, icon: CheckCircle, color: "bg-blue-500" },
          { label: "Out of Stock", value: stats.outOfStock, icon: XCircle, color: "bg-red-500" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.06 }} className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${stat.color} text-white`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-sm hover:scale-[1.02] transition">
          <Plus className="w-4 h-4" /> Add Product
        </button>

        <button onClick={() => setShowBulk((s) => !s)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <Upload className="w-4 h-4" /> Bulk Upload
        </button>

        <div className="inline-flex items-center gap-2">
          <button onClick={() => setShowProducts((s) => !s)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-sm">
            <Eye className="w-4 h-4" /> {showProducts ? "Hide Products" : "Browse Products"}
          </button>

          {/* Category management toggle beside Browse Products */}
          <button onClick={() => setShowCategories((s) => !s)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${showCategories ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-gray-200 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"}`}>
            <Layers className="w-4 h-4" /> {showCategories ? "Hide Categories" : "Manage Categories"}
          </button>
        </div>
      </div>

      {/* Bulk Upload */}
      {showBulk && (
        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <BulkUpload onUploadComplete={handleSave} expectSizeStock={true} />
        </div>
      )}

      {/* Category Management */}
      {showCategories && (
        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <CategoryManagement categories={categories} onRefresh={fetchCategories} />
        </div>
      )}

      {/* Products */}
      {showProducts && (
        <div className="space-y-6">
          {/* Search & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search products..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>

            <div className="flex items-center gap-3">
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {[10, 20, 50, 100].map((s) => <option key={s} value={s}>{s} per page</option>)}
                <option value={999999}>Show All</option>
              </select>

              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="best_selling">Best Selling</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="low_stock">Low Stock</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">No products found</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((p) => {
                const priceNum = Number(p.price ?? 0);
                const actualNum = Number(p.actualPrice ?? 0);
                const displayPrice = priceNum > 0 ? priceNum : actualNum;
                const showOriginal = Number(p.originalPrice ?? 0) > 0 && Number(p.originalPrice) > displayPrice;
                const firstImage = p.images ? String(p.images).split(",")[0] : "/images/placeholder.jpg";

                const totalStock = Number(p.totalStock ?? p.stock ?? 0);

                return (
                  <div key={p.id} className={cardCls}>
                    <div className="h-44 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800">
                      <img src={firstImage || "/images/placeholder.jpg"} alt={p.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="mt-3 flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{p.category} {p.subcategory ? `/ ${p.subcategory}` : ""}</p>

                        <div className="mt-2 font-semibold text-gray-900 dark:text-white flex items-baseline gap-3">
                          <span>₹{displayPrice.toLocaleString()}</span>
                          {showOriginal && <span className="text-sm line-through text-gray-400">₹{Number(p.originalPrice).toLocaleString()}</span>}
                          {typeof p.sold !== "undefined" && <span className="text-xs text-gray-500 dark:text-gray-400">• {p.sold} sold</span>}
                          {Number(p.featured) === 1 && <span className="ml-2 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Featured</span>}
                        </div>

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Stock: {totalStock}</div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button onClick={() => openEditor(p)} className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Edit className="w-4 h-4 text-gray-900 dark:text-white" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && limit !== 999999 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Prev</button>
              <span className="text-gray-700 dark:text-gray-300">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Product Modal */}
      {showForm && (
        <ProductFormModal
          product={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
          categories={categories}
        />
      )}
    </div>
  );
}
