// src/components/ProductsGrid.jsx
import React from "react";
import ProductCard from "./ProductCard";

export default function ProductsGrid({ products, onAddToCart, onBuyNow, onWishlist }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          onAddToCart={onAddToCart}
          onBuyNow={onBuyNow}
          onWishlist={onWishlist}
        />
      ))}
    </div>
  );
}
