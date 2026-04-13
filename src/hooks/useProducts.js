import { useEffect, useState, useRef } from "react";
import api from "../utils/api.js";

export default function useProducts({ category, q = "", page = 1, limit = 12, sort = "" }) {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    async function fetchProducts() {
      setLoading(true);
      setError(null);

      try {
        const params = { page, limit };
        if (category) params.category = category;
        if (q) params.q = q;
        if (sort) params.sort = sort;

        const res = await api.get("/api/products", { params, signal: ac.signal });

        // ✅ Correctly extract data & meta
        const data = res?.data?.data ?? [];
        const meta = res?.data?.meta ?? { total: 0 };

        setProducts(Array.isArray(data) ? data : []);
        setTotal(typeof meta.total === "number" ? meta.total : data.length);

        console.log("Products fetched:", data.length, "Total:", meta.total);
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          console.error("useProducts error:", err);
          setError(err);
          setProducts([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();

    return () => ac.abort();
  }, [category, q, page, limit, sort]);

  return { products, total, loading, error };
}
