import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Loader2, FilePlus2, Pencil, Power, Users } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { JOB_STATUS } from "../../lib/constants";
import { timeAgo } from "../../lib/format";

export default function CompanyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    api.get("/company/jobs")
      .then((r) => setJobs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const toggle = async (job) => {
    try {
      await api.post(`/company/jobs/${job.id}/toggle`);
      toast.success(job.status === "active" ? "Lowongan dinonaktifkan" : "Lowongan diaktifkan kembali");
      fetchJobs();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Lowongan Saya">
      <div data-testid="company-jobs-page">
        <div className="flex justify-end mb-4">
          <Link to="/company/jobs/new" className="inline-flex items-center gap-1.5 h-11 px-5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors" data-testid="add-job-btn">
            <FilePlus2 className="h-4 w-4" /> Tambah Lowongan
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-company-jobs">
            <FilePlus2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada lowongan</h3>
            <p className="text-sm text-slate-500 mt-1">Buat lowongan pertama Anda dan tunggu persetujuan admin.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="company-jobs-list">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4" data-testid={`company-job-row-${job.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-semibold text-slate-900">{job.title}</h3>
                    <StatusBadge status={job.status} map={JOB_STATUS} />
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {job.category} · {job.location} · {job.job_type} · Diposting {timeAgo(job.created_at)}
                  </p>
                  {job.status === "rejected" && job.rejection_reason && (
                    <p className="text-xs text-red-600 mt-1.5">Alasan penolakan: {job.rejection_reason}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {job.applicants} pelamar
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link to={`/company/applicants?job_id=${job.id}`} className="inline-flex items-center h-9 px-3.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid={`view-applicants-${job.id}`}>
                    Pelamar
                  </Link>
                  <Link to={`/company/jobs/${job.id}/edit`} className="inline-flex items-center gap-1 h-9 px-3.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid={`edit-job-${job.id}`}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  {(job.status === "active" || job.status === "nonaktif") && (
                    <button onClick={() => toggle(job)} className="inline-flex items-center gap-1 h-9 px-3.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid={`toggle-job-${job.id}`}>
                      <Power className="h-3.5 w-3.5" /> {job.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
