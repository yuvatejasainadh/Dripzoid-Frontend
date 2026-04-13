// src/pages/Home.jsx
// Version: V2.2 – Premium Fashion Homepage + FAQ Section

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Hero from "../components/Hero";
import FeaturedSection from "../components/FeaturedSection";
import TrendingSection from "../components/TrendingSection";
import OnSale from "../components/OnSale";
import FAQSection from "../components/FAQSection"; // ✅ NEW

/* ---------------------------------
   Default Data (fallback)
---------------------------------- */
const DEFAULT_SLIDES = [
  {
    id: "slide-1",
    src:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1763476327/my_project/dqdsmhr2165v29xajfm4.jpg",
    title: "New Season Drop",
    cta: { label: "Shop Now", href: "/shop" },
  },
];

const DEFAULT_SALES = [
  {
    id: "sale-1",
    title: "Limited Time Offers",
    isActive: true,
    banner:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1763476327/my_project/sale_banner.jpg",
    url: "/shop",
  },
];

/* ---------------------------------
   Home Page
---------------------------------- */
export default function HomePage() {
  const [slides, setSlides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("home.slides")) || DEFAULT_SLIDES;
    } catch {
      return DEFAULT_SLIDES;
    }
  });

  const [sales, setSales] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("home.sales")) || DEFAULT_SALES;
    } catch {
      return DEFAULT_SALES;
    }
  });

  useEffect(() => {
    localStorage.setItem("home.slides", JSON.stringify(slides));
  }, [slides]);

  useEffect(() => {
    localStorage.setItem("home.sales", JSON.stringify(sales));
  }, [sales]);

  const activeSale = sales.find((s) => s.isActive) || null;

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-black text-black dark:text-white">
      <div className="h-16" />

      {/* HERO */}
      <section className="mb-24">
        <Hero slides={slides} heroPromo={activeSale} />
      </section>

      {/* CATEGORY SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-6 mb-28">
        <div className="grid grid-cols-3 gap-6 text-center">
          {[
            {
              label: "Men",
              to: "/men",
              img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769234530/my_project/q9yp4y9u9db6plxswvqm.jpg",
            },
            {
              label: "Women",
              to: "/women",
              img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769234485/my_project/jjohfsp34dtkjqpbwdju.jpg",
            },
            {
              label: "Kids",
              to: "/kids",
              img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769234558/my_project/axzwtgc54k9u7jcryawe.jpg",
            },
          ].map((cat) => (
            <Link key={cat.label} to={cat.to} className="group">
              <div className="aspect-square rounded-full overflow-hidden mb-4 shadow-md group-hover:scale-105 transition">
                <img
                  src={cat.img}
                  alt={cat.label}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm font-semibold tracking-wide">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ON SALE */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <h2 className="text-3xl font-semibold mb-6">
          {activeSale ? activeSale.title : "On Sale"}
        </h2>
        <OnSale sales={sales} />
      </section>

      {/* FEATURED */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <FeaturedSection />
      </section>

      {/* TRENDING */}
      <section className="max-w-7xl mx-auto px-6 mb-40">
        <TrendingSection />
      </section>

      {/* TRUST STRIP */}
      <section className="border-t border-slate-200 dark:border-slate-800 py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Fast Shipping",
              subtitle: "Powered by Shiprocket",
              img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769225552/my_project/focg52j1sxvgcdswqml3.jpg",
            },
            {
              title: "Secure Payments",
              subtitle: "Trusted Razorpay Gateway",
              img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1769225506/my_project/qkqygkjqz364i7ym0nm1.jpg",
            },
            {
              title: "Premium Fabrics",
              subtitle: "Crafted by Dripzoid",
              img: "https://res.cloudinary.com/dvid0uzwo/image/upload/v1768910178/my_project/nwugfdsdrkdtv7obsoq9.png",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white dark:bg-slate-900 shadow-lg p-8 text-center hover:shadow-xl transition"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden">
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION ✅ */}
      <section className="border-t border-slate-200 dark:border-slate-800">
        <FAQSection className="mt-24 mb-24" />
      </section>
    </main>
  );
}
