import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Heart } from "lucide-react";
import { useWishlist } from "../contexts/WishlistContext";
import { normalizeImages } from "../utils/images";

const API_BASE = process.env.REACT_APP_API_BASE || "";

export default function OnSale() {
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistUpdatingId, setWishlistUpdatingId] = useState(null);

  /* ---------------- Wishlist helpers ---------------- */
  const wishlistIds = useMemo(() => {
    const s = new Set();
    if (!Array.isArray(wishlist)) return s;
    for (const it of wishlist) {
      const id = it?.product_id ?? it?.id ?? it?.productId;
      if (id != null) s.add(Number(id));
    }
    return s;
  }, [wishlist]);

  const isInWishlist = (productId) =>
    productId != null && wishlistIds.has(Number(productId));

  /* ---------------- Fetch sales ---------------- */
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    axios
      .get(`${API_BASE}/api/public/sales`)
      .then((res) => {
        if (!mounted) return;
        const data = Array.isArray(res?.data) ? res.data : [];

        const normalized = data.map((sale) => {
          const products = Array.isArray(sale.products) ? sale.products : [];
          const normalizedProducts = products.map((p) => {
            const images = Array.isArray(p.images)
              ? p.images
              : normalizeImages(p.images);
            const thumbnail = p.thumbnail || images[0] || null;
            return {
              ...p,
              images,
              thumbnail,
              price: p.price != null ? Number(p.price) : null,
              originalPrice:
                p.originalPrice != null ? Number(p.originalPrice) : null,
            };
          });
          return { ...sale, products: normalizedProducts };
        });

        setSales(normalized);
      })
      .catch((err) => {
        console.error("Error fetching sale products:", err);
        setSales([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- Helpers ---------------- */
  const firstImage = (product) => {
    if (!product) return "/fallback-product.png";
    if (product.thumbnail) return product.thumbnail;
    const arr = normalizeImages(product.images);
    return arr[0] || "/fallback-product.png";
  };

  const computeDiscountPercent = (price, originalPrice) => {
    if (!originalPrice || originalPrice <= 0 || price == null) return null;
    const percent = Math.round(((originalPrice - price) / originalPrice) * 100);
    return percent > 0 ? percent : null;
  };

  const handleWishlistToggle = async (product) => {
    if (!product) return;
    try {
      setWishlistUpdatingId(product.id);
      isInWishlist(product.id)
        ? await removeFromWishlist(product.id)
        : await addToWishlist(product.id);
    } catch (err) {
      console.error("Wishlist update failed", err);
    } finally {
      setWishlistUpdatingId(null);
    }
  };

  const totalProducts = useMemo(
    () =>
      sales.reduce(
        (acc, s) => acc + (Array.isArray(s.products) ? s.products.length : 0),
        0
      ),
    [sales]
  );

  /* ================== UI ================== */
  return (
    <section className="py-6 bg-white dark:bg-black">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Main heading */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
            Now On Sales
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {totalProducts} items
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Loading sale items…
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No sale items available.
          </div>
        ) : (
          <>
            {sales.map((sale) => (
              <div key={sale.id} className="mb-8">
                {/* Row header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {sale.title || sale.name || "Sale"}
                  </h3>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {sale.products.length} items
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2">
                  {sale.products.map((p) => {
                    const discount = computeDiscountPercent(
                      p.price,
                      p.originalPrice
                    );

                    return (
                      <article
                        key={`${sale.id}-${p.id}`}
                        className="flex-none w-1/2 md:w-1/4 snap-start bg-white dark:bg-black border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer relative"
                        onClick={() =>
                          window.open(
                            `https://dripzoid.com/product/${p.id}`,
                            "_blank"
                          )
                        }
                      >
                        {/* Image */}
                        <div className="aspect-[4/5] w-full overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
                          <img
                            src={firstImage(p)}
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            loading="lazy"
                          />

                          {/* SALE BADGE — top right */}
                          {(sale.title || sale.name) && (
                            <span className="absolute top-3 right-3 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
                              {sale.title || sale.name}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-3 flex items-center justify-between">
                          <div className="pr-2 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {p.name}
                            </h4>

                            {/* PRICE ROW WITH DISCOUNT BADGE */}
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-base font-semibold text-black dark:text-white">
                                ₹{p.price ?? "—"}
                              </span>

                              {p.originalPrice &&
                                p.originalPrice > p.price && (
                                  <span className="text-sm line-through text-slate-400">
                                    ₹{p.originalPrice}
                                  </span>
                                )}

                              {discount != null && (
                                <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  {discount}% OFF
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Wishlist */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWishlistToggle(p);
                            }}
                            disabled={wishlistUpdatingId === p.id}
                            className={`p-2 rounded-full transition ${
                              isInWishlist(p.id)
                                ? "bg-red-500 text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            <Heart size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
