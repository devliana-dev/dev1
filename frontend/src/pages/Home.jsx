import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, MapPin, Newspaper, MousePointerClick, ShieldCheck, ArrowRight, Briefcase,
  ClipboardList, Calculator, Handshake, Warehouse, Megaphone, Car, Coffee, Store,
  Settings, Laptop, Code2, Headset, Wallet, LayoutGrid,
} from "lucide-react";
import api from "../lib/api";
import { LOCATIONS } from "../lib/constants";
import JobListItem from "../components/JobListItem";

const KATEGORI_CARDS = [
  { label: "Administrasi", icon: ClipboardList, to: "/jobs?category=Admin" },
  { label: "Kasir", icon: Calculator, to: "/jobs?q=Kasir" },
  { label: "Sales", icon: Handshake, to: "/jobs?category=Sales" },
  { label: "Staff Gudang", icon: Warehouse, to: "/jobs?category=Gudang" },
  { label: "Marketing", icon: Megaphone, to: "/jobs?category=Marketing" },
  { label: "Driver", icon: Car, to: "/jobs?category=Driver" },
  { label: "Barista", icon: Coffee, to: "/jobs?q=Barista" },
  { label: "Restoran / UMKM", icon: Store, to: "/jobs?category=F%26B" },
  { label: "Operator", icon: Settings, to: "/jobs?q=Operator" },
  { label: "Freelance", icon: Laptop, to: "/jobs?job_type=Freelance" },
  { label: "IT / Software", icon: Code2, to: "/jobs?category=IT" },
  { label: "Customer Service", icon: Headset, to: "/jobs?q=Customer%20Service" },
  { label: "Keuangan", icon: Wallet, to: "/jobs?category=Finance" },
  { label: "Lainnya", icon: LayoutGrid, to: "/jobs?category=Lainnya" },
];

const AREA_LOKER = [
  { label: "Cirebon", to: "/jobs?location=Kota%20Cirebon" },
  { label: "Majalengka", to: "/jobs?location=Majalengka" },
  { label: "Kuningan", to: "/jobs?location=Kuningan" },
  { label: "Indramayu", to: "/jobs?location=Indramayu" },
  { label: "Brebes", to: "/jobs?location=Brebes" },
];

export default function Home() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ active_jobs: 0, companies: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/jobs", { params: { limit: 8 } })
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
      <section className="relative bg-slate-900 overflow-hidden" data-testid="hero-section">
        {/* Ilustrasi kota Cirebon */}
        <img
          src="https://static.prod-images.emergentagent.com/jobs/e16bb991-4078-4c7d-8bc9-0b3048e379f2/images/061515a567cbc559e71f085ec39b55e5e0a9fb1c91c3514a4473561bdd452f3b.jpeg"
          alt="Ilustrasi Kota Cirebon"
          className="absolute inset-x-0 bottom-0 w-full h-full object-cover object-bottom opacity-70"
          style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 45%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 45%)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/30 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-semibold tracking-wide backdrop-blur" data-testid="hero-badge">
            Portal Lowongan Kerja #1 di Cirebon
          </span>
          <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight font-extrabold text-white max-w-3xl leading-tight">
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

        </div>
      </section>

      {/* Kategori Pekerjaan + Area Loker */}
      <section className="bg-slate-900" data-testid="kategori-area-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">Kategori Pekerjaan</h2>
          <p className="text-sm text-slate-400 mt-1">Temukan pekerjaan sesuai dengan minat dan keahlian Anda</p>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5" data-testid="kategori-grid">
            {KATEGORI_CARDS.map((k) => (
              <Link
                key={k.label}
                to={k.to}
                className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-6 cursor-pointer hover:bg-slate-800 hover:border-sky-500/60 transition-[background-color,border-color] duration-200"
                data-testid={`kategori-${k.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <k.icon className="h-8 w-8 text-sky-400 group-hover:text-sky-300 transition-colors" />
                <span className="text-sm font-semibold text-slate-100 text-center leading-tight">{k.label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-14 pt-12 border-t border-slate-800" data-testid="area-loker-section">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">Area Loker</h2>
            <p className="text-sm text-slate-400 mt-1">Temukan lowongan kerja berdasarkan lokasi pilihan Anda</p>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" data-testid="area-loker-grid">
              {AREA_LOKER.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="group rounded-xl border border-slate-700/80 bg-slate-800/60 p-6 cursor-pointer hover:bg-slate-800 hover:border-sky-500/60 transition-[background-color,border-color] duration-200"
                  data-testid={`area-${a.label.toLowerCase()}`}
                >
                  <MapPin className="h-7 w-7 text-sky-400 group-hover:text-sky-300 transition-colors" />
                  <h3 className="mt-3 font-display font-bold text-white text-lg">{a.label}</h3>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-400">
                    Lihat Lowongan <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-slate-700/80 bg-slate-800/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <p className="text-sm text-slate-300 flex items-start gap-2.5">
                <MapPin className="h-5 w-5 text-sky-400 shrink-0" />
                <span>
                  <span className="font-semibold text-white">Belum menemukan lokasi yang Anda cari?</span>
                  <br />
                  <span className="text-slate-400">Gunakan fitur pencarian untuk menemukan lowongan di lokasi lainnya.</span>
                </span>
              </p>
              <Link
                to="/jobs"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors shrink-0"
                data-testid="lihat-semua-lokasi-btn"
              >
                Lihat Semua Lokasi <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
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
          <Link to="/jobs" className="hidden sm:inline-flex items-center gap-1.5 h-11 px-5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors" data-testid="view-all-jobs-link">
            Lihat Semua Lowongan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-10 text-center text-slate-500" data-testid="no-jobs-message">
            Belum ada lowongan.
          </div>
        ) : (
          <div className="space-y-4" data-testid="latest-jobs-list">
            {jobs.map((job) => (
              <JobListItem key={job.id} job={job} />
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
