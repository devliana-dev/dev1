# PRD — CirebonKarir.com

## Problem Statement (asli)
Website lowongan kerja lokal CirebonKarir.com yang mempertemukan pencari kerja dengan perusahaan/UMKM di wilayah Cirebon dan sekitarnya (Majalengka, Kuningan, Indramayu, Brebes). Simpel, cepat, mobile-first, Bahasa Indonesia, profesional. 3 role: candidate, company, admin. Alur lengkap: publik melihat/mencari lowongan tanpa login → login → melamar → tracking status; perusahaan daftar → profil → buat lowongan → moderasi admin → lowongan aktif → kelola pelamar via WhatsApp; admin moderasi semuanya.

## Visi Diperluas (Iterasi 10)
JOB BOARD + CAREER PROFILE + RECRUITMENT MANAGEMENT PLATFORM.
- Pelamar: Profil Karier → cari lowongan → job matching → One-Click Apply → tracking → interview → diterima.
- Perusahaan: posting → pelamar → profil karier kandidat → filter → shortlist → pipeline → interview → diterima.
- Admin: kelola platform, user, perusahaan, subscription, Launch Program.

## Arsitektur
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB (Motor) via MONGO_URL/DB_NAME, semua route prefix `/api`.
- **Frontend**: React (CRA+craco), Tailwind + Shadcn, React Router, axios (withCredentials + Bearer via localStorage `ck_token`), sonner toast.
- **Auth**: JWT 7 hari, bcrypt, httpOnly cookie + Bearer, brute-force lockout, RBAC (candidate/company/admin).
- **Storage**: Emergent Object Storage (CV, logo, foto profil, sertifikat, bukti bayar) via `/api/upload-*` & `/api/files/{path}` (cv/payment/cert dilindungi auth + ownership/relasi lamaran).
- **Koleksi MongoDB**: users, companies, jobs, applications, categories, files, login_attempts, blog_posts, membership_products, payments, subscriptions, company_posting_quotas, membership_audit_logs, payment_settings, cv_documents, cv_subscriptions (legacy), migrations, **launch_program** (singleton), **notifications** (dedupe_key), **apply_quotas** (key unik), **career_profiles** (user_id unik), **saved_jobs** (user_id+job_id unik), **job_alerts**, **application_status_history**, **application_notes**, **interviews**, **invitations** (company+job+candidate unik).

## Business Rules Utama (semua divalidasi backend, server time)
- **Launch Program global** (bukan per perusahaan): `launch_program` singleton {start_date, end_date, is_active}, editable admin tanpa coding. Selama aktif → semua perusahaan `launch_free` (benefit MEMBER penuh). Lewat end_date → otomatis kembali `free`. Data tidak pernah dihapus saat transisi.
- **Company plan**: `free` / `launch_free` / `member` (subscription company_membership aktif, Rp50rb/90 hari) / `expired`. `compute_company_plan()` + `sync_company_plan()` menulis plan_type ke doc company untuk filter admin.
- **Free company**: 1 posting/bulan kalender (`company_posting_quotas`, atomic consume), masa tayang 7 hari, applicant management dasar (lihat pelamar, profil kandidat yang melamar, status dasar).
- **Member/Launch_free**: posting tanpa kuota, masa tayang 30 hari, shortlist, notes, interview, candidate search/invite (`require_company_full_access`, FREE → 403).
- **Career Pro** (rename dari CV Profesional, product_code tetap `cv_professional`): Rp10rb/30 hari — CV premium + import + PDF + **30 One-Click Apply per periode**. FREE candidate: 3 One-Click Apply/bulan kalender (`apply_quotas`, atomic, anti manipulasi tanggal).
- **Pipeline lamaran**: terkirim → dilihat → diproses → shortlist → interview → diterima / ditolak. Semua perubahan tercatat di `application_status_history` + notifikasi ke kandidat (dedupe per status).
- **Job matching**: scoring sederhana (skill 30, pendidikan 20, pengalaman 20, lokasi 20, posisi 10) — `compute_match_score`, arsitektur siap AI.
- **Invite to apply**: notifikasi saja; kandidat memutuskan sendiri, TIDAK auto-apply. Hanya profil `visibility=public` yang bisa ditemukan; kontak/CV hanya terlihat jika kandidat melamar.
- **Reminder otomatis**: launch (14/7/3/1 hari + setelah berakhir), membership (14/7/3/1), Career Pro (7/3/1) — dedupe via dedupe_key, digenerate on-read + startup.
- **Job alert**: notifikasi saat admin approve lowongan yang cocok kriteria.
- **Privasi**: catatan internal hanya perusahaan terkait; perusahaan A tidak bisa akses data B (kepemilikan dicek di setiap query).

## User Personas
1. **Pencari Kerja** — browsing tanpa login, Profil Karier + completion %, simpan lowongan, job alert, quick apply, tracking timeline, CV premium (Career Pro).
2. **Perusahaan/UMKM** — dashboard recruitment (lowongan aktif/pelamar/shortlist/interview/diterima), pipeline, statistik, cari kandidat, membership.
3. **Admin** — moderasi, Launch Program, aktivasi member manual, monetisasi, Career Pro list, statistik revenue.

## Core Requirements (static)
- Lowongan wajib moderasi admin sebelum tampil publik (`published_at` + `expires_at` diset saat approve).
- Lowongan expired otomatis saat deadline/expires_at lewat.
- Data pribadi pelamar hanya untuk perusahaan terkait + admin.
- UI 100% Bahasa Indonesia, mobile-first.
- Payment gateway belum ada — struktur `payments`/`subscriptions` siap dihubungkan.

## Yang Sudah Diimplementasikan (24 Jun 2026)
- Backend lengkap: auth, register-company, public jobs/companies/meta, apply multipart + CV upload, candidate/company/admin endpoints, auto-expire jobs, seed data.
- Frontend: Home, Jobs (filter+search+pagination), JobDetail (JSON-LD, WhatsApp, share), ApplyJob, Companies, ForCompanies, auth pages, 3 dashboard, halaman statis, 404.
- SEO: meta/OG, robots.txt, sitemap.xml, slug URL.
- Testing iterasi 1: 28 pytest + Playwright — 100% lulus.

## Iterasi 2–9 (24 Jun 2026)
Lihat CHANGELOG.md (register role, admin edit job, hero, job list horizontal, kategori/area cards, blog, CV Profesional premium, membership & monetisasi terpusat).

## Iterasi 10 — Recruitment Management Platform (25 Agu 2026)
- **Backend baru** (`server.py` blok "Launch Program, Recruitment Management, Career Profile & Notifikasi"): launch program singleton + compute/sync company plan; notifikasi + reminder; kuota One-Click Apply (3 free/bulan, 30 pro/periode, atomic); Profil Karier (GET/PUT + foto + file sertifikat + completion berbobot + visibility); match scoring + rekomendasi; saved jobs; job alerts + trigger saat approve; pipeline history + notifikasi status; quick-apply; shortlist star; catatan internal; interviews CRUD + notifikasi; candidate search + profile view + invite; job stats + view counter; admin launch program CRUD + plan counts; admin membership activate/extend/deactivate (+90 hari); admin career-pro list; admin stats + member/career pro/revenue.
- **Edit existing**: APPLICATION_STATUSES +shortlist; save_upload +photo/cert; files protection +cert & relasi kandidat; apply_job + history/notifikasi perusahaan; application detail auto-dilihat via set_application_status + enrich career_profile/match/interviews; company_applications enrich career profile + match; company_stats + shortlist/interview/hired; get_company_entitlement plan-aware (launch_free=member benefits); create_job + published_at/views; admin_approve_job + published_at + job alerts + notifikasi; admin_companies + plan filter/jobs/applicants counts; job_detail + views increment; startup + index baru + rename produk Career Pro + reminders.
- **Frontend baru**: NotificationBell (badge unread, semua role), LaunchBanner (countdown real-time), CareerProfileView (tampilan profil profesional), NotificationsPage (shared 3 role), SavedJobs, JobAlerts, CandidateSearch (cari kandidat + undang), Shortlists, Interviews, CompanyStats, AdminLaunchProgram.
- **Rewrite**: CandidateProfile → Profil Karier lengkap (8 list editor + completion + visibility + foto); MyApplications → kartu + timeline + interview; Applicants → filter lengkap + match + shortlist + notes + interview + riwayat; AdminCompanies → plan tabs + aktivasi member.
- **Edit**: App.js (10 route baru), DashboardLayout (bell desktop+mobile), constants (shortlist/INTERVIEW_STATUS/COMPANY_PLAN/level options), format (imageUrl), JobDetail (Lamar Cepat + modal kuota + simpan), CompanyDashboard (banner launch + plan card + 7 stat), CvProfessional → Career Pro + kartu kuota, CompanyMembership (kartu launch_free), AdminDashboard (+member/career pro/revenue), menu ×3 (tanpa duplikat: "Pengaturan" company dihapus, "CV Profesional"→"Career Pro").

## Iterasi 10b — Section FAQ Homepage (25 Agu 2026)
- Komponen baru `/app/frontend/src/components/FaqSection.jsx`: accordion 8 Q&A seputar CirebonKarir (cara cari loker, gratis, wilayah Ciayumajakuning, pasang lowongan, Program Launching, update harian, tracking lamaran, privasi data). Tema sky-600 (bar pertanyaan) + navy saat terbuka, ikon plus/minus, jawaban kartu putih, link "Hubungi kami". Dipasang di homepage setelah Blog, sebelum footer. Terverifikasi screenshot (buka/tutup accordion OK).

## Iterasi 11 — Admin/Owner Command Center Fase A (25 Agu 2026)
- **RBAC**: role `owner` baru (seed owner@cirebonkarir.com/owner123 via env OWNER_EMAIL/OWNER_PASSWORD); `require_role` owner-bypass untuk route admin; `require_staff` + `require_perm(perm)` (users/companies/jobs/monetization/settings/export) — admin tanpa permission → 403; halaman Tim Admin & Settings ownerOnly (menu disembunyikan utk admin biasa).
- **Backend baru**: `/api/admin/overview` (KPI + alert center + business health growth 30d vs prev), `/analytics/growth?days=7-365` (series harian users/companies/jobs/applications), `/analytics/live-activity` (feed gabungan + pagination), `/analytics/funnel` (views→lamaran→...→diterima), `/analytics/market` (kategori+lokasi: jobs/pelamar/rasio/views/hired), `/analytics/talent` (distribusi completion profil, open-to-work, skill/pendidikan populer, avg match), `/analytics/top-performers`, `/analytics/monetization` (revenue hari/minggu/bulan/tahun/total, per produk: active/new/expired/revenue/renewal/due/rate, conversion rate), `/search` (global), `/export/{entity}` CSV (perm export), `/settings` GET/PUT (perm settings), `/staff` CRUD + status (owner only), `/audit-logs` gabungan admin_audit_logs + membership_audit_logs.
- **admin_log()** dipasang di: approve/reject lowongan, status perusahaan, suspend user, hapus lowongan/perusahaan, tambah kategori, export, settings, staff mgmt.
- **platform_settings** singleton (free/pro apply limit, free post limit, masa tayang free/member) — dipakai fungsi kuota/entitlement, editable tanpa coding.
- **Koleksi baru**: platform_settings, admin_audit_logs. admin_candidates diperluas (search, filter plan/status, paket, kuota apply, aktivitas terakhir). admin_jobs + kolom applications.
- **Frontend**: AdminDashboard rewrite (global search, health banner, alert center, 9 KPI clickable, quick actions, mini chart recharts), AdminAnalytics (5 tab: Pertumbuhan/Funnel/Pasar Kerja/Talent & Matching/Revenue & Konversi), AdminLiveActivity, AdminAuditLogs, AdminStaff, AdminSettings, AdminCareerPro (KPI + kuota + perpanjang/nonaktifkan), AdminCandidates rewrite (search/filter/kolom baru), AdminJobs +kolom Views/Lamaran, menu admin grup bertingkat, DashboardLayout header grup + ownerOnly filter, ProtectedRoute & Login owner-aware.
- Testing iterasi 8: 33/33 backend + semua flow UI lulus (`/app/test_reports/iteration_8.json`).

## Akun Demo
- Owner: owner@cirebonkarir.com / owner123 (env OWNER_EMAIL/OWNER_PASSWORD)
- Admin: muhamadwahid.sih@gmail.com / admin123
- Perusahaan: demo@perusahaan.com / password123
- Pencari kerja: budi@example.com / password123 (Career Pro aktif)
- Lainnya: /app/memory/test_credentials.md

## Backlog
### P1
- Lupa/reset password (endpoint dasar bisa ditambah).
- Foto profil masuk ke CV Builder (data sudah ada di career_profiles).
- Server-side PDF generation untuk CV (sekarang window.print browser).
### P2
- Payment gateway (Midtrans/Xendit) menggantikan verifikasi manual (struktur payments/subscriptions siap).
- Notifikasi email/WhatsApp (sekarang in-app only).
- AI job matching lanjutan (scoring sudah modular).
- Dynamic sitemap/canonical SEO.
- CMS admin untuk blog.
### P3 (dilarang user di MVP)
- Chat internal, video interview, psikotes, mobile app.

## Next Tasks
1. ~~Testing iterasi 7~~ DONE (25 Agu 2026): 27/27 backend pytest lulus + seluruh flow frontend baru lulus (`/app/test_reports/iteration_7.json`). Dua nit code review diperbaiki (cap completion 100%, strftime).
2. Kumpulkan feedback user.
3. Hardening security (audit message 124: hapus demo credentials di Login.jsx, security headers, rate limiting).
