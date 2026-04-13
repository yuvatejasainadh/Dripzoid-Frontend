import React, { useState, useRef } from "react";
import { motion } from "framer-motion";

/**
 * Expanded CTA component
 * - Modern Tailwind UI
 * - Framer-motion entrance & micro-interactions
 * - Accessible form: name, email, interests, frequency, consent
 * - Client-side validation + graceful fallback to mailto if POST fails
 * - Stores "subscribed" flag in localStorage (so users don't repeatedly see the form)
 *
 * Adjust copy, classes or the POST URL to match your project.
 */
export default function ExpandedCTA() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    interests: {
      newArrivals: true,
      seasonalSales: true,
      collaborations: false,
    },
    frequency: "weekly",
    consent: false,
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // null | "sending" | "success" | "error"
  const [subscribed, setSubscribed] = useState(() => {
    try {
      return Boolean(localStorage.getItem("dripzoid_subscribed"));
    } catch {
      return false;
    }
  });

  const liveRef = useRef(null);

  const emailRegex = /^\S+@\S+\.\S+$/;

  function validate() {
    const e = {};
    if (!form.email || !emailRegex.test(form.email)) e.email = "Please enter a valid email address.";
    if (!form.consent) e.consent = "We need your consent to send marketing emails.";
    return e;
  }

  function setField(path, value) {
    // simple nested updater for interests
    if (path.startsWith("interests.")) {
      const key = path.split(".")[1];
      setForm((f) => ({ ...f, interests: { ...f.interests, [key]: value } }));
      return;
    }
    setForm((f) => ({ ...f, [path]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    const eErrors = validate();
    setErrors(eErrors);
    if (Object.keys(eErrors).length) {
      // put focus on live region for assistive tech
      if (liveRef.current) liveRef.current.focus();
      return;
    }

    setStatus("sending");

    // payload
    const payload = {
      name: form.name.trim() || undefined,
      email: form.email.trim(),
      interests: Object.keys(form.interests).filter((k) => form.interests[k]),
      frequency: form.frequency,
      consent: form.consent,
      source: "cta-component",
    };

    try {
      // replace this url with your real newsletter endpoint
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Server rejected request.");

      // success
      setStatus("success");
      localStorage.setItem("dripzoid_subscribed", "1");
      setSubscribed(true);
    } catch (err) {
      console.warn("subscribe failed:", err);

      // fallback: open mailto so user can still contact
      const mailto = `mailto:support@dripzoid.com?subject=${encodeURIComponent(
        "Newsletter subscription"
      )}&body=${encodeURIComponent(`Name: ${payload.name || ""}\nEmail: ${payload.email}\nInterests: ${payload.interests.join(", ")}`)}`;

      window.open(mailto, "_blank");
      setStatus("error");
    } finally {
      // move live region for screen reader
      if (liveRef.current) liveRef.current.focus();
    }
  }

  if (subscribed) {
    return (
      <section className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-r from-black to-neutral-800 dark:from-white dark:to-neutral-200 text-white dark:text-black p-8 shadow-2xl"
        >
          <div className="flex items-start gap-6 md:gap-10">
            <div className="flex-none">
              <svg width="56" height="56" viewBox="0 0 24 24" className="text-white dark:text-black">
                <circle cx="12" cy="12" r="12" fill="currentColor" opacity="0.12" />
                <path d="M10 14l-3-3 1.4-1.4L10 11.2 15.6 5.6 17 7l-7 7z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-extrabold">You're subscribed — welcome to Dripzoid</h3>
              <p className="mt-2 text-neutral-200 dark:text-neutral-700 max-w-2xl">
                Thanks for joining our community. Expect curated drops, early access to seasonal sales, and exclusive
                collabs delivered to your inbox. You can update preferences anytime or unsubscribe with one click.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href="/account/preferences"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-semibold shadow hover:opacity-95 transition"
                >
                  Manage preferences
                </a>
                <a
                  href="/collections/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white hover:bg-white/5 transition"
                >
                  Shop new arrivals
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
      >
        {/* Left: messaging & benefits */}
        <div className="space-y-6">
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-extrabold"
          >
            Join the Dripzoid community — early drops & members-only perks
          </motion.h2>

          <motion.p
            initial={{ y: 8, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="text-neutral-600 dark:text-neutral-300"
          >
            Dripzoid blends bold streetwear with premium details — made for people who want to stand out.
            Subscribers get early access to new collections, priority sale previews, limited-edition collabs, and
            styling tips from our design team.
          </motion.p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { t: "Early access", d: "Be first to shop drops before public release." },
              { t: "Member discounts", d: "Exclusive promo codes and flash-sale invites." },
              { t: "Limited editions", d: "Access to collabs and limited-run pieces." },
              { t: "Style edits", d: "Curated styling and care tips from our team." },
            ].map((b) => (
              <li key={b.t} className="flex items-start gap-3">
                <span className="mt-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" className="text-black dark:text-white">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </span>
                <div>
                  <div className="font-medium">{b.t}</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">{b.d}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="text-xs text-neutral-400">
            We respect your inbox. We send 1–4 emails per month. Unsubscribe anytime.
          </div>
        </div>

        {/* Right: form */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/10 p-6 shadow-lg"
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                Your name <span className="text-neutral-400 text-xs">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Sainadh Chowdary"
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 outline-none"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                required
                placeholder="you@domain.com"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.email ? "border-red-400" : "border-neutral-200 dark:border-neutral-700"
                } bg-transparent focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 outline-none`}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-2 text-xs text-red-500">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">Interests</div>
              <div className="grid grid-cols-3 gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.interests.newArrivals}
                    onChange={(e) => setField("interests.newArrivals", e.target.checked)}
                  />
                  <span className="text-sm">New arrivals</span>
                </label>

                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.interests.seasonalSales}
                    onChange={(e) => setField("interests.seasonalSales", e.target.checked)}
                  />
                  <span className="text-sm">Seasonal sales</span>
                </label>

                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.interests.collaborations}
                    onChange={(e) => setField("interests.collaborations", e.target.checked)}
                  />
                  <span className="text-sm">Collaborations</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="frequency" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
                Email frequency
              </label>
              <select
                id="frequency"
                value={form.frequency}
                onChange={(e) => setField("frequency", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent outline-none"
              >
                <option value="daily">Daily (high volume)</option>
                <option value="weekly">Weekly (best for trends)</option>
                <option value="monthly">Monthly (digest)</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="inline-flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setField("consent", e.target.checked)}
                  required
                />
                <div className="text-sm text-neutral-600 dark:text-neutral-300">
                  I agree to receive marketing emails from Dripzoid. I understand I can unsubscribe at any time.
                  {errors.consent && <div className="text-xs text-red-500 mt-1">{errors.consent}</div>}
                </div>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-black text-white font-semibold hover:scale-[1.02] transition-transform shadow"
              >
                {status === "sending" ? "Subscribing..." : "Join Dripzoid"}
                <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-80">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() =>
                  setForm({
                    name: "",
                    email: "",
                    interests: { newArrivals: true, seasonalSales: true, collaborations: false },
                    frequency: "weekly",
                    consent: false,
                  })
                }
                className="px-4 py-2 rounded-full border border-neutral-200 text-sm"
              >
                Reset
              </button>

              <div className="flex-1 text-sm text-neutral-500">
                <div aria-live="polite" ref={liveRef} tabIndex={-1}>
                  {status === "success" && <span className="text-green-600">Thanks — check your inbox for a confirmation email.</span>}
                  {status === "error" && <span className="text-amber-600">Couldn't reach our server — opening mail client as fallback.</span>}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-neutral-400">
              By subscribing you join a community of creators and style-seekers. We value privacy — your email is used only
              for Dripzoid communications (not shared). Read our <a href="/privacy-policy" className="underline">privacy policy</a>.
            </p>
          </form>
        </motion.div>
      </motion.div>
    </section>
  );
}
