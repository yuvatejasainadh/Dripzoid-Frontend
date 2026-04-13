// src/pages/Women.jsx
import React, { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import FilterSidebar from "../components/FiltersSidebar"; // ✅ reuse sidebar
import { FiFilter } from "react-icons/fi";

const API_BASE = process.env.REACT_APP_API_BASE || "";

const MIN = 0;
const MAX = 10000;

export default function Women() {
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState([MIN, MAX]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorsList, setColorsList] = useState([]);
  const [sortOption, setSortOption] = useState("");

  const [categoryData, setCategoryData] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, limit: 0 });
  const [loading, setLoading] = useState(false);

  const perPageOptions = ["12", "24", "36", "all"];
  // Default to "all" now
  const [perPage, setPerPage] = useState("all");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Fetch categories scoped to Women
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/categories?category=Women`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        const json = await res.json();
        const raw = Array.isArray(json) ? json : (json.categories || json || []);
        const mapped = (raw || []).map((c) => {
          const name = c?.name ?? String(c);
          const subsRaw = c?.subcategories ?? [];
          const subs = (Array.isArray(subsRaw) ? subsRaw : []).map((s) =>
            typeof s === "string" ? s : s?.name ?? String(s)
          ).filter(Boolean);
          return { name: String(name), subcategories: subs };
        });
        if (mounted) setCategoryData(mapped);
      } catch (err) {
        console.error("Error fetching categories:", err);
        if (mounted) setCategoryData([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --- Fetch colors
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/colors`);
        if (!res.ok) throw new Error("Failed to fetch colors");
        const json = await res.json();
        if (!mounted) return;
        if (json?.colors?.length) setColorsList(json.colors);
        else setColorsList(["#f5f5f5", "#e8e1da", "#dbeaf0", "#f9f0f5"]);
      } catch {
        if (mounted) setColorsList(["#f5f5f5", "#e8e1da", "#dbeaf0", "#f9f0f5"]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --- Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("category", "Women");

      if (selectedSubcategories.length > 0) {
        const mapped = selectedSubcategories.map(
          (sel) => `${encodeURIComponent(sel.category)}:${encodeURIComponent(sel.subcategory)}`
        );
        params.append("subcategory", mapped.join(","));
      }

      if (selectedColors.length > 0) params.append("colors", selectedColors.join(","));
      params.append("minPrice", priceRange[0]);
      params.append("maxPrice", priceRange[1]);

      if (sortOption === "low-high") params.append("sort", "price_asc");
      else if (sortOption === "high-low") params.append("sort", "price_desc");
      else if (sortOption === "newest") params.append("sort", "newest");

      // ALWAYS send a `limit` param:
      if (perPage === "all") {
        params.append("limit", "all");
      } else {
        params.append("limit", String(perPage));
        params.append("page", String(page));
      }

      const url = `${API_BASE}/api/products?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
      const data = await res.json();

      const productsArray = Array.isArray(data) ? data : data?.data || [];
      const serverMeta = data?.meta || {};
      const total = Number(serverMeta.total ?? productsArray.length) || 0;
      const serverPage = Number(serverMeta.page ?? page) || 1;
      const limitUsed = Number(serverMeta.limit ?? (perPage === "all" ? total : Number(perPage)));
      const serverPages = Number(serverMeta.pages ?? Math.max(1, Math.ceil(total / (limitUsed || 1))));

      setMeta({ total, page: serverPage, pages: serverPages, limit: limitUsed });
      setProducts(productsArray);

      if (page > serverPages && serverPages > 0) setPage(1);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
      setMeta({ total: 0, page: 1, pages: 1, limit: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategories, selectedColors, priceRange, sortOption, perPage, page]);

  const clearFilters = () => {
    setSelectedSubcategories([]);
    setExpandedCategories([]);
    setPriceRange([MIN, MAX]);
    setSelectedColors([]);
    setSortOption("");
    setPerPage("all"); // reset to 'all'
    setPage(1);
  };

  const handlePerPageChange = (val) => { setPerPage(val); setPage(1); };
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(meta.pages || 1, p + 1));

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <FilterSidebar
          isStatic
          categoryData={categoryData}
          colorsList={colorsList}
          MIN={MIN} MAX={MAX}
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
        <div className="flex items-center justify-between w-full mb-4">
          <h1 className="text-xl font-bold">Women’s Shop</h1>
          <div className="flex items-center gap-3">
            {/* Per page selector – hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2">
              <label htmlFor="perPage" className="text-sm">Per page:</label>
              <select
                id="perPage" value={perPage}
                onChange={(e) => handlePerPageChange(e.target.value)}
                className="rounded-md pl-3 pr-8 py-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                {perPageOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt === "all" ? "All" : opt}</option>
                ))}
              </select>
            </div>

            {/* Filters button – icon only on small, icon + text on lg */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700"
              aria-label="Open filters"
            >
              <FiFilter className="text-lg" />
              <span className="hidden lg:inline text-sm">Filters</span>
            </button>
          </div>
        </div>

        {loading ? <p>Loading...</p> :
         products.length === 0 ? <p>No products found</p> :
         <>
           <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
             {products.map((p) => <ProductCard key={p.id || p._id} product={p} />)}
           </div>
           {perPage !== "all" && meta.pages > 1 && (
             <div className="mt-6 flex items-center justify-center gap-4">
               <button onClick={prevPage} disabled={page <= 1} className="px-3 py-1 border rounded-md">Prev</button>
               <span>Page {meta.page} of {meta.pages}</span>
               <button onClick={nextPage} disabled={meta.page >= meta.pages} className="px-3 py-1 border rounded-md">Next</button>
             </div>
           )}
         </>
        }
      </main>

      {/* Mobile Sidebar */}
      <FilterSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onApply={() => { setPage(1); setSidebarOpen(false); }}
        categoryData={categoryData}
        colorsList={colorsList}
        MIN={MIN} MAX={MAX}
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
}
