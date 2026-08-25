import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, MapPin, SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../lib/api";
import { LOCATIONS, JOB_TYPES, EDUCATION_LEVELS, CATEGORIES, SALARY_RANGES, EMPLOYER_TYPES } from "../lib/constants";
import JobListItem from "../components/JobListItem";

function FilterGroup({ title, options, value, onChange, testId }) {
  return (
    <div className="border-b border-slate-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0" data-testid={testId}>
      <h4 className="font-display font-semibold text-sm text-slate-900 mb-2.5">{title}</h4>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const label = typeof opt === "string" ? opt : opt.label;
          const active = value === val;
          return (
            <button
              key={val}
              onClick={() => onChange(active ? "" : val)}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-sky-50 text-sky-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
              }`}
              data-testid={`${testId}-${val.toString().toLowerCase().replace(/[\s/<>&–]+/g, "-")}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");

  const q = searchParams.get("q") || "";
  const location = searchParams.get("location") || "";
  const jobType = searchParams.get("job_type") || "";
  const education = searchParams.get("education") || "";
  const salary = searchParams.get("salary") || "";
  const category = searchParams.get("category") || "";
  const employerType = searchParams.get("employer_type") || "";
  const page = Number(searchParams.get("page") || 1);

  const setParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    setSearchParams(params);
  };

  const fetchJobs = useCallback(() => {
    setLoading(true);
    api.get("/jobs", { params: { q, location, job_type: jobType, education, salary, category, employer_type: employerType, page, limit: 12 } })
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, location, jobType, education, salary, category, employerType, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    setKeyword(q);
  }, [q]);

  const hasFilter = q || location || jobType || education || salary || category;

  const clearAll = () => {
    setSearchParams({});
    setKeyword("");
  };

  const filters = (
    <>
      <FilterGroup title="Lokasi" options={LOCATIONS} value={location} onChange={(v) => setParam("location", v)} testId="filter-location" />
      <FilterGroup title="Tipe Pekerjaan" options={JOB_TYPES} value={jobType} onChange={(v) => setParam("job_type", v)} testId="filter-type" />
      <FilterGroup title="Pendidikan" options={EDUCATION_LEVELS} value={education} onChange={(v) => setParam("education", v)} testId="filter-education" />
      <FilterGroup title="Gaji" options={SALARY_RANGES} value={salary} onChange={(v) => setParam("salary", v)} testId="filter-salary" />
      <FilterGroup title="Kategori" options={CATEGORIES} value={category} onChange={(v) => setParam("category", v)} testId="filter-category" />
    </>
  );

  return (
    <div className="page-fade">
      <div className="bg-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            {employerType === "umkm" ? "🏪 Loker UMKM" : employerType === "company" ? "Loker Perusahaan" : "Cari Lowongan"}
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setParam("q", keyword);
            }}
            className="mt-5 bg-white rounded-xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl"
            data-testid="jobs-search-form"
          >
            <div className="flex items-center gap-2 flex-1 px-3 h-11 rounded-lg bg-slate-50 border border-slate-200">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari posisi, perusahaan, atau kata kunci"
                className="w-full bg-transparent outline-none text-sm text-slate-800"
                data-testid="jobs-search-input"
              />
            </div>
            <button type="submit" className="h-11 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors" data-testid="jobs-search-btn">
              Cari
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 mb-6" data-testid="employer-type-tabs">
          {EMPLOYER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setParam("employer_type", t.value)}
              className={`h-10 px-4 rounded-full text-sm font-semibold transition-colors ${
                employerType === t.value ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
              data-testid={`tab-etype-${t.value || "all"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          <aside className="hidden lg:block">
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-24" data-testid="filters-sidebar">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-slate-900">Filter</h3>
                {hasFilter && (
                  <button onClick={clearAll} className="text-xs text-sky-700 font-medium hover:underline" data-testid="clear-filters-btn">
                    Hapus Semua
                  </button>
                )}
              </div>
              {filters}
            </div>
          </aside>

          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500" data-testid="jobs-count">
                Ditemukan <span className="font-semibold text-slate-900">{data.total}</span> lowongan
              </p>
              <button
                onClick={() => setShowFilter(true)}
                className="lg:hidden inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
                data-testid="open-filter-btn"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filter
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-white border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : data.items.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center" data-testid="no-jobs-found">
                <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-display font-semibold text-slate-900">Lowongan tidak ditemukan.</h3>
                <p className="text-sm text-slate-500 mt-1">Coba ubah kata kunci atau hapus beberapa filter.</p>
                {hasFilter && (
                  <button onClick={clearAll} className="mt-4 inline-flex h-10 px-5 items-center rounded-lg bg-slate-900 text-white text-sm font-semibold" data-testid="reset-filter-btn">
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4" data-testid="jobs-grid">
                  {data.items.map((job) => (
                    <JobListItem key={job.id} job={job} />
                  ))}
                </div>
                {data.pages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3" data-testid="pagination">
                    <button
                      disabled={page <= 1}
                      onClick={() => setParam("page", String(page - 1))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40"
                      data-testid="prev-page-btn"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-slate-600">
                      Halaman {data.page || page} dari {data.pages}
                    </span>
                    <button
                      disabled={page >= data.pages}
                      onClick={() => setParam("page", String(page + 1))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40"
                      data-testid="next-page-btn"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showFilter && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="filter-drawer">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowFilter(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-slate-900">Filter Lowongan</h3>
              <button onClick={() => setShowFilter(false)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200" data-testid="close-filter-btn">
                <X className="h-4 w-4" />
              </button>
            </div>
            {filters}
            <div className="mt-5 flex gap-2">
              {hasFilter && (
                <button onClick={clearAll} className="flex-1 h-11 rounded-lg border border-slate-300 text-sm font-medium text-slate-700" data-testid="clear-filters-mobile-btn">
                  Hapus Semua
                </button>
              )}
              <button onClick={() => setShowFilter(false)} className="flex-1 h-11 rounded-lg bg-sky-600 text-white text-sm font-semibold" data-testid="apply-filter-btn">
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
