import React from "react";
import { Link } from "react-router-dom";

export default function Collections() {
  const collections = ["Streetwear", "Luxury Basics", "Limited Drops", "Seasonal"];

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-extrabold mb-12">Collections</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {collections.map((c) => (
            <Link
              key={c}
              to={`/collections/${c.toLowerCase().replace(" ", "-")}`}
              className="p-10 rounded-2xl border bg-neutral-50 dark:bg-neutral-900 hover:scale-[1.02] transition"
            >
              <h3 className="text-2xl font-semibold">{c}</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                Explore the {c} collection.
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
