import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Plus,
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Image as ImageIcon,
  Gift,
  Check,
  X,
  Edit2,
  GripVertical,
} from "lucide-react";
import ProductSearchBar from "../components/ProductSearchBar";

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                 */
/* -------------------------------------------------------------------------- */

export default function SlidesAndSalesAdmin() {
  const API_BASE =
    (typeof process !== "undefined" && (process.env.REACT_APP_API_BASE || process.env.API_BASE)) ||
    (typeof window !== "undefined" && window.__API_BASE__) ||
    "https://api.dripzoid.com";

  function buildUrl(path) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) return path;
    const base = API_BASE.replace(/\/+$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    return base ? `${base}${p}` : p;
  }

  // -- UI modes
  const [mode, setMode] = useState("slides");

  // Slides
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [addingSlide, setAddingSlide] = useState(false);
  const fileInputRef = useRef(null);
  const dragIndexRef = useRef(null);
  const dragOverIndexRef = useRef(null);

  // Slide edit modal
  const [slideEditOpen, setSlideEditOpen] = useState(false);
  const [slideEditing, setSlideEditing] = useState(null); // { id, name, link, image_url, file }

  // Sales
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [creatingSale, setCreatingSale] = useState(false);

  // Sale edit modal
  const [saleEditOpen, setSaleEditOpen] = useState(false);
  const [saleEditing, setSaleEditing] = useState(null); // { id, name, enabled }

  // Products (client-side list)
  const [allProducts, setAllProducts] = useState([]); // all products fetched once
  const [productsLoading, setProductsLoading] = useState(false); // only for initial load
  const [productSort, setProductSort] = useState("relevance");
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Sale creator fields
  const [saleName, setSaleName] = useState("");

  // UI note
  const [note, setNote] = useState(null);

  // ref for search input (passed to ProductSearchBar if needed)
  const searchInputRef = useRef(null);

  // Styles helper funcs
  function primaryBtnClass(extra = "") {
    return `inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow transition transform-gpu hover:-translate-y-0.5 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-black text-white dark:bg-white dark:text-black ${extra}`;
  }
  function secondaryBtnClass(extra = "") {
    return `inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition border border-neutral-200/30 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 bg-transparent ${extra}`;
  }

  function setNoteWithAutoClear(n, timeout = 6000) {
    setNote(n);
    if (timeout) {
      setTimeout(() => setNote((cur) => (cur === n ? null : cur)), timeout);
    }
  }

  // fetch helpers
  function getAuthHeaders(addJson = true) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (addJson) headers["Content-Type"] = "application/json";
    return headers;
  }

  async function parseErrorResponse(res) {
    try {
      if (!res || typeof res.text !== "function") return String(res || "Unknown error");
      const ct = (res.headers && typeof res.headers.get === "function") ? (res.headers.get("content-type") || "") : "";
      const text = await res.text();
      if (ct.includes("application/json")) {
        try {
          const json = JSON.parse(text);
          return json.message || json.error || JSON.stringify(json);
        } catch {
          return text || `${res.status || "error"} ${res.statusText || ""}`;
        }
      }
      if (text && text.includes("<")) {
        const msgMatch = text.match(/<Message>([\s\S]*?)<\/*Message>/i);
        if (msgMatch && msgMatch[1]) return msgMatch[1].trim();
        return `Server returned XML error: ${text.slice(0, 240)}...`;
      }
      return text || `${res.status || "error"} ${res.statusText || ""}`;
    } catch {
      return `Network error or malformed error response`;
    }
  }

  async function safeFetchJson(url, opts = {}) {
    let res;
    try {
      res = await fetch(url, opts);
    } catch (fetchErr) {
      throw new Error(`Network error: ${fetchErr.message || fetchErr}`);
    }

    if (!res.ok) {
      const parsed = await parseErrorResponse(res);
      throw new Error(parsed);
    }

    const ct = (res.headers && res.headers.get ? res.headers.get("content-type") : "") || "";
    if (ct.includes("application/json")) {
      try {
        return await res.json();
      } catch {
        const txt = await res.text().catch(() => "");
        return { data: txt };
      }
    }
    const txt = await res.text().catch(() => "");
    try {
      return JSON.parse(txt);
    } catch {
      return { data: txt };
    }
  }

  async function apiGet(path, signal) {
    const opts = { credentials: "include", headers: getAuthHeaders(false) };
    if (signal) opts.signal = signal;
    return safeFetchJson(buildUrl(path), opts);
  }
  async function apiPost(path, body, isFormData = false) {
    const url = buildUrl(path);
    const opts = { method: "POST", credentials: "include" };
    if (isFormData) {
      opts.body = body;
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) opts.headers = { Authorization: `Bearer ${token}` };
    } else {
      opts.headers = getAuthHeaders(true);
      opts.body = JSON.stringify(body);
    }
    return safeFetchJson(url, opts);
  }
  async function apiPatch(path, body) {
    return safeFetchJson(buildUrl(path), { method: "PATCH", credentials: "include", headers: getAuthHeaders(true), body: JSON.stringify(body) });
  }
  async function apiPut(path, body, isFormData = false) {
    const url = buildUrl(path);
    const opts = { method: "PUT", credentials: "include" };
    if (isFormData) {
      opts.body = body;
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) opts.headers = { Authorization: `Bearer ${token}` };
    } else {
      opts.headers = getAuthHeaders(true);
      opts.body = JSON.stringify(body);
    }
    return safeFetchJson(url, opts);
  }
  async function apiDelete(path) {
    return safeFetchJson(buildUrl(path), { method: "DELETE", credentials: "include", headers: getAuthHeaders(false) });
  }

  // initial load (slides, sales, all products)
  useEffect(() => {
    (async () => {
      try {
        await loadSlides();
        await loadSales();
        await loadAllProducts();
      } catch (err) {
        console.error("initial load error:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- SLIDES
  async function loadSlides() {
    setLoadingSlides(true);
    try {
      const data = await apiGet("/api/admin/slides");
      const arr = Array.isArray(data) ? data : data.slides || data.data || [];
      setSlides(Array.isArray(arr) ? arr : []);
    } catch (err) {
      console.error("loadSlides error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load slides — ${err.message || err}` }, 10000);
      setSlides([]);
    } finally {
      setLoadingSlides(false);
    }
  }

  async function handleDeleteSlide(id) {
    if (!window.confirm("Delete this slide?")) return;
    try {
      await apiDelete(`/api/admin/slides/${id}`);
      setSlides((s) => s.filter((x) => x?.id !== id));
      setNoteWithAutoClear({ type: "success", text: "Slide removed" }, 4000);
    } catch (err) {
      console.error("handleDeleteSlide error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to remove slide — ${err.message || err}` }, 8000);
    }
  }

  function onDragStartSlide(e, index) {
    dragIndexRef.current = index;
    try {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
    } catch {}
  }
  function onDragEnterSlide(e, index) {
    e.preventDefault();
    dragOverIndexRef.current = index;
  }
  function onDragOverSlide(e) {
    e.preventDefault();
  }
  function onDropSlide(e) {
    e.preventDefault();
    const from = dragIndexRef.current;
    const to = dragOverIndexRef.current != null ? dragOverIndexRef.current : Number(e.dataTransfer.getData("text/plain"));
    if (from == null || to == null || Number.isNaN(from) || Number.isNaN(to)) {
      dragIndexRef.current = null;
      dragOverIndexRef.current = null;
      return;
    }
    reorderSlides(from, to);
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
  }

  async function reorderSlides(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    setSlides((prev) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      if (fromIndex < 0 || fromIndex >= copy.length) return copy;
      const [item] = copy.splice(fromIndex, 1);
      const toClamped = Math.max(0, Math.min(toIndex, copy.length));
      copy.splice(toClamped, 0, item);
      updateSlidesOrder(copy).catch((e) => console.error("reorder save failed", e));
      return copy;
    });
  }

  async function updateSlidesOrder(newOrder) {
    try {
      await apiPost("/api/admin/slides/reorder", { order: newOrder.map((s) => s?.id) });
      setNoteWithAutoClear({ type: "success", text: "Slides reordered" }, 3000);
    } catch (err) {
      console.error("updateSlidesOrder error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to save slide order — ${err.message || err}` }, 8000);
    }
  }

  async function uploadImage(file) {
    if (!file) throw new Error("No file provided");
    const fd = new FormData();
    fd.append("image", file);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(buildUrl("/api/admin/upload") === "/api/admin/upload" ? buildUrl("/api/upload") : buildUrl("/api/upload"), { method: "POST", body: fd, credentials: "include", headers });
      if (!res.ok) {
        const parsed = await parseErrorResponse(res);
        throw new Error(parsed);
      }
      const json = await res.json().catch(() => null);
      if (!json) throw new Error("Upload returned empty response");
      const url = json.url || json.secure_url || json.imageUrl || json.image_url || json.data?.url;
      if (!url) throw new Error("Upload succeeded but server returned no 'url' field.");
      return url;
    } catch (err) {
      console.error("uploadImage error:", err);
      throw err;
    }
  }

  async function handleAddSlide({ file, name, link }) {
    if (!file) {
      setNoteWithAutoClear({ type: "error", text: "Please choose an image." }, 4000);
      return;
    }
    setAddingSlide(true);
    try {
      const url = await uploadImage(file);
      const saved = await apiPost("/api/admin/slides", { name, link, image_url: url });
      const newSlide = saved?.slide || (saved?.id ? { id: saved.id, name, link, image_url: url } : { id: Date.now(), name, link, image_url: url });
      setSlides((s) => [...(Array.isArray(s) ? s : []), newSlide]);
      setNoteWithAutoClear({ type: "success", text: "Slide added" }, 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("handleAddSlide error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to add slide — ${err.message || err}` }, 8000);
    } finally {
      setAddingSlide(false);
    }
  }

  // Slide edit flow
  function openEditSlide(slide) {
    setSlideEditing({ ...slide, file: null }); // keep original image_url; file null until user chooses new
    setSlideEditOpen(true);
  }

  function onSlideFileChange(e) {
    const file = e?.target?.files?.[0] ?? null;
    setSlideEditing((s) => (s ? { ...s, file } : s));
  }

  async function handleUpdateSlide() {
    if (!slideEditing || !slideEditing.id) return;
    const { id, name, link, file } = slideEditing;
    try {
      setNoteWithAutoClear({ type: "success", text: "Updating slide..." }, 2000);
      let image_url = slideEditing.image_url || null;
      if (file) {
        image_url = await uploadImage(file);
      }
      await apiPut(`/api/admin/slides/${id}`, { name, link, image_url });
      setSlides((list) => (Array.isArray(list) ? list.map((s) => (s?.id === id ? { ...s, name, link, image_url } : s)) : list));
      setNoteWithAutoClear({ type: "success", text: "Slide updated" }, 4000);
      setSlideEditOpen(false);
      setSlideEditing(null);
    } catch (err) {
      console.error("handleUpdateSlide error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to update slide — ${err.message || err}` }, 8000);
    }
  }

  // -- SALES
  const fetchProductsByIds = useCallback(async (ids = []) => {
    if (!ids || ids.length === 0) return [];
    try {
      const tryBulk = await apiGet(`/api/products?ids=${ids.join(",")}`).catch(() => null);
      const bulkData = Array.isArray(tryBulk) ? tryBulk : tryBulk?.data ?? tryBulk?.products ?? tryBulk?.items ?? null;
      if (Array.isArray(bulkData) && bulkData.length > 0) return bulkData;
    } catch (e) {
      // swallow and fallback
    }
    const promises = ids.map((id) => apiGet(`/api/products/${id}`).then((j) => j?.data || j?.product || j).catch(() => null));
    const results = await Promise.all(promises);
    return results.filter(Boolean);
  }, []);

  const expandSalesProducts = useCallback(async (salesArr) => {
    const out = await Promise.all(
      (Array.isArray(salesArr) ? salesArr : []).map(async (sale) => {
        const productIds =
          Array.isArray(sale.productIds) && sale.productIds.length
            ? sale.productIds
            : Array.isArray(sale.products)
            ? sale.products.map((p) => p?.id).filter(Boolean)
            : [];
        const ids = Array.isArray(productIds) ? productIds.map((x) => (x && typeof x === "object" ? x.id : x)).filter(Boolean) : [];
        if (ids.length === 0) return { ...sale, products: sale?.products || [] };
        const prods = await fetchProductsByIds(ids);
        return { ...sale, products: prods || [] };
      })
    );
    return out;
  }, [fetchProductsByIds]);

  async function loadSales() {
    setLoadingSales(true);
    try {
      const data = await apiGet("/api/admin/sales");
      const arr = Array.isArray(data) ? data : data.sales || data.data || [];
      const withProducts = await expandSalesProducts(Array.isArray(arr) ? arr : []);
      setSales(withProducts);
    } catch (err) {
      console.error("loadSales error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load sales — ${err.message || err}` }, 8000);
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  }

  // ---------- FIXED: use saleName state as single source of truth ----------
  const handleCreateSale = useCallback(async () => {
    const name = (saleName || "").trim();
    if (!name || selectedProductIds.size === 0) {
      setNoteWithAutoClear({ type: "error", text: "Please provide a name and select at least one product" }, 6000);
      return;
    }
    setCreatingSale(true);
    try {
      const productIdsArray = Array.from(selectedProductIds).map((id) => (typeof id === "string" && id.match(/^\d+$/) ? Number(id) : id));
      const payload = { name, productIds: productIdsArray };
      const saved = await apiPost("/api/admin/sales", payload);

      const newSaleRaw = saved?.sale || (saved?.data && saved.data?.sale) || (saved?.id ? { id: saved.id, name, productIds: productIdsArray, enabled: 1 } : null);
      const createdSale = newSaleRaw || saved;

      const prods = await fetchProductsByIds(productIdsArray);
      const normalizedSale = { ...createdSale, products: prods || [], productIds: productIdsArray };

      setSales((s) => [...(Array.isArray(s) ? s : []), normalizedSale]);
      setSelectedProductIds(new Set());
      setSaleName("");
      setNoteWithAutoClear({ type: "success", text: "Sale created" }, 5000);

      setAllProducts((prev) => {
        const copy = Array.isArray(prev) ? [...prev] : [];
        (prods || []).forEach((p) => {
          if (!copy.some((x) => String(x?.id) === String(p?.id))) copy.unshift(p);
        });
        return copy;
      });
    } catch (err) {
      console.error("handleCreateSale error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to create sale — ${err.message || err}` }, 10000);
    } finally {
      setCreatingSale(false);
    }
  }, [saleName, selectedProductIds, fetchProductsByIds]);

  const toggleSaleEnabled = useCallback(async (saleId) => {
    try {
      const sale = sales.find((s) => s?.id === saleId);
      if (!sale) return;
      const newEnabled = sale?.enabled ? 0 : 1;
      await apiPut(`/api/admin/sales/${saleId}`, { enabled: newEnabled });
      setSales((list) => (Array.isArray(list) ? list.map((s) => (s?.id === saleId ? { ...s, enabled: newEnabled } : s)) : list));
      setNoteWithAutoClear({ type: "success", text: "Sale updated" }, 4000);
    } catch (err) {
      console.error("toggleSaleEnabled error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to update sale — ${err.message || err}` }, 8000);
    }
  }, [sales]);

  // Sale edit flow
  function openEditSale(sale) {
    setSaleEditing({ id: sale.id, name: sale.name || "", enabled: Number(sale.enabled ?? 0) });
    setSaleEditOpen(true);
  }

  async function handleUpdateSale() {
    if (!saleEditing || !saleEditing.id) return;
    const { id, name, enabled } = saleEditing;
    try {
      await apiPut(`/api/admin/sales/${id}`, { name, enabled });
      setSales((list) => (Array.isArray(list) ? list.map((s) => (s?.id === id ? { ...s, name, enabled } : s)) : list));
      setNoteWithAutoClear({ type: "success", text: "Sale updated" }, 4000);
      setSaleEditOpen(false);
      setSaleEditing(null);
    } catch (err) {
      console.error("handleUpdateSale error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to update sale — ${err.message || err}` }, 8000);
    }
  }

  async function handleDeleteSale(id) {
    if (!window.confirm("Delete this sale?")) return;
    try {
      await apiDelete(`/api/admin/sales/${id}`);
      setSales((s) => s.filter((x) => x?.id !== id));
      setNoteWithAutoClear({ type: "success", text: "Sale removed" }, 4000);
    } catch (err) {
      console.error("handleDeleteSale error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to remove sale — ${err.message || err}` }, 8000);
    }
  }

  // PRODUCTS - client-side search & sort
  const mapSortToComparator = useCallback((sortKey) => {
    switch (sortKey) {
      case "priceAsc":
        return (a, b) => Number((a?.price ?? 0)) - Number((b?.price ?? 0));
      case "priceDesc":
        return (a, b) => Number((b?.price ?? 0)) - Number((a?.price ?? 0));
      case "newest":
        return (a, b) => {
          const da = new Date(a?.createdAt || a?.created_at || 0).getTime();
          const db = new Date(b?.createdAt || b?.created_at || 0).getTime();
          return db - da;
        };
      case "nameAsc":
        return (a, b) => String(a?.name || "").localeCompare(String(b?.name || ""));
      case "nameDesc":
        return (a, b) => String(b?.name || "").localeCompare(String(a?.name || ""));
      default:
        return null; // no sort (relevance/default)
    }
  }, []);

  // helper: get primary image
  function getPrimaryImage(item) {
    if (!item) return "";
    if (item.image) return item.image;
    if (item.image_url) return item.image_url;
    if (item.thumbnail) return item.thumbnail;
    const imagesField = item.images ?? item.images_url ?? item.imagesUrl ?? null;
    if (!imagesField) return "";
    if (Array.isArray(imagesField)) {
      return imagesField[0] || "";
    }
    if (typeof imagesField === "string") {
      const parts = imagesField.split(",").map((p) => p.trim()).filter(Boolean);
      return parts[0] || "";
    }
    return "";
  }

  // Load all products once (initial load)
  async function loadAllProducts() {
    setProductsLoading(true);
    try {
      const url = "/api/products?limit=10000";
      const json = await apiGet(url);
      const data = Array.isArray(json) ? json : json.data ?? json.products ?? json.items ?? [];
      setAllProducts(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err) {
      console.error("loadAllProducts error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load products — ${err.message || err}` }, 12000);
      setAllProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }

  // If a product id was selected via search but is not in allProducts, fetch it and add to list
  async function ensureProductPresent(productId) {
    try {
      const exists = allProducts.some((p) => String(p?.id) === String(productId));
      if (exists) return;
      const json = await apiGet(`/api/products/${productId}`);
      const product = json?.data || json?.product || (Array.isArray(json) ? json[0] : json) || null;
      if (product && product.id) {
        setAllProducts((prev) => {
          const copy = Array.isArray(prev) ? [...prev] : [];
          if (copy.some((p) => String(p?.id) === String(product.id))) return copy;
          return [product, ...copy];
        });
      }
    } catch (err) {
      console.warn("ensureProductPresent failed for", productId, err);
      setNoteWithAutoClear({ type: "error", text: `Couldn't fetch product ${productId}: ${err.message || err}` }, 6000);
    }
  }

  // toggle selection
  const toggleSelectProduct = useCallback((productOrId) => {
    const id = productOrId?.id ?? productOrId;
    if (id == null) return;
    setSelectedProductIds((prev) => {
      const copy = new Set(prev);
      const willAdd = !copy.has(id);
      if (willAdd) copy.add(id);
      else copy.delete(id);
      if (willAdd) {
        ensureProductPresent(id).catch((e) => console.error("ensureProductPresent error:", e));
      }
      return copy;
    });
  }, [ensureProductPresent]);

  /* ----------------- UI components ----------------- */
  function CenterToggle() {
    return (
      <div className="w-full flex justify-center my-6">
        <div className="inline-flex items-center rounded-full p-1 bg-neutral-100/40 dark:bg-neutral-800/40 shadow-inner border border-neutral-200/20 dark:border-neutral-700/20">
          <button
            onClick={() => setMode("slides")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all flex items-center gap-2 ${mode === "slides" ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "bg-transparent text-neutral-800 dark:text-neutral-200"}`}
          >
            <ImageIcon className="w-4 h-4" />
            Slides
          </button>
          <button
            onClick={() => setMode("sales")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all flex items-center gap-2 ${mode === "sales" ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "bg-transparent text-neutral-800 dark:text-neutral-200"}`}
          >
            <Gift className="w-4 h-4" />
            Sales
          </button>
        </div>
      </div>
    );
  }

  function Note() {
    if (!note) return null;
    return (
      <div role="status" className={`mb-4 px-4 py-2 rounded-lg max-w-3xl mx-auto text-sm flex items-center gap-2 ${note.type === "success" ? "bg-white/6 text-white border border-white/10" : "bg-red-900/30 text-red-200 border border-red-800/30"}`}>
        {note.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        <div>{note.text}</div>
      </div>
    );
  }

  function SlideAddBox() {
    const [name, setName] = useState("");
    const [link, setLink] = useState("");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
      if (!file) {
        setPreview(null);
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }, [file]);

    function onFile(e) {
      const f = e?.target?.files?.[0];
      if (f) setFile(f);
    }

    function clearAll() {
      setFile(null);
      setPreview(null);
      setName("");
      setLink("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return (
      <div className="p-4 rounded-2xl border bg-gradient-to-b from-neutral-50/40 to-neutral-100/10 dark:from-neutral-900/40 dark:to-neutral-800/30 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-64 h-36 border-2 border-dashed rounded-xl overflow-hidden flex items-center justify-center bg-white/5">
              {preview ? <img src={preview} alt="preview" className="object-cover w-full h-full" /> : <div className="text-center text-sm text-neutral-400">Preview</div>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className={primaryBtnClass()}>
                <UploadCloud className="w-4 h-4" />
                Choose Image
              </button>
              <button onClick={clearAll} className={secondaryBtnClass()}>
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase text-neutral-500">Slide name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eg: Winter Collection" className="px-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none" />
            <label className="text-xs font-semibold uppercase text-neutral-500">Link (optional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/collection/winter" className="px-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none" />

            <div className="flex gap-2 mt-2">
              <button onClick={() => handleAddSlide({ file, name, link })} disabled={!file || addingSlide} className={primaryBtnClass(addingSlide ? "opacity-70 pointer-events-none" : "")}>
                <Plus className="w-4 h-4" />
                {addingSlide ? "Adding..." : "Add Slide"}
              </button>
              <button onClick={clearAll} className={secondaryBtnClass()}>
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function SlidesList() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Slides ({slides.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setSlides([])} title="Clear local view" className={secondaryBtnClass()}>
              <X className="w-4 h-4" />
              Clear View
            </button>
            <button onClick={() => loadSlides().catch((e) => console.error("manual reload slides error:", e))} className={secondaryBtnClass()}>
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
          </div>
        </div>

        {loadingSlides ? (
          <div className="p-4 rounded-md border">Loading slides...</div>
        ) : (
          <div className="w-full max-w-3xl mx-auto space-y-3">
            {slides.map((s, idx) => {
              const image = s?.image_url || s?.image || s?.imageUrl || s?.imageurl || "";
              const isDragOver = dragOverIndexRef.current === idx;
              return (
                <div
                  key={s?.id ?? idx}
                  draggable
                  onDragStart={(e) => onDragStartSlide(e, idx)}
                  onDragEnter={(e) => onDragEnterSlide(e, idx)}
                  onDragOver={(e) => onDragOverSlide(e)}
                  onDrop={onDropSlide}
                  className={`flex gap-4 items-center p-4 rounded-2xl border bg-white/5 shadow-md transition-all ${isDragOver ? "ring-2 ring-offset-2 ring-black/30 dark:ring-white/30" : ""}`}
                >
                  <div className="w-44 h-28 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center relative flex-shrink-0">
                    {image ? <img src={image} alt={s?.name || "slide"} className="object-cover w-full h-full" /> : <div className="text-sm text-neutral-400">No image</div>}
                    <div className="absolute top-2 left-2 p-1 rounded-md bg-black/40">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold">{s?.name || "Untitled"}</div>
                        <div className="text-sm text-neutral-500 mt-1">{s?.link || "—"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); reorderSlides(idx, Math.max(0, idx - 1)); }} className={secondaryBtnClass()} aria-label="move up">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); reorderSlides(idx, Math.min(slides.length - 1, idx + 1)); }} className={secondaryBtnClass()} aria-label="move down">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openEditSlide(s); }} className={secondaryBtnClass()}>
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(s?.id); }} className={secondaryBtnClass()}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-2">Position {idx + 1}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function SalesList() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Sales ({sales.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => loadSales().catch((e) => console.error("manual reload sales error:", e))} className={secondaryBtnClass()}>
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
          </div>
        </div>

        {loadingSales ? (
          <div className="p-4 rounded border">Loading sales...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sales.map((sale) => (
              <div key={sale?.id} className="p-4 rounded-2xl border bg-white/3 shadow-md flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{sale?.name || "Unnamed sale"}</div>
                    <div className="text-xs text-neutral-500">{(sale?.products || sale?.productIds || []).length} products</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleSaleEnabled(sale?.id)} className={`px-3 py-1 rounded-full text-sm ${sale?.enabled ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
                      {sale?.enabled ? "Enabled" : "Disabled"}
                    </button>
                    <button onClick={() => openEditSale(sale)} className={secondaryBtnClass()}>
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button onClick={() => handleDeleteSale(sale?.id)} className={secondaryBtnClass()}>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 items-center overflow-x-auto">
                  {(sale?.products || []).slice(0, 8).map((p) => (
                    <div key={p?.id} className="flex items-center gap-2 p-2 rounded bg-white/5 border">
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-white/5">
                        {getPrimaryImage(p) ? <img src={getPrimaryImage(p)} alt={p?.name} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">—</div>}
                      </div>
                      <div className="text-xs">
                        <div className="font-medium line-clamp-1">{p?.name}</div>
                        <div className="text-neutral-500">₹{p?.price ?? "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-neutral-500">ID: {sale?.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function SaleCreator() {
    const totalPages = Math.max(1, Math.ceil((allProducts || []).length / pageSize));

    const filteredProducts = useMemo(() => {
      const copy = Array.isArray(allProducts) ? [...allProducts] : [];
      const comparator = mapSortToComparator(productSort);
      if (comparator) copy.sort(comparator);
      return copy;
    }, [allProducts, productSort, mapSortToComparator]);

    const totalProducts = filteredProducts.length;
    const displayedProducts = useMemo(() => {
      const start = Math.max(0, (currentPage - 1) * pageSize);
      return filteredProducts.slice(start, start + pageSize);
    }, [filteredProducts, currentPage, pageSize]);

    return (
      <div className="p-4 rounded-2xl border bg-gradient-to-b from-neutral-50/40 to-neutral-100/10 dark:from-neutral-900/40 dark:to-neutral-800/30 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-neutral-500">Sale name (displayed on home)</label>

            {/* ---- Controlled input for sale name: single source of truth ---- */}
            <input
              value={saleName}
              onChange={(e) => setSaleName(e.target.value)}
              placeholder="Eg: Summer Sale"
              className="px-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none"
              aria-label="sale-name"
            />

            <div className="text-xs text-neutral-500 mt-2">Selected products: {selectedProductIds.size}</div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleCreateSale} disabled={creatingSale || !saleName.trim()} className={primaryBtnClass()}>
                <Plus className="w-4 h-4" />
                {creatingSale ? "Creating..." : "Create Sale"}
              </button>
              <button onClick={() => { setSelectedProductIds(new Set()); setSaleName(""); }} className={secondaryBtnClass()}>
                <X className="w-4 h-4" />
                Reset
              </button>
            </div>

            {selectedProductIds.size > 0 && (
              <div className="mt-3 text-xs text-neutral-500">
                Tip: use the search box to add products quickly. Selected products will be added to the sale when you click Create Sale.
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="flex gap-2 items-center mb-3">
              <div className="relative flex-1">
                <ProductSearchBar
                  onToggle={toggleSelectProduct}
                  selectedIds={selectedProductIds}
                  debounceMs={250}
                  ref={searchInputRef}
                  allProducts={allProducts}
                />
              </div>
              <select value={productSort} onChange={(e) => setProductSort(e.target.value)} className="px-3 py-3 rounded-full border border-neutral-200 bg-white/5">
                <option value="relevance">Relevance</option>
                <option value="priceAsc">Price — Low to High</option>
                <option value="priceDesc">Price — High to Low</option>
                <option value="newest">Newest</option>
                <option value="nameAsc">Name A→Z</option>
                <option value="nameDesc">Name Z→A</option>
              </select>
            </div>

            <div className="space-y-3">
              {productsLoading ? (
                <div className="p-3 rounded border">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-3 rounded border">No products found.</div>
              ) : (
                displayedProducts.map((p, i) => {
                  const key = p?.id ?? `idx-${i}`;
                  const img = getPrimaryImage(p);
                  const selected = selectedProductIds.has(p?.id);
                  return (
                    <div
                      key={key}
                      onClick={() => toggleSelectProduct(p?.id)}
                      className={`p-3 rounded-2xl border bg-white/4 shadow-md flex gap-4 items-center cursor-pointer ${selected ? "ring-2 ring-offset-2 ring-black dark:ring-white" : ""}`}
                    >
                      <input onClick={(e) => { e.stopPropagation(); toggleSelectProduct(p?.id); }} type="checkbox" checked={selected} className="accent-black dark:accent-white" readOnly />
                      <div className="w-28 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-white/5 relative">
                        {img ? (
                          <img src={img} alt={p?.name || "product"} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">No image</div>
                        )}
                        <div className="absolute top-1 right-1 bg-black/60 rounded px-2 py-0.5 text-xs text-white">
                          ₹{p?.price ?? "—"}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-sm">{p?.name}</div>
                          <button onClick={(e) => { e.stopPropagation(); toggleSelectProduct(p?.id); }} className={secondaryBtnClass()} title="Toggle select">
                            {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="text-xs text-neutral-500">ID: {p?.id}</div>
                        <div className="text-xs text-neutral-500 mt-2 line-clamp-2">{p?.shortDescription || p?.description || ""}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-neutral-500">Page {currentPage} of {Math.max(1, Math.ceil((totalProducts || 0) / pageSize))}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className={secondaryBtnClass(currentPage === 1 ? "opacity-50 pointer-events-none" : "")}>Prev</button>
                {Array.from({ length: Math.max(1, Math.ceil((totalProducts || 0) / pageSize)) }).map((_, idx) => {
                  const page = idx + 1;
                  if (page > 7) return null;
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded-full ${page === currentPage ? "bg-black text-white" : "bg-transparent text-neutral-600 border border-neutral-200/10"}`}>
                      {page}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage((p) => Math.min(Math.max(1, Math.ceil((totalProducts || 0) / pageSize)), p + 1))} disabled={currentPage === Math.ceil((totalProducts || 0) / pageSize)} className={secondaryBtnClass(currentPage === Math.ceil((totalProducts || 0) / pageSize) ? "opacity-50 pointer-events-none" : "")}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // main render
  return (
    <div className="min-h-screen p-6 bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-white transition-colors">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2">Slides & Sales Management</h1>
        <p className="text-sm text-neutral-500 mb-6">Black & white admin — drag slides, create named sales, advanced UI with icons & Tailwind animations.</p>

        <CenterToggle />
        <Note />

        {mode === "slides" ? (
          <div className="space-y-6">
            <SlideAddBox />
            <SlidesList />
          </div>
        ) : (
          <div className="space-y-6">
            <SaleCreator />
            <SalesList />
          </div>
        )}

        {/* Slide Edit Modal */}
        {slideEditOpen && slideEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setSlideEditOpen(false); setSlideEditing(null); }} />
            <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-2">Edit Slide</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-64 h-36 border-2 border-dashed rounded-xl overflow-hidden flex items-center justify-center bg-white/5">
                    {slideEditing.image_url ? <img src={slideEditing.image_url} alt="preview" className="object-cover w-full h-full" /> : <div className="text-sm text-neutral-400">No image</div>}
                  </div>
                  <input type="file" accept="image/*" onChange={onSlideFileChange} className="hidden" id="slide-edit-file" />
                  <div className="flex gap-2">
                    <label htmlFor="slide-edit-file" className={primaryBtnClass()}>
                      <UploadCloud className="w-4 h-4" />
                      Replace Image
                    </label>
                    <button onClick={() => { setSlideEditing((s) => ({ ...s, file: null, image_url: "" })); }} className={secondaryBtnClass()}>
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col gap-3">
                  <label className="text-xs font-semibold uppercase text-neutral-500">Slide name</label>
                  <input value={slideEditing.name || ""} onChange={(e) => setSlideEditing((s) => ({ ...s, name: e.target.value }))} placeholder="Eg: Winter Collection" className="px-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none" />
                  <label className="text-xs font-semibold uppercase text-neutral-500">Link (optional)</label>
                  <input value={slideEditing.link || ""} onChange={(e) => setSlideEditing((s) => ({ ...s, link: e.target.value }))} placeholder="/collection/winter" className="px-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleUpdateSlide} className={primaryBtnClass()}>
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                    <button onClick={() => { setSlideEditOpen(false); setSlideEditing(null); }} className={secondaryBtnClass()}>
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sale Edit Modal */}
        {saleEditOpen && saleEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setSaleEditOpen(false); setSaleEditing(null); }} />
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-2">Edit Sale</h3>
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold uppercase text-neutral-500">Sale name</label>
                <input value={saleEditing.name} onChange={(e) => setSaleEditing((s) => ({ ...s, name: e.target.value }))} className="px-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none" />
                <label className="text-xs font-semibold uppercase text-neutral-500">Enabled</label>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setSaleEditing((s) => ({ ...s, enabled: s.enabled ? 0 : 1 }))} className={`px-3 py-1 rounded-full ${saleEditing.enabled ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                    {saleEditing.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="flex gap-2 mt-2">
                  <button onClick={handleUpdateSale} className={primaryBtnClass()}>
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                  <button onClick={() => { setSaleEditOpen(false); setSaleEditing(null); }} className={secondaryBtnClass()}>
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
