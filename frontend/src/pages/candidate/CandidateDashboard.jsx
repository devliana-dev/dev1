import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Send, Hourglass, PhoneCall, CheckCircle2, XCircle, ArrowRight, Search, Upload,
  UserCheck, BellRing, Bookmark, MapPin, Wallet, FileText, Lightbulb, ChevronRight, FileUp,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { CANDIDATE_MENU } from "./menu";
import { APPLICATION_STATUS } from "../../lib/constants";
import { timeAgo, formatSalary, formatDate, logoUrl } from "../../lib/format";

const HERO_IMG = "https://static.prod-images.emergentagent.com/jobs/e16bb991-4078-4c7d-8bc9-0b3048e379f2/images/a1993fe9dcb61ca05e94397464622f40c347c5b549c4a4adb8eecba85bbd0645.jpeg";

const CHART_COLORS = { terkirim: "#0ea5e9", diproses: "#f59e0b", interview: "#8b5cf6", diterima: "#10b981", ditolak: "#f43f5e" };

const TIPS = [
  "Perbarui CV kamu secara berkala",
  "Lengkapi profil hingga 100%",
  "Aktifkan Job Alert agar tidak ketinggalan lowongan baru",
  "Lamar pekerjaan yang sesuai dengan keahlianmu",
];

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [completion, setCompletion] = useState(0);
  const [cvUser, setCvUser] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [recs, setRecs] = useState([]);
  const [savedIds, setSavedIds] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/candidate/stats"),
      api.get("/candidate/applications"),
      api.get("/candidate/career-profile"),
      api.get("/candidate/recommendations"),
      api.get("/cv-professional/my-cvs"),
      api.get("/candidate/saved-jobs/ids"),
    ]).then(([s, a, cp, r, cv, sv]) => {
      setStats(s.data);
      setApps(a.data.slice(0, 5));
      const c = cp.data.completion;
      setCompletion(typeof c === "number" ? Math.round(c) : Math.round(c?.percent ?? 0));
      setCvUser(cp.data.user);
      setRecs(r.data);
      setCvs(cv.data);
      setSavedIds(sv.data);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleSave = async (jobId) => {
    try {
      if (savedIds.includes(jobId)) {
        await api.delete(`/candidate/saved-jobs/${jobId}`);
        setSavedIds(savedIds.filter((x) => x !== jobId));
      } else {
        await api.post(`/candidate/saved-jobs/${jobId}`);
        setSavedIds([...savedIds, jobId]);
        toast.success("Lowongan disimpan");
      }
    } catch {
      toast.error("Gagal menyimpan lowongan");
    }
  };

  const firstName = (user?.name || "").split(" ")[0] || "Kamu";

  const cards = [
    { label: "Total Lamaran", value: stats?.total, icon: Send, cls: "bg-sky-50 text-sky-600", testId: "stat-total" },
    { label: "Lamaran Diproses", value: stats?.diproses, icon: Hourglass, cls: "bg-amber-50 text-amber-600", testId: "stat-diproses" },
    { label: "Dipanggil Interview", value: stats?.interview, icon: PhoneCall, cls: "bg-purple-50 text-purple-600", testId: "stat-interview" },
    { label: "Diterima", value: stats?.diterima, icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600", testId: "stat-diterima" },
    { label: "Ditolak", value: stats?.ditolak, icon: XCircle, cls: "bg-rose-50 text-rose-600", testId: "stat-ditolak" },
  ];

  const chartData = stats
    ? [
        { key: "terkirim", name: "Terkirim", value: Math.max(stats.total - stats.diproses - stats.interview - stats.diterima - stats.ditolak, 0) },
        { key: "diproses", name: "Diproses", value: stats.diproses },
        { key: "interview", name: "Interview", value: stats.interview },
        { key: "diterima", name: "Diterima", value: stats.diterima },
        { key: "ditolak", name: "Ditolak", value: stats.ditolak },
      ]
    : [];

  const latestCv = cvs[0];

  if (loading) {
    return (
      <DashboardLayout menu={CANDIDATE_MENU} title="Dashboard">
        <div className="space-y-6" data-testid="dashboard-skeleton">
          <div className="h-44 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 h-80 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            <div className="lg:col-span-4 h-80 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Dashboard">
      <div data-testid="candidate-dashboard" className="space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-[#0f2557] min-h-[180px] flex items-center" data-testid="dashboard-hero">
          <img src={HERO_IMG} alt="" className="absolute inset-0 h-full w-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f2557] via-[#0f2557]/85 to-[#0f2557]/25" />
          <div className="relative p-6 sm:p-10">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Halo, {firstName} 👋
            </h1>
            <p className="mt-2 text-sm sm:text-base text-sky-100/90 max-w-md leading-relaxed">
              Semoga hari ini membawa kamu lebih dekat dengan pekerjaan impianmu.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-sky-600 text-white text-sm font-bold hover:bg-sky-500 active:scale-95 transition-[background-color,transform]"
                data-testid="hero-find-jobs-btn"
              >
                <Search className="h-4 w-4" /> Cari Lowongan
              </Link>
              <Link
                to="/candidate/applications"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white/10 border border-white/25 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                data-testid="hero-my-apps-btn"
              >
                Lamaran Saya
              </Link>
            </div>
          </div>
        </section>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" data-testid="quick-stats">
          {cards.map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 hover:-translate-y-1 hover:shadow-md transition-[transform,box-shadow] duration-200"
              data-testid={c.testId}
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.cls}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-3xl font-bold text-slate-900">{c.value ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
              <Link to="/candidate/applications" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700" data-testid={`${c.testId}-link`}>
                Lihat semua <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="quick-actions">
          {[
            { to: "/jobs", label: "Cari Lowongan", icon: Search, testId: "quick-action-search" },
            { to: "/candidate/cv", label: "Upload CV", icon: Upload, testId: "quick-action-cv" },
            { to: "/candidate/profile", label: "Lengkapi Profil", icon: UserCheck, testId: "quick-action-profile" },
            { to: "/candidate/job-alerts", label: "Job Alert", icon: BellRing, testId: "quick-action-alert" },
          ].map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-sky-200 hover:bg-sky-50/50 transition-colors"
              data-testid={a.testId}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shrink-0">
                <a.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-slate-700">{a.label}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Lamaran Terakhir */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-6" data-testid="recent-applications-card">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-lg font-semibold text-slate-900">Lamaran Terakhir</h2>
                <Link to="/candidate/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700" data-testid="view-all-applications-link">
                  Lihat Semua <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {apps.length === 0 ? (
                <div className="text-center py-10" data-testid="no-applications-yet">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                    <Send className="h-6 w-6" />
                  </span>
                  <h3 className="font-display font-semibold text-slate-900">Belum Ada Lamaran</h3>
                  <p className="text-sm text-slate-500 mt-1">Yuk mulai cari pekerjaan yang sesuai dengan keahlianmu.</p>
                  <Link to="/jobs" className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 transition-colors" data-testid="empty-apps-cta">
                    Cari Lowongan
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {apps.map((a) => (
                    <Link
                      key={a.id}
                      to="/candidate/applications"
                      className="flex items-center gap-3.5 py-3.5 -mx-2 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                      data-testid={`recent-application-${a.id}`}
                    >
                      <img
                        src={logoUrl(a.company_logo, a.company_name)}
                        alt={a.company_name}
                        className="h-11 w-11 rounded-xl border border-slate-100 object-contain bg-white shrink-0"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate text-sm">{a.job_title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {a.company_name}
                          {a.job_location ? ` · ${a.job_location}` : ""} · {timeAgo(a.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={a.status} map={APPLICATION_STATUS} />
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-600 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Rekomendasi Lowongan */}
            <div data-testid="recommendations-section">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-slate-900">Rekomendasi Lowongan Untukmu</h2>
                <Link to="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700" data-testid="view-all-recs-link">
                  Lihat Semua <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {recs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center" data-testid="no-recommendations">
                  <p className="text-sm text-slate-500">Belum ada rekomendasi saat ini. Lengkapi Profil Karier untuk rekomendasi yang lebih akurat.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="recommendations-grid">
                  {recs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 hover:-translate-y-1 hover:shadow-md transition-[transform,box-shadow] duration-200"
                      data-testid={`rec-job-${job.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={logoUrl(job.company_logo, job.company_name)}
                          alt={job.company_name}
                          className="h-11 w-11 rounded-xl border border-slate-100 object-contain bg-white shrink-0"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">{job.title}</h3>
                          <p className="text-xs text-slate-500 truncate">{job.company_name}</p>
                        </div>
                        <button
                          onClick={() => toggleSave(job.id)}
                          aria-label="Simpan lowongan"
                          className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                            savedIds.includes(job.id) ? "border-sky-200 bg-sky-50 text-sky-600" : "border-slate-200 text-slate-400 hover:text-sky-600 hover:border-sky-200"
                          }`}
                          data-testid={`rec-bookmark-${job.id}`}
                        >
                          <Bookmark className={`h-4 w-4 ${savedIds.includes(job.id) ? "fill-current" : ""}`} />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {job.location}</span>
                        <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5 text-slate-400" /> {formatSalary(job.salary_min, job.salary_max)}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[11px] font-semibold">{job.job_type}</span>
                        <Link
                          to={`/jobs/${job.slug}`}
                          className="inline-flex items-center gap-1 h-9 px-4 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition-[background-color,transform]"
                          data-testid={`rec-view-${job.id}`}
                        >
                          Lihat Lowongan <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Statistik Lamaran */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-6" data-testid="stats-chart-card">
              <h2 className="font-display text-lg font-semibold text-slate-900">Statistik Lamaran</h2>
              {!stats || stats.total === 0 ? (
                <div className="text-center py-8" data-testid="stats-empty">
                  <p className="text-sm text-slate-500">Statistik akan muncul setelah kamu mengirim lamaran pertama.</p>
                </div>
              ) : (
                <>
                  <div className="relative h-48 mt-2" data-testid="stats-donut-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={2} strokeWidth={0}>
                          {chartData.map((d) => (
                            <Cell key={d.key} fill={CHART_COLORS[d.key]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="font-display text-2xl font-bold text-slate-900">{stats.total}</p>
                      <p className="text-[11px] text-slate-400">Total</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2" data-testid="stats-legend">
                    {chartData.map((d) => (
                      <li key={d.key} className="flex items-center gap-2.5 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[d.key] }} />
                        <span className="flex-1 text-slate-600">{d.name}</span>
                        <span className="font-semibold text-slate-900">{d.value}</span>
                        <span className="text-xs text-slate-400 w-12 text-right">
                          ({stats.total ? Math.round((d.value / stats.total) * 100) : 0}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Lengkapi Profilmu */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-6" data-testid="completion-card">
              <h2 className="font-display text-lg font-semibold text-slate-900">Lengkapi Profilmu</h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none" stroke="#0284c7" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${(completion / 100) * 97.4} 97.4`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900" data-testid="completion-percent">
                    {completion}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Profil yang lengkap meningkatkan peluang kamu dilirik perusahaan.
                </p>
              </div>
              <Link
                to="/candidate/profile"
                className="mt-4 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 active:scale-95 transition-[background-color,transform]"
                data-testid="complete-profile-btn"
              >
                Lengkapi Profil <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* CV Aktif */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 sm:p-6" data-testid="cv-card">
              <h2 className="font-display text-lg font-semibold text-slate-900">CV Aktif</h2>
              {latestCv || cvUser?.cv_filename ? (
                <div className="mt-4 flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate" data-testid="cv-active-name">
                      {latestCv ? latestCv.name : cvUser.cv_filename}
                    </p>
                    <p className="text-xs text-slate-400">
                      {latestCv ? `Terakhir diperbarui ${formatDate(latestCv.updated_at)}` : "CV yang diunggah"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 p-5 text-center" data-testid="cv-empty">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-2">
                    <FileUp className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-slate-900">CV belum tersedia</p>
                  <p className="text-xs text-slate-500 mt-0.5">Upload CV agar kamu bisa mulai melamar pekerjaan.</p>
                </div>
              )}
              <Link
                to={latestCv ? "/candidate/cv-professional/list" : "/candidate/cv"}
                className="mt-4 flex items-center justify-center gap-1.5 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                data-testid="cv-card-btn"
              >
                {latestCv || cvUser?.cv_filename ? "Lihat CV" : "Upload CV"} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 sm:p-6" data-testid="tips-card">
              <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" /> Tips Untukmu
              </h2>
              <ul className="mt-3 space-y-2.5">
                {TIPS.map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
