import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Send, Bookmark, Users, Check, Briefcase, Clock, CalendarCheck,
  CheckCircle2, FileText, ArrowRight, ShieldCheck, Copy, Crown,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { timeAgo, formatDate, logoUrl } from "../../lib/format";
import DashboardShell from "../../components/DashboardShell";

/* ---------- data statis ---------- */
const PRO_FEATURES = ["Job Alert", "CV Profesional", "Lamar Cepat 30x", "Statistik Lamaran", "Badge Career Pro", "Referral & Komisi"];

const STATUS_STYLE = {
  terkirim: "bg-slate-100 text-slate-600",
  dilihat: "bg-blue-50 text-blue-700",
  diproses: "bg-blue-50 text-blue-700",
  shortlist: "bg-violet-50 text-violet-700",
  interview: "bg-amber-50 text-amber-700",
  diterima: "bg-emerald-50 text-emerald-700",
  ditolak: "bg-red-50 text-red-600",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold capitalize ${STATUS_STYLE[status] || "bg-slate-100 text-slate-600"}`}>
      {status || "-"}
    </span>
  );
}

function PromoPro({ pro, quota, sub, referral }) {
  if (pro) {
    const pct = quota.limit ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;
    return (
      <div className="rounded-2xl bg-gradient-to-b from-[#0A1F4B] to-[#12307A] p-5 text-white shadow-sm border border-slate-200/60" data-testid="pro-active-card">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-[#0B1F4B] shadow-md">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display font-extrabold text-[15px]">Career Pro Aktif</p>
            <p className="text-[10.5px] text-blue-200/80">Berlaku s.d. {formatDate(sub?.expires_at || "")}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-white/10 p-3.5" data-testid="lamar-cepat-quota">
          <div className="flex items-center justify-between text-[11.5px] font-semibold">
            <span className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5 text-yellow-400" /> Kuota Lamar Cepat</span>
            <span className="font-extrabold text-yellow-400">{quota.remaining ?? 0}/{quota.limit ?? 30}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-white/10 p-3.5" data-testid="referral-mini">
          <div className="flex items-center justify-between text-[11.5px] font-semibold">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-yellow-400" /> Kode Referral</span>
            <button
              onClick={() => { navigator.clipboard?.writeText(referral.code || ""); toast.success("Kode referral dikopi"); }}
              className="inline-flex items-center gap-1 text-yellow-400 font-extrabold"
              data-testid="referral-copy"
            >
              {referral.code || "-"} <Copy className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-1.5 text-[10.5px] text-blue-200/80">{referral.conversions ?? 0} teman berhasil upgrade • komisi Rp{((referral.conversions || 0) * 5000).toLocaleString("id-ID")}</p>
        </div>
        <Link to="/candidate/referral" className="mt-3 inline-flex w-full items-center justify-center gap-1.5 h-9 rounded-lg border border-white/25 text-[12px] font-bold text-white hover:bg-white/10 transition-colors" data-testid="referral-manage">
          Kelola Referral & Komisi <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#0A1F4B] to-[#12307A] p-5 text-white shadow-sm border border-slate-200/60" data-testid="pro-promo-card">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-[#0B1F4B] shadow-md">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display font-extrabold text-[15px]">Upgrade Career Pro</p>
          <p className="text-[10.5px] text-blue-200/80">Buka semua fitur karier premium</p>
        </div>
      </div>
      <p className="mt-4 font-display text-2xl font-extrabold text-yellow-400" data-testid="pro-price">Rp20.000 <span className="text-[12px] font-semibold text-blue-200/80">/ 3 bulan</span></p>
      <ul className="mt-3.5 space-y-2">
        {PRO_FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-2 text-[12px] font-medium text-blue-100">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 shrink-0"><Check className="h-2.5 w-2.5 text-[#0B1F4B]" strokeWidth="3.5" /></span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        to="/candidate/cv-professional"
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 h-11 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-[#0B1F4B] text-[13px] font-extrabold shadow-lg shadow-amber-500/25 hover:brightness-105 transition"
        data-testid="upgrade-pro-btn"
      >
        Upgrade Career Pro <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-2.5 text-[10px] text-blue-200/70 text-center">Sekali bayar • Aktif 3 bulan • Tanpa komisi berjenjang</p>
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

function RecommendCard({ job, pro, onQuickApply, applying }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`recommend-card-${job.id}`}>
      <img src={logoUrl(job.company_logo, job.company_name)} alt={job.company_name} className="h-11 w-11 rounded-lg border border-slate-200 bg-white object-contain p-1 shrink-0" loading="lazy" />
      <div className="min-w-0 flex-1">
        <Link to={`/jobs/${job.slug}`} className="font-display font-bold text-[13.5px] text-slate-900 hover:text-blue-700 line-clamp-1">{job.title}</Link>
        <p className="text-[11.5px] text-slate-500 truncate">{job.company_name}</p>
        <p className="mt-0.5 text-[10.5px] text-slate-400 flex flex-wrap items-center gap-x-2">
          <span className="inline-flex items-center gap-1"><Bookmark className="h-3 w-3" />{job.location}</span>
          <span>•</span><span>{job.job_type}</span>
        </p>
      </div>
      <div className="flex sm:flex-col gap-2 shrink-0">
        {pro && (
          <button
            onClick={() => onQuickApply(job)}
            disabled={applying === job.id}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-400 text-[#0B1F4B] text-[11.5px] font-extrabold shadow-md shadow-amber-400/25 hover:brightness-105 transition disabled:opacity-60"
            data-testid={`quick-apply-${job.id}`}
          >
            <Send className="h-3.5 w-3.5" /> {applying === job.id ? "Mengirim..." : "Lamar Cepat"}
          </button>
        )}
        <Link
          to={`/jobs/${job.slug}/apply`}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[11.5px] font-bold hover:bg-blue-100 transition-colors"
          data-testid={`manual-apply-${job.id}`}
        >
          Lamar Manual
        </Link>
      </div>
    </div>
  );
}

export default function CandidateDashboardNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [profile, setProfile] = useState(null);
  const [recos, setRecos] = useState([]);
  const [quota, setQuota] = useState({});
  const [cvStatus, setCvStatus] = useState({ has_access: false });
  const [referral, setReferral] = useState({ code: "", conversions: 0 });
  const [savedCount, setSavedCount] = useState(0);
  const [applying, setApplying] = useState("");

  const loadAll = () => {
    api.get("/candidate/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/candidate/applications").then((r) => setApps(r.data)).catch(() => {});
    api.get("/candidate/career-profile").then((r) => setProfile(r.data)).catch(() => {});
    api.get("/candidate/recommendations").then((r) => setRecos((r.data || []).slice(0, 4))).catch(() => {});
    api.get("/candidate/apply-quota").then((r) => setQuota(r.data)).catch(() => {});
    api.get("/cv-professional/status").then((r) => setCvStatus(r.data)).catch(() => {});
    api.get("/referral/me").then((r) => setReferral(r.data)).catch(() => {});
    api.get("/candidate/saved-jobs/ids").then((r) => setSavedCount(Array.isArray(r.data) ? r.data.length : 0)).catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  const pro = !!cvStatus.has_access;
  const firstName = (user?.name || "").split(" ")[0];
  const completeness = (() => {
    if (!profile) return 0;
    const fields = [profile.photo_path, profile.about, profile.city, profile.education, profile.experience, profile.skills];
    const filled = fields.filter((f) => f && String(f).trim() !== "" && (!Array.isArray(f) || f.length > 0)).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const quickApply = async (job) => {
    setApplying(job.id);
    try {
      const r = await api.post(`/jobs/${job.id}/quick-apply`, {});
      setQuota(r.data.quota || quota);
      setApps((prev) => [{ ...r.data, quota: undefined }, ...prev]);
      setRecos((prev) => prev.filter((j) => j.id !== job.id));
      toast.success(`Lamaran cepat terkirim ke ${job.company_name}!`);
    } catch (err) {
      const detail = err?.response?.data?.detail || "Lamar Cepat gagal. Coba lagi.";
      toast.error(detail);
      if (String(detail).includes("CV")) {
        setTimeout(() => navigate("/candidate/cv"), 1400);
      }
    } finally {
      setApplying("");
    }
  };

  return (
    <DashboardShell variant="candidate" title="Dashboard Kandidat" subtitle="Kelola kariermu dari satu tempat">
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start max-w-[1400px] mx-auto">
        {/* Konten utama */}
        <div className="space-y-5 min-w-0">
              {/* Sambutan */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A1F4B] via-[#12307A] to-[#1A43B8] p-5 sm:p-6 text-white shadow-sm" data-testid="greeting-card">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-blue-400/20 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <h2 className="font-display text-xl sm:text-2xl font-extrabold" data-testid="greeting-name">Halo, {firstName}!</h2>
                    {pro ? (
                      <p className="mt-1.5 text-[12.5px] text-blue-100/85">
                        Career Pro aktif s.d. <b className="text-yellow-400">{formatDate(cvStatus.subscription?.expires_at || "")}</b> • Sisa Lamar Cepat <b className="text-yellow-400">{quota.remaining ?? 0}/{quota.limit ?? 30}</b>
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[12.5px] text-blue-100/85">Kamu menggunakan paket <b className="text-white">FREE</b> — akses semua fitur umum &amp; lamar manual ke lowongan mana pun.</p>
                    )}
                  </div>
                  <Link to="/candidate/cv" className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white/10 border border-white/25 text-[12.5px] font-bold hover:bg-white/20 transition-colors">
                    <FileText className="h-4 w-4" /> CV Saya
                  </Link>
                </div>
              </div>

              {/* Statistik */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4" data-testid="candidate-stats">
                <StatCard label="Total Lamaran" value={stats?.total ?? 0} icon={Send} tone="bg-blue-100 text-blue-600" />
                <StatCard label="Diproses" value={stats?.diproses ?? 0} icon={Clock} tone="bg-amber-100 text-amber-600" />
                <StatCard label="Interview" value={stats?.interview ?? 0} icon={CalendarCheck} tone="bg-violet-100 text-violet-600" />
                <StatCard label="Diterima" value={stats?.diterima ?? 0} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" />
              </div>

              {/* Dua kolom: lamaran terakhir + profil */}
              <div className="grid md:grid-cols-[1fr_260px] gap-5">
                <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 min-w-0" data-testid="recent-applications">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="font-display font-bold text-[15px] text-slate-900">Lamaran Terakhir</h3>
                    <Link to="/candidate/applications" className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600 hover:text-blue-800">
                      Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  {apps.length === 0 ? (
                    <p className="py-8 text-center text-[12.5px] text-slate-400">Belum ada lamaran. Mulai dari Cari Lowongan!</p>
                  ) : (
                    <div className="space-y-2.5">
                      {apps.slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors" data-testid={`recent-app-${a.id}`}>
                          <img src={logoUrl(a.company_logo, a.company_name)} alt="" className="h-9 w-9 rounded-lg border border-slate-200 bg-white object-contain p-1 shrink-0" loading="lazy" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-bold text-slate-900 truncate">{a.job_title}</p>
                            <p className="text-[10.5px] text-slate-500 truncate">{a.company_name} • {timeAgo(a.created_at)}</p>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5" data-testid="profile-completeness">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-[14px] text-slate-900">Profil Karier</h3>
                      <span className="font-display font-extrabold text-[15px] text-blue-600">{completeness}%</span>
                    </div>
                    <div className="mt-2.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${completeness}%` }} />
                    </div>
                    <p className="mt-2 text-[10.5px] text-slate-400">Kelengkapan profil menambah peluang dilihat perekrut.</p>
                    <Link to="/candidate/profile" className="mt-3 inline-flex w-full items-center justify-center gap-1.5 h-9 rounded-lg bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 transition-colors">
                      Lengkapi Profil
                    </Link>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5" data-testid="saved-summary">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                        <Bookmark className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <p className="font-display font-extrabold text-lg text-[#0B1F4B] leading-none">{savedCount}</p>
                        <p className="mt-1 text-[11px] text-slate-500 leading-none">Lowongan Tersimpan</p>
                      </div>
                    </div>
                    <Link to="/candidate/saved" className="mt-3 inline-flex w-full items-center justify-center gap-1.5 h-9 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50">
                      Lihat Tersimpan
                    </Link>
                  </div>
                </div>
              </div>

              {/* Rekomendasi */}
              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5" data-testid="recommendations">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-display font-bold text-[15px] text-slate-900">Rekomendasi Lowongan</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Peluang yang cocok dengan profil kariermu.</p>
                  </div>
                  <Link to="/jobs" className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-600 hover:text-blue-800">
                    Cari Lowongan <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {recos.length === 0 ? (
                  <p className="py-8 text-center text-[12.5px] text-slate-400">Belum ada rekomendasi saat ini.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recos.map((job) => (
                      <RecommendCard key={job.id} job={job} pro={pro} onQuickApply={quickApply} applying={applying} />
                    ))}
                  </div>
                )}
                {!pro && (
                  <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5" data-testid="free-apply-note">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Paket FREE hanya mendukung Lamar Manual. Upgrade Career Pro untuk Lamar Cepat &amp; kuota 30x.
                  </p>
                )}
              </div>
            </div>

            {/* Sidebar kanan: 1 card promosi Career Pro */}
            <aside className="lg:sticky lg:top-[88px] space-y-5" data-testid="candidate-right-rail">
              <PromoPro pro={pro} quota={quota} sub={cvStatus.subscription} referral={referral} />
            </aside>
          </div>
    </DashboardShell>
  );
}
