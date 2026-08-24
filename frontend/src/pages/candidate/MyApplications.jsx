import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Loader2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";
import { CANDIDATE_MENU } from "./menu";
import { APPLICATION_STATUS } from "../../lib/constants";
import { formatDate } from "../../lib/format";

export default function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/candidate/applications")
      .then((r) => setApps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Lamaran Saya">
      <div data-testid="my-applications-page">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : apps.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="empty-applications">
            <Send className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada lamaran</h3>
            <p className="text-sm text-slate-500 mt-1">Mulai cari lowongan dan kirim lamaran pertama Anda.</p>
            <Link to="/jobs" className="inline-flex items-center h-11 px-6 mt-5 rounded-lg bg-slate-900 text-white text-sm font-semibold" data-testid="find-jobs-btn">
              Cari Lowongan
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="applications-list">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Posisi</th>
                    <th className="px-5 py-3 font-medium">Perusahaan</th>
                    <th className="px-5 py-3 font-medium">Tanggal Melamar</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apps.map((a) => (
                    <tr key={a.id} data-testid={`application-row-${a.id}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{a.job_title}</td>
                      <td className="px-5 py-3.5 text-slate-600">{a.company_name}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(a.created_at)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={a.status} map={APPLICATION_STATUS} /></td>
                      <td className="px-5 py-3.5">
                        <Link to={`/jobs/${a.job_slug}`} className="text-sky-700 font-medium hover:underline" data-testid={`view-job-${a.id}`}>
                          Lihat Lowongan
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
