import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "../../components/DashboardLayout";
import api, { formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { CANDIDATE_MENU } from "./menu";

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      toast.error("Konfirmasi password baru tidak sama");
      return;
    }
    setSaving(true);
    try {
      await api.put("/auth/change-password", { old_password: form.old_password, new_password: form.new_password });
      toast.success("Password berhasil diubah. Silakan login kembali dengan password baru.");
      await logout();
      navigate("/login");
    } catch (err) {
      toast.error(formatApiError(err));
      setSaving(false);
    }
  };

  const inputCls = "w-full h-11 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Pengaturan Akun">
      <div className="max-w-2xl space-y-6" data-testid="account-settings-page">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6" data-testid="account-info-card">
          <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-600" /> Informasi Akun
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Nama</dt>
              <dd className="font-semibold text-slate-900 text-right">{user?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-semibold text-slate-900 text-right">{user?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Role</dt>
              <dd className="font-semibold text-slate-900 text-right">Pencari Kerja</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-400">Untuk mengubah nama, email, atau nomor HP, gunakan halaman Profil Karier.</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 space-y-4" data-testid="change-password-form">
          <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-sky-600" /> Ganti Password
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Lama</label>
            <input type="password" required value={form.old_password} onChange={set("old_password")} className={inputCls} data-testid="old-password-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru (min. 6 karakter)</label>
            <input type="password" required minLength={6} value={form.new_password} onChange={set("new_password")} className={inputCls} data-testid="new-password-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
            <input type="password" required value={form.confirm} onChange={set("confirm")} className={inputCls} data-testid="confirm-password-input" />
          </div>
          <p className="text-xs text-slate-400">Setelah password diubah, semua sesi login lama akan berakhir dan kamu perlu login kembali.</p>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 disabled:opacity-60 transition-colors" data-testid="change-password-btn">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Password Baru
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
