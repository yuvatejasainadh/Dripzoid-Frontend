// src/pages/ApplyPage.jsx
import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "";


export default function ApplyPage() {
  const { jobId } = useParams();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    portfolio: "",
    cover: "",
    resume: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (name === "resume") {
      setForm((prev) => ({ ...prev, resume: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("portfolio", form.portfolio);
      formData.append("cover", form.cover);
      if (form.resume) formData.append("resume", form.resume);

      const res = await fetch(`${API_BASE}/api/jobs/apply`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Application failed");
      }

      setSuccess(true);
    } catch (err) {
      console.error("Application error:", err);
      alert(err.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-center px-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Application Submitted 🎉</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Thank you for applying! Our team will review your application soon.
          </p>
          <Link
            to="/jobs"
            className="px-6 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold"
          >
            Back to Jobs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <section className="max-w-2xl mx-auto px-6 py-20">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold mb-3">
            Apply for this Position
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Complete the form below to submit your application.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 border rounded-2xl p-8 bg-neutral-50 dark:bg-neutral-900"
        >
          {/* Name */}
          <div>
            <label className="block mb-2 font-medium">Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 bg-white dark:bg-black"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block mb-2 font-medium">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 bg-white dark:bg-black"
              placeholder="you@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block mb-2 font-medium">Phone Number</label>
            <input
              type="tel"
              name="phone"
              required
              value={form.phone}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 bg-white dark:bg-black"
              placeholder="+91 9XXXXXXXXX"
            />
          </div>

          {/* Portfolio */}
          <div>
            <label className="block mb-2 font-medium">
              Portfolio / LinkedIn
            </label>
            <input
              type="url"
              name="portfolio"
              value={form.portfolio}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 bg-white dark:bg-black"
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block mb-2 font-medium">Upload Resume</label>
            <input
              type="file"
              name="resume"
              accept=".pdf,.doc,.docx"
              required
              onChange={handleChange}
              className="w-full"
            />
          </div>

          {/* Cover Letter */}
          <div>
            <label className="block mb-2 font-medium">
              Why should we hire you?
            </label>
            <textarea
              name="cover"
              rows="4"
              value={form.cover}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3 bg-white dark:bg-black"
              placeholder="Write a short note..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/jobs" className="text-blue-500 underline">
            ← Back to Jobs
          </Link>
        </div>
      </section>
    </main>
  );
}
