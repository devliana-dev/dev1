import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, Plus, X, Ban, RotateCcw, Pencil, Crown } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { ADMIN_MENU } from "./menu";
import { formatDate } from "../../lib/format";

const PERMS = [
  { key: "users", label: "Kelola Pelamar" },
  { key: "companies", label: "Kelola Perusahaan" },
  { key: "jobs", label: "Kelola Lowongan" },
  { key: "monetization", label: "Monetisasi" },
  { key: "settings", label: "System Settings" },
  { key: "export", label: "Export Data" },
];

const inputCls = "w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500";

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", permissions: [] });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/admin/staff")
      .then((r) => { setStaff(r.data); setForbidden(false); })
      .catch((err) => { if (err?.response?.status === 403) setForbidden(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePerm = (key) =>
    setForm((f) => ({ ...f, permissions: f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key] }));

  const openCreate = () => {
    setForm({ name: "", email: "", password: "", permissions: [] });
    setModal({ mode: "create" });
  };

  const openEdit = (s) => {
    setForm({ name: s.name, email: s.email, password: "", permissions: s.permissions || [] });
    setModal({ mode: "edit", staff: s });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === "create") {
        await api.post("/admin/staff", form);
        toast.success("Akun admin dibuat");
      } else {
        await api.put(`/admin/staff/${modal.staff.id}`, { name: form.name, permissions: form.permissions });
        toast.success("Admin diperbarui");
      }
      setModal(null);
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (s) => {
    try {
      await api.post(`/admin/staff/${s.id}/status`, { blocked: !s.blocked });
      toast.success(s.blocked ? "Admin diaktifkan kembali" : "Admin dinonaktifkan");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <DashboardLayout menu={ADMIN_MENU} title="Tim Admin">
      <div data-testid="admin-staff-page">
        {forbidden ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center" data-testid="staff-owner-only">
            <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-slate-900">Khusus Owner</h3>
            <p className="text-sm text-slate-500 mt-1">Hanya akun Owner yang dapat mengelola tim admin.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : (
          <>
            <div className="mb-4 flex justify-end">
              <button onClick={openCreate} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800" data-testid="staff-add-btn">
                <Plus className="h-4 w-4" /> Tambah Admin
              </button>
            </div>
            <div className="space-y-3" data-testid="staff-list">
              {staff.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4" data-testid={`staff-row-${s.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold text-slate-900">{s.name}</h3>
                      {s.role === "owner" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                          <Crown className="h-3 w-3" /> Owner
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">Admin</span>
                      )}
                      {s.blocked && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Nonaktif</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{s.email} · Terdaftar {formatDate(s.created_at)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Permission: {(s.permissions || []).includes("all") ? "Semua" : (s.permissions || []).join(", ") || "Tidak ada"}
                    </p>
                  </div>
                  {s.role !== "owner" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEdit(s)} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-sky-100 text-sky-700 text-xs font-semibold hover:bg-sky-200" data-testid={`staff-edit-${s.id}`}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => toggleBlock(s)} className={`inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-semibold ${s.blocked ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`} data-testid={`staff-block-${s.id}`}>
                        {s.blocked ? <><RotateCcw className="h-3.5 w-3.5" /> Aktifkan</> : <><Ban className="h-3.5 w-3.5" /> Nonaktifkan</>}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {modal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setModal(null)} data-testid="staff-modal">
            <form onSubmit={submit} className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-slate-900">{modal.mode === "create" ? "Tambah Admin" : "Edit Admin"}</h3>
                <button type="button" onClick={() => setModal(null)} aria-label="Tutup" className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} data-testid="staff-name-input" />
                </div>
                {modal.mode === "create" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} data-testid="staff-email-input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                      <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} data-testid="staff-password-input" />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Permission</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PERMS.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={form.permissions.includes(p.key)} onChange={() => togglePerm(p.key)} className="h-4 w-4 rounded border-slate-300 text-sky-600" data-testid={`perm-${p.key}`} />
                        {p.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Tanpa permission, admin hanya dapat melihat data, tidak dapat mengubah.</p>
                </div>
              </div>
              <button type="submit" disabled={saving} className="mt-5 w-full h-11 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60 inline-flex items-center justify-center gap-2" data-testid="staff-save-btn">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
