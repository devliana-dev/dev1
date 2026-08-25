import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, Briefcase, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { formatApiError } from "../../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      const from = location.state?.from;
      if (from) navigate(from, { replace: true });
      else if (user.role === "admin" || user.role === "owner") navigate("/admin", { replace: true });
      else if (user.role === "company") navigate("/company/dashboard", { replace: true });
      else navigate("/candidate/dashboard", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 page-fade" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white mb-4">
            <Briefcase className="h-6 w-6" />
          </span>
          <h1 className="font-display text-2xl font-bold text-slate-900">Masuk ke Akun Anda</h1>
          <p className="text-sm text-slate-500 mt-1">Selamat datang kembali di CirebonKarir.com</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5" data-testid="login-form">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" data-testid="login-error">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="login-email-input" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-sky-700 font-medium hover:underline" data-testid="forgot-password-link">Lupa password?</Link>
            </div>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="login-password-input" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full h-12 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
            data-testid="login-submit-btn">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Login
          </button>
          <div className="text-center text-sm text-slate-500 space-y-2">
            <p>Belum punya akun? <Link to="/register" className="text-sky-700 font-semibold hover:underline" data-testid="goto-register-link">Daftar Pencari Kerja</Link></p>
            <p><Link to="/register-company" className="text-sky-700 font-semibold hover:underline" data-testid="goto-register-company-link">Daftar Sebagai Perusahaan</Link></p>
          </div>
        </form>

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900" data-testid="demo-accounts-info">
            <p className="font-semibold flex items-center gap-1.5 mb-1.5"><Info className="h-3.5 w-3.5" /> Akun Demo</p>
            <p>Admin: muhamadwahid.sih@gmail.com / admin123</p>
            <p>Perusahaan: demo@perusahaan.com / password123</p>
            <p>Pencari Kerja: budi@example.com / password123</p>
          </div>
        )}
      </div>
    </div>
  );
}
