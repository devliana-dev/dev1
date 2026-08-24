import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, User, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { formatApiError } from "../../lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
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
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate("/candidate/dashboard", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 page-fade" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900">Buat Akun Baru</h1>
          <p className="text-sm text-slate-500 mt-1">Buat akun gratis dan mulai melamar pekerjaan</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4" data-testid="register-role-choice">
          <div className="h-12 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-1.5" data-testid="role-candidate-active">
            <User className="h-4 w-4" /> Pencari Kerja
          </div>
          <Link to="/register-company" className="h-12 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors" data-testid="role-company-choice">
            <Building2 className="h-4 w-4" /> Perusahaan
          </Link>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4" data-testid="register-form">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" data-testid="register-error">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
            <input required value={form.name} onChange={set("name")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="register-name-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input required type="email" value={form.email} onChange={set("email")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="register-email-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor WhatsApp</label>
            <input required value={form.phone} onChange={set("phone")} placeholder="08xxxxxxxxxx" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="register-phone-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input required type="password" minLength={6} value={form.password} onChange={set("password")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="register-password-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password</label>
            <input required type="password" value={form.confirm} onChange={set("confirm")} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="register-confirm-input" />
          </div>
          <button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2" data-testid="register-submit-btn">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Daftar
          </button>
          <p className="text-center text-sm text-slate-500">
            Sudah punya akun? <Link to="/login" className="text-sky-700 font-semibold hover:underline" data-testid="goto-login-link">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
