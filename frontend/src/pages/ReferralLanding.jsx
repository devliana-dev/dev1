import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Gift, Loader2, ShieldCheck, Briefcase, FileText } from "lucide-react";
import api from "../lib/api";

export default function ReferralLanding() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/referrals/validate/${code}`)
      .then((r) => {
        setData(r.data);
        if (r.data.valid) {
          localStorage.setItem("ck_referral_code", r.data.code);
        }
      })
      .catch(() => setData({ valid: false }))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center px-4 py-12" data-testid="referral-landing">
      <div className="w-full max-w-md">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
        ) : !data?.valid ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center" data-testid="referral-invalid">
            <Gift className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h1 className="font-display text-xl font-bold text-slate-900">Kode referral tidak valid</h1>
            <p className="text-sm text-slate-500 mt-2">Link yang kamu buka tidak aktif atau sudah tidak berlaku.</p>
            <Link to="/register" className="inline-flex items-center h-11 px-6 mt-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800" data-testid="invalid-register-btn">
              Tetap Daftar Gratis
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm" data-testid="referral-valid">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white">
              <Gift className="h-7 w-7" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold text-slate-900" data-testid="referral-greeting">
              {data.referrer_name} mengundangmu!
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Gabung CirebonKarir.com — platform lowongan kerja lokal Cirebon & Ciayumajakuning.
            </p>
            <div className="mt-5 space-y-2.5 text-left">
              {[
                { icon: Briefcase, text: "Ribuan lowongan terverifikasi admin" },
                { icon: FileText, text: "Profil Karier & CV profesional" },
                { icon: ShieldCheck, text: "Gratis untuk pencari kerja" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
                  <f.icon className="h-5 w-5 text-sky-600 shrink-0" />
                  <p className="text-sm text-slate-700">{f.text}</p>
                </div>
              ))}
            </div>
            <Link
              to={`/register?ref=${data.code}`}
              className="mt-6 inline-flex w-full items-center justify-center h-12 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors"
              data-testid="referral-register-cta"
            >
              Daftar Sekarang — Gratis
            </Link>
            <p className="mt-3 text-xs text-slate-400">Kode referral {data.code} akan terisi otomatis.</p>
          </div>
        )}
      </div>
    </div>
  );
}
