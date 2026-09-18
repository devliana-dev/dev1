"""Seed data demo untuk Homepage CirebonKarir.id (idempotent, one-off).
Menambah perusahaan terverifikasi + lowongan aktif agar section
'Lowongan Terbaru' (10) dan 'Lowongan UMKM' (4-5) tampil penuh.
Tidak mengubah skema/kode backend.
"""
import uuid
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pymongo


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hours_iso(h: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=h)).isoformat()


def slugify(s: str) -> str:
    return re.sub(r"-{2,}", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")


# --- baca konfigurasi dari backend/.env (tanpa hardcode) ---
env = {}
for line in Path("/app/backend/.env").read_text().splitlines():
    line = line.strip()
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

client = pymongo.MongoClient(env["MONGO_URL"])
db = client[env["DB_NAME"]]

EXP = timedelta(days=45)

COMPANIES = [
    dict(name="Alfamart", logo="/brands/alfamart.png", employer_type="company", business_category="Retail", city="Kota Cirebon"),
    dict(name="Cirebon Elektronik Center", logo="/logos/elektronik.svg", employer_type="company", business_category="Retail", city="Kota Cirebon"),
    dict(name="CW Outlet & Coffee", logo="/logos/cw-outlet.svg", employer_type="company", business_category="Retail", city="Kabupaten Cirebon"),
    dict(name="Granmedia", logo="/logos/granmedia.svg", employer_type="company", business_category="Logistik", city="Indramayu"),
    dict(name="Mitratek Cirebon", logo="/logos/mitratek.svg", employer_type="company", business_category="Manufaktur", city="Majalengka"),
    dict(name="KFC Cirebon", logo="/brands/kfc.png", employer_type="company", business_category="F&B", city="Kota Cirebon"),
    dict(name="Indomaret", logo="/brands/indomaret.png", employer_type="company", business_category="Retail", city="Kuningan"),
    dict(name="Watsons Cirebon", logo="/brands/watsons.png", employer_type="company", business_category="Retail", city="Kota Cirebon"),
    dict(name="Hypermart Cirebon", logo="/brands/hypermart.png", employer_type="company", business_category="Retail", city="Kota Cirebon"),
    dict(name="Astra Honda Motor", logo="/brands/ahm.png", employer_type="company", business_category="Otomotif", city="Kota Cirebon"),
    dict(name="Kedai Kopi Kita", logo="/logos/kopi.svg", employer_type="umkm", business_category="F&B", city="Kota Cirebon"),
    dict(name="Bakso Cirebon Pak Untung", logo="/logos/bakso.svg", employer_type="umkm", business_category="Kuliner", city="Kota Cirebon"),
]

# (judul, perusahaan, kategori, lokasi, jenis, jam_lalu, pendidikan, pengalaman)
JOBS = [
    ("Staff Admin", "Alfamart", "Admin", "Kota Cirebon", "Full Time", 2, "SMA/SMK", "Tidak ada minimal"),
    ("Sales Executive", "Cirebon Elektronik Center", "Sales", "Kota Cirebon", "Full Time", 3, "SMA/SMK", "1 tahun"),
    ("Crew Outlet", "CW Outlet & Coffee", "Retail", "Kabupaten Cirebon", "Part Time", 5, "SMA/SMK", "Tidak ada minimal"),
    ("Staff Gudang", "Granmedia", "Gudang", "Indramayu", "Full Time", 6, "SMA/SMK", "Tidak ada minimal"),
    ("Kasir", "Hypermart Cirebon", "Retail", "Kota Cirebon", "Full Time", 8, "SMA/SMK", "Tidak ada minimal"),
    ("Teknisi Motor", "Astra Honda Motor", "Teknisi", "Kota Cirebon", "Full Time", 10, "SMA/SMK", "1 tahun"),
    ("Beauty Advisor", "Watsons Cirebon", "Sales", "Kota Cirebon", "Full Time", 12, "SMA/SMK", "Tidak ada minimal"),
    ("Staff Penjualan", "Mitratek Cirebon", "Sales", "Majalengka", "Full Time", 14, "SMA/SMK", "Tidak ada minimal"),
    ("Crew Restaurant", "KFC Cirebon", "F&B", "Kota Cirebon", "Part Time", 16, "SMA/SMK", "Tidak ada minimal"),
    ("Pramuniaga", "Indomaret", "Retail", "Kuningan", "Full Time", 18, "SMA/SMK", "Tidak ada minimal"),
    ("Barista", "Kedai Kopi Kita", "F&B", "Kota Cirebon", "Part Time", 4, "SMA/SMK", "Tidak ada minimal"),
    ("Karyawan Dapur", "Bakso Cirebon Pak Untung", "F&B", "Kota Cirebon", "Full Time", 7, "SMA/SMK", "Tidak ada minimal"),
    ("Kasir Warung", "Bakso Cirebon Pak Untung", "F&B", "Kota Cirebon", "Part Time", 20, "SMA/SMK", "Tidak ada minimal"),
]

DESC = "Dibutuhkan segera karyawan yang jujur, disiplin, dan siap bekerja sama. Fresh graduate dipersilakan melamar. Fasilitas: lingkungan kerja nyaman, onboarding terstruktur, dan kesempatan berkembang."

created = 0
for c in COMPANIES:
    if db.companies.find_one({"name": c["name"]}):
        continue
    user = {
        "id": str(uuid.uuid4()), "name": f"PIC {c['name']}", "email": f"demo.{slugify(c['name'])}@cirebonkarir.id",
        "phone": "081200000000", "password_hash": "-", "role": "company", "blocked": False, "created_at": now_iso(),
    }
    db.users.insert_one(user)
    db.companies.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "name": c["name"],
        "slug": f"{slugify(c['name'])}-{uuid.uuid4().hex[:6]}", "logo": c.get("logo", ""),
        "description": f"{c['name']} adalah mitra terpercaya CirebonKarir.id.",
        "address": c["city"], "city": c["city"], "phone": "081200000000",
        "email": user["email"], "website": "", "instagram": "", "founded_year": "", 
        "business_category": c["business_category"], "size": "",
        "employer_type": c["employer_type"], "status": "verified", "created_at": now_iso(),
    })
    created += 1

cmap = {c["name"]: c for c in db.companies.find({}, {"_id": 0})}

for (title, comp, cat, loc, jtype, hrs, edu, exp) in JOBS:
    company = cmap.get(comp)
    if not company:
        print(f"SKIP (perusahaan tidak ada): {comp}")
        continue
    created_at = hours_iso(hrs)
    slug = f"{slugify(title)}-{slugify(loc)}-{uuid.uuid4().hex[:6]}"
    if db.jobs.find_one({"title": title, "company_id": company["id"], "location": loc}):
        continue
    db.jobs.insert_one({
        "id": str(uuid.uuid4()), "company_id": company["id"], "slug": slug,
        "title": title, "category": cat, "location": loc, "job_type": jtype,
        "salary_min": 2200000, "salary_max": 3200000, "education": edu, "experience": exp,
        "age_requirement": "", "description": DESC, "responsibilities": "", "requirements": "",
        "benefits": "", "deadline": "", "whatsapp": "", "employer_type": company["employer_type"],
        "business_category": next((c["business_category"] for c in COMPANIES if c["name"] == comp), ""),
        "work_hours": "", "slots": 0, "status": "active", "rejection_reason": "",
        "listing_days": 30, "posting_mode": "member", "expires_at": (datetime.now(timezone.utc) + EXP).isoformat(),
        "published_at": created_at, "views": 0, "created_at": created_at,
    })
    created += 1

print(f"Selesai. Dokumen baru dibuat: {created}")
print("Total lowongan aktif:", db.jobs.count_documents({"status": "active"}))
print("Total UMKM lowongan:", db.jobs.count_documents({"status": "active", "employer_type": "umkm"}))
print("Total perusahaan verified:", db.companies.count_documents({"status": "verified"}))
