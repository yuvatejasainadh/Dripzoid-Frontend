import React from "react";
import ExpandedCTA from "../components/CallToAction"; // adjust path if needed
import {
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
} from "lucide-react";

export default function Contact() {
  return (
    <section className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Get in Touch with <span className="text-neutral-500">Dripzoid</span>
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            Whether you have a question about our collections, need support with an order,
            or want to collaborate — we’re always here to connect.
          </p>
        </div>
      </div>

      {/* Contact Cards */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Email */}
          <div className="rounded-2xl p-6 border border-neutral-200/20 dark:border-neutral-700 bg-white/60 dark:bg-neutral-800/60 shadow-lg hover:shadow-xl transition">
            <Mail className="w-8 h-8 mb-4 text-black dark:text-white" />
            <h3 className="text-xl font-bold mb-2">Email Support</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
              For order help, sizing questions, or general enquiries.
            </p>
            <a
              href="mailto:support@dripzoid.com"
              className="font-semibold underline underline-offset-4 hover:text-neutral-500"
            >
              support@dripzoid.com
            </a>
          </div>

          {/* Phone */}
          <div className="rounded-2xl p-6 border border-neutral-200/20 dark:border-neutral-700 bg-white/60 dark:bg-neutral-800/60 shadow-lg hover:shadow-xl transition">
            <Phone className="w-8 h-8 mb-4 text-black dark:text-white" />
            <h3 className="text-xl font-bold mb-2">Call Us</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
              Speak directly with our support team during business hours.
            </p>
            <a
              href="tel:+919494038163"
              className="font-semibold underline underline-offset-4 hover:text-neutral-500"
            >
              +91 94940 38163
            </a>
          </div>

          {/* Address */}
          <div className="rounded-2xl p-6 border border-neutral-200/20 dark:border-neutral-700 bg-white/60 dark:bg-neutral-800/60 shadow-lg hover:shadow-xl transition">
            <MapPin className="w-8 h-8 mb-4 text-black dark:text-white" />
            <h3 className="text-xl font-bold mb-2">Our Location</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Dripzoid<br />
              Near Cattle Market,<br />
              Pithapuram, Andhra Pradesh<br />
              India – 533450
            </p>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-3xl p-8 bg-gradient-to-r from-black to-neutral-800 dark:from-white dark:to-neutral-200 text-white dark:text-black shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
            Stay Connected with Dripzoid
          </h2>
          <p className="text-center text-neutral-200 dark:text-neutral-700 mb-8 max-w-2xl mx-auto">
            Follow us on social platforms for latest drops, behind-the-scenes content,
            exclusive offers, and community updates.
          </p>

          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="https://www.instagram.com/dripzoidofficial?igsh=MWZzbzltczdnNzh2aw=="
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold hover:scale-105 transition"
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </a>

            <a
              href="https://wa.me/message/NSIW5WOQRBDFG1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold hover:scale-105 transition"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>

            <a
              href="https://www.facebook.com/share/1Begozxt9S/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold hover:scale-105 transition"
            >
              <Facebook className="w-5 h-5" />
              Facebook
            </a>

            <a
              href="https://youtube.com/@dripzoidofficial?si=z_oN9DBw7X-YzPGp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold hover:scale-105 transition"
            >
              <Youtube className="w-5 h-5" />
              YouTube
            </a>
          </div>
        </div>
      </div>

      {/* CTA FORM (Imported) */}
      <ExpandedCTA />
    </section>
  );
}
