import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Send, Loader2, ChevronDown, CalendarCheck, Video, MapPin } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api from "../../lib/api";
import { CANDIDATE_MENU } from "./menu";
import { APPLICATION_STATUS, INTERVIEW_STATUS } from "../../lib/constants";
import { formatDate } from "../../lib/format";

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Timeline({ appId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/candidate/applications/${appId}/timeline`).then((r) => setData(r.data)).catch(() => {});
  }, [appId]);

  if (!data) return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /></div>;

  return (
    <div className="pt-4" data-testid={`timeline-${appId}`}>
      <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
        {data.history.length === 0 && (
          <li className="ml-4 text-sm text-slate-500">Lamaran dikirim {formatDate(data.application.created_at)}</li>
        )}
        {data.history.map((h) => (
          <li key={h.id} className="ml-4" data-testid={`timeline-item-${h.id}`}>
            <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-sky-600 ring-4 ring-sky-50" />
            <p className="text-sm font-medium text-slate-800">
              {h.to_status ? (APPLICATION_STATUS[h.to_status]?.label || h.to_status) : "Lamaran dikirim"}
              {h.note ? ` — ${h.note}` : ""}
            </p>
            <p className="text-xs text-slate-400">{formatDateTime(h.created_at)} · oleh {h.actor_role === "company" ? "Perusahaan" : "Anda"}</p>
          </li>
        ))}
      </ol>
      {data.interviews.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-sky-600" /> Jadwal Interview
          </h4>
          <div className="space-y-2">
            {data.interviews.map((iv) => (
              <div key={iv.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm" data-testid={`timeline-interview-${iv.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{formatDateTime(iv.scheduled_at)}</span>
                  <StatusBadge status={iv.status} map={INTERVIEW_STATUS} />
                  <span className="text-xs text-slate-500">{iv.method === "online" ? "Online" : "Offline"}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {iv.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {iv.location}</span>}
                  {iv.link && (
                    <a href={iv.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                      <Video className="h-3.5 w-3.5" /> Link meeting
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

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
          <div className="space-y-3" data-testid="applications-list">
            {apps.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid={`application-row-${a.id}`}>
                <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="w-full flex items-center justify-between gap-3 p-5 text-left" data-testid={`application-toggle-${a.id}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold text-slate-900">{a.job_title}</h3>
                      <StatusBadge status={a.status} map={APPLICATION_STATUS} />
                      {a.apply_method === "one_click" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">One-Click</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{a.company_name} · Melamar {formatDate(a.created_at)}</p>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-slate-400 shrink-0 transition-transform ${expanded === a.id ? "rotate-180" : ""}`} />
                </button>
                {expanded === a.id && (
                  <div className="border-t border-slate-100 px-5 pb-5 bg-slate-50/50">
                    <div className="pt-3">
                      <Link to={`/jobs/${a.job_slug}`} className="text-sm text-sky-700 font-semibold hover:underline" data-testid={`view-job-${a.id}`}>
                        Lihat Lowongan
                      </Link>
                    </div>
                    <Timeline appId={a.id} />
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
