// src/components/PurchaseBar.jsx
import React from "react";
import { ShoppingCart, CreditCard, Share2 } from "lucide-react";
import { motion } from "framer-motion";

export default function PurchaseBar({ addedToCart, goToCart, addToCartHandler, buyNowHandler, disablePurchase, handleShare }) {
  return (
    <>
      {/* Desktop actions are still inside ProductInfo; this sticky bar is for mobile */}
      <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
        <div className="bg-white dark:bg-gray-900 rounded-full p-3 shadow-lg flex gap-2 items-center">
          <motion.button onClick={addedToCart ? goToCart : addToCartHandler} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={disablePurchase && !addedToCart} className={`flex-1 px-4 py-2 rounded-full text-sm font-semibold ${disablePurchase && !addedToCart ? "opacity-60" : "bg-black text-white"}`} aria-label={addedToCart ? "Go to cart" : "Add to cart"}>
            <ShoppingCart className="inline mr-2" /> {addedToCart ? "Go to cart" : "Add"}
          </motion.button>

          <button onClick={buyNowHandler} disabled={disablePurchase} className="px-3 py-2 rounded-full border text-sm" aria-label="Buy now">
            <CreditCard />
          </button>

          <button onClick={handleShare} className="px-2 py-2 rounded-full border" aria-label="Share">
            <Share2 />
          </button>
        </div>
      </div>
    </>
  );
}
