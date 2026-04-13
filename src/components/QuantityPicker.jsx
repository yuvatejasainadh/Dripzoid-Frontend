// src/components/QuantityPicker.jsx
import React from "react";

export default function QuantityPicker({ quantity, setQuantity, availableStock }) {
  return (
    <div className="mb-6">
      <div className="font-medium mb-2">Quantity</div>
      <div className="flex items-center gap-3">
        <button onClick={() => setQuantity((q) => Math.max(1, (q || 1) - 1))} className="px-3 py-1 border rounded" type="button" aria-label="Decrease" disabled={quantity <= 1}>
          -
        </button>
        <span className="min-w-[36px] text-center" aria-live="polite">{quantity}</span>
        <button onClick={() => setQuantity((q) => {
          const avail = Number(availableStock || 0);
          const curr = q || 0;
          return Math.min(avail, curr + 1);
        })} className={`px-3 py-1 border rounded ${availableStock <= 0 || quantity >= availableStock ? "opacity-50 cursor-not-allowed" : ""}`} type="button" disabled={availableStock <= 0 || quantity >= availableStock} aria-label="Increase">
          +
        </button>
      </div>
    </div>
  );
}
