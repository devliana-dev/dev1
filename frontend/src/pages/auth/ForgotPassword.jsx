import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import api, { formatApiError } from "../../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 page-fade" data-testid="forgot-password-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white mb-4">
            <KeyRound className="h-6 w-6" />
          </span>
          <h1 className="font-display text-2xl font-bold text-slate-900">Lupa Password</h1>
          <p className="text-sm text-slate-500 mt-1">Admin kami akan membantu mereset password akun Anda</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 text-center" data-testid="forgot-password-success">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="font-display font-semibold text-slate-900 text-lg">Permintaan Terkirim</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Jika email terdaftar, permintaan reset password telah diteruskan ke admin. Admin akan menghubungi Anda
              melalui WhatsApp/email terdaftar dengan password sementara yang baru.
            </p>
            <Link to="/login" className="mt-6 inline-flex items-center justify-center h-11 px-6 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors" data-testid="back-to-login-btn">
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5" data-testid="forgot-password-form">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" data-testid="forgot-password-error">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Terdaftar</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com"
                className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" data-testid="forgot-email-input" />
              <p className="text-xs text-slate-400 mt-2">Masukkan email akun pencari kerja atau perusahaan Anda.</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              data-testid="forgot-submit-btn">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirim Permintaan Reset
            </button>
            <p className="text-center text-sm text-slate-500">
              Ingat password Anda? <Link to="/login" className="text-sky-700 font-semibold hover:underline" data-testid="goto-login-link">Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
