import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                <Briefcase className="h-5 w-5" />
              </span>
              <span className="font-display font-extrabold text-lg text-white">
                CirebonKarir<span className="text-sky-400">.com</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Temukan peluang kerja terbaik di Cirebon dan sekitarnya.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-3 text-sm">Menu</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/tentang-kami" className="hover:text-white transition-colors" data-testid="footer-about-link">Tentang Kami</Link></li>
              <li><Link to="/jobs" className="hover:text-white transition-colors" data-testid="footer-jobs-link">Cari Lowongan</Link></li>
              <li><Link to="/untuk-perusahaan" className="hover:text-white transition-colors" data-testid="footer-companies-link">Untuk Perusahaan</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors" data-testid="footer-blog-link">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-3 text-sm">Lainnya</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/kebijakan-privasi" className="hover:text-white transition-colors" data-testid="footer-privacy-link">Kebijakan Privasi</Link></li>
              <li><Link to="/syarat-ketentuan" className="hover:text-white transition-colors" data-testid="footer-terms-link">Syarat &amp; Ketentuan</Link></li>
              <li><Link to="/hubungi-kami" className="hover:text-white transition-colors" data-testid="footer-contact-link">Hubungi Kami</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-sm text-slate-500">
          © 2026 CirebonKarir.com
        </div>
      </div>
    </footer>
  );
}
