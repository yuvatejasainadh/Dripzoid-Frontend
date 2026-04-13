import React from "react";

export default function Collabs() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-extrabold mb-6">Collaborations</h1>

        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mb-16">
          We collaborate with creators, designers, and brands who share our
          passion for originality, culture, and confidence.
        </p>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="p-8 rounded-2xl border bg-neutral-50 dark:bg-neutral-900">
            <h3 className="text-xl font-semibold mb-2">Creators & Influencers</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Partner with Dripzoid to create exclusive drops and campaigns that
              resonate with your audience.
            </p>
          </div>

          <div className="p-8 rounded-2xl border bg-neutral-50 dark:bg-neutral-900">
            <h3 className="text-xl font-semibold mb-2">Brands & Artists</h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Limited editions, capsule collections, and bold creative projects.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <a
            href="mailto:collabs@dripzoid.com"
            className="inline-block px-8 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold"
          >
            Collab With Us
          </a>
        </div>
      </section>
    </main>
  );
}
