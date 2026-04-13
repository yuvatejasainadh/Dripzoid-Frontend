// src/components/Hero.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const variants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir < 0 ? 80 : -80, opacity: 0 }),
};

const API_BASE = process.env.REACT_APP_API_BASE || "";

function extractSrc(s) {
  if (!s) return null;
  // common fields we might encounter
  return s.image_url || s.src || s.image || s.imageUrl || s.url || null;
}
function extractTitle(s) {
  if (!s) return "";
  return s.name || s.title || s.label || "";
}
function extractLink(s) {
  if (!s) return s.link || s.url || null;
  return null;
}

/**
 * Hero carousel - fetches slides from API and displays them.
 * Props:
 *  - autoPlayMs (number) default 4500
 */
export default function Hero({ autoPlayMs = 4500 }) {
  const [slides, setSlides] = useState([]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const throttled = useRef(false);
  const [imgErrorMap, setImgErrorMap] = useState({}); // { slideId: true }
  const total = slides.length;

  // safe change index
  function changeIndex(delta) {
    if (throttled.current || total <= 1) return;
    throttled.current = true;
    setDir(delta);
    setIndex((i) => (i + delta + total) % total);
    setTimeout(() => (throttled.current = false), 300);
  }

  function handleDragEnd(_, info) {
    if (info.offset.x < -60 || info.velocity.x < -500) changeIndex(1);
    else if (info.offset.x > 60 || info.velocity.x > 500) changeIndex(-1);
  }

  // fetch slides: try a few sensible endpoints and normalize
  useEffect(() => {
    let mounted = true;

    async function tryFetch(url) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (!mounted || !Array.isArray(data)) return null;
        return data;
      } catch {
        return null;
      }
    }

    (async () => {
      // candidate endpoints (ordered)
      const candidates = [
        `${API_BASE}/api/public/slides`,
        `${API_BASE}/api/slides`,
        `${API_BASE}/api/sales-slides/public/slides`,
        `${API_BASE}/api/sales/slides`,
        `/api/public/slides`,
        `/api/slides`,
      ];

      let data = null;
      for (const url of candidates) {
        // eslint-disable-next-line no-await-in-loop
        data = await tryFetch(url);
        if (data && Array.isArray(data) && data.length > 0) break;
      }

      // fallback: if nothing found, do nothing (hero will be null)
      if (!mounted) return;

      if (Array.isArray(data) && data.length > 0) {
        const normalized = data
          .map((s, idx) => {
            const src = extractSrc(s) || null;
            const title = extractTitle(s) || "";
            const link = extractLink(s) || null;
            return {
              id: s.id ?? s._id ?? `slide-${idx}-${Date.now()}`,
              src,
              title,
              link,
            };
          })
          .filter((s) => !!s.src); // keep only slides with a source

        if (normalized.length === 0) {
          // If API returned slides but none contained images, we still set empty to hide hero
          setSlides([]);
          return;
        }

        setSlides(normalized);
        setIndex(0);
      } else {
        setSlides([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // autoplay
  useEffect(() => {
    if (paused || total <= 1) return;
    const t = setInterval(() => changeIndex(1), autoPlayMs);
    return () => clearInterval(t);
  }, [paused, autoPlayMs, total]);

  // keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") changeIndex(1);
      if (e.key === "ArrowLeft") changeIndex(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // intentionally do not include changeIndex in deps
  }, [total]);

  // keep index within bounds when slides update
  useEffect(() => {
    if (index >= total && total > 0) setIndex(0);
  }, [slides, total, index]);

  if (total === 0) return null;

  // handlers
  const handleImgError = (slideId) => (e) => {
    setImgErrorMap((m) => ({ ...m, [slideId]: true }));
    // hide broken image element
    if (e?.target) e.target.style.display = "none";
  };

  const active = slides[index];

  return (
    <section
      className="relative max-w-6xl mx-auto overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative aspect-[16/6] bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={active.id}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: "easeInOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
            style={{ touchAction: "pan-y" }}
          >
            {/* Image (if it errors, we still have the gradient & caption) */}
            {active.src && !imgErrorMap[active.id] ? (
              <img
                src={active.src}
                alt={active.title || "Slide"}
                className="w-full h-full object-cover"
                loading="lazy"
                draggable="false"
                onError={handleImgError(active.id)}
              />
            ) : (
              // fallback background (subtle gradient)
              <div
                aria-hidden="true"
                className="w-full h-full bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900"
              />
            )}

            {/* subtle overlay for text readability */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* caption */}
            <div className="absolute left-6 bottom-6 text-white max-w-lg pointer-events-auto">
              <span className="inline-block text-xs uppercase tracking-wider bg-black/60 px-3 py-1 rounded-full">
                Dripzoid
              </span>

              <h2 className="mt-3 text-2xl md:text-3xl font-bold leading-snug drop-shadow-sm">
                {active.title || ""}
              </h2>

              {active.link && (
                <a
                  href={active.link}
                  className="inline-block mt-4 text-sm font-medium underline underline-offset-4"
                >
                  Shop Now →
                </a>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={() => changeIndex(-1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 shadow flex items-center justify-center"
          >
            <span aria-hidden>←</span>
          </button>

          <button
            onClick={() => changeIndex(1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 shadow flex items-center justify-center"
          >
            <span aria-hidden>→</span>
          </button>
        </>
      )}

      {/* dots */}
      {total > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i === index) return;
                setDir(i > index ? 1 : -1);
                setIndex(i);
              }}
              aria-current={i === index}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-transform ${
                i === index ? "bg-white scale-125" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
