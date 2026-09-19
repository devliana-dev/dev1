import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  LayoutDashboard, Search, Send, Bookmark, Users, User, Settings, HelpCircle,
  BellRing, FileText, Zap, BarChart3, Crown, Gift,
  FilePlus2, Briefcase, UserCheck, CalendarCheck, UserSearch, Star,
  Building2, UserCog, Megaphone, MailPlus, Sparkles, ListOrdered, Database,
  Bell, LogOut, Menu, X, ShieldCheck,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

/* ============================================================
   SATU Dashboard Shell untuk semua halaman role (sidebar navy
   + header tetap, hanya konten tengah yang berganti).
   ============================================================ */

const CANDIDATE_MENU = [
  { to: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/jobs", label: "Cari Lowongan", icon: Search },
  { to: "/candidate/applications", label: "Lamaran Saya", icon: Send },
  { to: "/candidate/saved", label: "Lowongan Tersimpan", icon: Bookmark },
  { to: "#komunitas", label: "Komunitas", icon: Users, soon: true },
  { to: "/candidate/profile", label: "Profil Karier", icon: User },
  { to: "/candidate/settings", label: "Pengaturan Akun", icon: Settings },
  { to: "/candidate/help", label: "Bantuan & Kontak", icon: HelpCircle },
  { header: "Career Pro" },
  { to: "/candidate/job-alerts", label: "Job Alert", icon: BellRing, pro: true },
  { to: "/candidate/cv-professional", label: "CV Profesional", icon: FileText, pro: true },
  { to: "/jobs", label: "Lamar Cepat", icon: Zap, pro: true },
  { to: "/candidate/applications", label: "Statistik Lamaran", icon: BarChart3, pro: true },
  { to: "/candidate/cv-professional/upgrade", label: "Badge Career Pro", icon: Crown, pro: true },
  { to: "/candidate/referral", label: "Referral & Komisi", icon: Gift, pro: true },
];

const COMPANY_MENU = [
  { to: "/company/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/company/jobs/new", label: "Posting Lowongan", icon: FilePlus2 },
  { to: "/company/jobs", label: "Lowongan Saya", icon: Briefcase },
  { to: "/company/applicants", label: "Pelamar", icon: Users },
  { to: "/company/applicants", label: "Screening Kandidat", icon: UserCheck },
  { to: "/company/interviews", label: "Interview", icon: CalendarCheck },
  { to: "/company/shortlists", label: "Kandidat Tersimpan", icon: Star },
  { to: "/company/profile", label: "Profil Perusahaan", icon: Building2 },
  { to: "/company/team", label: "Tim & Akses", icon: UserCog, pro: true },
  { to: "#pengaturan", label: "Pengaturan", icon: Settings, soon: true },
  { to: "#bantuan", label: "Bantuan & Kontak", icon: HelpCircle, soon: true },
  { header: "Fitur Premium" },
  { to: "/company/candidates", label: "Cari Kandidat", icon: UserSearch, pro: true },
  { to: "/company/candidates", label: "Invite Candidate", icon: MailPlus, pro: true },
  { to: "#ai-matching", label: "AI Candidate Matching", icon: Sparkles, pro: true, soon: true },
  { to: "#ranking", label: "Candidate Ranking", icon: ListOrdered, pro: true, soon: true },
  { to: "#talent-pool", label: "Talent Pool", icon: Database, pro: true, soon: true },
  { to: "#boost", label: "Boost Lowongan", icon: Megaphone, pro: true, soon: true },
  { to: "/company/stats", label: "Recruitment Analytics", icon: BarChart3, pro: true },
];

const CONFIG = {
  candidate: {
    menu: CANDIDATE_MENU,
    notifPath: "/candidate/notifications",
    proLabel: "Career Pro",
    freeLabel: "Paket FREE",
    proCheck: "/cv-professional/status",
    upgradePath: "/candidate/cv-professional/upgrade",
    upgradeToast: "Fitur ini khusus Career Pro. Upgrade untuk mengaksesnya.",
    planDataTestid: "plan-badge",
    avatarFooter: "bg-blue-500/30 border-white/20",
    avatarTop: "bg-gradient-to-br from-blue-500 to-blue-700",
    testPrefix: "candidate",
  },
  company: {
    menu: COMPANY_MENU,
    notifPath: "/company/notifications",
    proLabel: "Premium Perusahaan",
    freeLabel: "Paket FREE",
    proCheck: "/company/entitlement",
    upgradePath: "/company/membership",
    upgradeToast: "Fitur ini khusus Premium Perusahaan. Upgrade untuk mengaksesnya.",
    planDataTestid: "plan-badge",
    avatarFooter: "bg-green-500/30 border-white/20",
    avatarTop: "bg-gradient-to-br from-green-500 to-emerald-700",
    testPrefix: "company",
  },
};

function PlanBadge({ pro, config }) {
  return pro ? (
    <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 text-[#0B1F4B] text-[11.5px] font-extrabold shadow-md shadow-amber-400/30" data-testid={config.planDataTestid}>
      <Crown className="h-3.5 w-3.5" /> {config.proLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-slate-200 text-slate-700 text-[11.5px] font-extrabold" data-testid={config.planDataTestid}>
      <ShieldCheck className="h-3.5 w-3.5" /> FREE
    </span>
  );
}

export default function DashboardShell({ variant = "candidate", title, subtitle, children }) {
  const config = CONFIG[variant] || CONFIG.candidate;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [pro, setPro] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get(config.proCheck)
      .then((r) => { if (alive) setPro(variant === "candidate" ? !!r.data?.has_access : !!r.data?.is_member); })
      .catch(() => {});
    return () => { alive = false; };
  }, [config.proCheck, variant]);

  const activeIdx = config.menu.findIndex((m) => {
    if (!m.to || m.to.startsWith("#")) return false;
    if (m.exact) return pathname === m.to;
    return pathname === m.to || pathname.startsWith(m.to + "/");
  });

  const handleMenu = (item) => {
    if (item.pro && !pro) {
      toast.info(config.upgradeToast);
      navigate(config.upgradePath);
      setOpen(false);
      return;
    }
    if (item.soon) {
      toast.info(`${item.label} segera hadir. Nantikan update berikutnya!`);
      setOpen(false);
      return;
    }
    setOpen(false);
    if (item.to.startsWith("#")) return;
    navigate(item.to);
  };

  const navItems = config.menu.map((m, idx) => {
    if (m.header) {
      return (
        <p key={`header-${m.header}`} className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/70">
          {m.header}
        </p>
      );
    }
    const active = idx === activeIdx;
    const locked = m.pro && !pro;
    return (
      <button
        key={`${m.label}-${idx}`}
        onClick={() => handleMenu(m)}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
          active
            ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
            : locked
              ? "text-blue-100/60 hover:bg-white/5 hover:text-blue-50"
              : "text-blue-100/85 hover:bg-white/10 hover:text-white"
        }`}
        data-testid={`${config.testPrefix}-menu-${m.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      >
        <m.icon className={`h-4 w-4 shrink-0 ${locked ? "text-blue-200/50" : ""}`} />
        <span className="flex-1 text-left">{m.label}</span>
        {m.pro && <Crown className={`h-3.5 w-3.5 shrink-0 ${locked ? "text-yellow-400/70" : "text-yellow-400"}`} />}
      </button>
    );
  });

  const sidebar = (
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
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto" data-testid={`${config.testPrefix}-dash-menu`}>
        {navItems}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border font-display font-bold text-sm ${config.avatarFooter}`}>
            {(user?.name || "U").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold truncate">{user?.name}</p>
            <p className="text-[10px] text-blue-200/80">{pro ? config.proLabel : config.freeLabel}</p>
          </div>
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            className="p-2 rounded-lg text-blue-200/80 hover:text-white hover:bg-white/10"
            aria-label="Keluar"
            data-testid={`${config.testPrefix}-dash-logout`}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FD]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30" data-testid={`${config.testPrefix}-sidebar-desktop`}>
        {sidebar}
      </aside>
      {/* Drawer mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" data-testid={`${config.testPrefix}-sidebar-mobile`}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 max-w-[80%]">
            {sidebar}
            <button onClick={() => setOpen(false)} className="absolute top-4 -right-11 h-9 w-9 rounded-lg bg-white text-slate-700 shadow-lg flex items-center justify-center" aria-label="Tutup menu">
              <X className="h-4 w-4" />
            </button>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Header tetap */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/70" data-testid={`${config.testPrefix}-topbar`}>
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button onClick={() => setOpen(true)} className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#0B1F4B]" aria-label="Menu" data-testid={`${config.testPrefix}-dash-hamburger`}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-extrabold text-[16px] text-[#0B1F4B] leading-tight">{title}</h1>
              <p className="text-[10.5px] text-slate-400 leading-tight">{subtitle}</p>
            </div>
            <PlanBadge pro={pro} config={config} />
            <Link to={config.notifPath} className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Notifikasi">
              <Bell className="h-4 w-4" />
            </Link>
            <span className={`hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-white font-display font-bold text-sm ${config.avatarTop}`}>
              {(user?.name || "U").charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        {/* Konten tengah — satu-satunya area yang berubah antar halaman */}
        <main className="p-4 sm:p-6" data-testid={`${config.testPrefix}-dash-content`}>
          {children}
        </main>
      </div>
    </div>
  );
}
