import { useEffect, useState } from "react";
import { Briefcase, CheckCircle2, Eye, Loader2, PhoneCall, Send, Star } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { JOB_STATUS } from "../../lib/constants";
import { formatDate } from "../../lib/format";

export default function CompanyStats() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/company/stats"), api.get("/company/job-stats")])
      .then(([s, j]) => { setStats(s.data); setJobs(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Lowongan", value: stats?.total_jobs, icon: Briefcase, cls: "bg-sky-100 text-sky-700", testId: "cs-total-jobs" },
    { label: "Lowongan Aktif", value: stats?.active_jobs, icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700", testId: "cs-active-jobs" },
    { label: "Total Pelamar", value: stats?.total_applicants, icon: Send, cls: "bg-violet-100 text-violet-700", testId: "cs-applicants" },
    { label: "Shortlist", value: stats?.shortlisted, icon: Star, cls: "bg-amber-100 text-amber-700", testId: "cs-shortlisted" },
    { label: "Interview", value: stats?.interview, icon: PhoneCall, cls: "bg-blue-100 text-blue-700", testId: "cs-interviews" },
    { label: "Diterima", value: stats?.hired, icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700", testId: "cs-hired" },
  ];

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Statistik">
      <div data-testid="company-stats-page">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : (
          <>
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

            <div className="mt-8 bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="job-stats-table">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-display font-semibold text-slate-900">Statistik per Lowongan</h3>
              </div>
              {jobs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">Belum ada lowongan.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-left">
                      <tr>
                        <th className="px-5 py-3 font-medium">Lowongan</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-center"><span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Dilihat</span></th>
                        <th className="px-4 py-3 font-medium text-center">Pelamar</th>
                        <th className="px-4 py-3 font-medium text-center">Shortlist</th>
                        <th className="px-4 py-3 font-medium text-center">Interview</th>
                        <th className="px-4 py-3 font-medium text-center">Diterima</th>
                        <th className="px-4 py-3 font-medium">Tayang s/d</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs.map((j) => (
                        <tr key={j.id} data-testid={`job-stat-${j.id}`}>
                          <td className="px-5 py-3.5 font-medium text-slate-900 max-w-52 truncate">{j.title}</td>
                          <td className="px-4 py-3.5"><StatusBadge status={j.status} map={JOB_STATUS} /></td>
                          <td className="px-4 py-3.5 text-center text-slate-600">{j.views}</td>
                          <td className="px-4 py-3.5 text-center text-slate-600">{j.applications}</td>
                          <td className="px-4 py-3.5 text-center text-slate-600">{j.shortlist}</td>
                          <td className="px-4 py-3.5 text-center text-slate-600">{j.interview}</td>
                          <td className="px-4 py-3.5 text-center font-semibold text-emerald-700">{j.hired}</td>
                          <td className="px-4 py-3.5 text-slate-500">{j.expires_at ? formatDate(j.expires_at) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
