import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, MapPin, Newspaper, MousePointerClick, ShieldCheck, ArrowRight, Briefcase,
  ClipboardList, Calculator, Megaphone, Car, Coffee, Settings, Code2, LayoutGrid,
  Flame, BadgeCheck, Zap, TrendingUp, Package, User,
} from "lucide-react";
import api from "../lib/api";
import { LOCATIONS } from "../lib/constants";
import JobListItem from "../components/JobListItem";
import BlogCard from "../components/BlogCard";
import FaqSection from "../components/FaqSection";

const KATEGORI_CARDS = [
  { label: "Admin", icon: User, to: "/jobs?category=Admin" },
  { label: "Kasir", icon: Calculator, to: "/jobs?q=Kasir" },
  { label: "Sales", icon: TrendingUp, to: "/jobs?category=Sales" },
  { label: "Marketing", icon: Megaphone, to: "/jobs?category=Marketing" },
  { label: "Staff Gudang", icon: Package, to: "/jobs?category=Gudang" },
  { label: "Driver", icon: Car, to: "/jobs?category=Driver" },
  { label: "Barista", icon: Coffee, to: "/jobs?q=Barista" },
  { label: "Operator", icon: Settings, to: "/jobs?q=Operator" },
  { label: "IT / Komputer", icon: Code2, to: "/jobs?category=IT" },
  { label: "Lainnya", icon: LayoutGrid, to: "/jobs?category=Lainnya" },
];

const HERO_CHIPS = ["Admin", "Kasir", "Sales", "Marketing", "Driver", "Barista", "Gudang", "Operator", "Freelance"];

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
      <section className="relative overflow-hidden bg-sky-50" data-testid="hero-section">
        {/* Ilustrasi kota Cirebon */}
        <img
          src="https://static.prod-images.emergentagent.com/jobs/e16bb991-4078-4c7d-8bc9-0b3048e379f2/images/23b45a427faf79d00a76c65b5d693786d77e1bd010063aa4bd2f00597b17d9d2.jpeg"
          alt="Ilustrasi Kota Cirebon"
          className="absolute inset-0 w-full h-full object-cover object-right"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(240,249,255,0.98) 0%, rgba(240,249,255,0.94) 30%, rgba(240,249,255,0.6) 50%, rgba(240,249,255,0.05) 72%)" }}
        />
        <div className="absolute inset-0 bg-sky-50/70 sm:hidden" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-28 sm:pt-20 sm:pb-36">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight font-extrabold text-slate-900 max-w-2xl leading-tight">
            Temukan Pekerjaan Impianmu di <span className="text-sky-600">Cirebon</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
            Cari lowongan kerja terbaru dari berbagai perusahaan dan UMKM di Cirebon dan sekitarnya.
          </p>

          <form onSubmit={search} className="mt-8 bg-white rounded-full p-2 shadow-xl border border-slate-100 flex flex-col md:flex-row gap-2 max-w-3xl" data-testid="hero-search-form">
            <div className="flex items-center gap-2 flex-1 px-4 h-12">
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
            <div className="flex items-center gap-2 px-4 h-12 md:w-56 md:border-l border-slate-200">
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
              className="h-12 px-7 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors inline-flex items-center justify-center gap-2"
              data-testid="hero-search-btn"
            >
              <Search className="h-4 w-4 md:hidden" /> Cari Lowongan
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-2" data-testid="popular-categories">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 mr-1">
              <Flame className="h-4 w-4 text-orange-500" /> Populer:
            </span>
            {HERO_CHIPS.map((cat) => (
              <button
                key={cat}
                onClick={() => navigate(`/jobs?q=${encodeURIComponent(cat)}`)}
                className="rounded-full px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium shadow-sm hover:border-sky-400 hover:text-sky-700 transition-colors"
                data-testid={`category-chip-${cat.toLowerCase().replace(/[\s/]+/g, "-")}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-10" data-testid="feature-bar">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 px-6 py-7 sm:px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {[
            { icon: Briefcase, title: "Lowongan Terbaru", desc: "Ribuan lowongan kerja terbaru setiap harinya" },
            { icon: BadgeCheck, title: "Perusahaan Terpercaya", desc: "Perusahaan terverifikasi untuk keamanan pencari kerja" },
            { icon: Zap, title: "Mudah & Cepat", desc: "Proses melamar kerja yang mudah dan cepat" },
            { icon: MapPin, title: "Lokal Cirebon", desc: "Lowongan kerja dari Cirebon dan sekitarnya" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4" data-testid={`feature-bar-${f.title.toLowerCase().replace(/[\s&]+/g, "-")}`}>
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display font-bold text-slate-900 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kategori Populer + Area Loker */}
      <section className="pt-14 sm:pt-16" data-testid="kategori-area-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Kategori Populer</h2>
              <p className="text-sm text-slate-500 mt-1">Temukan pekerjaan sesuai dengan minat dan keahlian Anda</p>
            </div>
            <Link to="/jobs" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-800" data-testid="lihat-semua-kategori-link">
              Lihat Semua Kategori <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5" data-testid="kategori-grid">
            {KATEGORI_CARDS.map((k) => (
              <Link
                key={k.label}
                to={k.to}
                className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-6 cursor-pointer shadow-sm hover:shadow-md hover:border-sky-300 transition-[box-shadow,border-color] duration-200"
                data-testid={`kategori-${k.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <k.icon className="h-8 w-8 text-sky-600 group-hover:text-sky-500 transition-colors" />
                <span className="text-sm font-semibold text-slate-700 text-center leading-tight">{k.label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-14" data-testid="area-loker-section">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Area Loker</h2>
            <p className="text-sm text-slate-500 mt-1">Temukan lowongan kerja berdasarkan lokasi pilihan Anda</p>
            <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" data-testid="area-loker-grid">
              {AREA_LOKER.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="group rounded-xl border border-slate-200 bg-white p-6 cursor-pointer shadow-sm hover:shadow-md hover:border-sky-300 transition-[box-shadow,border-color] duration-200"
                  data-testid={`area-${a.label.toLowerCase()}`}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 font-display font-bold text-slate-900 text-lg">{a.label}</h3>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700">
                    Lihat Lowongan <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <p className="text-sm text-slate-600 flex items-start gap-2.5">
                <MapPin className="h-5 w-5 text-sky-600 shrink-0" />
                <span>
                  <span className="font-semibold text-slate-900">Belum menemukan lokasi yang Anda cari?</span>
                  <br />
                  <span className="text-slate-500">Gunakan fitur pencarian untuk menemukan lowongan di lokasi lainnya.</span>
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
      {/* Blog */}
      <BlogSection />
      {/* FAQ */}
      <FaqSection />
    </div>
  );
}

function BlogSection() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get("/blog", { params: { limit: 4 } }).then((r) => setPosts(r.data)).catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="bg-white border-t border-slate-200" data-testid="blog-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Blog</h2>
          <p className="text-sm text-slate-500 mt-1">Tips dan informasi seputar dunia kerja</p>
        </div>
        <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="blog-section-grid">
          {posts.map((p) => (
            <BlogCard key={p.id} post={p} />
          ))}
        </div>
        <div className="mt-9 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 h-11 px-6 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            data-testid="view-all-blog-btn"
          >
            Lihat Semua Artikel <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
