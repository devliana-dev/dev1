import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Building2, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { formatApiError } from "../../lib/api";

export default function RegisterCompany() {
  const { registerCompany } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ company_name: "", email: "", phone: "", pic_name: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Konfirmasi password tidak sama");
      return;
    }
    setLoading(true);
    try {
      await registerCompany({ company_name: form.company_name, email: form.email, phone: form.phone, pic_name: form.pic_name, password: form.password });
      toast.success("Pendaftaran berhasil! Lengkapi profil perusahaan Anda.");
      navigate("/company/profile", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 page-fade" data-testid="register-company-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white mb-4">
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="font-display text-2xl font-bold text-slate-900">Daftar Sebagai Perusahaan</h1>
          <p className="text-sm text-slate-500 mt-1">Pasang lowongan gratis dan temukan kandidat terbaik</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4" data-testid="register-role-choice">
          <Link to="/register" className="h-12 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors" data-testid="role-candidate-choice">
            <User className="h-4 w-4" /> Pencari Kerja
          </Link>
          <div className="h-12 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-1.5" data-testid="role-company-active">
            <Building2 className="h-4 w-4" /> Perusahaan
          </div>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4" data-testid="register-company-form">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" data-testid="register-company-error">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Perusahaan</label>
            <input required value={form.company_name} onChange={set("company_name")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="rc-name-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input required type="email" value={form.email} onChange={set("email")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="rc-email-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor WhatsApp</label>
            <input required value={form.phone} onChange={set("phone")} placeholder="08xxxxxxxxxx" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="rc-phone-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama PIC</label>
            <input required value={form.pic_name} onChange={set("pic_name")} placeholder="Nama penanggung jawab" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="rc-pic-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input required type="password" minLength={6} value={form.password} onChange={set("password")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="rc-password-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password</label>
            <input required type="password" value={form.confirm} onChange={set("confirm")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="rc-confirm-input" />
          </div>
          <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2" data-testid="rc-submit-btn">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Daftar Perusahaan
          </button>
          <p className="text-center text-sm text-slate-500">
            Sudah punya akun? <Link to="/login" className="text-sky-700 font-semibold hover:underline" data-testid="rc-goto-login-link">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
