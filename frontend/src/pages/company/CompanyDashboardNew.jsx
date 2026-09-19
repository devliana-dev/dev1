import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FilePlus2, Briefcase, Users, CalendarCheck,
  UserCheck, Megaphone, Clock, Check, ArrowRight, ShieldCheck, Crown,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { timeAgo, formatDate, logoUrl } from "../../lib/format";
import DashboardShell from "../../components/DashboardShell";

/* ---------- data statis ---------- */
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
    <DashboardShell variant="company" title="Dashboard Perusahaan" subtitle="Kelola rekrutmen tim Anda">
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
    </DashboardShell>
  );
}
