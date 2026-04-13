import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Heart } from "lucide-react";
import { useWishlist } from "../contexts/WishlistContext";
import { normalizeImages } from "../utils/images";

const API_BASE = process.env.REACT_APP_API_BASE;

export default function TrendingSection() {
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistUpdatingId, setWishlistUpdatingId] = useState(null);

  // derive wishlist IDs set (robust)
  const wishlistIds = useMemo(() => {
    const s = new Set();
    if (!Array.isArray(wishlist)) return s;
    for (const it of wishlist) {
      if (!it) continue;
      const id = it.product_id ?? it.id ?? it.productId;
      if (id !== undefined && id !== null) s.add(Number(id));
    }
    return s;
  }, [wishlist]);

  const isInWishlist = (productId) => {
    if (productId === undefined || productId === null) return false;
    return wishlistIds.has(Number(productId));
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    axios
      .get(`${API_BASE}/api/trending?trending=true`)
      .then((res) => {
        if (!mounted) return;
        const payload = res?.data ?? [];
        const arr = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.data)
          ? payload.data
          : [];
        setProducts(arr);
      })
      .catch((err) => {
        console.error("Error fetching trending products:", err);
        setProducts([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const firstImage = (images) => {
    const arr = normalizeImages(images);
    return arr[0] || "/fallback-product.png";
  };

  const handleWishlistToggle = async (product) => {
    if (!product) return;
    const inWishlist = isInWishlist(product.id);
    try {
      setWishlistUpdatingId(product.id);
      if (inWishlist) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product.id);
      }
    } catch (err) {
      console.error("Wishlist update failed", err);
    } finally {
      setWishlistUpdatingId(null);
    }
  };

  return (
    <section className="py-6 bg-white dark:bg-black">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white">Trending</h2>
          <div className="text-sm text-slate-600 dark:text-slate-300">{products.length} items</div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading trending products…
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No trending products available.
          </div>
        ) : (
          <>
            <div
              data-scroll="true"
              className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-4 md:px-6"
            >
              {products.map((p) => (
                <article
                  key={p.id ?? p._id ?? p.name}
                  className="flex-none w-1/2 md:w-1/4 snap-start bg-white dark:bg-black border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() => window.open(`https://dripzoid.com/product/${p.id}`, "_blank")}
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <img
                      src={firstImage(p.images)}
                      alt={p.name}
                      className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                      draggable="false"
                    />
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <div className="pr-2 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</h3>
                      <p className="mt-1 text-base font-semibold text-black dark:text-white">₹{p.price}</p>
                    </div>

                    <div className="flex flex-col items-center gap-2 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWishlistToggle(p);
                        }}
                        disabled={wishlistUpdatingId === p.id}
                        aria-disabled={wishlistUpdatingId === p.id}
                        className={`p-2 rounded-full focus:outline-none transition ${
                          isInWishlist(p.id)
                            ? "bg-red-500 text-white dark:bg-red-500 dark:text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        }`}
                        title={isInWishlist(p.id) ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <Heart size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
              <span className="text-xs text-slate-500">Swipe</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
