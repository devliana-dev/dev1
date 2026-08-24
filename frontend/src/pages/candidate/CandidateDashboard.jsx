import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Loader as LoaderIcon, PhoneCall, XCircle, Loader2, ArrowRight } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { CANDIDATE_MENU } from "./menu";
import { APPLICATION_STATUS } from "../../lib/constants";
import { timeAgo } from "../../lib/format";

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);

  useEffect(() => {
    api.get("/candidate/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/candidate/applications").then((r) => setApps(r.data.slice(0, 5))).catch(() => {});
  }, []);

  const cards = [
    { label: "Total Lamaran", value: stats?.total, icon: Send, cls: "bg-sky-100 text-sky-700", testId: "stat-total" },
    { label: "Lamaran Diproses", value: stats?.diproses, icon: LoaderIcon, cls: "bg-amber-100 text-amber-700", testId: "stat-diproses" },
    { label: "Dipanggil Interview", value: stats?.interview, icon: PhoneCall, cls: "bg-violet-100 text-violet-700", testId: "stat-interview" },
    { label: "Ditolak", value: stats?.ditolak, icon: XCircle, cls: "bg-red-100 text-red-600", testId: "stat-ditolak" },
  ];

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Dashboard" >
      <div data-testid="candidate-dashboard">
        <h2 className="font-display text-xl font-bold text-slate-900">Halo, {user?.name}</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">Semoga segera mendapatkan pekerjaan yang cocok.</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <h3 className="font-display font-semibold text-slate-900">Lamaran Terakhir</h3>
            <Link to="/candidate/applications" className="text-sm font-semibold text-sky-700 inline-flex items-center gap-1" data-testid="view-all-applications-link">
              Semua <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {apps.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm" data-testid="no-applications-yet">
              Belum ada lamaran. <Link to="/jobs" className="text-sky-700 font-semibold">Cari lowongan sekarang</Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {apps.map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between gap-3" data-testid={`recent-application-${a.id}`}>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{a.job_title}</p>
                    <p className="text-xs text-slate-500">{a.company_name} · {timeAgo(a.created_at)}</p>
                  </div>
                  <StatusBadge status={a.status} map={APPLICATION_STATUS} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
