// src/pages/Shop.jsx
import React, { useState, useEffect } from "react";
import { Funnel } from "lucide-react";
import ProductCard from "../components/ProductCard";
import FilterSidebar from "../components/FiltersSidebar";
import LogoBorderLoader from "../components/LogoLoader";

const API_BASE = process.env.REACT_APP_API_BASE || "";

const MIN = 0;
const MAX = 10000;

const Shop = () => {
  /* ================= FILTER STATE ================= */
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([MIN, MAX]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorsList, setColorsList] = useState([]);
  const [sortOption, setSortOption] = useState("");

  const [categoryData, setCategoryData] = useState([]);

  /* ================= PRODUCT STATE ================= */
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  /* ================= UI STATE ================= */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ================= FETCH CATEGORIES ================= */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/categories`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        const json = await res.json();

        const raw = Array.isArray(json) ? json : json.categories || [];
        const mapped = raw.map((c) => ({
          name: c?.name ?? String(c),
          subcategories: (c?.subcategories || []).map((s) =>
            typeof s === "string" ? s : s?.name
          ),
        }));

        if (mounted) setCategoryData(mapped);
      } catch (err) {
        console.error(err);
        if (mounted) setCategoryData([]);
      }
    })();
    return () => (mounted = false);
  }, []);

  /* ================= FETCH COLORS ================= */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/colors`);
        if (!res.ok) throw new Error("Failed to fetch colors");
        const json = await res.json();
        if (mounted) setColorsList(json?.colors || []);
      } catch {
        if (mounted) setColorsList([]);
      }
    })();
    return () => (mounted = false);
  }, []);

  /* ================= FETCH PRODUCTS ================= */
  const fetchProducts = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (selectedSubcategories.length > 0) {
        params.append(
          "subcategory",
          selectedSubcategories
            .map((s) => `${s.category}:${s.subcategory}`)
            .join(",")
        );
      }

      if (selectedColors.length > 0) {
        params.append("colors", selectedColors.join(","));
      }

      params.append("minPrice", priceRange[0]);
      params.append("maxPrice", priceRange[1]);

      if (sortOption === "low-high") params.append("sort", "price_asc");
      if (sortOption === "high-low") params.append("sort", "price_desc");
      if (sortOption === "newest") params.append("sort", "newest");

      params.append("page", page);

      const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Product fetch failed");

      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];

      setProducts(list);
      setMeta({
        total: data?.meta?.total || list.length,
        page: data?.meta?.page || page,
        pages: data?.meta?.pages || 1,
      });
    } catch (err) {
      console.error(err);
      setProducts([]);
      setMeta({ total: 0, page: 1, pages: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, [selectedSubcategories, selectedColors, priceRange, sortOption, page]);

  /* ================= HELPERS ================= */
  const clearFilters = () => {
    setSelectedSubcategories([]);
    setExpandedCategories([]);
    setPriceRange([MIN, MAX]);
    setSelectedColors([]);
    setSortOption("");
    setPage(1);
  };

  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(meta.pages, p + 1));

  /* ================= RENDER ================= */
  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Desktop sidebar (static) */}
      <div className="hidden lg:block">
        <FilterSidebar
          isStatic
          categoryData={categoryData}
          colorsList={colorsList}
          MIN={MIN}
          MAX={MAX}
          selectedSubcategories={selectedSubcategories}
          setSelectedSubcategories={setSelectedSubcategories}
          expandedCategories={expandedCategories}
          setExpandedCategories={setExpandedCategories}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          selectedColors={selectedColors}
          setSelectedColors={setSelectedColors}
          sortOption={sortOption}
          setSortOption={setSortOption}
          clearFilters={clearFilters}
          onApply={() => setPage(1)}
        />
      </div>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Shop</h1>

          {/* Funnel icon visible on all breakpoints.
              On lg+ we show label next to it for clarity */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-sm"
            aria-controls="filters-panel"
            aria-expanded={sidebarOpen}
            aria-label="Open filters"
            title="Open filters"
          >
            <Funnel size={18} />
            <span className="hidden lg:inline text-sm font-medium">Filters</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-72">
            <LogoBorderLoader />
          </div>
        ) : products.length === 0 ? (
          <p>No products found</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((p) => (
                <ProductCard key={p.id || p._id} product={p} />
              ))}
            </div>

            {meta.pages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={prevPage}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-md border disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm">
                  Page <strong>{meta.page}</strong> of <strong>{meta.pages}</strong>
                </span>
                <button
                  onClick={nextPage}
                  disabled={page >= meta.pages}
                  className="px-3 py-1 rounded-md border disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile / sliding Filter Sidebar */}
      <FilterSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onApply={() => {
          setPage(1);
          setSidebarOpen(false);
        }}
        categoryData={categoryData}
        colorsList={colorsList}
        MIN={MIN}
        MAX={MAX}
        selectedSubcategories={selectedSubcategories}
        setSelectedSubcategories={setSelectedSubcategories}
        expandedCategories={expandedCategories}
        setExpandedCategories={setExpandedCategories}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        selectedColors={selectedColors}
        setSelectedColors={setSelectedColors}
        sortOption={sortOption}
        setSortOption={setSortOption}
        clearFilters={clearFilters}
      />
    </div>
  );
};

export default Shop;
