import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard, FilePlus2, Briefcase, Users, UserCheck, CalendarCheck,
  UserSearch, Star, Building2, UserCog, Settings, HelpCircle, Crown, Bell,
  LogOut, Menu, X, Check, ArrowRight, ShieldCheck, Megaphone, Clock,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { timeAgo, formatDate, logoUrl } from "../../lib/format";

/* ---------- data statis ---------- */
const MENU = [
  { to: "/company/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/company/jobs/new", label: "Posting Lowongan", icon: FilePlus2 },
  { to: "/company/jobs", label: "Lowongan Saya", icon: Briefcase },
  { to: "/company/applicants", label: "Pelamar", icon: Users },
  { to: "/company/applicants", label: "Screening Kandidat", icon: UserCheck },
  { to: "/company/interviews", label: "Interview", icon: CalendarCheck },
  { to: "/company/candidates", label: "Cari Kandidat", icon: UserSearch, premium: true },
  { to: "/company/shortlists", label: "Kandidat Tersimpan", icon: Star },
  { to: "/company/profile", label: "Profil Perusahaan", icon: Building2 },
  { to: "/company/team", label: "Tim & Akses", icon: UserCog, adminOnly: true },
  { to: "#pengaturan", label: "Pengaturan", icon: Settings, soon: true },
  { to: "#bantuan", label: "Bantuan & Kontak", icon: HelpCircle, soon: true },
];

const PREMIUM_FEATURES = [
  "Cari Kandidat",
  "Invite Candidate",
  "AI Candidate Matching",
  "Candidate Ranking",
  "Talent Pool",
  "Boost Lowongan",
  "Advanced Screening",
  "Recruitment Analytics",
];

const STATUS_STYLE = {
  terkirim: "bg-slate-100 text-slate-600",
  dilihat: "bg-blue-50 text-blue-700",
  diproses: "bg-blue-50 text-blue-700",
  shortlist: "bg-violet-50 text-violet-700",
  interview: "bg-amber-50 text-amber-700",
  diterima: "bg-emerald-50 text-emerald-700",
  ditolak: "bg-red-50 text-red-600",
  aktif: "bg-emerald-50 text-emerald-700",
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  expired: "bg-slate-100 text-slate-500",
  rejected: "bg-red-50 text-red-600",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold capitalize ${STATUS_STYLE[status] || "bg-slate-100 text-slate-600"}`}>
      {status || "-"}
    </span>
  );
}

function PlanBadge({ premium }) {
  return premium ? (
    <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 text-[#0B1F4B] text-[11.5px] font-extrabold shadow-md shadow-amber-400/30">
      <Crown className="h-3.5 w-3.5" /> Premium
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-slate-200 text-slate-700 text-[11.5px] font-extrabold">
      <ShieldCheck className="h-3.5 w-3.5" /> FREE
    </span>
  );
}

function Sidebar({ onNavigate, premium, testPrefix = "" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleClick = (item) => {
    if (item.soon) {
      toast.info(`${item.label} segera hadir. Nantikan update berikutnya!`);
      return;
    }
    if (item.adminOnly && !premium) {
      toast.info("Tim & Akses tersedia setelah upgrade Premium Perusahaan.");
      return;
    }
    if (item.premium && !premium) {
      toast.info("Cari Kandidat adalah fitur Premium Perusahaan. Upgrade untuk mengaksesnya.");
      return;
    }
    onNavigate();
    navigate(item.to);
  };
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#0A1F4B] to-[#12307A] text-white">
      <div className="px-5 pt-6 pb-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 font-display text-lg font-extrabold text-white">C</span>
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-extrabold">CirebonKarir<span className="text-blue-300">.id</span></span>
            <span className="block text-[9px] text-blue-200/80">Hubungkan Talenta dengan Peluang</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto" data-testid="company-dash-menu">
        {MENU.map((m) => (
          <button
            key={m.label}
            onClick={() => handleClick(m)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
              m.end ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" : "text-blue-100/85 hover:bg-white/10 hover:text-white"
            }`}
            data-testid={`${testPrefix}menu-${m.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          >
            <m.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{m.label}</span>
            {m.premium && !premium && <Crown className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-500/30 border border-white/20 font-display font-bold text-sm">
            {(user?.name || "P").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold truncate">{user?.name}</p>
            <p className="text-[10px] text-blue-200/80">{premium ? "Premium Perusahaan" : "Paket FREE"}</p>
          </div>
          <button onClick={() => { logout(); navigate("/"); }} className="p-2 rounded-lg text-blue-200/80 hover:text-white hover:bg-white/10" aria-label="Keluar" data-testid="company-dash-logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PromoPremium({ premium, ent }) {
  if (premium) {
    return (
      <div className="rounded-2xl bg-gradient-to-b from-[#0A1F4B] to-[#12307A] p-5 text-white shadow-sm border border-slate-200/60" data-testid="premium-active-card">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-[#0B1F4B] shadow-md">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display font-extrabold text-[15px]">Premium Aktif</p>
            <p className="text-[10.5px] text-blue-200/80">{ent?.plan?.subscription_end_date ? `Berlaku s.d. ${formatDate(ent.plan.subscription_end_date)}` : "Aktif selama Masa Launching"}</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[12px] font-medium text-blue-100">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 shrink-0"><Check className="h-2.5 w-2.5 text-[#0B1F4B]" strokeWidth="3.5" /></span>
              {f}
            </li>
          ))}
        </ul>
        <Link to="/company/membership" className="mt-4 inline-flex w-full items-center justify-center gap-1.5 h-10 rounded-lg border border-white/25 text-[12px] font-bold text-white hover:bg-white/10 transition-colors" data-testid="premium-manage">
          Kelola Membership <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#0A1F4B] to-[#12307A] p-5 text-white shadow-sm border border-slate-200/60" data-testid="premium-promo-card">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-[#0B1F4B] shadow-md">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display font-extrabold text-[15px]">Upgrade Premium</p>
          <p className="text-[10.5px] text-blue-200/80">Rekrutmen lebih cepat &amp; cerdas</p>
        </div>
      </div>
      <p className="mt-3.5 text-[11.5px] text-blue-100/85 leading-relaxed">Buka seluruh fitur rekrutmen premium CirebonKarir.id:</p>
      <ul className="mt-3 space-y-2">
        {PREMIUM_FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-2 text-[12px] font-medium text-blue-100">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 shrink-0"><Check className="h-2.5 w-2.5 text-[#0B1F4B]" strokeWidth="3.5" /></span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        to="/company/membership"
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 h-11 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-[#0B1F4B] text-[13px] font-extrabold shadow-lg shadow-amber-500/25 hover:brightness-105 transition"
        data-testid="upgrade-premium-btn"
      >
        Upgrade Premium <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-2.5 text-[10px] text-blue-200/70 text-center">Cocok untuk tim rekrutmen yang tumbuh cepat</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 flex items-center gap-3" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-xl font-extrabold text-[#0B1F4B] leading-none">{value}</p>
        <p className="mt-1 text-[11px] text-slate-500 font-medium leading-none">{label}</p>
      </div>
    </div>
  );
}

export default function CompanyDashboardNew() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [ent, setEnt] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/company/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/company/entitlement").then((r) => setEnt(r.data)).catch(() => {});
    api.get("/company/jobs").then((r) => setJobs(r.data || [])).catch(() => {});
    api.get("/company/applications").then((r) => setApps(r.data || [])).catch(() => {});
  }, []);

  const premium = !!ent?.is_member;
  const companyName = stats?.company_name || user?.name || "Perusahaan";
  const freePostsLeft = ent?.quota ? `${ent.quota.remaining}/${ent.quota.limit}` : "-";

  return (
    <div className="min-h-screen bg-[#F4F7FD]">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30" data-testid="company-sidebar-desktop">
        <Sidebar premium={premium} onNavigate={() => {}} />
      </aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" data-testid="company-sidebar-mobile">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 max-w-[80%]">
            <Sidebar premium={premium} testPrefix="drawer-" onNavigate={() => setOpen(false)} />
            <button onClick={() => setOpen(false)} className="absolute top-4 -right-11 h-9 w-9 rounded-lg bg-white text-slate-700 shadow-lg flex items-center justify-center" aria-label="Tutup menu">
              <X className="h-4 w-4" />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/70">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button onClick={() => setOpen(true)} className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#0B1F4B]" aria-label="Menu" data-testid="company-dash-hamburger">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-extrabold text-[16px] text-[#0B1F4B] leading-tight">Dashboard Perusahaan</h1>
              <p className="text-[10.5px] text-slate-400 leading-tight">Kelola rekrutmen tim Anda</p>
            </div>
            <PlanBadge premium={premium} />
            <Link to="/company/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Notifikasi">
              <Bell className="h-4 w-4" />
            </Link>
            <span className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-700 text-white font-display font-bold text-sm">
              {companyName.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start max-w-[1400px] mx-auto">
            <div className="space-y-5 min-w-0">
              {/* Sambutan */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A1F4B] via-[#12307A] to-[#1A43B8] p-5 sm:p-6 text-white shadow-sm" data-testid="greeting-card">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-green-400/15 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold" data-testid="greeting-name">Halo, {companyName}!</h2>
                    {premium ? (
                      <p className="mt-1.5 text-[12.5px] text-blue-100/85">
                        {ent?.plan?.subscription_end_date ? <>Premium Perusahaan aktif s.d. <b className="text-yellow-400">{formatDate(ent.plan.subscription_end_date)}</b> — seluruh fitur rekrutmen premium terbuka.</> : <>Premium Perusahaan aktif selama <b className="text-yellow-400">Masa Launching</b> — seluruh fitur rekrutmen premium terbuka.</>}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[12.5px] text-blue-100/85">
                        Paket <b className="text-white">FREE</b> — posting lowongan dasar, kelola pelamar &amp; ATS dasar. Sisa posting gratis bulan ini: <b className="text-yellow-400">{freePostsLeft}</b>.
                      </p>
                    )}
                  </div>
                  <Link to="/company/jobs/new" className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-green-500 text-white text-[12.5px] font-bold shadow-md shadow-green-900/30 hover:bg-green-600 transition-colors" data-testid="post-job-btn">
                    <FilePlus2 className="h-4 w-4" /> Posting Lowongan
                  </Link>
                </div>
              </div>

              {!premium && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="premium-hint">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
                    <Megaphone className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0B1F4B]">Buka fitur rekrutmen premium</p>
                    <p className="text-[11.5px] text-slate-600">Cari Kandidat, AI Candidate Matching, Talent Pool, Recruitment Analytics, dan lainnya.</p>
                  </div>
                  <Link to="/company/membership" className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-amber-400 text-[#0B1F4B] text-[12px] font-extrabold hover:brightness-105 transition" data-testid="premium-hint-btn">
                    <Crown className="h-3.5 w-3.5" /> Upgrade
                  </Link>
                </div>
              )}

              {/* Statistik */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4" data-testid="company-stats">
                <StatCard label="Lowongan Aktif" value={stats?.active_jobs ?? 0} icon={Briefcase} tone="bg-blue-100 text-blue-600" />
                <StatCard label="Total Pelamar" value={stats?.total_applicants ?? 0} icon={Users} tone="bg-violet-100 text-violet-600" />
                <StatCard label="Pelamar Baru" value={stats?.new_applicants ?? 0} icon={Clock} tone="bg-amber-100 text-amber-600" />
                <StatCard label="Interview" value={stats?.interview ?? 0} icon={CalendarCheck} tone="bg-emerald-100 text-emerald-600" />
              </div>

              {/* Lowongan & Pelamar */}
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 min-w-0" data-testid="recent-jobs">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="font-display font-bold text-[15px] text-slate-900">Lowongan Saya</h3>
                    <Link to="/company/jobs" className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600 hover:text-blue-800">
                      Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  {jobs.length === 0 ? (
                    <p className="py-8 text-center text-[12.5px] text-slate-400">Belum ada lowongan. Klik tombol Posting Lowongan untuk memulai.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {jobs.slice(0, 5).map((j) => (
                        <Link key={j.id} to="/company/jobs" className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors" data-testid={`recent-job-${j.id}`}>
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                            <Briefcase className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-bold text-slate-900 truncate">{j.title}</p>
                            <p className="text-[10.5px] text-slate-500">{j.applicants ?? 0} pelamar • {timeAgo(j.created_at)}</p>
                          </div>
                          <StatusBadge status={j.status} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 min-w-0" data-testid="recent-applicants">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="font-display font-bold text-[15px] text-slate-900">Pelamar Terbaru</h3>
                    <Link to="/company/applicants" className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600 hover:text-blue-800">
                      Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  {apps.length === 0 ? (
                    <p className="py-8 text-center text-[12.5px] text-slate-400">Belum ada pelamar masuk.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {apps.slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors" data-testid={`recent-applicant-${a.id}`}>
                          <img src={logoUrl(a.career_profile?.photo_path || "", a.name)} alt={a.name} className="h-9 w-9 rounded-full border border-slate-200 object-cover shrink-0" loading="lazy" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-bold text-slate-900 truncate">{a.name}</p>
                            <p className="text-[10.5px] text-slate-500 truncate">{a.job_title} • {timeAgo(a.created_at)}</p>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar kanan: 1 card promosi Premium */}
            <aside className="lg:sticky lg:top-[88px] space-y-5" data-testid="company-right-rail">
              <PromoPremium premium={premium} ent={ent} />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
