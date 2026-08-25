import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api, { formatApiError } from "../../lib/api";
import { COMPANY_MENU } from "./menu";
import { APPLICATION_STATUS } from "../../lib/constants";
import { fileUrl, formatDate, imageUrl } from "../../lib/format";

export default function Shortlists() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/company/shortlists")
      .then((r) => { setItems(r.data); setForbidden(false); })
      .catch((err) => { if (err?.response?.status === 403) setForbidden(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const remove = async (app) => {
    try {
      await api.post(`/company/applications/${app.id}/shortlist`, { shortlisted: false });
      setItems((prev) => prev.filter((a) => a.id !== app.id));
      toast.success(`${app.name} dihapus dari shortlist`);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={COMPANY_MENU} title="Kandidat Shortlist">
      <div data-testid="shortlists-page">
        {forbidden ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center" data-testid="shortlist-upgrade-prompt">
            <Crown className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Fitur Member Perusahaan</h3>
            <p className="text-sm text-slate-500 mt-1">Shortlist kandidat tersedia untuk Member Perusahaan.</p>
            <Link to="/company/membership" className="mt-5 inline-flex items-center h-11 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700" data-testid="shortlist-upgrade-btn">
              Upgrade Member
            </Link>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-shortlists">
            <Star className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada kandidat pilihan</h3>
            <p className="text-sm text-slate-500 mt-1">
              Tandai pelamar dengan bintang di halaman <Link to="/company/applicants" className="text-sky-700 font-semibold">Pelamar</Link>.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="shortlists-list">
            {items.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4" data-testid={`shortlist-${a.id}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {imageUrl(a.career_profile?.photo_path) ? (
                    <img src={imageUrl(a.career_profile.photo_path)} alt="" className="h-12 w-12 rounded-xl object-cover border border-slate-100" />
                  ) : (
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
                      <Star className="h-5 w-5 fill-current" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold text-slate-900">{a.name}</h3>
                      <StatusBadge status={a.status} map={APPLICATION_STATUS} />
                      {a.match?.score > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700" data-testid={`shortlist-match-${a.id}`}>
                          {a.match.score}% cocok
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.job_title} · {a.career_profile?.city || "-"} · Melamar {formatDate(a.created_at)}
                    </p>
                    {a.career_profile?.skills?.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {a.career_profile.skills.map((s) => s.name).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {a.cv_path && (
                    <a href={fileUrl(a.cv_path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid={`shortlist-cv-${a.id}`}>
                      Lihat CV
                    </a>
                  )}
                  <Link to={`/company/applicants?job_id=${a.job_id}`} className="inline-flex items-center h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800" data-testid={`shortlist-open-${a.id}`}>
                    Detail
                  </Link>
                  <button onClick={() => remove(a)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100" aria-label="Hapus dari shortlist" data-testid={`shortlist-remove-${a.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
