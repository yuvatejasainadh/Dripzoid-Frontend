// src/components/RelatedProducts.jsx
import React from "react";
import ProductCard from "./ProductCard";

export default function RelatedProducts({ relatedProducts = [], galleryImages = [] }) {
  const items = Array.isArray(relatedProducts) && relatedProducts.length ? relatedProducts : [];
  const fallbackImage = galleryImages && galleryImages.length ? galleryImages[0] : "/placeholder.png";

  return (
    <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 border border-gray-200/60 dark:border-gray-700/60">
      <h2 className="text-xl font-bold mb-4 text-black dark:text-white">You might be interested in</h2>

      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4">
          {items.length ? items.map((p, i) => (
            <div key={p?.id || p?._id || i} className="flex-shrink-0 min-w-[60%] sm:min-w-[45%] snap-start">
              <ProductCard product={toCardShape(p, fallbackImage)} />
            </div>
          )) : [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 min-w-[60%] sm:min-w-[45%] snap-start">
              <ProductCard product={{ id: i, name: `Product ${i}`, price: 2499, images: [fallbackImage] }} />
            </div>
          ))}
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-4 gap-4">
        {items.length ? items.map((p, i) => <ProductCard key={p?.id || p?._id || i} product={toCardShape(p, fallbackImage)} />) : [1,2,3,4].map((i) => <ProductCard key={i} product={{ id: i, name: `Product ${i}`, price: 2499, images: [fallbackImage] }} />)}
      </div>
    </section>
  );
}

function toCardShape(p, fallbackImage) {
  if (!p) return { id: null, name: "Product", price: 0, images: [fallbackImage] };
  return {
    id: p.id || p._id || p.productId || null,
    name: p.name || p.title || "Product",
    price: p.price ?? p.cost ?? 0,
    images: p.images || (p.image ? [p.image] : [fallbackImage]),
  };
}
