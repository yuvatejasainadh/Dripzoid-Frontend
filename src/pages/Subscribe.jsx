import React from "react";
import CallToAction from "../components/CallToAction";

export default function Subscribe() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-black text-black dark:text-white">
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
          Stay Ahead of the Drip
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-12">
          Be the first to know about new drops, exclusive sales, limited editions,
          and members-only offers.
        </p>

        <CallToAction />

        <p className="text-xs text-neutral-500 mt-10">
          No spam. Unsubscribe anytime.
        </p>
      </section>
    </main>
  );
}
