// src/components/Lightbox.jsx
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function Lightbox({ open, images = [], index = 0, onClose = () => {}, setIndex = () => {} }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length, onClose, setIndex]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80" onClick={onClose} />
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative max-w-5xl w-full mx-4">
        <div className="relative">
          <img src={images[index]} alt={`Lightbox ${index + 1}`} className="w-full max-h-[80vh] object-contain rounded" />
          <button onClick={onClose} className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800 text-black dark:text-white p-2 rounded-full"><X /></button>
          <button onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800 p-2 rounded-full"><ChevronLeft /></button>
          <button onClick={() => setIndex((i) => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800 p-2 rounded-full"><ChevronRight /></button>
        </div>
      </motion.div>
    </div>
  );
}
