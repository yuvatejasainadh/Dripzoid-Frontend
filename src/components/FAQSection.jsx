// FAQSection.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Search, ChevronDown, ChevronUp } from "lucide-react";

/**
 * FAQSection
 * - Carousel (one question per slide on small screens; more columns on wide screens)
 * - Search + filter
 * - Expand/collapse answer inside each slide
 * - Keyboard navigation + swipe (drag) support via framer-motion
 *
 * Usage: import FAQSection and render at bottom of home page.
 */

const FAQS = [
  {
    id: "shipping-time",
    q: "How long does shipping take?",
    a:
      "Standard shipping within India typically takes 3–7 business days. Express shipping options (1–3 business days) are available at checkout for an additional fee. International delivery times vary by destination and customs processing — expect 7–21 business days depending on the country.",
  },
  {
    id: "returns-policy",
    q: "What is your returns & exchange policy?",
    a:
      "You can return unworn items within 14 days of delivery for an exchange or store credit. Sale/clearance items may be final sale — check the product page for exceptions. Items must be in original condition with tags. Start a return via 'My Orders' or contact support at support@dripzoid.com.",
  },
  {
    id: "size-guide",
    q: "How do I choose the right size?",
    a:
      "Our product pages include a detailed size chart and model measurements. If you're between sizes, we recommend sizing up for a relaxed fit or down for a slimmer fit depending on the product description. Use the live chat for personalised advice.",
  },
  {
    id: "materials-care",
    q: "What materials do you use & how do I care for my clothes?",
    a:
      "We use premium cotton blends, denim, and technical fabrics depending on the style. Care instructions are on each product page and the garment label. Most items are machine-wash cold and hang-dry — avoid high heat to preserve prints and fabric integrity.",
  },
  {
    id: "payment-options",
    q: "Which payment methods do you accept?",
    a:
      "We accept major debit/credit cards, UPI, netbanking, and popular wallets. For international orders we accept international cards and selected payment gateways. All payments are processed securely via PCI-compliant partners.",
  },
  {
    id: "track-order",
    q: "How can I track my order?",
    a:
      "After your order ships we send an email and SMS with tracking details. You can also view tracking from 'My Orders' in your account. If tracking hasn't updated, contact support and we'll investigate.",
  },
  {
    id: "discounts-promo",
    q: "Do you have discount codes or student offers?",
    a:
      "We run seasonal sales, early-access drops, and occasional promo codes via email and social channels. Subscribe to our newsletter for exclusive offers. Student discounts may be available during select campaigns — check the banner or contact support.",
  },
  {
    id: "out-of-stock",
    q: "What happens if an item is out of stock?",
    a:
      "If an item is out of stock you can request a restock alert on the product page. For limited drops, restocks are not always guaranteed — check product pages for availability and sign up for alerts.",
  },
  {
    id: "gift-cards",
    q: "Do you offer gift cards?",
    a:
      "Yes — digital gift cards are available in a range of amounts. They can be redeemed at checkout and do not expire. Gift cards cannot be exchanged for cash.",
  },
  {
    id: "wholesale",
    q: "Do you offer wholesale or bulk orders?",
    a:
      "We offer wholesale partnerships for retailers and bulk order discounts for brands/events. Email business@dripzoid.com with your enquiry and our team will follow up.",
  },
];

// animation helpers
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.98,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.98,
  }),
};

export default function FAQSection({ className = "" }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0); // >0 right, <0 left
  const [expandedId, setExpandedId] = useState(null);

  // derived filtered list
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((f) => (f.q + " " + f.a).toLowerCase().includes(q));
  }, [query]);

  // constrain index when filtered changes
  useEffect(() => {
    if (index >= filtered.length) {
      setIndex(Math.max(0, filtered.length - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length]);

  const go = useCallback(
    (dir) => {
      if (filtered.length <= 1) return;
      const next = (index + dir + filtered.length) % filtered.length;
      setDirection(dir);
      setIndex(next);
      setExpandedId(null);
    },
    [index, filtered.length]
  );

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // simple auto-size for responsiveness: number of visible cards (not used for slide logic here)
  // we intentionally render one slide at a time (centered) for clarity at bottom of home
  const current = filtered[index];

  if (!current) {
    return (
      <section className={`py-12 px-4 ${className}`}>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2">Frequently Asked Questions</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">No results for your search.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Frequently asked questions"
      className={`py-12 px-4 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 ${className}`}
    >
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold">FAQ — Need help?</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-xl">
              Quick answers to common questions about shipping, returns, sizing and more. Use the
              search to jump to the relevant topic, or swipe the cards left/right.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <label htmlFor="faq-search" className="sr-only">Search FAQs</label>
              <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full px-3 py-2 shadow-sm w-72">
                <Search className="w-4 h-4 text-neutral-400" />
                <input
                  id="faq-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions, e.g. returns, shipping..."
                  className="bg-transparent outline-none text-sm w-full text-neutral-700 dark:text-neutral-200"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label="Previous question"
                onClick={() => go(-1)}
                className="p-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow hover:scale-105 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                aria-label="Next question"
                onClick={() => go(1)}
                className="p-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow hover:scale-105 transition"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Carousel viewport */}
        <div className="relative">
          <div className="overflow-hidden">
            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={current.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: "easeInOut" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(event, info) => {
                  const offset = info.offset.x;
                  const velocity = info.velocity.x;
                  if (offset < -100 || velocity < -500) {
                    go(1);
                  } else if (offset > 100 || velocity > 500) {
                    go(-1);
                  }
                }}
                className="px-2"
              >
                <article
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${filtered.length}`}
                  className="mx-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 md:p-8 shadow-lg max-w-3xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-semibold leading-tight">{current.q}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-3">
                        {current.a}
                      </p>

                      {/* expand */}
                      <div className="mt-4">
                        <button
                          onClick={() => setExpandedId((prev) => (prev === current.id ? null : current.id))}
                          aria-expanded={expandedId === current.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-white/5 text-sm font-medium hover:shadow-sm transition"
                        >
                          {expandedId === current.id ? (
                            <>
                              <ChevronUp className="w-4 h-4" /> Hide answer
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" /> Read answer
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex-shrink-0 hidden md:flex items-center">
                      <div className="w-28 h-28 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center text-sm text-neutral-700 dark:text-neutral-200">
                        <span className="text-center">Q {index + 1}</span>
                      </div>
                    </div>
                  </div>

                  {/* Animated answer area */}
                  <AnimatePresence initial={false}>
                    {expandedId === current.id && (
                      <motion.div
                        key="expanded"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="mt-4 overflow-hidden"
                      >
                        <div className="prose prose-sm dark:prose-invert text-sm text-neutral-700 dark:text-neutral-300">
                          <p>{current.a}</p>
                          <p className="mt-2 text-xs text-neutral-500">
                            Still have questions? Contact <a href="mailto:support@dripzoid.com" className="text-blue-600">support@dripzoid.com</a> or use live chat.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {filtered.map((f, i) => (
              <button
                key={f.id}
                aria-label={`Go to ${i + 1}`}
                onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); setExpandedId(null); }}
                className={`w-2 h-2 rounded-full transition-transform ${i === index ? "scale-125 bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-600"}`}
              />
            ))}
          </div>

          {/* Small footer CTA */}
          <div className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Can’t find what you’re looking for? <a href="/contact" className="text-blue-600 hover:underline">Contact our support</a>.
          </div>
        </div>
      </div>
    </section>
  );
}
