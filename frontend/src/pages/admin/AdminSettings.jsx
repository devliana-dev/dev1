import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";

const FIELDS = [
  { key: "free_apply_limit", label: "Kuota One-Click Apply — Free", hint: "Per bulan kalender untuk pelamar gratis" },
  { key: "pro_apply_limit", label: "Kuota One-Click Apply — Career Pro", hint: "Per periode aktif 30 hari" },
  { key: "free_post_limit", label: "Kuota Posting Gratis Perusahaan", hint: "Per bulan kalender" },
  { key: "free_job_days", label: "Masa Tayang Lowongan — Free (hari)", hint: "Berlaku untuk lowongan baru" },
  { key: "member_job_days", label: "Masa Tayang Lowongan — Member (hari)", hint: "Berlaku untuk Member & Launch Free" },
  { key: "referral_commission", label: "Komisi Referral (Rp)", hint: "Komisi per pembelian Career Pro dari referral" },
  { key: "min_withdrawal", label: "Minimum Withdrawal (Rp)", hint: "Saldo minimum untuk pengajuan penarikan" },
  { key: "holding_days", label: "Holding Period Komisi (hari)", hint: "Komisi approved otomatis menjadi tersedia setelah periode ini" },
];

const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    api.get("/admin/settings")
      .then((r) => setSettings(r.data))
      .catch((err) => { if (err?.response?.status === 403) setForbidden(true); });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = Object.fromEntries(FIELDS.map((f) => [f.key, Number(settings[f.key]) || 0]));
      await api.put("/admin/settings", payload);
      toast.success("System settings disimpan. Business rules baru langsung berlaku.");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout menu={ADMIN_MENU} title="System Settings">
      <div className="max-w-2xl" data-testid="admin-settings-page">
        {forbidden ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center" data-testid="settings-forbidden">
            <Settings className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Akses Ditolak</h3>
            <p className="text-sm text-slate-500 mt-1">Anda memerlukan permission System Settings untuk mengubah konfigurasi bisnis.</p>
          </div>
        ) : !settings ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : (
          <form onSubmit={save} className="bg-white rounded-xl border border-slate-200 p-6" data-testid="settings-form">
            <h3 className="font-display font-semibold text-slate-900">Business Rules</h3>
            <p className="text-sm text-slate-500 mt-1">
              Semua nilai divalidasi dan diterapkan di backend (server time). Perubahan harga/durasi paket ada di menu Monetization → Produk & Harga.
            </p>
            <div className="mt-5 space-y-4">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                  <input type="number" min="1" required value={settings[f.key]} onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })} className={inputCls} data-testid={`setting-${f.key}`} />
                  <p className="text-xs text-slate-400 mt-1">{f.hint}</p>
                </div>
              ))}
            </div>
            <button type="submit" disabled={saving} className="mt-6 h-11 px-6 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-2" data-testid="settings-save-btn">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan Settings
            </button>
            <p className="text-xs text-slate-400 mt-3">Terakhir diubah oleh {settings.updated_by || "system"}</p>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
