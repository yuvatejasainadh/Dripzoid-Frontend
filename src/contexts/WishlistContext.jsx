// src/contexts/WishlistContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "";

const WishlistContext = createContext();

export function useWishlist() {
  return useContext(WishlistContext);
}

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]); // renamed from wishlist
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = (isJson = true) => {
    const headers = {};
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("userToken");

    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (isJson) headers["Content-Type"] = "application/json";
    return headers;
  };

  /* ================= FETCH ================= */
  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, {
        method: "GET",
        headers: getHeaders(false),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `${res.status} ${res.statusText}`);
      }

      const rows = await res.json();
      setItems(rows || []);
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
      setError(err.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ================= ADD ================= */
  const addToWishlist = useCallback(
    async (productId) => {
      if (!productId) return;

      const idStr = String(productId);

      if (items.some((w) => String(w.product_id ?? w.id ?? "") === idStr)) {
        return;
      }

      const placeholder = {
        id: `optimistic-${idStr}-${Date.now()}`,
        product_id: idStr,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };

      setItems((prev) => [placeholder, ...prev]);

      try {
        const res = await fetch(
          `${API_BASE}/api/wishlist/${encodeURIComponent(idStr)}`,
          {
            method: "POST",
            headers: getHeaders(false),
          }
        );

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }

        await fetchWishlist();
      } catch (err) {
        setItems((prev) =>
          prev.filter((r) => !String(r.id).startsWith(`optimistic-${idStr}`))
        );
        throw err;
      }
    },
    [items, fetchWishlist]
  );

  /* ================= REMOVE ================= */
  const removeFromWishlist = useCallback(
    async (productId) => {
      if (!productId) return;

      const idStr = String(productId);
      const prev = items;

      setItems((prevState) =>
        prevState.filter(
          (item) =>
            String(item.product_id ?? item.id ?? "") !== idStr
        )
      );

      try {
        const res = await fetch(
          `${API_BASE}/api/wishlist/${encodeURIComponent(idStr)}`,
          {
            method: "DELETE",
            headers: getHeaders(false),
          }
        );

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || `${res.status} ${res.statusText}`);
        }

        await fetchWishlist();
      } catch (err) {
        setItems(prev || []);
        throw err;
      }
    },
    [items, fetchWishlist]
  );

  /* ================= TOGGLE ================= */
  const toggle = useCallback(
    async (productOrId) => {
      const id =
        typeof productOrId === "object"
          ? productOrId?.id ?? productOrId?.product_id ?? productOrId?._id
          : productOrId;

      if (!id) throw new Error("Invalid product id");

      const idStr = String(id);

      const exists = items.some(
        (w) => String(w.product_id ?? w.id ?? "") === idStr
      );

      if (exists) {
        await removeFromWishlist(idStr);
        return { removed: true };
      } else {
        await addToWishlist(idStr);
        return { added: true };
      }
    },
    [items, addToWishlist, removeFromWishlist]
  );

  /* ================= INIT ================= */
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  /* ================= MEMO VALUE ================= */
  const value = useMemo(
    () => ({
      items, // <-- standardized name
      loading,
      error,
      fetchWishlist,
      addToWishlist,
      removeFromWishlist,
      toggle,
    }),
    [items, loading, error, fetchWishlist, addToWishlist, removeFromWishlist, toggle]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}
