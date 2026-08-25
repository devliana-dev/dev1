import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Loader2, Check, X, Trash2, Briefcase, Pencil } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { JOB_STATUS } from "../../lib/constants";
import { formatDate } from "../../lib/format";

const TABS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Aktif" },
  { value: "rejected", label: "Ditolak" },
  { value: "expired", label: "Expired" },
];

const ETABS = [
  { value: "", label: "Semua" },
  { value: "company", label: "Perusahaan" },
  { value: "umkm", label: "🏪 UMKM" },
];

export default function AdminJobs() {
  const [tab, setTab] = useState("");
  const [etype, setEtype] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    const params = {};
    if (tab) params.status = tab;
    if (etype) params.employer_type = etype;
    api.get("/admin/jobs", { params })
      .then((r) => setJobs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, etype]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const approve = async (job) => {
    try {
      await api.post(`/admin/jobs/${job.id}/approve`);
      toast.success(`Lowongan "${job.title}" disetujui`);
      fetchJobs();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const reject = async (job) => {
    const reason = window.prompt("Alasan penolakan (akan terlihat oleh perusahaan):");
    if (reason === null) return;
    try {
      await api.post(`/admin/jobs/${job.id}/reject`, { reason });
      toast.success("Lowongan ditolak");
      fetchJobs();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const remove = async (job) => {
    if (!window.confirm(`Hapus lowongan "${job.title}" beserta semua lamarannya?`)) return;
    try {
      await api.delete(`/admin/jobs/${job.id}`);
      toast.success("Lowongan dihapus");
      fetchJobs();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Kelola Lowongan">
      <div data-testid="admin-jobs-page">
        <div className="flex flex-wrap gap-2 mb-5" data-testid="job-tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.value ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
              data-testid={`tab-${t.label.toLowerCase()}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5" data-testid="employer-type-filter">
          <span className="text-xs font-medium text-slate-500 mr-1">Jenis Pemberi Kerja:</span>
          {ETABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setEtype(t.value)}
              className={`h-9 px-4 rounded-full text-xs font-semibold transition-colors ${
                etype === t.value ? "bg-sky-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
              data-testid={`etype-tab-${t.value || "all"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-admin-jobs">
            <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Tidak ada lowongan pada kategori ini.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="admin-jobs-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Posisi</th>
                    <th className="px-5 py-3 font-medium">Perusahaan</th>
                    <th className="px-5 py-3 font-medium">Kategori</th>
                    <th className="px-5 py-3 font-medium text-center">Views</th>
                    <th className="px-5 py-3 font-medium text-center">Lamaran</th>
                    <th className="px-5 py-3 font-medium">Tanggal</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id} data-testid={`admin-job-row-${job.id}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{job.title}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {job.company_name}
                        {job.employer_type === "umkm" && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold whitespace-nowrap" data-testid={`admin-umkm-badge-${job.id}`}>🏪 UMKM</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{job.category}</td>
                      <td className="px-5 py-3.5 text-center text-slate-600" data-testid={`job-views-${job.id}`}>{job.views || 0}</td>
                      <td className="px-5 py-3.5 text-center text-slate-600" data-testid={`job-applications-${job.id}`}>{job.applications || 0}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(job.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={job.status} map={JOB_STATUS} />
                        {job.status === "rejected" && job.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1 max-w-[180px]">{job.rejection_reason}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5">
                          {job.status === "pending" && (
                            <>
                              <button onClick={() => approve(job)} title="Setujui" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200" data-testid={`approve-job-${job.id}`}>
                                <Check className="h-4 w-4" />
                              </button>
                              <button onClick={() => reject(job)} title="Tolak" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200" data-testid={`reject-job-${job.id}`}>
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <Link to={`/admin/jobs/${job.id}/edit`} title="Edit" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200" data-testid={`edit-job-${job.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button onClick={() => remove(job)} title="Hapus" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200" data-testid={`delete-job-${job.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
