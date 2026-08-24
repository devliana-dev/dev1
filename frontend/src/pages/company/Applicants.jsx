import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Users, MessageCircle, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { APPLICATION_STATUS } from "../../lib/constants";
import { formatDate, fileUrl, waApplicantLink } from "../../lib/format";

export default function Applicants() {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get("job_id") || "";
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/company/applications", { params: jobId ? { job_id: jobId } : {} }),
      api.get("/company/jobs"),
    ])
      .then(([appsRes, jobsRes]) => {
        setApplications(appsRes.data);
        setJobs(jobsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markViewed = async (app) => {
    setExpanded(expanded === app.id ? null : app.id);
    if (app.status === "terkirim") {
      try {
        await api.get(`/company/applications/${app.id}`);
        setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "dilihat" } : a)));
      } catch {}
    }
  };

  const updateStatus = async (appId, status) => {
    try {
      await api.put(`/company/applications/${appId}`, { status });
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
      toast.success("Status lamaran diperbarui");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Pelamar">
      <div data-testid="applicants-page">
        <div className="mb-5 max-w-xs">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Filter berdasarkan lowongan</label>
          <select
            value={jobId}
            onChange={(e) => {
              const p = new URLSearchParams(searchParams);
              if (e.target.value) p.set("job_id", e.target.value);
              else p.delete("job_id");
              setSearchParams(p);
            }}
            className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            data-testid="applicants-job-filter"
          >
            <option value="">Semua Lowongan</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-applicants">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada pelamar</h3>
            <p className="text-sm text-slate-500 mt-1">Pelamar akan muncul di sini setelah lowongan Anda aktif.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="applicants-list">
            {applications.map((app) => (
              <div key={app.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid={`applicant-row-${app.id}`}>
                <button onClick={() => markViewed(app)} className="w-full flex items-center justify-between gap-3 p-5 text-left" data-testid={`applicant-toggle-${app.id}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold text-slate-900">{app.name}</h3>
                      <StatusBadge status={app.status} map={APPLICATION_STATUS} />
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{app.job_title} · Melamar {formatDate(app.created_at)}</p>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${expanded === app.id ? "rotate-180" : ""}`} />
                </button>

                {expanded === app.id && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50" data-testid={`applicant-detail-${app.id}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <p className="text-slate-600"><span className="text-slate-400">Email:</span> {app.email}</p>
                      <p className="text-slate-600"><span className="text-slate-400">WhatsApp:</span> {app.phone}</p>
                      <p className="text-slate-600"><span className="text-slate-400">Pendidikan:</span> {app.education || "-"}</p>
                      <p className="text-slate-600"><span className="text-slate-400">Pengalaman:</span> {app.experience || "-"}</p>
                    </div>
                    {app.message && (
                      <div className="mt-3 rounded-lg bg-white border border-slate-200 p-3.5 text-sm text-slate-600">
                        <span className="text-slate-400">Pesan pelamar:</span> {app.message}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      {app.cv_path && (
                        <a href={fileUrl(app.cv_path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-white" data-testid={`applicant-cv-${app.id}`}>
                          <FileText className="h-4 w-4" /> Lihat CV
                        </a>
                      )}
                      <a href={waApplicantLink(app.phone, app.name, app.job_title)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700" data-testid={`applicant-wa-${app.id}`}>
                        <MessageCircle className="h-4 w-4" /> Hubungi via WhatsApp
                      </a>
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        data-testid={`applicant-status-${app.id}`}
                      >
                        {Object.entries(APPLICATION_STATUS).map(([val, conf]) => (
                          <option key={val} value={val}>{conf.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
