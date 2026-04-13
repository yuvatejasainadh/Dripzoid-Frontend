// src/components/SizeSelector.jsx
import React from "react";

export default function SizeSelector({ product, sizeStockMap = {}, selectedSize, setSelectedSize, sizeEquals }) {
  const sizesSource = Array.isArray(product?.sizes) ? product.sizes : Object.keys(sizeStockMap || []);
  return (
    <div className="mb-4">
      <div className="font-medium mb-2">Size</div>
      <div className="flex gap-3 flex-wrap">
        {sizesSource.map((s) => {
          const label = typeof s === "string" ? s : (s && (s.size || s.name)) || String(s || "");
          const active = sizeEquals ? sizeEquals(label, selectedSize) : label === selectedSize;
          return (
            <button
              key={String(label)}
              onClick={() => setSelectedSize(label)}
              className={`px-3 py-2 rounded-lg border text-sm ${active ? "bg-black text-white dark:bg-white dark:text-black" : "bg-gray-100 dark:bg-gray-800"}`}
              aria-pressed={active}
              type="button"
            >
              {String(label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
