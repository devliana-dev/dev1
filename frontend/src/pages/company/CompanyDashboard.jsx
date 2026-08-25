import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CheckCircle2, Users, Clock, AlertTriangle, BadgeCheck, Crown, Rocket, Star, PhoneCall, UserCheck } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import LaunchBanner from "../../components/LaunchBanner";
import api from "../../lib/api";
import { COMPANY_MENU } from "./menu";

export default function CompanyDashboard() {
  const [stats, setStats] = useState(null);
  const [ent, setEnt] = useState(null);

  useEffect(() => {
    api.get("/company/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/company/entitlement").then((r) => setEnt(r.data)).catch(() => {});
  }, []);

  const cards = [
    { label: "Total Lowongan", value: stats?.total_jobs, icon: Briefcase, cls: "bg-sky-100 text-sky-700", testId: "stat-total-jobs" },
    { label: "Lowongan Aktif", value: stats?.active_jobs, icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700", testId: "stat-active-jobs" },
    { label: "Total Pelamar", value: stats?.total_applicants, icon: Users, cls: "bg-violet-100 text-violet-700", testId: "stat-applicants" },
    { label: "Kandidat Shortlist", value: stats?.shortlisted, icon: Star, cls: "bg-amber-100 text-amber-700", testId: "stat-shortlisted" },
    { label: "Interview", value: stats?.interview, icon: PhoneCall, cls: "bg-blue-100 text-blue-700", testId: "stat-interviews" },
    { label: "Kandidat Diterima", value: stats?.hired, icon: UserCheck, cls: "bg-emerald-100 text-emerald-700", testId: "stat-hired" },
    { label: "Menunggu Persetujuan", value: stats?.pending_jobs, icon: Clock, cls: "bg-amber-100 text-amber-700", testId: "stat-pending-jobs" },
  ];

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Dashboard">
      <div data-testid="company-dashboard">
        <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
          {stats?.company_name || "Dashboard Perusahaan"}
          {stats?.company_status === "verified" && <BadgeCheck className="h-5 w-5 text-sky-600" />}
        </h2>

        {stats?.company_status === "pending" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-800" data-testid="pending-verification-alert">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>Perusahaan Anda sedang menunggu verifikasi admin. Lengkapi <Link to="/company/profile" className="font-semibold underline">profil perusahaan</Link> untuk mempercepat proses verifikasi.</p>
          </div>
        )}
        {stats?.company_status === "rejected" && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="rejected-alert">
            Verifikasi perusahaan Anda ditolak. Silakan perbaiki profil perusahaan dan hubungi admin.
          </div>
        )}

        <div className="mt-4"><LaunchBanner /></div>

        {ent?.plan && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5" data-testid="account-status-card">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-start gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${ent.is_member ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  <Crown className="h-5 w-5" />
                </span>
                <div>
                  {ent.plan.plan_type === "launch_free" ? (
                    <>
                      <p className="font-display font-bold text-slate-900">Launch Free <span className="text-xs font-medium text-sky-600">Program Launching</span></p>
                      <p className="text-sm text-slate-500 mt-0.5">Semua fitur Member aktif gratis sampai <span className="font-semibold text-slate-800">{new Date(ent.plan.launch_end_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span> · Masa tayang lowongan: 30 hari</p>
                    </>
                  ) : ent.plan.plan_type === "member" ? (
                    <>
                      <p className="font-display font-bold text-slate-900">Member Aktif <span className="text-xs font-medium text-slate-500">Rp 50.000 / 3 Bulan</span></p>
                      <p className="text-sm text-slate-500 mt-0.5">Berlaku sampai: <span className="font-semibold text-slate-800">{new Date(ent.member_expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span> · Masa tayang lowongan: 30 hari</p>
                      {Math.ceil((new Date(ent.member_expires_at).getTime() - Date.now()) / 86400000) <= 7 && (
                        <p className="text-xs text-amber-700 mt-1" data-testid="member-reminder">Member Anda akan berakhir dalam {Math.max(0, Math.ceil((new Date(ent.member_expires_at).getTime() - Date.now()) / 86400000))} hari.</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-display font-bold text-slate-900">Paket Gratis</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Posting gratis bulan ini: <span className="font-semibold text-slate-800" data-testid="free-quota-remaining">{ent.quota.remaining} / {ent.quota.limit}</span> · Masa tayang: 7 hari
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {ent.is_member ? (
                  <>
                    <Link to="/company/jobs/new" className="inline-flex items-center h-10 px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700" data-testid="status-post-job-btn">Pasang Lowongan</Link>
                    {ent.plan.plan_type === "member" && (
                      <Link to="/company/membership" className="inline-flex items-center h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid="status-renew-btn">Perpanjang Member</Link>
                    )}
                  </>
                ) : (
                  <Link to="/company/membership" className="inline-flex items-center h-10 px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700" data-testid="status-upgrade-btn">Upgrade Member</Link>
                )}
              </div>
            </div>
            {!ent.is_member && (
              <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" data-testid="upgrade-promo-card">
                <p className="text-sm text-sky-900 flex items-start gap-2.5">
                  <Rocket className="h-5 w-5 text-sky-600 shrink-0" />
                  <span><b>Tingkatkan Jangkauan Lowongan</b> — Dengan Member Perusahaan Rp 50.000 / 3 bulan, dapatkan masa tayang lowongan 30 hari.</span>
                </p>
                <Link to="/company/membership" className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 shrink-0" data-testid="promo-upgrade-btn">Upgrade Sekarang</Link>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5" data-testid={c.testId}>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.cls}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-2xl font-bold text-slate-900">{c.value ?? "-"}</p>
              <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-slate-900">Buka lowongan baru?</h3>
            <p className="text-sm text-slate-500 mt-0.5">Lowongan akan ditinjau admin sebelum tampil di halaman publik.</p>
          </div>
          <Link to="/company/jobs/new" className="inline-flex items-center h-11 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors shrink-0" data-testid="create-job-cta-btn">
            Tambah Lowongan
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
