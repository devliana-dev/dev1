import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Building2, Briefcase, Send, Clock, ArrowRight } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import { ADMIN_MENU } from "./menu";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingJobs, setPendingJobs] = useState([]);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/jobs", { params: { status: "pending" } }).then((r) => setPendingJobs(r.data.slice(0, 5))).catch(() => {});
  }, []);

  const cards = [
    { label: "Pencari Kerja", value: stats?.candidates, icon: Users, cls: "bg-sky-100 text-sky-700", testId: "admin-stat-candidates" },
    { label: "Perusahaan", value: stats?.companies, icon: Building2, cls: "bg-violet-100 text-violet-700", testId: "admin-stat-companies" },
    { label: "Lowongan Aktif", value: stats?.jobs_active, icon: Briefcase, cls: "bg-emerald-100 text-emerald-700", testId: "admin-stat-jobs" },
    { label: "Menunggu Moderasi", value: stats?.jobs_pending, icon: Clock, cls: "bg-amber-100 text-amber-700", testId: "admin-stat-pending" },
    { label: "Total Lamaran", value: stats?.applications, icon: Send, cls: "bg-blue-100 text-blue-700", testId: "admin-stat-applications" },
    { label: "Perusahaan Pending", value: stats?.companies_pending, icon: Clock, cls: "bg-orange-100 text-orange-700", testId: "admin-stat-companies-pending" },
  ];

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Dashboard Admin">
      <div data-testid="admin-dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-900">Lowongan Menunggu Moderasi</h3>
            <Link to="/admin/jobs" className="text-sm font-semibold text-sky-700 inline-flex items-center gap-1" data-testid="goto-jobs-link">
              Kelola <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {pendingJobs.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center" data-testid="no-pending-jobs">Tidak ada lowongan yang menunggu persetujuan.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingJobs.map((j) => (
                <li key={j.id} className="py-3 flex items-center justify-between gap-3" data-testid={`pending-job-${j.id}`}>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{j.title}</p>
                    <p className="text-xs text-slate-500">{j.company_name} · {j.location}</p>
                  </div>
                  <Link to="/admin/jobs" className="text-xs font-semibold text-sky-700 shrink-0">Tinjau</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
