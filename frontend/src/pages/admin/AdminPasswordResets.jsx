import { useEffect, useState, useCallback } from "react";
import { Loader2, KeyRound, Check, X } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { formatDate } from "../../lib/format";

const TABS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "completed", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

const STATUS_CLS = {
  pending: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};
const STATUS_LABEL = { pending: "Menunggu", completed: "Selesai", rejected: "Ditolak" };

export default function AdminPasswordResets() {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(() => {
    setLoading(true);
    api.get("/admin/password-resets", { params: tab ? { status: tab } : {} })
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const complete = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/admin/password-resets/${target.id}/complete`, { new_password: newPassword });
      toast.success(`Password ${target.email} berhasil direset. Sampaikan password baru ke pengguna via WhatsApp/email.`);
      setTarget(null);
      setNewPassword("");
      fetchItems();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const reject = async (req) => {
    if (!window.confirm(`Tolak permintaan reset password dari ${req.email}?`)) return;
    try {
      await api.post(`/admin/password-resets/${req.id}/reject`);
      toast.success("Permintaan ditolak");
      fetchItems();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Reset Password">
      <div data-testid="admin-password-resets-page">
        <div className="flex flex-wrap gap-2 mb-5" data-testid="reset-tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.value ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
              data-testid={`reset-tab-${t.value || "all"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" data-testid="no-reset-requests">
            <KeyRound className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Tidak ada permintaan reset password pada kategori ini.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="reset-requests-table">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">Pengguna</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Tanggal</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((req) => (
                    <tr key={req.id} data-testid={`reset-row-${req.id}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{req.name}</p>
                        <p className="text-xs text-slate-500">{req.email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{req.role === "company" ? "Perusahaan" : "Pencari Kerja"}</td>
                      <td className="px-5 py-3.5 text-slate-500">{formatDate(req.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLS[req.status] || "bg-slate-100 text-slate-600"}`} data-testid={`reset-status-${req.id}`}>
                          {STATUS_LABEL[req.status] || req.status}
                        </span>
                        {req.completed_by && <p className="text-xs text-slate-400 mt-1">oleh {req.completed_by}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        {req.status === "pending" && (
                          <div className="flex gap-1.5">
                            <button onClick={() => { setTarget(req); setNewPassword(""); }} title="Set password baru"
                              className="inline-flex h-8 px-3 items-center justify-center gap-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-semibold"
                              data-testid={`reset-complete-${req.id}`}>
                              <Check className="h-4 w-4" /> Reset
                            </button>
                            <button onClick={() => reject(req)} title="Tolak"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                              data-testid={`reset-reject-${req.id}`}>
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {target && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setTarget(null)} data-testid="reset-modal">
          <form onSubmit={complete} className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-slate-900">Reset Password — {target.name}</h3>
            <p className="text-sm text-slate-500 mt-1.5">
              Masukkan password sementara baru untuk <b>{target.email}</b>. Sampaikan password ini ke pengguna secara manual (WhatsApp/email).
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru (min. 6 karakter)</label>
              <input type="text" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Contoh: cirebon123" className={inputCls} data-testid="reset-new-password-input" />
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setTarget(null)} className="flex-1 h-11 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700" data-testid="reset-cancel-btn">
                Batal
              </button>
              <button type="submit" disabled={saving} className="flex-1 h-11 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 inline-flex items-center justify-center gap-2" data-testid="reset-submit-btn">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Reset Password
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
