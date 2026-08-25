import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { CANDIDATE_MENU } from "./menu";
import { formatSalary, logoUrl, timeAgo } from "../../lib/format";

export default function SavedJobs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/candidate/saved-jobs")
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const remove = async (jobId) => {
    try {
      await api.delete(`/candidate/saved-jobs/${jobId}`);
      setItems((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Lowongan dihapus dari simpanan");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Lowongan Tersimpan">
      <div data-testid="saved-jobs-page">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-saved-jobs">
            <Heart className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Belum ada lowongan tersimpan</h3>
            <p className="text-sm text-slate-500 mt-1">Simpan lowongan yang menarik agar mudah dibuka kembali.</p>
            <Link to="/jobs" className="inline-flex items-center h-11 px-6 mt-5 rounded-lg bg-slate-900 text-white text-sm font-semibold" data-testid="browse-jobs-btn">
              Cari Lowongan
            </Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="saved-jobs-list">
            {items.map((j) => (
              <div key={j.id} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex items-center gap-4" data-testid={`saved-job-${j.id}`}>
                <img src={logoUrl(j.company_logo, j.company_name)} alt="" className="h-12 w-12 rounded-lg object-cover border border-slate-100 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/jobs/${j.slug}`} className="font-display font-semibold text-slate-900 hover:text-sky-700 truncate">
                      {j.title}
                    </Link>
                    {j.status !== "active" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Ditutup</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>{j.company_name}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span>
                    <span>{formatSalary(j.salary_min, j.salary_max)}</span>
                    <span>Disimpan {timeAgo(j.saved_at)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/jobs/${j.slug}`} className="hidden sm:inline-flex items-center h-9 px-4 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700" data-testid={`open-saved-${j.id}`}>
                    Buka
                  </Link>
                  <button onClick={() => remove(j.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100" aria-label="Hapus" data-testid={`remove-saved-${j.id}`}>
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
