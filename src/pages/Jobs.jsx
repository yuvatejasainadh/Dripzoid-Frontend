import React, { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "";


/* =========================
   Utility: unique values for filters
   ========================= */
function getUnique(list, key) {
  return [...new Set(list.map((i) => i[key]))].filter(Boolean);
}

/* =========================
   Subcomponents
   ========================= */
function SearchBar({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 w-full max-w-2xl mx-auto">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title, role, skill (eg. QA, React, content)..."
        className="flex-1 rounded-lg border px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="button"
        onClick={() => onChange("")}
        className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm"
      >
        Clear
      </button>
    </div>
  );
}

function Filters({ filters, onChange, options }) {
  return (
    <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 items-stretch md:items-center">
      <select
        value={filters.type}
        onChange={(e) => onChange({ ...filters, type: e.target.value })}
        className="rounded-md border px-3 py-2"
      >
        <option value="">All Types</option>
        {options.types.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
        value={filters.location}
        onChange={(e) => onChange({ ...filters, location: e.target.value })}
        className="rounded-md border px-3 py-2"
      >
        <option value="">All Locations</option>
        {options.locations.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      <select
        value={filters.department}
        onChange={(e) => onChange({ ...filters, department: e.target.value })}
        className="rounded-md border px-3 py-2"
      >
        <option value="">All Departments</option>
        {options.departments.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="rounded-md border px-3 py-2"
      >
        <option value="">All Statuses</option>
        {options.statuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

function JobCard({ job }) {
  const badgeColor =
    job.type === "Internship"
      ? "bg-amber-100 text-amber-800"
      : job.type === "Full-time"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";

  return (
    <article className="border rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${badgeColor}`}>
              {job.type}
            </span>
            <h3 className="text-xl font-semibold">{job.title}</h3>
          </div>

          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            {job.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-neutral-700">
            <span>📍 {job.location}</span>
            <span>⏱ {job.duration}</span>
            {job.stipend && <span>💰 {job.stipend}</span>}
            <span className="ml-2">🔖 {job.department}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <a
            href={`/jobs/${job.slug}`}
            className="inline-flex items-center px-4 py-2 rounded-full border text-sm hover:bg-neutral-50"
          >
            View Details
          </a>

          {job.status === "Open" ? (
            <a
              href={`/apply/${job.id}`}
              className="inline-flex items-center px-4 py-2 rounded-full bg-black text-white text-sm"
            >
              Apply Now
            </a>
          ) : (
            <button className="inline-flex items-center px-4 py-2 rounded-full bg-neutral-100 text-sm" disabled>
              Closed
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* =========================
   Main Jobs Page
   ========================= */
export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    location: "",
    department: "",
    status: "",
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  /* =========================
     Fetch Jobs from API
     ========================= */
  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch(`${API_BASE}/api/jobs`);
        const data = await res.json();
        setJobs(data || []);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  /* =========================
     Filter Options
     ========================= */
  const options = useMemo(
    () => ({
      types: getUnique(jobs, "type"),
      locations: getUnique(jobs, "location"),
      departments: getUnique(jobs, "department"),
      statuses: getUnique(jobs, "status"),
    }),
    [jobs]
  );

  /* =========================
     Search + Filter Logic
     ========================= */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return jobs.filter((job) => {
      if (q && !job.title.toLowerCase().includes(q) &&
          !(job.description || "").toLowerCase().includes(q)) return false;

      if (filters.type && job.type !== filters.type) return false;
      if (filters.location && job.location !== filters.location) return false;
      if (filters.department && job.department !== filters.department) return false;
      if (filters.status && job.status !== filters.status) return false;

      return true;
    });
  }, [jobs, query, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [query, filters]);

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <section className="max-w-7xl mx-auto px-6 py-20">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold mb-4">Careers at Dripzoid</h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Join a fast-growing fashion brand redefining streetwear in India.
          </p>
        </header>

        {/* Search + Filters */}
        <div className="mb-8 space-y-4">
          <SearchBar value={query} onChange={setQuery} />
          <div className="flex items-center justify-center">
            <Filters filters={filters} onChange={setFilters} options={options} />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <p className="text-center text-neutral-500">Loading jobs...</p>
        ) : (
          <>
            {/* Job Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pageItems.length ? (
                pageItems.map((job) => <JobCard key={job.id} job={job} />)
              ) : (
                <p className="col-span-full text-center text-neutral-500">
                  No jobs found.
                </p>
              )}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-md border"
                >
                  Prev
                </button>

                {Array.from({ length: pageCount }).map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-2 rounded-md ${p === page ? "bg-black text-white" : "border"}`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                  className="px-3 py-2 rounded-md border"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
