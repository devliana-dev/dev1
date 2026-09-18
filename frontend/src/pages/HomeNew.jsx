import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Search, MapPin, Briefcase, BadgeCheck, Bookmark, ArrowRight, ArrowUpRight,
  Flame, Crown, Building2, Users, GraduationCap, Clock, ShieldCheck, Gift, Zap,
  Star, ChevronLeft, ChevronRight, Menu, X, LayoutDashboard, LogOut, Instagram,
  Linkedin, Youtube, Music2, Megaphone, Newspaper, Store, CheckCircle2, Check, Send, Monitor,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, isNewJob, logoUrl } from "../lib/format";

/* ============================== DATA ============================== */

const HERO_IMG =
  "https://images.pexels.com/photos/34238962/pexels-photo-34238962.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const NAV_LINKS = [
  { to: "/jobs", label: "Cari Kerja" },
  { to: "/company/candidates", label: "Cari Kandidat" },
  { to: "/companies", label: "Perusahaan" },
  { to: "/blog", label: "Tips Karir" },
  { to: "#event", label: "Event", soon: true },
  { to: "#komunitas", label: "Komunitas", soon: true },
];

const WILAYAH = [
  { name: "Cirebon", to: "/jobs?location=Kota%20Cirebon", img: "https://images.pexels.com/photos/36999223/pexels-photo-36999223.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" },
  { name: "Indramayu", to: "/jobs?location=Indramayu", img: "https://images.unsplash.com/photo-1581405784351-6f26c4720c5c?crop=entropy&cs=srgb&fm=jpg&q=85&w=940" },
  { name: "Kuningan", to: "/jobs?location=Kuningan", img: "https://images.unsplash.com/photo-1592364395653-83e648b20cc2?crop=entropy&cs=srgb&fm=jpg&q=85&w=940" },
  { name: "Majalengka", to: "/jobs?location=Majalengka", img: "https://images.unsplash.com/photo-1635924201021-e8ae80c2bdc0?crop=entropy&cs=srgb&fm=jpg&q=85&w=940" },
];

const KATEGORI_CHIPS = [
  { label: "Semua Kategori", to: "/jobs", active: true },
  { label: "Admin & Staff", to: "/jobs?category=Admin" },
  { label: "Marketing", to: "/jobs?category=Marketing" },
  { label: "Sales", to: "/jobs?category=Sales" },
  { label: "Customer Service", to: "/jobs?q=Customer%20Service" },
  { label: "IT & Digital", to: "/jobs?category=IT" },
  { label: "Design", to: "/jobs?q=Design" },
  { label: "Finance", to: "/jobs?category=Finance" },
  { label: "Pendidikan", to: "/jobs?q=Pendidikan" },
  { label: "Kesehatan", to: "/jobs?q=Kesehatan" },
  { label: "Hotel & Industri", to: "/jobs?q=Hotel" },
];

const CAREER_PRO_ITEMS = [
  "Job Alert Lowongan Terbaru",
  "CV Profesional (Premium)",
  "Lamar Cepat dan Prioritas",
  "Statistik Lamaran",
  "Badge Career Pro",
];

const COMPANY_PANEL_ITEMS = [
  "Cari Kandidat",
  "Invite Candidate",
  "AI Candidate Matching",
  "Screening Kandidat",
  "Boost Lowongan",
];

const TRUST_CHIPS = [
  { icon: Users, label: "Ribuan Lowongan", sub: "Setiap Hari" },
  { icon: ShieldCheck, label: "Perusahaan", sub: "Terverifikasi" },
  { icon: Gift, label: "Gratis untuk", sub: "Pencari Kerja" },
  { icon: Zap, label: "Mudah Cepat", sub: "dan Terpercaya" },
];

const DEMO_URGENT = [
  { id: "demo-urgent-1", title: "Staff Admin", company: "Alfamart", location: "Cirebon", job_type: "Full Time", time: "2 jam lalu", logo: "/brands/alfamart.png" },
  { id: "demo-urgent-2", title: "Teknisi Motor", company: "Honda Astra", location: "Cirebon", job_type: "Full Time", time: "10 jam lalu", logo: "/brands/ahm.png" },
];

const DEMO_CANDIDATES = [
  { name: "Andi Pratama", edu: "SMA/SMK lulusan", loc: "Cirebon", skills: "Admin, Data Entry", photo: "https://images.unsplash.com/photo-1589386417686-0d34b5903d23?w=200&h=200&fit=crop&q=80&auto=format" },
  { name: "Siti Aisyah", edu: "SMA/SMK lulusan", loc: "Indramayu", skills: "Sales, Customer Service", photo: "https://images.unsplash.com/photo-1581065178047-8ee15951ede6?w=200&h=200&fit=crop&q=80&auto=format" },
  { name: "Rizky Maulana", edu: "D3", loc: "Kuningan", skills: "Digital Marketing, Design", photo: "https://images.unsplash.com/photo-1579420593648-0deba81fd762?w=200&h=200&fit=crop&q=80&auto=format" },
  { name: "Hesti Hidayati", edu: "SMA/SMK lulusan", loc: "Majalengka", skills: "Customer Service, Admin", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80&auto=format" },
];

const FALLBACK_TIPS = [
  "Cara Membuat CV yang Menarik untuk HRD",
  "Tips Lolos Interview Kerja",
  "Kesalahan yang Harus Dihindari saat Melamar Kerja",
];

const hoursAgoIso = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const DEMO_JOBS = [
  { id: "demo-job-1", title: "Staff Admin", company_name: "Alfamart", company_logo: "/brands/alfamart.png", category: "Admin", location: "Cirebon", job_type: "Full Time", education: "SMA/SMK", experience: "1 - 2 Tahun", created_at: hoursAgoIso(2), skills: ["Administrasi", "Microsoft Office", "Data Entry"], demo: true },
  { id: "demo-job-2", title: "Sales Executive", company_name: "PT Kawan Lama Sejahtera", company_logo: "/brands/kai.png", category: "Sales", location: "Cirebon", job_type: "Full Time", education: "SMA/SMK", experience: "1 - 3 Tahun", created_at: hoursAgoIso(5), skills: ["Sales", "Komunikasi", "Target Oriented"], demo: true },
  { id: "demo-job-3", title: "Crew Outlet", company_name: "J.CO Donuts & Coffee", company_logo: "/logos/cw-outlet.svg", category: "F&B", location: "Cirebon", job_type: "Part Time", education: "SMA/SMK", experience: "Tanpa Pengalaman", created_at: hoursAgoIso(8), skills: ["Pelayanan", "Food & Beverage", "Kerja Tim"], demo: true },
  { id: "demo-job-4", title: "Staff Gudang", company_name: "Gramedia", company_logo: "/logos/granmedia.svg", category: "Gudang", location: "Cirebon", job_type: "Full Time", education: "SMA/SMK", experience: "1 - 2 Tahun", created_at: hoursAgoIso(24), skills: ["Logistik", "Inventory", "Administrasi"], demo: true },
  { id: "demo-job-5", title: "Kasir", company_name: "Hypermart", company_logo: "/brands/hypermart.png", category: "Retail", location: "Cirebon", job_type: "Full Time", education: "SMA/SMK", experience: "Tanpa Pengalaman", created_at: hoursAgoIso(26), skills: ["Kasir", "Pelayanan", "Retail"], demo: true },
  { id: "demo-job-6", title: "Teknisi Motor", company_name: "AHASS Cirebon", company_logo: "/brands/ahm.png", category: "Teknisi", location: "Cirebon", job_type: "Full Time", education: "SMK", experience: "1 - 3 Tahun", created_at: hoursAgoIso(28), skills: ["Teknik", "Service Motor", "Mekanik"], demo: true },
  { id: "demo-job-7", title: "Beauty Advisor", company_name: "Watsons Indonesia", company_logo: "/brands/watsons.png", category: "Sales", location: "Cirebon", job_type: "Full Time", education: "SMA/SMK", experience: "Tanpa Pengalaman", created_at: hoursAgoIso(48), skills: ["Beauty Care", "Pelayanan", "Komunikasi"], demo: true },
  { id: "demo-job-8", title: "Staff Penjualan", company_name: "Mitra10", company_logo: "/logos/mitratek.svg", category: "Sales", location: "Cirebon", job_type: "Full Time", education: "SMA/SMK", experience: "1 - 2 Tahun", created_at: hoursAgoIso(52), skills: ["Penjualan", "Customer Service", "Retail"], demo: true },
  { id: "demo-job-9", title: "Crew Restaurant", company_name: "KFC Cirebon", company_logo: "/brands/kfc.png", category: "F&B", location: "Cirebon", job_type: "Part Time", education: "SMA/SMK", experience: "Tanpa Pengalaman", created_at: hoursAgoIso(72), skills: ["Pelayanan", "Food & Beverage", "Kerja Tim"], demo: true },
  { id: "demo-job-10", title: "Pramuniaga", company_name: "PT Indomarco Prismatama", company_logo: "/brands/indomaret.png", category: "Retail", location: "Cirebon", job_type: "Full Time", education: "SMA/SMK", experience: "Tanpa Pengalaman", created_at: hoursAgoIso(74), skills: ["Retail", "Pelayanan", "Kasir"], demo: true },
];

const DEMO_UMKM = [
  { id: "demo-umkm-1", title: "Kasir Toko", company_name: "Toko Sembako Barokah", location: "Kota Cirebon", job_type: "Full Time", created_at: hoursAgoIso(3), demo: true },
  { id: "demo-umkm-2", title: "Barista", company_name: "Kedai Kopi Kita", location: "Kota Cirebon", job_type: "Part Time", created_at: hoursAgoIso(4), demo: true },
  { id: "demo-umkm-3", title: "Karyawan Dapur", company_name: "Bakso Cirebon Pak Untung", location: "Kota Cirebon", job_type: "Full Time", created_at: hoursAgoIso(7), demo: true },
  { id: "demo-umkm-4", title: "Karyawan Laundry", company_name: "Laundry Express Cirebon", location: "Kota Cirebon", job_type: "Full Time", created_at: hoursAgoIso(9), demo: true },
  { id: "demo-umkm-5", title: "Kurir Antar Jemput", company_name: "Laundry Express Cirebon", location: "Kota Cirebon", job_type: "Part Time", created_at: hoursAgoIso(11), demo: true },
];

const TRUSTED_BRANDS = [
  { name: "Telkom Indonesia", category: "Telekomunikasi", logo: "/brands/telkom.png" },
  { name: "BCA", category: "Perbankan", logo: "/brands/bca.png" },
  { name: "Alfamart", category: "Retail", logo: "/brands/alfamart.png" },
  { name: "Indofood", category: "Makanan & Minuman", logo: "/brands/indofood.png" },
  { name: "Danamon", category: "Perbankan", logo: "/brands/danamon.png" },
  { name: "Wardah", category: "Kecantikan & Personal Care", logo: "wardah" },
  { name: "Paragon", category: "Manufaktur", logo: "paragon" },
  { name: "Pertamina", category: "Energi", logo: "/brands/pertamina.png" },
  { name: "KAI", category: "Transportasi", logo: "/brands/kai.png" },
  { name: "Indomaret", category: "Retail", logo: "/brands/indomaret.png" },
];

const TOP_KARIR = [
  "Contoh CV yang Menarik HRD",
  "Tips Lolos Interview Kerja",
  "Skill yang Paling Dicarai Perusahaan",
];

const STATS = [
  { value: 15892, display: (n) => `${n.toLocaleString("id-ID")}+`, label: "Kandidat Aktif", icon: Users, iconBg: "bg-blue-500" },
  { value: 2548, display: (n) => `${n.toLocaleString("id-ID")}+`, label: "Lowongan Aktif", icon: Briefcase, iconBg: "bg-emerald-500" },
  { value: 1248, display: (n) => `${n.toLocaleString("id-ID")}+`, label: "Perusahaan Terverifikasi", icon: Building2, iconBg: "bg-violet-500" },
  { value: 10, display: (n) => `${n}K+`, label: "Pengguna Terpercaya", icon: TrendingIcon, iconBg: "bg-amber-400" },
];

function TrendingIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 7l-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" />
    </svg>
  );
}

function jobTags(job) {
  if (Array.isArray(job.skills) && job.skills.length > 0) return job.skills.slice(0, 3);
  const tags = [job.category, job.business_category, job.work_hours].filter(Boolean);
  return [...new Set(tags)].slice(0, 3);
}

/* ============================== HEADER ============================== */

function Logo({ dark = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0" data-testid="home-logo">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 font-display text-xl font-extrabold text-white shadow-md shadow-blue-900/20">
        C
      </span>
      <span className="leading-tight">
        <span className={`block font-display text-lg font-extrabold ${dark ? "text-white" : "text-[#0B1F4B]"}`}>
          CirebonKarir<span className="text-blue-600">.id</span>
        </span>
        <span className={`block text-[10px] font-medium ${dark ? "text-blue-200/80" : "text-slate-500"}`}>
          Hubungkan Talenta dengan Peluang
        </span>
      </span>
    </Link>
  );
}

function HomeHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dashboardPath =
    user?.role === "admin" ? "/admin" : user?.role === "company" ? "/company/dashboard" : "/candidate/dashboard";

  const handleClick = (l) => {
    setOpen(false);
    if (l.soon) toast.info(`${l.label} segera hadir. Nantikan update berikutnya!`);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm" data-testid="home-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[72px]">
          <Logo />
          <nav className="hidden xl:flex items-center gap-1" data-testid="home-nav">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.soon ? "#" : l.to}
                onClick={(e) => { if (l.soon) { e.preventDefault(); handleClick(l); } }}
                className="px-3 py-2 rounded-lg text-[13.5px] font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                data-testid={`home-nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden xl:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  data-testid="home-header-dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button
                  onClick={() => { logout(); navigate("/"); }}
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  data-testid="home-header-logout"
                >
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="h-10 px-4 inline-flex items-center rounded-full text-sm font-semibold text-[#0B1F4B] hover:bg-slate-100 transition-colors" data-testid="home-header-login">
                  Masuk
                </Link>
                <Link to="/register" className="h-10 px-5 inline-flex items-center gap-1.5 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-600/25 hover:bg-blue-700 transition-colors" data-testid="home-header-register">
                  Daftar Gratis <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
          <button
            className="xl:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-[#0B1F4B]"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            data-testid="home-header-hamburger"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="xl:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1" data-testid="home-header-mobile">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.soon ? "#" : l.to}
              onClick={(e) => { if (l.soon) { e.preventDefault(); handleClick(l); } else { setOpen(false); } }}
              className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-blue-50"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 grid grid-cols-2 gap-2">
            {user ? (
              <>
                <Link to={dashboardPath} onClick={() => setOpen(false)} className="inline-flex items-center justify-center gap-1.5 h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <button onClick={() => { setOpen(false); logout(); navigate("/"); }} className="inline-flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-semibold text-red-600 border border-red-200">
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="inline-flex items-center justify-center h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
                  Masuk
                </Link>
                <Link to="/register" onClick={() => setOpen(false)} className="inline-flex items-center justify-center h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold">
                  Daftar Gratis
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* ============================== HERO ============================== */

const PEOPLE_IMG = "https://images.unsplash.com/photo-1573496130141-209d200cebd8?w=900&q=85&auto=format&fit=crop";

const QUICK_LINKS = [
  { title: "Loker Terbaru", sub: "Lowongan Terkini di Sekitarmu", icon: Briefcase, iconBg: "bg-blue-600 shadow-blue-600/30", to: "/jobs" },
  { title: "Perusahaan Terpercaya", sub: "Bergabung dengan Perusahaan Berkualitas", icon: Building2, iconBg: "bg-blue-500 shadow-blue-500/30", to: "/companies" },
  { title: "Kerja Remote", sub: "Kerja Fleksibel, Lebih Bebas", icon: Monitor, iconBg: "bg-purple-600 shadow-purple-600/30", to: "/jobs?q=Remote" },
  { title: "Fresh Graduate", sub: "Peluang untuk Langkah Pertama", icon: Users, iconBg: "bg-violet-500 shadow-violet-500/30", to: "/jobs?q=Fresh%20Graduate" },
  { title: "Lamar Cepat", sub: "Proses Lamaran Lebih Mudah", icon: Send, iconBg: "bg-yellow-400 shadow-yellow-400/30", to: "/candidate/cv-professional" },
];

function GratisRibbon() {
  return (
    <Link to="/candidate/cv-professional" className="relative inline-flex flex-col items-center transition-transform hover:scale-[1.03]" data-testid="gratis-ribbon">
      <span className="absolute -left-4 -top-3 text-yellow-300 text-lg rotate-[-15deg]" aria-hidden="true">&#10022;</span>
      <span className="absolute -right-5 top-2 text-yellow-300 text-base rotate-[20deg]" aria-hidden="true">&#10022;</span>
      <div className="relative flex items-center gap-2.5 bg-gradient-to-b from-yellow-300 to-amber-400 rounded-xl pl-3 pr-5 py-2 shadow-xl shadow-blue-900/25 rotate-1">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B1F4B] text-yellow-400">
          <Gift className="h-5 w-5" />
        </span>
        <span className="font-display font-extrabold text-[15px] leading-[1.15] text-[#0B1F4B] text-left">
          CV PROFESIONAL<br />GRATIS!
        </span>
      </div>
      <div className="relative -mt-1 bg-[#0B1F4B] text-white text-[11px] font-bold px-4 py-1.5 rounded-lg -rotate-1 shadow-md">
        Selama Masa Launching
      </div>
    </Link>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const search = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (location) params.set("location", location);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(100deg, #081A3D 0%, #0E2A6E 38%, #1A43B8 68%, #2453E8 100%)" }}
      data-testid="home-hero"
    >
      <div className="absolute top-[-120px] left-[22%] h-80 w-[480px] rounded-full bg-blue-500/30 blur-3xl" />
      <div className="absolute bottom-[-160px] right-[10%] h-96 w-[560px] rounded-full bg-[#2E6BF5]/40 blur-3xl" />
      <div className="absolute top-1/3 left-[58%] h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-14 left-[3%] h-5 w-5 rounded-full bg-blue-400/60" />
      <div className="absolute top-[42%] -right-8 h-36 w-36 rounded-full bg-blue-500/30" />
      <svg className="absolute inset-x-0 bottom-0 h-36 w-full opacity-[0.07]" viewBox="0 0 1440 120" preserveAspectRatio="none" fill="#ffffff" aria-hidden="true">
        <path d="M0 60c240-50 480-50 720 0s480 50 720 0v60H0z" />
      </svg>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 lg:pt-10 lg:pb-9">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Kolom kiri */}
          <div className="lg:col-span-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-full bg-[#0A1F4B] text-white text-[10.5px] font-bold tracking-wide uppercase">
                <MapPin className="h-3 w-3" /> Cirebon &amp; Sekitarnya
              </span>
              <span className="text-[11.5px] text-white/80 font-medium">
                Cirebon <span className="text-white/40 mx-0.5">|</span> Indramayu <span className="text-white/40 mx-0.5">|</span> Kuningan <span className="text-white/40 mx-0.5">|</span> Majalengka
              </span>
            </div>

            <h1 className="mt-4 font-display text-3xl sm:text-4xl lg:text-[44px] font-extrabold leading-[1.14] tracking-tight text-white" data-testid="hero-headline">
              Cari Kerja atau
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#FFD34D] via-[#FFC93C] to-[#F5B301]">Cari Karyawan?</span>
            </h1>
            <p className="mt-3 text-[13.5px] sm:text-sm text-white/85 max-w-md leading-relaxed">
              Temukan peluang terbaik, talenta berkualitas, dan bangun masa depan yang lebih baik di Cirebon dan sekitarnya.
            </p>

            <form onSubmit={search} className="mt-5" data-testid="hero-search-form">
              <div className="bg-white rounded-xl p-1.5 shadow-2xl shadow-blue-900/30 flex flex-col md:flex-row md:items-center gap-1.5">
                <div className="flex items-center gap-2 flex-1 px-2.5 h-10">
                  <Search className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Cari posisi, nama perusahaan, atau kata kunci..."
                    className="w-full bg-transparent outline-none text-[13px] text-slate-800 placeholder:text-slate-400"
                    data-testid="hero-search-input"
                  />
                </div>
                <div className="flex items-center gap-2 px-2.5 h-10 md:h-9 md:border-l border-slate-200">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full md:w-40 bg-transparent outline-none text-[13px] text-slate-700"
                    data-testid="hero-location-select"
                  >
                    <option value="">Cirebon &amp; Sekitarnya</option>
                    {["Kota Cirebon", "Kabupaten Cirebon", "Indramayu", "Kuningan", "Majalengka"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="h-10 md:h-9 px-5 rounded-lg bg-blue-600 text-white text-[13px] font-bold shadow-md shadow-blue-900/25 hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-1.5"
                  data-testid="hero-search-btn"
                >
                  Cari Sekarang <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-y-2.5" data-testid="hero-trust-chips">
              {TRUST_CHIPS.map((c, i) => (
                <div key={c.label} className="flex items-center gap-2">
                  {i > 0 && <span className="hidden sm:block h-8 w-px bg-white/20 mx-3" />}
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3B7BFF] text-white shadow-md shadow-blue-900/20">
                    <c.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10.5px] leading-tight text-white/80 font-medium">
                    {c.label}
                    <span className="block font-bold text-white">{c.sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Kolom kanan: panel */}
          <div className="lg:col-span-6 relative">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Career Pro */}
              <div className="rounded-2xl bg-white p-4 shadow-2xl shadow-blue-900/25" data-testid="hero-panel-career-pro">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400 text-white shadow-md shadow-yellow-500/30">
                    <Crown className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display font-extrabold text-[14.5px] text-[#0B1F4B] leading-tight">Career Pro</p>
                    <p className="text-[10.5px] text-slate-500 leading-tight mt-0.5">Fitur Lengkap untuk Pengembangan Karier</p>
                  </div>
                </div>
                <ul className="mt-3.5 space-y-2">
                  {CAREER_PRO_ITEMS.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[11.5px] font-medium text-slate-700 whitespace-nowrap">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 shrink-0">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth="3.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/candidate/cv-professional"
                  className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 h-10 rounded-lg bg-yellow-400 text-[#0B1F4B] text-[12.5px] font-bold shadow-md shadow-yellow-500/30 hover:brightness-105 transition"
                  data-testid="hero-career-pro-btn"
                >
                  Lihat Career Pro <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Untuk Perusahaan */}
              <div className="rounded-2xl bg-white p-4 shadow-2xl shadow-blue-900/25" data-testid="hero-panel-company">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 text-white shadow-md shadow-green-500/30">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display font-extrabold text-[14.5px] text-[#0B1F4B] leading-tight">Untuk Perusahaan</p>
                    <p className="text-[10.5px] text-slate-500 leading-tight mt-0.5">Temukan Kandidat Terbaik Lebih Cepat</p>
                  </div>
                </div>
                <ul className="mt-3.5 space-y-2">
                  {COMPANY_PANEL_ITEMS.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[11.5px] font-medium text-slate-700 whitespace-nowrap">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 shrink-0">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth="3.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register-company"
                  className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 h-10 rounded-lg bg-green-600 text-white text-[12.5px] font-bold shadow-md shadow-green-600/30 hover:bg-green-700 transition-colors"
                  data-testid="hero-company-btn"
                >
                  Mulai Rekrut <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickLinksSection() {
  return (
    <section className="bg-white" data-testid="quick-links-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4" data-testid="hero-quick-links">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.title}
              to={q.to}
              className="group bg-white rounded-xl border border-slate-200 p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              data-testid={`quick-link-${q.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${q.iconBg}`}>
                <q.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center font-display font-bold text-[13px] text-[#0B1F4B] leading-tight">
                  {q.title}
                  <ChevronRight className={`h-4 w-4 ml-1 shrink-0 ${q.chevron} transition-transform group-hover:translate-x-0.5`} />
                </span>
                <span className="block text-[11px] text-slate-500 leading-tight mt-1">{q.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== KATEGORI & WILAYAH ============================== */

function KategoriPills() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10" data-testid="kategori-section">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1" data-testid="kategori-pills">
        {KATEGORI_CHIPS.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className={`shrink-0 h-10 px-5 inline-flex items-center rounded-full text-[13px] font-semibold transition-colors ${
              c.active
                ? "bg-[#0B1F4B] text-white shadow-md shadow-blue-900/20"
                : "bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700"
            }`}
            data-testid={`kategori-chip-${c.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          >
            {c.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function WilayahSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8" data-testid="wilayah-section">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {WILAYAH.map((w) => (
          <Link
            key={w.name}
            to={w.to}
            className="group relative h-36 sm:h-44 rounded-2xl overflow-hidden shadow-md"
            data-testid={`wilayah-card-${w.name.toLowerCase()}`}
          >
            <img src={w.img} alt={w.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061428]/95 via-[#061428]/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-2">
              <div>
                <h3 className="font-display text-white font-extrabold text-base sm:text-lg drop-shadow">{w.name}</h3>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-blue-100">
                  Lihat Lowongan <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 border border-white/30 text-white backdrop-blur-sm group-hover:bg-blue-600 group-hover:border-blue-600 transition-colors">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ============================== STATISTIK ============================== */

function StatNumber({ stat, start }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    const dur = 1500;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      setN(Math.round(stat.value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, stat.value]);
  return <span>{stat.display(n)}</span>;
}

function StatsBar() {
  const ref = useRef(null);
  const [start, setStart] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setStart(true); return; }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setStart(true); obs.disconnect(); } }),
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10" data-testid="stats-section">
      <div ref={ref} className="rounded-2xl bg-gradient-to-r from-[#0A1F4B] via-[#0E2A63] to-[#12307A] px-6 py-6 sm:px-10 shadow-xl shadow-blue-900/15">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-3.5" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} text-white shadow-lg`}>
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-xl sm:text-2xl font-extrabold text-white leading-none">
                  <StatNumber stat={s} start={start} />
                </p>
                <p className="mt-1.5 text-[11.5px] sm:text-xs text-blue-200/80 font-medium leading-none">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== LOWONGAN TERBARU ============================== */

function SaveButton({ job, saved, onToggle }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(job); }}
      className={`inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border text-[12.5px] font-semibold transition-colors ${
        saved ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-700"
      }`}
      data-testid={`save-btn-${job.id}`}
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-blue-600" : ""}`} /> {saved ? "Tersimpan" : "Simpan"}
    </button>
  );
}

function JobCardNew({ job, saved, onToggle }) {
  const tags = jobTags(job);
  const detailTo = job.demo ? "/jobs" : `/jobs/${job.slug}`;
  const eduLabel = job.education && job.education !== "Tidak ada minimal" ? `Minimal ${job.education}` : "";
  const expLabel = !job.experience || ["", "Tidak ada minimal", "Fresh graduate"].includes(job.experience) ? "Tanpa Pengalaman" : job.experience;
  return (
    <div className="group bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 transition-all p-4 sm:p-5" data-testid={`latest-job-card-${job.id}`}>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        <Link to={detailTo} className="shrink-0 self-start" data-testid={`job-logo-${job.id}`}>
          <img
            src={logoUrl(job.company_logo, job.company_name)}
            alt={job.company_name}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border border-slate-200 bg-white object-contain p-2"
            loading="lazy"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={detailTo} className="font-display font-bold text-[16px] text-slate-900 hover:text-blue-700 transition-colors leading-snug" data-testid={`job-title-${job.id}`}>
              {job.title}
            </Link>
            {isNewJob(job.created_at) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10.5px] font-bold" data-testid={`job-badge-baru-${job.id}`}>Baru</span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-600 min-w-0" data-testid={`job-company-${job.id}`}>
            <span className="font-semibold truncate">{job.company_name}</span>
            {job.company_verified && <BadgeCheck className="h-4 w-4 text-emerald-500 shrink-0" />}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-500">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {job.location}</span>
            <span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {job.job_type}</span>
            {eduLabel && (
              <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {eduLabel}</span>
            )}
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {expLabel}</span>
          </div>
          {tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 flex flex-col gap-3 sm:items-end sm:justify-center sm:w-[252px]">
          <span className="text-[11.5px] text-slate-400 sm:text-right whitespace-nowrap" data-testid={`job-posted-${job.id}`}>
            Diposting {timeAgo(job.created_at)}
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <SaveButton job={job} saved={saved} onToggle={onToggle} />
            <Link
              to={detailTo}
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 h-10 px-5 rounded-lg bg-blue-600 text-white text-[12.5px] font-bold shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors"
              data-testid={`apply-btn-${job.id}`}
            >
              <Send className="h-3.5 w-3.5" /> Lamar Sekarang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function UrgentCard({ item }) {
  return (
    <Link to="/jobs" className="block p-3.5 rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition-colors" data-testid={`urgent-card-${item.id}`}>
      <div className="flex items-start gap-3">
        <img src={item.logo} alt={item.company} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1" loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display font-bold text-[13.5px] text-slate-900 truncate">{item.title}</p>
            <span className="inline-flex items-center gap-1 h-5 px-2 shrink-0 rounded-full bg-red-600 text-white text-[10px] font-bold" data-testid={`urgent-badge-${item.id}`}>
              <Flame className="h-3 w-3" /> Urgent
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 truncate mt-0.5">{item.company}</p>
          <p className="mt-1 text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.location}</span>
            <span>•</span><span>{item.job_type}</span>
          </p>
          <p className="mt-0.5 text-[10.5px] text-slate-400">{item.time}</p>
        </div>
      </div>
    </Link>
  );
}

function SidebarCard({ icon: Icon, iconBg, title, linkTo, linkLabel = "Lihat Semua", children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm" data-testid={`sidebar-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="flex items-center gap-2 font-display font-bold text-[15px] text-slate-900">
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${iconBg} text-white`}>
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </h3>
        <Link to={linkTo} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600 hover:text-blue-800 shrink-0" data-testid={`sidebar-link-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
          {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </div>
  );
}

function NumberedItem({ index, title, to }) {
  return (
    <Link to={to || "/blog"} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors" data-testid={`numbered-item-${index}`}>
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0B1F4B] text-white text-[12px] font-bold">{index}</span>
      <span className="text-[12.5px] font-semibold text-slate-700 leading-snug">{title}</span>
    </Link>
  );
}

function MainArea() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [tips, setTips] = useState(FALLBACK_TIPS.map((t) => ({ slug: "", title: t })));
  const [savedIds, setSavedIds] = useState([]);

  const loadJobs = useCallback(() => {
    return api.get("/jobs", { params: { limit: 10 } })
      .then((r) => {
        const items = (r.data && r.data.items) || [];
        if (items.length > 0) {
          setJobs(items);
          setUsingFallback(false);
        } else {
          setJobs(DEMO_JOBS);
          setUsingFallback(true);
        }
      })
      .catch(() => {
        setJobs(DEMO_JOBS);
        setUsingFallback(true);
      });
  }, []);

  useEffect(() => {
    loadJobs();
    api.get("/blog", { params: { limit: 3 } })
      .then((r) => { if (Array.isArray(r.data) && r.data.length > 0) setTips(r.data.slice(0, 3).map((p) => ({ slug: p.slug, title: p.title }))); })
      .catch(() => {});
  }, [loadJobs]);

  // Coba lagi otomatis saat sedang menampilkan data contoh, hingga data asli berhasil dimuat
  useEffect(() => {
    if (!usingFallback) return;
    const iv = setInterval(() => { loadJobs(); }, 4000);
    return () => clearInterval(iv);
  }, [usingFallback, loadJobs]);

  useEffect(() => {
    if (user?.role === "candidate") {
      api.get("/candidate/saved-jobs/ids").then((r) => setSavedIds(r.data)).catch(() => {});
    } else {
      setSavedIds([]);
    }
  }, [user]);

  const toggleSave = (job) => {
    if (job.demo) { toast.info("Ini contoh lowongan. Masuk untuk melihat lowongan asli"); return; }
    if (!user) { toast.info("Masuk dahulu untuk menyimpan lowongan"); navigate("/login"); return; }
    if (user.role !== "candidate") { toast.info("Simpan lowongan hanya untuk akun pencari kerja"); return; }
    const saved = savedIds.includes(job.id);
    setSavedIds(saved ? savedIds.filter((id) => id !== job.id) : [...savedIds, job.id]);
    const req = saved ? api.delete(`/candidate/saved-jobs/${job.id}`) : api.post(`/candidate/saved-jobs/${job.id}`);
    req.then(() => toast.success(saved ? "Lowongan dihapus dari tersimpan" : "Lowongan disimpan"))
      .catch(() => {
        setSavedIds(saved ? [...savedIds, job.id] : savedIds.filter((id) => id !== job.id));
        toast.error("Gagal menyimpan lowongan");
      });
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12" data-testid="main-area-section">
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Kolom kiri */}
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <h2 className="flex items-center gap-2.5 font-display text-xl sm:text-2xl font-extrabold text-slate-900">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
                  <Briefcase className="h-5 w-5" />
                </span>
                Lowongan Terbaru
              </h2>
              <p className="mt-2 text-[13px] text-slate-500 sm:pl-[60px]">Temukan peluang karier terbaru dari perusahaan terpercaya di Cirebon dan sekitarnya.</p>
            </div>
            <Link to="/jobs" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:text-blue-800" data-testid="lihat-semua-lowongan-link">
              Lihat Semua <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {!jobs ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500" data-testid="no-jobs-message">
              Belum ada lowongan. Silakan kembali lagi nanti.
            </div>
          ) : (
            <div className="space-y-4" data-testid="latest-jobs-list">
              {jobs.map((job) => (
                <JobCardNew key={job.id} job={job} saved={savedIds.includes(job.id)} onToggle={toggleSave} />
              ))}
            </div>
          )}

          {usingFallback && jobs && (
            <p className="mt-4 text-center text-[11.5px] text-slate-400" data-testid="jobs-fallback-note">
              Menampilkan contoh lowongan sementara memuat data terbaru...
            </p>
          )}

          <div
            className="mt-6 rounded-xl bg-blue-50 border border-blue-100 px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            data-testid="jobs-help-bar"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display font-bold text-[14px] text-[#0B1F4B]">Masih belum menemukan yang cocok?</p>
                <p className="text-[12px] text-slate-500 mt-0.5">Jelajahi semua lowongan kerja dan temukan peluang terbaik untuk kariermu.</p>
              </div>
            </div>
            <Link
              to="/jobs"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-lg bg-white border border-blue-200 text-blue-600 text-[13px] font-bold hover:bg-blue-600 hover:text-white transition-colors"
              data-testid="lihat-semua-lowongan-btn"
            >
              Lihat Semua Lowongan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Kolom kanan */}
        <aside className="space-y-6" data-testid="home-sidebar">
          <SidebarCard icon={Flame} iconBg="bg-red-600" title="Lowongan Urgent" linkTo="/jobs">
            <div className="space-y-3" data-testid="urgent-list">
              {DEMO_URGENT.map((item) => <UrgentCard key={item.id} item={item} />)}
            </div>
          </SidebarCard>

          <SidebarCard icon={Users} iconBg="bg-blue-600" title="Kandidat yang Sedang Mencari Kerja" linkTo="/company/candidates" linkLabel="Lihat Semua">
            <div className="space-y-3" data-testid="candidate-list">
              {DEMO_CANDIDATES.map((c) => (
                <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors" data-testid={`candidate-card-${c.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <img src={c.photo} alt={c.name} loading="lazy" className="h-11 w-11 shrink-0 rounded-full object-cover border-2 border-white shadow-md" data-testid={`candidate-photo-${c.name.split(" ")[0].toLowerCase()}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-[13px] text-slate-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{c.edu} • {c.loc}</p>
                    <p className="text-[10.5px] text-blue-600 font-medium truncate mt-0.5">{c.skills}</p>
                  </div>
                  <Link
                    to={user ? "/company/candidates" : "/login"}
                    className="shrink-0 inline-flex items-center justify-center h-8 px-3 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors"
                    data-testid={`candidate-profile-btn-${c.name.split(" ")[0].toLowerCase()}`}
                  >
                    Lihat Profil
                  </Link>
                </div>
              ))}
            </div>
          </SidebarCard>

          <SidebarCard icon={Newspaper} iconBg="bg-[#0B1F4B]" title="Tips Karir Hari Ini" linkTo="/blog">
            <div className="space-y-1" data-testid="tips-list">
              {tips.map((t, i) => (
                <NumberedItem key={i} index={i + 1} title={t.title} to={t.slug ? `/blog/${t.slug}` : "/blog"} />
              ))}
            </div>
          </SidebarCard>

          <SidebarCard icon={Star} iconBg="bg-amber-500" title="Top Karir Hari Ini" linkTo="/blog">
            <div className="space-y-1" data-testid="topkarir-list">
              {TOP_KARIR.map((t, i) => (
                <NumberedItem key={i} index={i + 1} title={t} to="/blog" />
              ))}
            </div>
          </SidebarCard>

          {/* Banner iklan vertikal */}
          <div className="relative overflow-hidden rounded-2xl shadow-xl" data-testid="ad-banner">
            <img src="https://images.unsplash.com/photo-1566205780052-9657b0ed76e7?crop=entropy&cs=srgb&fm=jpg&q=85&w=940" alt="Iklan" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(6,20,40,0.88) 0%, rgba(10,31,75,0.94) 100%)" }} />
            <div className="relative p-6 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-[#0B1F4B] shadow-lg">
                <Megaphone className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display text-lg font-extrabold text-white leading-snug">
                Pasang Iklan atau Promosi di <span className="text-amber-300">CirebonKarir.id</span>
              </h3>
              <ul className="mt-4 space-y-2 text-left">
                {["Jangkau ribuan pencari kerja", "Tingkatkan brand perusahaan", "Dapatkan kandidat berkualitas"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-[12px] font-medium text-blue-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-300 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
              <Link
                to="/hubungi-kami"
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 h-11 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0B1F4B] text-[13px] font-bold shadow-lg hover:brightness-105 transition"
                data-testid="ad-banner-cta"
              >
                Hubungi Kami <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Banner iklan kedua */}
          <div className="relative overflow-hidden rounded-2xl shadow-xl" data-testid="ad-banner-2">
            <img src="https://images.unsplash.com/photo-1502285751408-54ef434c8381?crop=entropy&cs=srgb&fm=jpg&q=85&w=940" alt="Iklan UMKM" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(30,15,0,0.72) 0%, rgba(60,30,0,0.88) 100%)" }} />
            <div className="relative p-6 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                <Store className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display text-lg font-extrabold text-white leading-snug">
                Promosikan Usaha &amp; <span className="text-amber-300">UMKM Anda</span> di CirebonKarir.id
              </h3>
              <ul className="mt-4 space-y-2 text-left">
                {["Ribuan pengunjung setiap hari", "Harga terjangkau untuk UMKM", "Tampil di seluruh wilayah Cirebon"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-[12px] font-medium text-blue-100">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-300 shrink-0" /> {t}
                  </li>
                ))}
              </ul>
              <Link
                to="/hubungi-kami"
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 h-11 rounded-xl bg-blue-600 text-white text-[13px] font-bold shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition-colors"
                data-testid="ad-banner-2-cta"
              >
                Pasang Iklan <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ============================== LOWONGAN UMKM ============================== */

function UmkmSection() {
  const [jobs, setJobs] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadUmkm = useCallback(() => {
    return api.get("/jobs", { params: { employer_type: "umkm", limit: 5 } })
      .then((r) => {
        const items = (r.data && r.data.items) || [];
        if (items.length > 0) {
          setJobs(items.slice(0, 5));
          setUsingFallback(false);
        } else {
          setJobs(DEMO_UMKM);
          setUsingFallback(true);
        }
      })
      .catch(() => {
        setJobs(DEMO_UMKM);
        setUsingFallback(true);
      });
  }, []);

  useEffect(() => {
    loadUmkm();
  }, [loadUmkm]);

  useEffect(() => {
    if (!usingFallback) return;
    const iv = setInterval(() => { loadUmkm(); }, 4000);
    return () => clearInterval(iv);
  }, [usingFallback, loadUmkm]);

  if (jobs === null) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14" data-testid="umkm-section">
        <div className="h-40 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14" data-testid="umkm-section">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="flex items-center gap-2.5 font-display text-xl sm:text-2xl font-extrabold text-slate-900">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
              <Store className="h-5 w-5" />
            </span>
            Lowongan UMKM
          </h2>
          <p className="mt-2 text-[13px] text-slate-500 sm:pl-[60px]">Dukung bisnis lokal, temukan peluang karier menarik di UMKM sekitar Cirebon.</p>
        </div>
        <Link to="/jobs?employer_type=umkm" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:text-blue-800" data-testid="umkm-see-all">
          Jelajahi Semua Lowongan UMKM <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" data-testid="umkm-grid">
        {jobs.map((job, i) => (
          <div key={job.id} className="relative bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all p-5 text-center" data-testid={`umkm-card-${job.id}`}>
            {isNewJob(job.created_at) && (
              <span className="absolute top-3 right-3 inline-flex h-5 px-2 items-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold" data-testid={`umkm-badge-baru-${job.id}`}>Baru</span>
            )}
            <img
              src={logoUrl(job.company_logo, job.company_name)}
              alt={job.company_name}
              className="mx-auto h-16 w-16 rounded-2xl border border-slate-200 bg-white object-contain p-1.5 shadow-sm"
              loading="lazy"
              data-testid={`umkm-logo-${job.id}`}
            />
            <Link to={job.demo ? "/jobs?employer_type=umkm" : `/jobs/${job.slug}`} className="mt-3 block" data-testid={`umkm-title-${job.id}`}>
              <h3 className="font-display font-bold text-[13.5px] text-slate-900 leading-snug line-clamp-2 hover:text-blue-700 transition-colors">{job.title}</h3>
            </Link>
            <p className="mt-1 text-[11.5px] text-slate-500 font-medium truncate">{job.company_name}</p>
            <p className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3" /> {job.location} <span>•</span> {job.job_type}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================== PERUSAHAAN TERPERCAYA ============================== */

function WardahLogo() {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="font-display text-[22px] text-[#177E8B]" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>Wardah</span>
      <span className="text-[6.5px] tracking-[0.3em] text-[#177E8B] mt-1.5 font-semibold">BEAUTY MOVES YOU</span>
    </div>
  );
}

function ParagonLogo() {
  return (
    <div className="flex flex-col items-center leading-none">
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 24 22" className="h-5 w-5 shrink-0" fill="#1E3A8A" aria-hidden="true">
          <path d="M1 2h8.5L21 11l-11.5 9H1l9.5-9z" />
        </svg>
        <span className="font-display font-extrabold text-[17px] tracking-tight text-[#1E3A8A]">PARAGON</span>
      </div>
      <span className="text-[6.5px] tracking-[0.22em] text-slate-500 mt-1 font-semibold">TECHNOLOGY AND INNOVATION</span>
    </div>
  );
}

function CompaniesCarousel() {
  const scroller = useRef(null);
  const scroll = (dir) => scroller.current?.scrollBy({ left: dir * 640, behavior: "smooth" });

  return (
    <section className="mt-14 bg-[#EEF3FB] py-14 sm:py-16" data-testid="companies-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4">
          <span className="hidden sm:block h-px w-20 bg-blue-300/80" />
          <p className="text-[12px] font-bold tracking-[0.22em] text-blue-600 uppercase text-center" data-testid="companies-eyebrow">Perusahaan Terverifikasi</p>
          <span className="hidden sm:block h-px w-20 bg-blue-300/80" />
        </div>
        <div className="mt-3 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="text-center lg:text-left">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1F4B]">Bekerja Sama dengan Perusahaan Terpercaya</h2>
            <p className="mt-2 text-[13.5px] text-slate-500">Bergabunglah bersama perusahaan pilihan yang telah membuka peluang karier di Cirebon dan sekitarnya.</p>
          </div>
          <Link to="/companies" className="shrink-0 inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:text-blue-800 lg:pb-1 mx-auto lg:mx-0" data-testid="lihat-semua-perusahaan">
            Lihat Semua Perusahaan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative mt-9">
          <button
            onClick={() => scroll(-1)}
            aria-label="Sebelumnya"
            className="absolute -left-3 lg:-left-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-100 text-blue-600 shadow-lg hover:bg-blue-600 hover:text-white transition-colors hidden sm:inline-flex"
            data-testid="companies-prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div ref={scroller} className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth py-1" data-testid="companies-track">
            {TRUSTED_BRANDS.map((b) => (
              <div
                key={b.name}
                className="shrink-0 w-[158px] sm:w-[168px] bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-4 flex flex-col items-center"
                data-testid={`company-card-${b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <div className="h-16 sm:h-[68px] w-full flex items-center justify-center">
                  {b.logo === "wardah" ? (
                    <WardahLogo />
                  ) : b.logo === "paragon" ? (
                    <ParagonLogo />
                  ) : (
                    <img src={b.logo} alt={b.name} className="max-h-14 sm:max-h-16 max-w-full object-contain" loading="lazy" />
                  )}
                </div>
                <p className="mt-3 min-h-[32px] flex items-center text-[12px] text-slate-500 text-center leading-snug">{b.category}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => scroll(1)}
            aria-label="Berikutnya"
            className="absolute -right-3 lg:-right-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-100 text-blue-600 shadow-lg hover:bg-blue-600 hover:text-white transition-colors hidden sm:inline-flex"
            data-testid="companies-next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================== CTA ============================== */

function CtaSection() {
  return (
    <section
      className="relative overflow-hidden mt-14"
      style={{ background: "linear-gradient(100deg, #061428 0%, #0A1F4B 55%, #12307A 100%)" }}
      data-testid="cta-section"
    >
      <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 opacity-[0.06] font-display font-extrabold text-white text-[220px] leading-none select-none hidden lg:block">C</div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="text-center lg:text-left">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
            Mulai perjalanan<br className="hidden sm:block" /> kariermu sekarang!
          </h2>
          <p className="mt-3 text-blue-100/80 text-sm sm:text-base">Ribuan peluang terbaik menantimu di Cirebon dan sekitarnya.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            to="/jobs"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-white text-[#0B1F4B] text-sm font-bold shadow-lg hover:bg-blue-50 transition-colors"
            data-testid="cta-cari-kerja-btn"
          >
            Cari Kerja
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors"
            data-testid="cta-daftar-btn"
          >
            Daftar Gratis Sekarang <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================== FOOTER ============================== */

function HomeFooter() {
  const year = new Date().getFullYear();
  const cols = [
    { title: "Pencari Kerja", links: [{ label: "Cari Lowongan", to: "/jobs" }, { label: "Tips Karir", to: "/blog" }, { label: "Buat CV", to: "/candidate/cv" }] },
    { title: "Perusahaan", links: [{ label: "Pasang Lowongan", to: "/register-company" }, { label: "Cari Kandidat", to: "/company/candidates" }, { label: "Solusi Rekrutmen", to: "/untuk-perusahaan" }] },
    { title: "Tentang", links: [{ label: "Tentang Kami", to: "/tentang-kami" }, { label: "Karier", to: "/blog" }, { label: "Kontak Kami", to: "/hubungi-kami" }] },
  ];
  const socials = [
    { icon: Instagram, label: "Instagram" },
    { icon: Linkedin, label: "LinkedIn" },
    { icon: Youtube, label: "YouTube" },
    { icon: Music2, label: "TikTok" },
  ];

  return (
    <footer className="bg-[#071228] text-slate-300" data-testid="home-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Logo dark />
            <p className="mt-4 text-[12.5px] leading-relaxed text-slate-400">
              Menghubungkan Talenta, Peluang, dan Masa Depan di Cirebon Raya.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display font-bold text-white text-[14px]">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-[12.5px] text-slate-400 hover:text-white transition-colors" data-testid={`footer-link-${l.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="font-display font-bold text-white text-[14px]">Ikuti Kami</h4>
            <div className="mt-4 flex gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
                  data-testid={`footer-social-${s.label.toLowerCase()}`}
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-slate-500">© {year} CirebonKarir.id - Cari Lokal, Peluang Global</p>
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <Link to="/syarat-ketentuan" className="hover:text-white transition-colors">Syarat &amp; Ketentuan</Link>
            <span className="text-slate-700">|</span>
            <Link to="/kebijakan-privasi" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
            <span className="text-slate-700">|</span>
            <Link to="/hubungi-kami" className="hover:text-white transition-colors">Bantuan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================== PAGE ============================== */

export default function HomeNew() {
  return (
    <div className="bg-white min-h-screen page-fade">
      <HomeHeader />
      <Hero />
      <QuickLinksSection />
      <KategoriPills />
      <WilayahSection />
      <StatsBar />
      <MainArea />
      <UmkmSection />
      <CompaniesCarousel />
      <CtaSection />
      <HomeFooter />
    </div>
  );
}
