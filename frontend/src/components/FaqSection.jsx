import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus } from "lucide-react";

const FAQS = [
  {
    q: "Bagaimana cara mencari loker di Cirebon lewat CirebonKarir.com?",
    a: "Gunakan kolom pencarian di beranda atau halaman Lowongan. Ketik posisi yang Anda inginkan, lalu persempit hasil dengan filter lokasi, kategori, tipe pekerjaan, pendidikan, hingga rentang gaji. Semua bisa dilakukan tanpa login.",
  },
  {
    q: "Apakah CirebonKarir.com gratis untuk pencari kerja?",
    a: "Ya, 100% gratis untuk mendaftar, membuat Profil Karier, mencari, dan melamar lowongan. Tersedia paket Career Pro opsional (Rp10.000/30 hari) untuk Anda yang ingin CV profesional, semua template premium, dan kuota One-Click Apply lebih besar.",
  },
  {
    q: "Wilayah mana saja yang dicakup CirebonKarir.com?",
    a: "Kami fokus pada wilayah Ciayumajakuning: Kota Cirebon, Kabupaten Cirebon, Majalengka, Kuningan, Indramayu, dan Brebes — sehingga lowongan yang tampil benar-benar dekat dengan tempat tinggal Anda.",
  },
  {
    q: "Bagaimana cara perusahaan memasang lowongan kerja?",
    a: "Daftar akun perusahaan, lengkapi profil, lalu buat lowongan. Setiap lowongan melewati moderasi admin sebelum tampil demi keamanan pelamar. Perusahaan mendapat 1 lowongan gratis setiap bulan dengan masa tayang 7 hari, dan selama Program Launching seluruh fitur Member bisa digunakan gratis.",
  },
  {
    q: "Apa itu Program Launching CirebonKarir?",
    a: "Selama periode launching, semua perusahaan otomatis mendapatkan akses fitur Member secara gratis: masa tayang lowongan 30 hari, manajemen pelamar lengkap, shortlist kandidat, jadwal interview, hingga statistik rekrutmen. Setelah program berakhir, akun kembali ke Paket Free dan dapat upgrade ke Member Perusahaan (Rp50.000/3 bulan).",
  },
  {
    q: "Apakah lowongan diperbarui setiap hari?",
    a: "Ya. Lowongan baru masuk dan diverifikasi admin setiap hari. Aktifkan Job Alert di dashboard Anda agar mendapat notifikasi otomatis saat ada lowongan baru yang cocok dengan kriteria Anda.",
  },
  {
    q: "Bagaimana saya tahu lamaran saya sedang diproses?",
    a: "Setiap perubahan status — dilihat perusahaan, diproses, shortlist, interview, diterima, atau ditolak — tercatat di halaman Lamaran Saya lengkap dengan linimasa, dan Anda menerima notifikasi secara real-time.",
  },
  {
    q: "Apakah data pribadi saya aman?",
    a: "Aman. Nomor HP dan email Anda hanya terlihat oleh perusahaan yang lowongannya Anda lamar. Profil Karier dapat diatur Privat atau Terbuka, dan catatan internal perusahaan tidak pernah ditampilkan ke pelamar.",
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-slate-50 border-t border-slate-200" data-testid="faq-section">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">FAQ</h2>
          <span className="mt-3 inline-block h-1 w-12 rounded-full bg-sky-600" />
          <p className="text-sm text-slate-500 mt-3">Pertanyaan yang sering diajukan seputar CirebonKarir.com</p>
        </div>

        <div className="mt-9 space-y-3" data-testid="faq-list">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="rounded-xl overflow-hidden shadow-sm" data-testid={`faq-item-${i}`}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm sm:text-base font-semibold transition-colors ${
                    isOpen ? "bg-slate-900 text-white" : "bg-sky-600 text-white hover:bg-sky-700"
                  }`}
                  data-testid={`faq-question-${i}`}
                >
                  {item.q}
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-colors ${isOpen ? "bg-white/10" : "bg-white/15"}`}>
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                {isOpen && (
                  <div className="bg-white border border-t-0 border-slate-200 px-5 py-4 text-sm text-slate-600 leading-relaxed" data-testid={`faq-answer-${i}`}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Masih ada pertanyaan?{" "}
          <Link to="/hubungi-kami" className="font-semibold text-sky-700 hover:underline" data-testid="faq-contact-link">
            Hubungi tim kami
          </Link>
        </p>
      </div>
    </section>
  );
}
