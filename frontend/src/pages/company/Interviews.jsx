import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Crown, Loader2, MapPin, Video, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { INTERVIEW_STATUS } from "../../lib/constants";

const TABS = [
  { value: "", label: "Semua" },
  { value: "scheduled", label: "Terjadwal" },
  { value: "confirmed", label: "Terkonfirmasi" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Interviews() {
  const [tab, setTab] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/company/interviews", { params: tab ? { status: tab } : {} })
      .then((r) => { setItems(r.data); setForbidden(false); })
      .catch((err) => { if (err?.response?.status === 403) setForbidden(true); })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setStatus = async (iv, status) => {
    try {
      await api.post(`/company/interviews/${iv.id}/status`, { status });
      toast.success("Status interview diperbarui");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const remove = async (iv) => {
    if (!window.confirm(`Hapus jadwal interview ${iv.candidate_name}?`)) return;
    try {
      await api.delete(`/company/interviews/${iv.id}`);
      toast.success("Interview dihapus");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Interview">
      <div data-testid="interviews-page">
        <div className="flex flex-wrap gap-2 mb-5" data-testid="interview-tabs">
          {TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${tab === t.value ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
              data-testid={`interview-tab-${t.value || "all"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {forbidden ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center" data-testid="interview-upgrade-prompt">
            <Crown className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Fitur Member Perusahaan</h3>
            <p className="text-sm text-slate-500 mt-1">Interview Management tersedia untuk Member Perusahaan.</p>
            <Link to="/company/membership" className="mt-5 inline-flex items-center h-11 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700" data-testid="interview-upgrade-btn">
              Upgrade Member
            </Link>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-interviews">
            <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada jadwal interview</h3>
            <p className="text-sm text-slate-500 mt-1">
              Jadwalkan interview dari halaman <Link to="/company/applicants" className="text-sky-700 font-semibold">Pelamar</Link>.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="interviews-list">
            {items.map((iv) => (
              <div key={iv.id} className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`interview-${iv.id}`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold text-slate-900">{iv.candidate_name}</h3>
                      <StatusBadge status={iv.status} map={INTERVIEW_STATUS} />
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${iv.method === "online" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                        {iv.method === "online" ? "Online" : "Offline"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{iv.job_title}</p>
                    <p className="text-sm font-medium text-sky-700 mt-1.5">{formatDateTime(iv.scheduled_at)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {iv.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {iv.location}</span>}
                      {iv.link && (
                        <a href={iv.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                          <Video className="h-3.5 w-3.5" /> Link meeting
                        </a>
                      )}
                    </div>
                    {iv.notes && <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{iv.notes}</p>}
                  </div>
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <select value={iv.status} onChange={(e) => setStatus(iv, e.target.value)}
                      className="h-10 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                      data-testid={`interview-status-${iv.id}`}>
                      {Object.entries(INTERVIEW_STATUS).map(([val, conf]) => (
                        <option key={val} value={val}>{conf.label}</option>
                      ))}
                    </select>
                    <button onClick={() => remove(iv)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100" aria-label="Hapus interview" data-testid={`interview-delete-${iv.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
