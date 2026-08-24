import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Newspaper, MousePointerClick, ShieldCheck, ArrowRight, Briefcase } from "lucide-react";
import api from "../lib/api";
import { LOCATIONS, POPULAR_CATEGORIES } from "../lib/constants";
import JobCard from "../components/JobCard";

export default function Home() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ active_jobs: 0, companies: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/jobs", { params: { limit: 6 } })
      .then((r) => setJobs(r.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get("/meta").then((r) => setStats(r.data.stats)).catch(() => {});
  }, []);

  const search = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (location) params.set("location", location);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <div className="page-fade">
      {/* Hero */}
      <section className="relative bg-slate-900" data-testid="hero-section">
        <img
          src="https://images.pexels.com/photos/32327756/pexels-photo-32327756.jpeg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-slate-900/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight font-extrabold text-white max-w-3xl leading-tight">
            Temukan Pekerjaan Impianmu di <span className="text-sky-400">Cirebon</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Cari lowongan kerja terbaru dari berbagai perusahaan dan UMKM di Cirebon dan sekitarnya.
          </p>

          <form onSubmit={search} className="mt-8 bg-white rounded-2xl p-2.5 shadow-lg flex flex-col md:flex-row gap-2 max-w-3xl" data-testid="hero-search-form">
            <div className="flex items-center gap-2 flex-1 px-3 h-12 rounded-lg bg-slate-50 border border-slate-200">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari posisi, perusahaan, atau kata kunci"
                className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
                data-testid="hero-search-input"
              />
            </div>
            <div className="flex items-center gap-2 px-3 h-12 rounded-lg bg-slate-50 border border-slate-200 md:w-56">
              <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-slate-800"
                data-testid="hero-location-select"
              >
                <option value="">Semua Lokasi</option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-12 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors"
              data-testid="hero-search-btn"
            >
              Cari Lowongan
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2" data-testid="popular-categories">
            {POPULAR_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => navigate(`/jobs?q=${encodeURIComponent(cat)}`)}
                className="rounded-full px-4 py-2 bg-white/10 border border-white/20 text-slate-100 text-sm font-medium hover:bg-white/20 transition-colors backdrop-blur"
                data-testid={`category-chip-${cat.toLowerCase().replace(/[\s/]+/g, "-")}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap gap-x-10 gap-y-3" data-testid="stats-strip">
          <div className="flex items-center gap-2.5">
            <Briefcase className="h-5 w-5 text-sky-600" />
            <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">{stats.active_jobs}</span> Lowongan Aktif</p>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <p className="text-sm text-slate-600"><span className="font-bold text-slate-900">{stats.companies}</span> Perusahaan Terverifikasi</p>
          </div>
        </div>
      </section>

      {/* Latest jobs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14" data-testid="latest-jobs-section">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Lowongan Terbaru</h2>
            <p className="text-sm text-slate-500 mt-1">Lowongan yang baru saja dipasang oleh perusahaan</p>
          </div>
          <Link to="/jobs" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-800" data-testid="view-all-jobs-link">
            Lihat Semua <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500" data-testid="no-jobs-message">
            Belum ada lowongan tersedia.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
        <div className="mt-8 text-center sm:hidden">
          <Link to="/jobs" className="inline-flex items-center h-11 px-6 rounded-lg bg-slate-900 text-white text-sm font-semibold" data-testid="view-all-jobs-mobile-btn">
            Lihat Semua Lowongan
          </Link>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-white border-y border-slate-200" data-testid="why-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">Kenapa CirebonKarir.com?</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Newspaper, title: "Lowongan Terbaru", desc: "Temukan berbagai lowongan terbaru dari perusahaan dan UMKM." },
              { icon: MousePointerClick, title: "Mudah Digunakan", desc: "Cari dan lamar pekerjaan dengan proses sederhana." },
              { icon: ShieldCheck, title: "Perusahaan Terverifikasi", desc: "Lowongan melewati proses moderasi sebelum ditampilkan." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center hover:shadow-md transition-shadow" data-testid={`feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700 mb-4">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="font-display font-semibold text-lg text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-testid="cta-section">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-slate-200 px-6 py-10 sm:p-12 text-center shadow-sm">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Sedang Mencari Kerja?</h2>
            <p className="mt-3 text-slate-500 max-w-sm mx-auto">Ratusan lowongan dari perusahaan terverifikasi menunggumu. Gratis, tanpa syarat.</p>
            <Link
              to="/jobs"
              className="inline-flex items-center h-12 px-8 mt-7 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors"
              data-testid="cta-find-job-btn"
            >
              Cari Lowongan Sekarang
            </Link>
          </div>
          <div className="rounded-2xl bg-slate-900 px-6 py-10 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky-600/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
            <h2 className="relative font-display text-2xl sm:text-3xl font-bold text-white">Sedang Mencari Karyawan?</h2>
            <p className="relative mt-3 text-slate-300 max-w-sm mx-auto">Pasang lowongan dan temukan kandidat terbaik.</p>
            <Link
              to="/register-company"
              className="relative inline-flex items-center h-12 px-8 mt-7 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-colors"
              data-testid="cta-post-job-btn"
            >
              Pasang Lowongan Gratis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
