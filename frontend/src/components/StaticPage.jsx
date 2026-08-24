const CONTENT = {
  "tentang-kami": {
    title: "Tentang Kami",
    body: [
      "CirebonKarir.com adalah platform lowongan kerja lokal yang mempertemukan pencari kerja dengan perusahaan dan UMKM di wilayah Cirebon, Majalengka, Kuningan, Indramayu, dan Brebes.",
      "Misi kami adalah mempermudah masyarakat Cirebon dan sekitarnya menemukan pekerjaan yang sesuai, sekaligus membantu perusahaan lokal menemukan kandidat terbaik dengan proses yang sederhana dan cepat.",
      "Setiap lowongan yang tampil di CirebonKarir.com telah melewati proses moderasi oleh tim kami demi keamanan dan kenyamanan para pencari kerja.",
    ],
  },
  "kebijakan-privasi": {
    title: "Kebijakan Privasi",
    body: [
      "Kami menghormati privasi Anda. Data pribadi yang Anda berikan (nama, email, nomor WhatsApp, dan CV) hanya digunakan untuk keperluan proses lamaran kerja.",
      "Data lamaran Anda hanya dapat dilihat oleh perusahaan yang Anda lamar dan admin platform. Kami tidak menjual atau membagikan data pribadi Anda kepada pihak ketiga.",
      "Anda dapat menghubungi kami kapan saja untuk meminta penghapusan akun dan data pribadi Anda.",
    ],
  },
  "syarat-ketentuan": {
    title: "Syarat & Ketentuan",
    body: [
      "Dengan menggunakan CirebonKarir.com, Anda menyetujui syarat dan ketentuan berikut.",
      "Pencari kerja wajib memberikan data yang benar dan tidak menyalahgunakan platform untuk tujuan penipuan. Perusahaan wajib memasang lowongan yang benar-benar tersedia dan tidak memungut biaya apa pun kepada pelamar.",
      "Admin berhak menolak, menghapus, atau memblokir lowongan dan akun yang melanggar ketentuan. CirebonKarir.com tidak bertanggung jawab atas transaksi atau kesepakatan yang terjadi di luar platform.",
    ],
  },
  "hubungi-kami": {
    title: "Hubungi Kami",
    body: [
      "Ada pertanyaan, saran, atau kendala saat menggunakan CirebonKarir.com? Kami siap membantu.",
      "Email: halo@cirebonkarir.com",
      "Jam operasional: Senin - Jumat, 09.00 - 17.00 WIB.",
    ],
  },
};

export default function StaticPage({ page }) {
  const content = CONTENT[page];
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 page-fade" data-testid={`static-page-${page}`}>
      <h1 className="font-display text-3xl font-bold text-slate-900 mb-6">{content.title}</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4">
        {content.body.map((p, i) => (
          <p key={i} className="text-slate-600 leading-relaxed">{p}</p>
        ))}
      </div>
    </div>
  );
}
