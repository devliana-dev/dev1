import { useCallback, useEffect, useState } from "react";
import { BellPlus, Loader2, Trash2, BellRing } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { CANDIDATE_MENU } from "./menu";
import { LOCATIONS, JOB_TYPES, CATEGORIES } from "../../lib/constants";
import { formatDate } from "../../lib/format";

const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function JobAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ q: "", location: "", category: "", job_type: "" });

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/candidate/job-alerts")
      .then((r) => setAlerts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/candidate/job-alerts", form);
      toast.success("Job Alert dibuat. Anda akan menerima notifikasi saat ada lowongan yang cocok.");
      setForm({ q: "", location: "", category: "", job_type: "" });
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/candidate/job-alerts/${id}`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Job Alert dihapus");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Job Alert">
      <div className="max-w-3xl" data-testid="job-alerts-page">
        <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 p-6" data-testid="job-alert-form">
          <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
            <BellPlus className="h-5 w-5 text-sky-600" /> Buat Job Alert
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Isi minimal satu kriteria. Notifikasi dikirim ke Notification Center saat ada lowongan baru yang cocok.
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Posisi / Kata kunci</label>
              <input value={form.q} onChange={set("q")} placeholder="Contoh: Operator Produksi" className={inputCls} data-testid="alert-q-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lokasi</label>
              <select value={form.location} onChange={set("location")} className={inputCls} data-testid="alert-location-select">
                <option value="">Semua lokasi</option>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori</label>
              <select value={form.category} onChange={set("category")} className={inputCls} data-testid="alert-category-select">
                <option value="">Semua kategori</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipe Pekerjaan</label>
              <select value={form.job_type} onChange={set("job_type")} className={inputCls} data-testid="alert-type-select">
                <option value="">Semua tipe</option>
                {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="mt-5 h-11 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60 inline-flex items-center gap-2" data-testid="alert-submit-btn">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Job Alert
          </button>
        </form>

        <div className="mt-6" data-testid="job-alerts-list">
          <h3 className="font-display font-semibold text-slate-900 mb-3">Job Alert Aktif</h3>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-sky-600" /></div>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center" data-testid="no-job-alerts">
              <BellRing className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Belum ada job alert.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3" data-testid={`job-alert-${a.id}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {a.q && <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-100">{a.q}</span>}
                      {a.location && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{a.location}</span>}
                      {a.category && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{a.category}</span>}
                      {a.job_type && <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">{a.job_type}</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">Dibuat {formatDate(a.created_at)}</p>
                  </div>
                  <button onClick={() => remove(a.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 shrink-0" aria-label="Hapus alert" data-testid={`delete-alert-${a.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
