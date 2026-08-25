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

## Iterasi 12 — Referral & Commission System (25 Agu 2026)
- **Model 1-tingkat**: komisi Rp2.000 hanya dari pembelian Career Pro (Rp10.000); Company Member TIDAK menghasilkan komisi. Perusahaan bisa jadi referrer dan mendapat komisi dari kandidat yang upgrade Career Pro via link-nya.
- **Eligibility**: pelamar → Career Pro aktif; perusahaan → member/launch_free aktif. Tidak aktif = PAUSED (komisi/saldo/history tidak hilang, komisi baru & withdrawal diblokir); perpanjang = ACTIVE lagi.
- **Koleksi baru**: referral_codes (code unik, owner unik), referrals (referee_user_id unik = first-valid attribution terkunci), referral_commissions (payment_id unik = anti duplikat komisi), withdrawal_requests. Settings referral (referral_commission 2000, min_withdrawal 50000, holding_days 7) di platform_settings, editable admin.
- **Alur komisi**: payment Career Pro approved → komisi `pending` → admin approve → `approved` → holding 7 hari auto / admin release → `available` → withdrawal paid → komisi `paid`. Cancel subscription (refund) → komisi cancelled; yang sudah paid ditandai suspicious.
- **Anti-fraud**: self-referral di-skip, duplikat komisi diblokir unique index, reject → flag suspicious, authorization scoped per pemilik.
- **Endpoint**: publik `/api/referrals/validate/{code}`; self `/api/referral/me|referrals|commissions|withdrawals`; admin `/api/admin/referrals/overview|referrers|commissions|withdrawals` + action endpoints (perm monetization).
- **Frontend**: `/r/:code` landing publik (nama referrer + CTA daftar, kode tersimpan localStorage & auto-isi di form register), `ReferralDashboard` shared kandidat/perusahaan (banner aktif/dijeda + CTA, link card copy/share WA/FB, 6 KPI wallet, riwayat referral, modal withdrawal + riwayat), `/admin/referrals` 4 tab (Overview/Referrers/Komisi/Withdrawals), field kode referral di Register, menu Referral di 3 role, AdminSettings +3 field.
- Curl E2E terverifikasi: register via referral → komisi Rp2.000 pending→approved→available → wallet benar → duplikat payment 400 → withdrawal kurang saldo ditolak → admin overview akurat.
- Testing iterasi 9: 19/19 backend + semua flow UI lulus (`/app/test_reports/iteration_9.json`), termasuk withdrawal lengkap (process→paid), paused/resumed, refund-cancel, company member tanpa komisi, authorization matrix, mobile 390px. Nit review diperbaiki: paused_reason kosong saat aktif, DuplicateKeyError spesifik.

## Iterasi 13 — Loker UMKM (25 Agu 2026)
- **Model**: field `employer_type` ("company"/"umkm") di koleksi `companies` & `jobs` (migrasi aman via startup update_many — semua data existing = "company"); field opsional baru di jobs: `business_category` (kategori usaha), `work_hours` (jam kerja), `slots` (jumlah kebutuhan). Keputusan user: employer_type default dari profil perusahaan, bisa diubah per lowongan; halaman UMKM pakai /jobs existing dengan tab; 19 kategori usaha hardcoded di constants.
- **Backend**: filter `employer_type` di GET /api/jobs (umkm → hanya UMKM, company → $ne umkm agar data lama masuk) + search mencakup business_category; filter employer_type di GET /api/admin/jobs; create_job/update_job normalisasi employer_type (fallback profil perusahaan); register-company & update profil simpan employer_type; company_stats + employer_type, new_applicants (terkirim), expired_jobs; attach_company fallback employer_type dari company; index jobs.employer_type; seed_demo_umkm idempotent (2 UMKM verified: Toko Sembako Barokah, Laundry Express Cirebon; 4 lowongan aktif + 1 pending).
- **Frontend**: Home — toggle [Semua Loker|Perusahaan|🏪 Loker UMKM] di hero (hero-employer-tabs) + section "Loker UMKM Cirebon" (UmkmSection, 4 kartu badge amber + Lihat Detail + ⚡ Lamar Sekarang → detail page One-Click Apply existing); Jobs.jsx — tab employer-type-tabs + judul dinamis; JobListItem & JobDetail — badge 🏪 UMKM; JobDetail + info Kategori Usaha/Jam Kerja/Jumlah Kebutuhan; JobForm — pilihan Jenis Pemberi Kerja (jf-etype-*) + blok field UMKM (jf-umkm-fields); RegisterCompany — pilihan jenis pemberi kerja (label dinamis Nama Usaha); AdminJobs — filter jenis pemberi kerja + badge di tabel; CompanyDashboard — badge UMKM + kartu Lamaran Baru & Lowongan Expired; CompanyProfile — select jenis pemberi kerja + opsi kategori usaha kondisional; constants — EMPLOYER_TYPES & UMKM_BUSINESS_CATEGORIES.
- One-Click Apply, moderasi, kuota, Career Pro, referral, membership — nol perubahan business logic.
- Testing iterasi 13: 15/15 backend pytest + seluruh flow UI lulus termasuk mobile 390px (`/app/test_reports/iteration_13.json`). TEST 1-6 spesifikasi user semua lulus.

## Iterasi 14 — Lupa/Reset Password (Admin-Assisted) (25 Agu 2026)
- **Model**: koleksi baru `password_reset_requests` {id, user_id, email, name, role, status pending/completed/rejected, created_at, completed_at, completed_by}. Tanpa email/SMTP — admin set password sementara via dashboard dan menyampaikannya ke user di luar platform (WhatsApp/email).
- **Backend**: POST /api/auth/forgot-password (response generik anti user-enumeration, dedupe pending per user, hanya role candidate/company, notifikasi ke semua admin/owner); admin endpoints dengan require_perm("users"): GET /api/admin/password-resets?status=, POST /:id/complete {new_password} (min 6 char, bcrypt, set pwd_reset_at epoch, notifikasi user, admin_log), POST /:id/reject; invalidasi token lama — create_access_token kini menyertakan iat, get_user_by_token menolak token dengan iat < pwd_reset_at (backward-compatible: token lama tanpa iat tetap berlaku s.d. expired); index startup password_reset_requests(user_id,status).
- **Frontend**: link "Lupa password?" di Login; halaman publik /forgot-password (form → success state); halaman admin /admin/password-resets (tab status, tabel, modal set password baru, tolak) + menu "Reset Password" di grup SISTEM.
- Testing iterasi 14: 14/14 backend pytest + seluruh flow UI lulus termasuk mobile 390px, cleanup kredensial budi dikembalikan (`/app/test_reports/iteration_14.json`).

## Iterasi 15 — Hardening Security + PDF CV Server-Side + Foto Profil CV (25 Agu 2026)
- **Hardening**: middleware `security_headers_and_rate_limit` — security headers di semua response API (X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS via X-Forwarded-Proto); rate limit in-memory per IP untuk auth publik (login 10/mnt, register/register-company/forgot-password 5/mnt → 429). Demo credentials di Login.jsx hanya tampil saat NODE_ENV !== "production" (keputusan user). CSP sengaja tidak dipasang (risiko merusak SPA; set di web server level jika perlu).
- **PDF CV server-side**: WeasyPrint 69 (di requirements.txt); endpoint GET /api/cv-professional/cvs/{id}/pdf (require_cv_premium + ownership); render_cv_html mirror 3 template (modern/ats/minimalis); foto profil di-embed base64 data URI dari object storage. Frontend CvBuilder & CvList "Download PDF" sekarang unduh PDF server (window.print dihapus); CV belum disimpan → toast minta simpan dulu.
- **Foto profil di CV**: field personal.photo; tombol "Ambil dari Profil Karier" (dari career profile photo_path) + Hapus Foto; foto tampil di ketiga template (preview & PDF).
- Testing iterasi 15: 13/13 backend pytest + seluruh flow UI lulus (`/app/test_reports/iteration_15.json`); issue minor HSTS-behind-proxy diperbaiki (X-Forwarded-Proto). Catatan: rate limiter in-memory per proses — tidak shared antar replica (batasan MVP).

## Akun Demo
- Owner: owner@cirebonkarir.com / owner123 (env OWNER_EMAIL/OWNER_PASSWORD)
- Admin: muhamadwahid.sih@gmail.com / admin123
- Perusahaan: demo@perusahaan.com / password123
- UMKM: demo@umkm.com / password123 (Toko Sembako Barokah), laundry@umkm.com / password123 (Laundry Express Cirebon)
- Pencari kerja: budi@example.com / password123 (Career Pro aktif)
- Lainnya: /app/memory/test_credentials.md

## Backlog
### P1
- ~~Lupa/reset password~~ DONE (iterasi 14, admin-assisted).
- ~~Hardening security (demo credentials, security headers, rate limiting)~~ DONE (iterasi 15).
- ~~Server-side PDF generation untuk CV~~ DONE (iterasi 15, WeasyPrint).
- ~~Foto profil masuk ke CV Builder~~ DONE (iterasi 15).
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
