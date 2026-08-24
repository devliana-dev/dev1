import { useEffect, useState } from "react";
import { Loader2, Send, FileText } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { APPLICATION_STATUS } from "../../lib/constants";
import { formatDate, fileUrl } from "../../lib/format";

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/applications")
      .then((r) => setApplications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Semua Lamaran">
      <div data-testid="admin-applications-page">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-admin-applications">
            <Send className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Belum ada lamaran masuk.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="admin-applications-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Nama Pelamar</th>
                    <th className="px-5 py-3 font-medium">Posisi</th>
                    <th className="px-5 py-3 font-medium">Perusahaan</th>
                    <th className="px-5 py-3 font-medium">Tanggal</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">CV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((a) => (
                    <tr key={a.id} data-testid={`admin-application-row-${a.id}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{a.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{a.job_title}</td>
                      <td className="px-5 py-3.5 text-slate-600">{a.company_name}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(a.created_at)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={a.status} map={APPLICATION_STATUS} /></td>
                      <td className="px-5 py-3.5">
                        {a.cv_path ? (
                          <a href={fileUrl(a.cv_path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-700 font-medium hover:underline" data-testid={`admin-cv-${a.id}`}>
                            <FileText className="h-4 w-4" /> Lihat
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
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
