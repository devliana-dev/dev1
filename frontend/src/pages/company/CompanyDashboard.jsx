import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CheckCircle2, Users, Clock, AlertTriangle, BadgeCheck } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import { COMPANY_MENU } from "./menu";

export default function CompanyDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/company/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    { label: "Total Lowongan", value: stats?.total_jobs, icon: Briefcase, cls: "bg-sky-100 text-sky-700", testId: "stat-total-jobs" },
    { label: "Lowongan Aktif", value: stats?.active_jobs, icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700", testId: "stat-active-jobs" },
    { label: "Total Pelamar", value: stats?.total_applicants, icon: Users, cls: "bg-violet-100 text-violet-700", testId: "stat-applicants" },
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
