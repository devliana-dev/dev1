# PRD — CirebonKarir.com

## Problem Statement (asli)
Website lowongan kerja lokal CirebonKarir.com yang mempertemukan pencari kerja dengan perusahaan/UMKM di wilayah Cirebon dan sekitarnya (Majalengka, Kuningan, Indramayu, Brebes). Simpel, cepat, mobile-first, Bahasa Indonesia, profesional. 3 role: candidate, company, admin. Alur lengkap: publik melihat/mencari lowongan tanpa login → login → melamar → tracking status; perusahaan daftar → profil → buat lowongan → moderasi admin → lowongan aktif → kelola pelamar via WhatsApp; admin moderasi semuanya.

## Arsitektur
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB (Motor) via MONGO_URL/DB_NAME dari .env, semua route berprefix `/api`.
- **Frontend**: React (CRA+craco), Tailwind + Shadcn, React Router, axios (withCredentials + Bearer fallback via localStorage `ck_token`), sonner toast.
- **Auth**: JWT 7 hari, bcrypt hashing, httpOnly cookie + Bearer, brute-force lockout (5x gagal = 15 menit), role-based access control (candidate/company/admin).
- **File storage**: Emergent Object Storage (CV PDF/DOC & logo) via `/api/upload-*` dan `/api/files/{path}` (CV dilindungi auth + ownership).
- **Koleksi MongoDB**: users, companies, jobs, applications, categories, files, login_attempts.

## User Personas
1. **Pencari Kerja** — browsing tanpa login, search/filter, detail, apply dengan CV, dashboard status lamaran.
2. **Perusahaan/UMKM** — registrasi, profil + logo, CRUD lowongan (pending → approved), kelola pelamar + WhatsApp, toggle aktif/nonaktif.
3. **Admin** — statistik, moderasi lowongan (approve/reject+alasan), verifikasi/blokir/hapus perusahaan, blokir pencari kerja, lihat semua lamaran, kelola kategori.

## Core Requirements (static)
- Lowongan wajib moderasi admin sebelum tampil publik.
- Lowongan expired otomatis saat deadline lewat (badge "Lowongan Ditutup").
- Data pribadi pelamar hanya untuk perusahaan terkait + admin.
- UI 100% Bahasa Indonesia, mobile-first.

## Yang Sudah Diimplementasikan (24 Jun 2026)
- Backend lengkap: auth (register/login/logout/me), register-company, public jobs/companies/meta, apply multipart + CV upload, candidate/company/admin endpoints, auto-expire jobs, seed data (6 perusahaan, 14 lowongan, 2 lamaran, 11 kategori).
- Frontend: Home (hero search, kategori populer, lowongan terbaru, kenapa, CTA), Jobs (filter lengkap + search + pagination + drawer filter mobile), JobDetail (JSON-LD JobPosting, WhatsApp, share), ApplyJob, Companies + CompanyDetail, ForCompanies, Login/Register/RegisterCompany, 3 dashboard lengkap, halaman statis footer, 404.
- SEO: meta/OG, robots.txt, sitemap.xml, slug URL (`/jobs/:slug`, `/companies/:slug`).
- Testing iterasi 1: 28 pytest backend + Playwright e2e — 100% lulus (`/app/test_reports/iteration_1.json`).

## Iterasi 2 — Verifikasi & Pelengkapan (24 Jun 2026)
- Register kini punya pilihan role (tab Pencari Kerja / Perusahaan di /register & /register-company).
- Admin bisa EDIT lowongan via UI (`/admin/jobs/:id/edit`, JobForm mode admin, status tidak berubah).
- Homepage dual CTA: "Sedang Mencari Kerja?" → /jobs dan "Sedang Mencari Karyawan?" → /register-company.
- Sample data ditambah: Operator Produksi (Majalengka), Marketing Cafe (Kuningan) → total 14 lowongan aktif.
- Testing iterasi 2: 11 pytest baru + 7 flow Playwright — 100% lulus (`/app/test_reports/iteration_2.json`, `/app/backend/tests/test_iteration2.py`). Termasuk: isolasi antar-perusahaan (cross-tenant PUT 404), admin PUT menjaga status, role tersimpan benar, mobile 390px tanpa horizontal scroll.

## Iterasi 3 — Polish Hero Homepage (24 Jun 2026)
- Hero homepage dipercantik: ilustrasi flat kota Cirebon (Keraton/gapura, gunung Ciremai) sebagai latar dengan gradient fade, badge "Portal Lowongan Kerja #1 di Cirebon".
- Bug fix 2: pita batik di tepi bawah hero tampil sebagai noise gelap (bitmap jpeg hasil konversi). Diperbaiki total: ornamen diganti SVG vektor buatan tangan (`/app/frontend/public/megamendung.svg` — 3 baris lengkung awan Mega Mendung, tile 220px seamless, stroke sky-blue). PNG lama dihapus. Diverifikasi testing agent (iterasi 4, `/app/test_reports/iteration_4.json`) — 100% lulus.

## Akun Demo
- Admin: muhamadwahid.sih@gmail.com / admin123
- Perusahaan: demo@perusahaan.com / password123
- Pencari kerja: budi@example.com / password123

## Backlog
### P1
- Lupa/reset password (endpoint dasar bisa ditambah).
- Notifikasi email (Resend) saat status lamaran berubah / lowongan disetujui.
- Halaman edit lowongan untuk admin di UI (API sudah ada: PUT /api/admin/jobs/{id}).

### P2
- Simpan lowongan favorit (bookmark) untuk kandidat.
- Pagination server-side di tabel admin.
- Rate limiting endpoint register/apply.
- Refactor server.py ke modul (auth, jobs, admin, seed).

### P3 (dilarang di MVP oleh user)
- Chat internal, payment/subscription, AI recruitment, video interview, psikotes, CV builder, mobile app.

## Next Tasks
1. Kumpulkan feedback user dari MVP.
2. Tambahkan reset password + notifikasi email jika diminta.
3. Pertimbangkan scheduler untuk expire jobs jika data besar (saat ini on-read, efektif untuk volume kecil).
