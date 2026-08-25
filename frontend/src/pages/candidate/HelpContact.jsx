import { Link } from "react-router-dom";
import { HelpCircle, MessageCircle, FileQuestion, Info } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { CANDIDATE_MENU } from "./menu";

const ITEMS = [
  {
    to: "/hubungi-kami",
    icon: MessageCircle,
    title: "Hubungi Kami",
    desc: "Butuh bantuan langsung? Kirim pesan ke tim CirebonKarir melalui halaman kontak.",
    testId: "help-contact-link",
  },
  {
    to: "/",
    icon: FileQuestion,
    title: "FAQ / Pertanyaan Umum",
    desc: "Lihat jawaban pertanyaan yang paling sering ditanyakan di bagian FAQ halaman utama.",
    testId: "help-faq-link",
  },
  {
    to: "/tentang-kami",
    icon: Info,
    title: "Tentang CirebonKarir",
    desc: "Kenali platform lowongan kerja lokal Cirebon dan cara kami membantumu.",
    testId: "help-about-link",
  },
];

export default function HelpContact() {
  return (
    <DashboardLayout menu={CANDIDATE_MENU} title="Bantuan & Kontak">
      <div className="max-w-2xl" data-testid="help-page">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 mb-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-4">
            <HelpCircle className="h-6 w-6" />
          </span>
          <h2 className="font-display text-xl font-bold text-slate-900">Ada yang bisa kami bantu?</h2>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Tim CirebonKarir siap membantu kendala seputar akun, lamaran, CV, Career Pro, maupun referral & komisi.
          </p>
        </div>
        <div className="space-y-4">
          {ITEMS.map((i) => (
            <Link
              key={i.to + i.title}
              to={i.to}
              className="flex items-start gap-4 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5 hover:border-sky-200 hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow,border-color] duration-200"
              data-testid={i.testId}
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shrink-0">
                <i.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display font-semibold text-slate-900">{i.title}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{i.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
