// src/components/ProductGallery.jsx
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ProductGallery({
  galleryImages = ["/placeholder.png"],
  selectedImage = 0,
  setSelectedImage = () => {},
  openLightbox = () => {},
  onTouchStart = () => {},
  onTouchEnd = () => {},
}) {
  return (
    <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="relative">
        <button type="button" onClick={() => openLightbox(selectedImage)} aria-label="Open gallery" className="w-full block rounded-xl overflow-hidden">
          <img
            src={galleryImages[selectedImage]}
            alt={`image ${selectedImage + 1}`}
            className="w-full h-[48vw] sm:h-[380px] md:h-[460px] lg:h-[520px] object-cover rounded-xl shadow transition-transform duration-300 hover:scale-[1.01]"
          />
        </button>

        <div className="absolute top-3 left-3 bg-black/80 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
          {selectedImage + 1}/{galleryImages.length}
        </div>

        <button onClick={() => setSelectedImage((s) => (s - 1 + galleryImages.length) % galleryImages.length)} type="button" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-black dark:text-white p-2 rounded-full shadow z-30" aria-label="Previous">
          <ChevronLeft />
        </button>

        <button onClick={() => setSelectedImage((s) => (s + 1) % galleryImages.length)} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 text-black dark:text-white p-2 rounded-full shadow z-30" aria-label="Next">
          <ChevronRight />
        </button>
      </div>

      <div className="flex gap-3 mt-3 overflow-x-auto thumbs-container py-1 snap-x snap-mandatory">
        {galleryImages.map((g, i) => {
          const isActive = i === selectedImage;
          return (
            <button
              key={`${g}-${i}`}
              onClick={() => setSelectedImage(i)}
              aria-selected={isActive}
              aria-label={`Image ${i + 1}`}
              title={`Image ${i + 1}`}
              type="button"
              className="relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden focus:outline-none snap-start"
              style={{ scrollSnapAlign: "center" }}
            >
              <div className={`w-full h-full rounded-md border transition-all duration-200 overflow-hidden ${isActive ? "border-2 border-black dark:border-white shadow-md" : "border border-gray-300 dark:border-gray-700 hover:border-gray-500"}`}>
                <img src={g} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
