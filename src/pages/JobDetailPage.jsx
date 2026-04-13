import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "";


export default function JobDetailPage() {
  const { slug } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${slug}`);
        if (!res.ok) throw new Error("Job not found");
        const data = await res.json();
        setJob(data);
      } catch (err) {
        console.error(err);
        setJob(null);
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Loading job details...</p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h1 className="text-3xl font-bold mb-4">Job Not Found</h1>
          <Link to="/jobs" className="text-blue-500 underline">
            Back to Jobs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <section className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <header className="mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium mb-4">
            {job.type}
          </span>
          <h1 className="text-4xl font-extrabold mb-3">{job.title}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {job.location} • {job.department}
          </p>
        </header>

        {/* Overview */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-3">Overview</h2>
          <p className="text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
            {job.description}
          </p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Duration</p>
            <p className="font-semibold">{job.duration || "N/A"}</p>
          </div>
          <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Stipend</p>
            <p className="font-semibold">{job.stipend || "—"}</p>
          </div>
          <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-neutral-900">
            <p className="text-sm text-neutral-500">Location</p>
            <p className="font-semibold">{job.location || "Remote"}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col md:flex-row gap-4">
          {job.status === "Open" && (
            <Link
              to={`/apply/${job.id}`}
              className="px-8 py-3 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold text-center"
            >
              Apply Now
            </Link>
          )}

          <Link
            to="/jobs"
            className="px-8 py-3 rounded-full border text-center"
          >
            Back to Jobs
          </Link>
        </div>
      </section>
    </main>
  );
}
