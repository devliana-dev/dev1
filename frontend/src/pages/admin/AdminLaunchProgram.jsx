import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, PartyPopper, Rocket, Save, Building2, Crown, Star, TimerOff } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";

const toInput = (iso) => (iso ? String(iso).slice(0, 16) : "");
const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function AdminLaunchProgram() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ start_date: "", end_date: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    api.get("/admin/launch-program")
      .then((r) => {
        setData(r.data);
        setForm({
          start_date: toInput(r.data.program.start_date),
          end_date: toInput(r.data.program.end_date),
          is_active: !!r.data.program.is_active,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/launch-program", {
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_active: form.is_active,
      });
      toast.success("Pengaturan Launch Program disimpan");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!data)
    return (
      <DashboardLayout menu={ADMIN_MENU} title="Launch Program">
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
      </DashboardLayout>
    );

  const planCards = [
    { label: "Launch Free", value: data.plan_counts.launch_free, icon: Rocket, cls: "bg-sky-100 text-sky-700", plan: "launch_free", testId: "launch-count-launch-free" },
    { label: "Free", value: data.plan_counts.free, icon: Building2, cls: "bg-slate-100 text-slate-600", plan: "free", testId: "launch-count-free" },
    { label: "Member", value: data.plan_counts.member, icon: Crown, cls: "bg-emerald-100 text-emerald-700", plan: "member", testId: "launch-count-member" },
    { label: "Expired", value: data.plan_counts.expired, icon: TimerOff, cls: "bg-red-100 text-red-600", plan: "expired", testId: "launch-count-expired" },
  ];

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Launch Program">
      <div className="max-w-3xl" data-testid="admin-launch-page">
        <div className={`rounded-xl border p-5 ${data.active ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-slate-100"}`} data-testid="launch-status-card">
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${data.active ? "bg-sky-600 text-white" : "bg-slate-300 text-slate-600"}`}>
              <PartyPopper className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display font-bold text-slate-900" data-testid="launch-status-text">
                {data.active ? "Program Launching sedang AKTIF" : "Program Launching tidak aktif"}
              </p>
              <p className="text-sm text-slate-500">
                {data.active
                  ? `Sisa waktu: ${data.days_remaining} hari. Semua perusahaan mendapatkan akses fitur Member gratis.`
                  : "Perusahaan mengikuti paket masing-masing (Free/Member)."}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={save} className="mt-6 bg-white rounded-xl border border-slate-200 p-6" data-testid="launch-form">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Pengaturan Periode</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Mulai</label>
              <input type="datetime-local" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} data-testid="launch-start-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Berakhir</label>
              <input type="datetime-local" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} data-testid="launch-end-input" />
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" data-testid="launch-active-checkbox" />
            Program aktif (jika dinonaktifkan, semua perusahaan kembali ke paket masing-masing)
          </label>
          <button type="submit" disabled={saving} className="mt-5 h-11 px-6 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60 inline-flex items-center gap-2" data-testid="launch-save-btn">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan Pengaturan
          </button>
          <p className="text-xs text-slate-400 mt-3">
            Terakhir diubah oleh {data.program.updated_by || "system"}. Status perusahaan dihitung otomatis dari tanggal ini (server time).
          </p>
        </form>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {planCards.map((c) => (
            <Link key={c.label} to={`/admin/companies?plan=${c.plan}`} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 transition-colors" data-testid={c.testId}>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.cls}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400 flex items-center gap-1">
          <Star className="h-3.5 w-3.5" /> Total {data.total_companies} perusahaan terdaftar. Klik kartu untuk melihat daftar perusahaan per status paket.
        </p>
      </div>
    </DashboardLayout>
  );
}
