"""
Aktifkan seluruh akun demo untuk setiap dashboard CirebonKarir.
Idempotent: aman dijalankan berkali-kali.
"""
import asyncio, os, sys, uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, "/app/backend")
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


def hash_pw(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=10)).decode()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def slugify(text):
    return "".join(c if c.isalnum() else "-" for c in text.lower()).strip("-")


async def upsert_user(db, email, name, role, password, phone="081234567890", **extra):
    existing = await db.users.find_one({"email": email})
    if existing:
        upd = {"password_hash": hash_pw(password), "role": role, "name": name,
               "phone": phone, "blocked": False, **extra}
        await db.users.update_one({"email": email}, {"$set": upd})
        return existing["id"]
    u = {"id": str(uuid.uuid4()), "email": email, "name": name, "phone": phone,
         "password_hash": hash_pw(password), "role": role, "blocked": False,
         "education": "", "experience": "", "about": "", "cv_path": "", "cv_filename": "",
         "created_at": now_iso(), **extra}
    await db.users.insert_one(u)
    return u["id"]


async def upsert_company(db, user_id, name, city, biz, status, color, initials):
    existing = await db.companies.find_one({"user_id": user_id})
    logo = f"https://ui-avatars.com/api/?name={initials}&background={color}&color=fff&size=128&bold=true"
    doc = {"name": name, "city": city, "business_category": biz, "status": status,
           "logo": logo, "employer_type": "company", "size": "10-50 karyawan",
           "founded_year": "2015", "description": f"{name} adalah perusahaan demo untuk uji coba dashboard perusahaan.",
           "address": f"Jl. Contoh No. 1, {city}", "phone": "081234567890",
           "email": (await db.users.find_one({"id": user_id}))["email"],
           "website": "", "instagram": "", "updated_at": now_iso()}
    if existing:
        await db.companies.update_one({"user_id": user_id}, {"$set": doc})
        return existing["id"]
    doc.update({"id": str(uuid.uuid4()), "user_id": user_id,
                "slug": f"{slugify(name)}-{uuid.uuid4().hex[:6]}", "created_at": now_iso()})
    await db.companies.insert_one(doc)
    return doc["id"]


async def ensure_membership_sub(db, user_id, days=90):
    # Company membership
    existing = await db.subscriptions.find_one({"user_id": user_id, "product_code": "company_membership"})
    now = datetime.now(timezone.utc)
    exp = (now + timedelta(days=days)).isoformat()
    if existing:
        await db.subscriptions.update_one(
            {"id": existing["id"]},
            {"$set": {"status": "active", "expires_at": exp, "updated_at": now.isoformat()}})
        return
    await db.subscriptions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "product_code": "company_membership",
        "package_name": "Member Perusahaan", "status": "active",
        "price": 50000, "duration_days": days,
        "started_at": now.isoformat(), "expires_at": exp,
        "created_at": now.isoformat(), "updated_at": now.isoformat()})


async def ensure_career_pro_sub(db, user_id, days=90):
    existing = await db.subscriptions.find_one({"user_id": user_id, "product_code": "cv_professional"})
    now = datetime.now(timezone.utc)
    exp = (now + timedelta(days=days)).isoformat()
    if existing:
        await db.subscriptions.update_one(
            {"id": existing["id"]},
            {"$set": {"status": "active", "expires_at": exp, "duration_days": days,
                      "package_name": "Career Pro", "price": 10000, "updated_at": now.isoformat()}})
        return
    await db.subscriptions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "product_code": "cv_professional",
        "package_name": "Career Pro", "status": "active",
        "price": 10000, "duration_days": days,
        "started_at": now.isoformat(), "expires_at": exp,
        "created_at": now.isoformat(), "updated_at": now.isoformat()})


async def ensure_career_profile(db, user_id, city, target):
    existing = await db.career_profiles.find_one({"user_id": user_id})
    seed = {
        "photo_path": "", "address": f"Jl. Demo No. 1, {city}", "city": city,
        "summary": "Kandidat demo untuk uji coba dashboard. Berpengalaman dalam administrasi dan pelayanan pelanggan, terbiasa bekerja dengan target dan tim.",
        "target_position": target, "target_category": "Admin", "target_location": city,
        "target_job_type": "Full Time", "expected_salary": 3500000, "visibility": "public",
        "education": [{"level": "SMA/SMK", "institution": "SMKN 1 Cirebon", "major": "Akuntansi",
                       "start_year": "2018", "end_year": "2021", "description": ""}],
        "experience": [{"company": "Toko Retail Cirebon", "position": "Staff Admin",
                        "start_date": "2022-01", "end_date": "2024-06", "current": False,
                        "description": "Menginput data penjualan, membuat laporan mingguan, dan melayani konsumen."}],
        "skills": [{"name": "Administrasi", "level": "Mahir"}, {"name": "Microsoft Office", "level": "Mahir"},
                   {"name": "Komunikasi", "level": "Baik"}],
        "certifications": [], "languages": [{"name": "Indonesia", "level": "Native"},
                                             {"name": "Inggris", "level": "Dasar"}],
        "organizations": [], "achievements": [], "portfolios": [], "job_preferences": [],
        "cv_design": {"template": "modern", "accent": "navy"},
        "updated_at": now_iso(),
    }
    if existing:
        await db.career_profiles.update_one({"user_id": user_id}, {"$set": seed})
        return
    seed.update({"id": str(uuid.uuid4()), "user_id": user_id, "created_at": now_iso()})
    await db.career_profiles.insert_one(seed)


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # 1. Admin
    await upsert_user(db, "admin@cirebonkarir.com", "Admin CirebonKarir", "admin", "admin123")
    print("✓ admin@cirebonkarir.com / admin123 (role=admin)")

    # 2. Owner
    await upsert_user(db, "owner@cirebonkarir.com", "Owner CirebonKarir", "owner", "owner123")
    print("✓ owner@cirebonkarir.com / owner123 (role=owner)")

    # 3. Candidate FREE
    free_uid = await upsert_user(db, "budi@example.com", "Budi Santoso Free", "candidate", "password123",
                                  phone="081298765432", education="SMA/SMK",
                                  experience="1 tahun sebagai kasir toko",
                                  about="Kandidat demo FREE untuk menguji Dashboard Kandidat non-Pro.")
    await ensure_career_profile(db, free_uid, "Kota Cirebon", "Kasir Toko")
    # Ensure no active career pro
    await db.subscriptions.update_many(
        {"user_id": free_uid, "product_code": "cv_professional", "status": "active"},
        {"$set": {"status": "expired"}})
    print("✓ budi@example.com / password123 (role=candidate — FREE)")

    # 4. Candidate CAREER PRO
    pro_uid = await upsert_user(db, "budi.demo@cirebonkarir.id", "Budi Santoso", "candidate", "password123",
                                 phone="081234567890", education="SMA/SMK",
                                 experience="2 tahun sebagai admin gudang",
                                 about="Kandidat demo Career Pro untuk menguji Lamar Cepat & CV Profesional.")
    await ensure_career_profile(db, pro_uid, "Kota Cirebon", "Staff Admin")
    await ensure_career_pro_sub(db, pro_uid)
    print("✓ budi.demo@cirebonkarir.id / password123 (role=candidate — Career Pro AKTIF)")

    # 5. Company FREE
    company_free_uid = await upsert_user(db, "demo@perusahaan.com", "Sari Wulandari", "company", "password123")
    await upsert_company(db, company_free_uid, "Perusahaan Demo Cirebon", "Kota Cirebon", "Retail", "verified", "0F172A", "PD")
    # Ensure no active membership
    await db.subscriptions.update_many(
        {"user_id": company_free_uid, "product_code": "company_membership", "status": "active"},
        {"$set": {"status": "expired"}})
    print("✓ demo@perusahaan.com / password123 (role=company — FREE tier)")

    # 6. Company PREMIUM (member subscription active)
    company_prem_uid = await upsert_user(db, "premium@perusahaan.com", "Rian Hidayat", "company", "password123")
    await upsert_company(db, company_prem_uid, "PT Demo Premium Cirebon", "Kota Cirebon", "IT", "verified", "0284C7", "PP")
    await ensure_membership_sub(db, company_prem_uid)
    print("✓ premium@perusahaan.com / password123 (role=company — Member Premium AKTIF)")

    # 7. UMKM demo
    umkm1 = await upsert_user(db, "demo@umkm.com", "Dedi Kurniawan", "company", "password123")
    ex = await db.companies.find_one({"user_id": umkm1})
    if not ex:
        await db.companies.insert_one({
            "id": str(uuid.uuid4()), "user_id": umkm1, "name": "Toko Sembako Barokah",
            "slug": f"toko-sembako-barokah-{uuid.uuid4().hex[:6]}",
            "logo": "https://ui-avatars.com/api/?name=SB&background=f59e0b&color=fff&size=128&bold=true",
            "employer_type": "umkm", "status": "verified", "city": "Kota Cirebon",
            "business_category": "Retail", "size": "1-10 karyawan", "founded_year": "2020",
            "description": "UMKM Toko Sembako Barokah — demo untuk dashboard UMKM.",
            "address": "Jl. Sultan Ageng Tirtayasa No. 12", "phone": "081234567890",
            "email": "demo@umkm.com", "website": "", "instagram": "", "created_at": now_iso()})
    else:
        await db.companies.update_one({"user_id": umkm1},
            {"$set": {"employer_type": "umkm", "status": "verified"}})
    print("✓ demo@umkm.com / password123 (role=company — UMKM)")

    # 8. Laundry UMKM
    umkm2 = await upsert_user(db, "laundry@umkm.com", "Maya Puspita", "company", "password123")
    ex2 = await db.companies.find_one({"user_id": umkm2})
    if not ex2:
        await db.companies.insert_one({
            "id": str(uuid.uuid4()), "user_id": umkm2, "name": "Laundry Express Cirebon",
            "slug": f"laundry-express-cirebon-{uuid.uuid4().hex[:6]}",
            "logo": "https://ui-avatars.com/api/?name=LE&background=0ea5e9&color=fff&size=128&bold=true",
            "employer_type": "umkm", "status": "verified", "city": "Kota Cirebon",
            "business_category": "Jasa", "size": "1-10 karyawan", "founded_year": "2019",
            "description": "UMKM Laundry Express Cirebon — demo dashboard UMKM.",
            "address": "Jl. Kartini No. 45", "phone": "081234567891",
            "email": "laundry@umkm.com", "website": "", "instagram": "", "created_at": now_iso()})
    else:
        await db.companies.update_one({"user_id": umkm2},
            {"$set": {"employer_type": "umkm", "status": "verified"}})
    print("✓ laundry@umkm.com / password123 (role=company — UMKM)")

    print("\nSemua akun demo telah diaktifkan.")


if __name__ == "__main__":
    asyncio.run(main())
