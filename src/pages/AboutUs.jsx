import React from "react";

export default function AboutUs() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12 md:py-20 text-neutral-900 dark:text-neutral-100">
      {/* HERO */}
      <header className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-12">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" fill="currentColor" />
            </svg>
            Made in India · Street-luxury
          </p>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            Dripzoid — Wear the Confidence
          </h1>

          <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-6">
            Bold streetwear with a luxury touch. We design pieces that help you express your individuality —
            crafted thoughtfully, worn proudly.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="/shop"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-black text-white font-semibold shadow hover:shadow-lg transition"
            >
              Shop Now
            </a>
            <a
              href="/collections"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
            >
              Explore Collections
            </a>
          </div>
        </div>

        <figure className="order-first md:order-last">
          {/* Replace with a real image or dynamic hero */}
          <img
            src="https://via.placeholder.com/900x700?text=Dripzoid+Hero"
            alt="Dripzoid apparel showcase"
            className="w-full rounded-2xl shadow-lg object-cover"
          />
        </figure>
      </header>

      {/* QUICK STATS / PROMISES */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/6 border border-neutral-200/10">
          <div className="text-sm font-medium text-neutral-500">Founded</div>
          <div className="mt-2 text-xl font-bold">2020</div>
          <div className="text-sm text-neutral-500 mt-1">Built in India, shipped worldwide</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/6 border border-neutral-200/10">
          <div className="text-sm font-medium text-neutral-500">Pieces</div>
          <div className="mt-2 text-xl font-bold">Premium Fabrics</div>
          <div className="text-sm text-neutral-500 mt-1">Softer feels, lasting fits</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/60 dark:bg-white/6 border border-neutral-200/10">
          <div className="text-sm font-medium text-neutral-500">Community</div>
          <div className="mt-2 text-xl font-bold">Design Collabs</div>
          <div className="text-sm text-neutral-500 mt-1">Creators & drop culture</div>
        </div>
      </section>

      {/* OUR STORY + MISSION / VISION */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
        <div>
          <h2 className="text-2xl font-semibold mb-3">Our Story</h2>
          <p className="text-neutral-600 dark:text-neutral-300 mb-4">
            Dripzoid began as a small creative collective with a simple idea: merge street authenticity with
            refined quality. What started as limited drops and capsule collections quickly grew into a brand
            recognized for clean silhouettes, bold graphics and elevated materials. Every season we iterate
            on fit, fabric and finish — listening to our community and staying true to our roots.
          </p>

          <p className="text-neutral-600 dark:text-neutral-300">
            We design for the person who wants more than a label — they want clothing that performs, endures,
            and amplifies how they show up in the world.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-tr from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 border border-neutral-200/10">
            <h3 className="text-lg font-semibold">Mission</h3>
            <p className="text-neutral-600 dark:text-neutral-300 mt-2">
              To craft accessible street-luxury that empowers people to wear confidence — design-forward pieces
              that feel premium without the pretense.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-tr from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 border border-neutral-200/10">
            <h3 className="text-lg font-semibold">Vision</h3>
            <p className="text-neutral-600 dark:text-neutral-300 mt-2">
              To be a home for modern self-expression — championing sustainable choices, meaningful collaborations,
              and designs that last beyond seasonal trends.
            </p>
          </div>
        </div>
      </section>

      {/* VALUES GRID */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Our Values</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Design-First",
              desc: "Every collection starts with concept and fit. We obsess over silhouette and proportion.",
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 2L20 7v10l-8 5-8-5V7l8-5z" fill="currentColor" />
                </svg>
              ),
            },
            {
              title: "Quality",
              desc: "Premium fabrics, reinforced stitching and consistent sizing—garments built to last.",
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 2l3 6 7 1-5 4 2 7-6-3-6 3 2-7-5-4 7-1 3-6z" fill="currentColor" />
                </svg>
              ),
            },
            {
              title: "Community",
              desc: "We co-create with artists, stylists and our customers—your voice shapes our drops.",
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zM4 20c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6v1H4v-1z" fill="currentColor" />
                </svg>
              ),
            },
            {
              title: "Sustainability",
              desc: "We’re reducing waste and choosing better materials as we scale.",
              icon: (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 2a10 10 0 000 20v-6l4 4 2-2-6-6V2z" fill="currentColor" />
                </svg>
              ),
            },
          ].map((c) => (
            <article key={c.title} className="p-5 bg-white/60 dark:bg-white/6 border border-neutral-200/10 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-black/5 dark:bg-white/8 flex-shrink-0">{c.icon}</div>
                <div>
                  <h4 className="font-semibold">{c.title}</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{c.desc}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* QUALITY & SUSTAINABILITY */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
        <div>
          <h3 className="text-xl font-semibold mb-3">Quality & Craftsmanship</h3>
          <p className="text-neutral-600 dark:text-neutral-300 mb-3">
            We source materials from trusted mills and partner with experienced manufacturers to ensure
            consistent quality. Every stitch and finish is tested — from wash resilience to colorfastness.
            Our in-house fit team prototypes multiple iterations so every drop fits how it should.
          </p>

          <ul className="list-disc pl-5 text-neutral-600 dark:text-neutral-300 space-y-2">
            <li>Premium, pre-shrunk fabrics for consistent fit</li>
            <li>Reinforced seams at stress points</li>
            <li>Blended materials where performance matters</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-3">Sustainability</h3>
          <p className="text-neutral-600 dark:text-neutral-300 mb-3">
            We’re taking steps to minimize our environmental footprint — from conscious fabric choices (recycled
            fibers, organic cotton) to smarter packaging and limited-run drops that avoid overproduction.
            Sustainability is a continual journey and we publish improvements as we make them.
          </p>

          <div className="mt-4 space-y-2">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold">✓</span>
              <div>
                <div className="font-medium">Recycled & organic materials</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-300">Increasing percentage each year.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold">✓</span>
              <div>
                <div className="font-medium">Minimal packaging</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-300">Designs to reduce waste & bulk.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="mb-12">
        <h3 className="text-2xl font-semibold mb-4">Community & Collaborations</h3>
        <p className="text-neutral-600 dark:text-neutral-300 mb-4">
          Our community is at the center of what we do. We collaborate with visual artists, stylists and local
          creatives to produce limited drops. Join our mailing list and community channels for early access,
          behind-the-scenes design stories and invite-only collabs.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            className="px-4 py-2 rounded-full bg-black text-white font-semibold hover:opacity-95 transition"
            href="/subscribe"
          >
            Join the List
          </a>
          <a
            className="px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
            href="/collabs"
          >
            See Collabs
          </a>
        </div>
      </section>

      {/* PRACTICALS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <article className="p-5 rounded-2xl bg-white/60 dark:bg-white/6 border border-neutral-200/10">
          <h4 className="font-semibold mb-2">Sizing & Fit</h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
            Our size guide is tailored per product. We include chest, length and sleeve measurements on every product page.
          </p>
          <a className="text-sm font-medium underline" href="/size-guide">View Size Guide</a>
        </article>

        <article className="p-5 rounded-2xl bg-white/60 dark:bg-white/6 border border-neutral-200/10">
          <h4 className="font-semibold mb-2">Shipping & Returns</h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
            Standard shipping across India and international options available. Easy returns within 14 days of delivery.
          </p>
          <a className="text-sm font-medium underline" href="/shipping">Shipping Policy</a>
        </article>

        <article className="p-5 rounded-2xl bg-white/60 dark:bg-white/6 border border-neutral-200/10">
          <h4 className="font-semibold mb-2">Careers & Wholesale</h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">Interested in joining our growing team or stocking Dripzoid in your store?</p>
          <a className="text-sm font-medium underline" href="/jobs">Work With Us</a>
        </article>
      </section>

      {/* CONTACT / CTA */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 border border-neutral-200/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h4 className="text-xl font-semibold">Have a question or collaboration idea?</h4>
            <p className="text-neutral-600 dark:text-neutral-300 mt-1">Reach out — we love hearing from customers and creators.</p>
          </div>

          <div className="flex items-center gap-3">
            <a href="mailto:hello@dripzoid.com" className="px-4 py-3 rounded-full bg-black text-white font-semibold">Contact Us</a>
            <a href="/faq" className="text-sm underline">Help & FAQ</a>
          </div>
        </div>
      </section>

      <footer className="mt-12 text-sm text-neutral-500 dark:text-neutral-400">
        <div>© {new Date().getFullYear()} Dripzoid. All rights reserved.</div>
      </footer>
    </main>
  );
}
