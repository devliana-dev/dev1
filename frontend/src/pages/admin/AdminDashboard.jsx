import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users, Building2, Briefcase, Send, Crown, Wallet, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, Search, Zap, Activity, UserCheck, HeartPulse, Download, BadgeCheck,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_MENU } from "./menu";
import { formatRupiah } from "../../lib/format";

function GrowthChip({ label, value }) {
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
      flat ? "bg-white/10 text-slate-300" : up ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"
    }`} data-testid={`growth-${label.toLowerCase().replace(/\s/g, "-")}`}>
      {!flat && (up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />)}
      {label} {flat ? "0%" : `${up ? "+" : ""}${value}%`}
    </span>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const timer = useRef(null);

  const onChange = (e) => {
    const val = e.target.value;
    setQ(val);
    clearTimeout(timer.current);
    if (val.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      api.get("/admin/search", { params: { q: val.trim() } })
        .then((r) => { setResults(r.data); setOpen(true); })
        .catch(() => {});
    }, 350);
  };

  const go = (path) => {
    setOpen(false);
    setQ("");
    navigate(path);
  };

  const groups = results ? [
    { label: "Pelamar", items: results.users.map((u) => ({ text: `${u.name} — ${u.email}`, path: "/admin/candidates" })) },
    { label: "Perusahaan", items: results.companies.map((c) => ({ text: `${c.name} — ${c.email}`, path: "/admin/companies" })) },
    { label: "Lowongan", items: results.jobs.map((j) => ({ text: j.title, path: `/admin/jobs/${j.id}/edit` })) },
    { label: "Lamaran", items: results.applications.map((a) => ({ text: `${a.name} → ${a.job_title}`, path: "/admin/applications" })) },
  ].filter((g) => g.items.length > 0) : [];

  return (
    <div className="relative" data-testid="global-search">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        value={q}
        onChange={onChange}
        onFocus={() => results && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Cari user, perusahaan, lowongan, lamaran..."
        className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        data-testid="global-search-input"
      />
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-80 overflow-y-auto" data-testid="global-search-results">
          {groups.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">Tidak ada hasil untuk &quot;{q}&quot;</p>
          ) : (
            groups.map((g) => (
              <div key={g.label}>
                <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.label}</p>
                {g.items.map((item, i) => (
                  <button key={i} onClick={() => go(item.path)} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" data-testid={`search-result-${g.label}-${i}`}>
                    {item.text}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [growth, setGrowth] = useState(null);

  useEffect(() => {
    api.get("/admin/overview").then((r) => setData(r.data)).catch(() => {});
    api.get("/admin/analytics/growth", { params: { days: 7 } }).then((r) => {
      const merged = r.data.series.users.map((u, i) => ({
        date: u.date.slice(5),
        Pelamar: u.count,
        Lowongan: r.data.series.jobs[i].count,
        Lamaran: r.data.series.applications[i].count,
      }));
      setGrowth(merged);
    }).catch(() => {});
  }, []);

  const kpi = data?.kpi;
  const cards = [
    { label: "Pelamar", value: kpi?.candidates, icon: Users, cls: "bg-sky-100 text-sky-700", link: "/admin/candidates", testId: "kpi-candidates" },
    { label: "Perusahaan", value: kpi?.companies, icon: Building2, cls: "bg-violet-100 text-violet-700", link: "/admin/companies", testId: "kpi-companies" },
    { label: "Lowongan Aktif", value: kpi?.jobs_active, icon: Briefcase, cls: "bg-emerald-100 text-emerald-700", link: "/admin/jobs", testId: "kpi-jobs-active" },
    { label: "Total Lamaran", value: kpi?.applications, icon: Send, cls: "bg-blue-100 text-blue-700", link: "/admin/applications", testId: "kpi-applications" },
    { label: "User Aktif (30 hari)", value: kpi?.users_active, icon: Activity, cls: "bg-cyan-100 text-cyan-700", link: "/admin/candidates", testId: "kpi-users-active" },
    { label: "Perusahaan Aktif", value: kpi?.companies_active, icon: BadgeCheck, cls: "bg-teal-100 text-teal-700", link: "/admin/companies", testId: "kpi-companies-active" },
    { label: "Career Pro", value: kpi?.career_pro, icon: Crown, cls: "bg-amber-100 text-amber-700", link: "/admin/career-pro", testId: "kpi-career-pro" },
    { label: "Company Member", value: kpi?.members, icon: UserCheck, cls: "bg-emerald-100 text-emerald-700", link: "/admin/monetisasi", testId: "kpi-members" },
    { label: "Revenue", value: kpi ? formatRupiah(kpi.revenue) : "-", icon: Wallet, cls: "bg-slate-900 text-white", link: "/admin/monetisasi", testId: "kpi-revenue" },
  ];

  const quickActions = [
    { label: "Review Lowongan", to: "/admin/jobs", testId: "qa-review-jobs" },
    { label: "Verifikasi Perusahaan", to: "/admin/companies", testId: "qa-verify-companies" },
    { label: "Verifikasi Pembayaran", to: "/admin/monetisasi", testId: "qa-payments" },
    { label: "Launch Program", to: "/admin/launch-program", testId: "qa-launch" },
    { label: "Career Pro", to: "/admin/career-pro", testId: "qa-career-pro" },
  ];

  const alerts = (data?.alerts || []).filter((a) => a.count > 0);

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Command Center">
      <div data-testid="admin-overview-page" className="space-y-5">
        <GlobalSearch />

        {data && (
          <div className="rounded-xl bg-slate-900 text-white p-5 sm:p-6" data-testid="business-health-card">
            <div className="flex items-center gap-2.5">
              <HeartPulse className="h-5 w-5 text-sky-400" />
              <h2 className="font-display font-bold">CirebonKarir Business Health</h2>
            </div>
            <p className="mt-2 text-sm text-slate-300" data-testid="health-summary">
              Status platform: <span className="font-semibold text-white">{data.health}</span>
              <span className="text-slate-400"> — perubahan 30 hari terakhir vs 30 hari sebelumnya</span>
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <GrowthChip label="User" value={data.growth.users} />
              <GrowthChip label="Perusahaan" value={data.growth.companies} />
              <GrowthChip label="Lowongan" value={data.growth.jobs} />
              <GrowthChip label="Lamaran" value={data.growth.applications} />
            </div>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="alert-center">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-2 mb-2.5">
              <AlertTriangle className="h-4 w-4" /> Perlu Perhatian
            </p>
            <div className="space-y-1.5">
              {alerts.map((a) => (
                <Link key={a.key} to={a.link} className="flex items-center gap-2 text-sm text-amber-800 hover:text-amber-900 hover:underline" data-testid={`alert-${a.key}`}>
                  <span className="inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-amber-600 text-white text-[11px] font-bold">{a.count}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {cards.map((c) => (
            <Link key={c.label} to={c.link} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-sky-300 hover:shadow-sm transition-all" data-testid={c.testId}>
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.cls}`}>
                <c.icon className="h-4.5 w-4.5 h-5 w-5" />
              </span>
              <p className="mt-2.5 font-display text-xl font-bold text-slate-900 truncate">{c.value ?? "-"}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{c.label}</p>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2" data-testid="quick-actions">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1 self-center">
            <Zap className="h-3.5 w-3.5" /> Quick Action:
          </span>
          {quickActions.map((a) => (
            <Link key={a.label} to={a.to} className="h-9 px-3.5 inline-flex items-center rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid={a.testId}>
              {a.label}
            </Link>
          ))}
          <a href={`${process.env.REACT_APP_BACKEND_URL}/api/admin/export/users`} className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid="qa-export-users">
            <Download className="h-3.5 w-3.5" /> Export Users CSV
          </a>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="growth-mini-chart">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-900">Aktivitas 7 Hari Terakhir</h3>
            <Link to="/admin/analytics" className="text-xs font-semibold text-sky-700 hover:underline" data-testid="view-analytics-link">
              Lihat Analytics Lengkap
            </Link>
          </div>
          {!growth ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /></div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Pelamar" stroke="#0284c7" fill="#e0f2fe" strokeWidth={2} />
                  <Area type="monotone" dataKey="Lowongan" stroke="#7c3aed" fill="#ede9fe" strokeWidth={2} />
                  <Area type="monotone" dataKey="Lamaran" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400">Login sebagai {user?.email} ({user?.role})</p>
      </div>
    </DashboardLayout>
  );
}
