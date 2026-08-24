import { Link } from "react-router-dom";
import { UserPlus, Building2, FilePlus2, ShieldCheck, Rocket, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ForCompanies() {
  const { user } = useAuth();
  const ctaPath = user?.role === "company" ? "/company/jobs/new" : "/register-company";

  return (
    <div className="page-fade">
      <section className="bg-slate-900 py-16 sm:py-24" data-testid="for-companies-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Pasang Lowongan <span className="text-sky-400">Gratis</span>
          </h1>
          <p className="mt-4 text-slate-300 max-w-2xl mx-auto text-base sm:text-lg">
            Jangkau ribuan pencari kerja di Cirebon, Majalengka, Kuningan, Indramayu, dan Brebes. Daftar, lengkapi profil, dan pasang lowongan dalam hitungan menit.
          </p>
          <Link to={ctaPath} className="inline-flex items-center h-12 px-8 mt-8 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-colors" data-testid="for-companies-cta-btn">
            Daftar Perusahaan Sekarang
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center">Cara Kerja</h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[
            { icon: UserPlus, title: "Daftar", desc: "Buat akun perusahaan gratis" },
            { icon: Building2, title: "Lengkapi Profil", desc: "Isi info perusahaan Anda" },
            { icon: FilePlus2, title: "Buat Lowongan", desc: "Isi detail posisi yang dibuka" },
            { icon: ShieldCheck, title: "Moderasi", desc: "Admin meninjau lowongan" },
            { icon: Rocket, title: "Tayang", desc: "Lowongan tampil & pelamar masuk" },
          ].map((s, i) => (
            <div key={s.title} className="bg-white rounded-xl border border-slate-200 p-6 text-center" data-testid={`step-${i + 1}`}>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display font-semibold text-slate-900 mt-3 text-sm">{i + 1}. {s.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Kenapa memasang lowongan di CirebonKarir.com?</h2>
            <ul className="mt-6 space-y-3">
              {[
                "100% gratis untuk perusahaan dan UMKM",
                "Lowongan dimoderasi agar dipercaya pencari kerja",
                "Pelamar langsung terhubung via WhatsApp",
                "Kelola lowongan dan pelamar dari satu dashboard",
                "Badge Perusahaan Terverifikasi meningkatkan kepercayaan",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-slate-600">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <Link to={ctaPath} className="inline-flex items-center h-12 px-8 mt-8 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors" data-testid="for-companies-cta-bottom-btn">
              Pasang Lowongan Gratis
            </Link>
          </div>
          <img
            src="https://images.pexels.com/photos/8101502/pexels-photo-8101502.jpeg"
            alt="Tim profesional"
            className="rounded-2xl object-cover w-full h-72 md:h-96"
          />
        </div>
      </section>
    </div>
  );
}
