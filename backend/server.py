from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
import requests
from fastapi import (APIRouter, Depends, FastAPI, File, Form, HTTPException,
                     Query, Request, Response, UploadFile)
from fastapi.responses import Response as RawResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pydantic import BaseModel, EmailStr
from starlette.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@cirebonkarir.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "cirebonkarir"
storage_key = None

LOCATIONS = ["Kota Cirebon", "Kabupaten Cirebon", "Majalengka", "Kuningan", "Indramayu", "Brebes"]
JOB_TYPES = ["Full Time", "Part Time", "Freelance", "Kontrak", "Magang"]
EDUCATION_LEVELS = ["Tidak ada minimal", "SMP", "SMA/SMK", "D3", "S1"]
DEFAULT_CATEGORIES = ["Admin", "Finance", "Marketing", "Sales", "F&B", "Retail", "Gudang", "Driver", "Teknisi", "IT", "Lainnya"]
APPLICATION_STATUSES = ["terkirim", "dilihat", "diproses", "interview", "diterima", "ditolak"]
COMPANY_STATUSES = ["pending", "verified", "rejected", "blocked"]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Object Storage ----------
def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text)
    return text.strip("-") or "item"


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True,
                        samesite="none", max_age=7 * 24 * 3600, path="/")


def extract_token(request: Request, auth_query: Optional[str] = None) -> Optional[str]:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token and auth_query:
        token = auth_query
    return token


async def get_user_by_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    return await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})


async def get_current_user(request: Request):
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Anda belum login")
    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Sesi tidak valid, silakan login kembali")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Akun Anda diblokir. Hubungi admin.")
    return user


def require_role(*roles):
    async def dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Akses ditolak")
        return user
    return dep


async def expire_jobs():
    today = datetime.now(timezone.utc).date().isoformat()
    await db.jobs.update_many({"status": "active", "deadline": {"$lt": today, "$ne": ""}}, {"$set": {"status": "expired"}})
    await db.jobs.update_many({"status": "active", "expires_at": {"$lte": now_iso(), "$ne": ""}}, {"$set": {"status": "expired"}})


async def get_company_map():
    companies = await db.companies.find({}, {"_id": 0, "id": 1, "name": 1, "slug": 1, "logo": 1, "status": 1, "city": 1}).to_list(2000)
    return {c["id"]: c for c in companies}


def attach_company(job: dict, cmap: dict) -> dict:
    c = cmap.get(job.get("company_id"), {})
    job["company_name"] = c.get("name", "Perusahaan")
    job["company_logo"] = c.get("logo", "")
    job["company_slug"] = c.get("slug", "")
    job["company_verified"] = c.get("status") == "verified"
    return job


async def save_upload(user_id: str, file: UploadFile, kind: str) -> dict:
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    allowed = {"cv": {"pdf", "doc", "docx"}, "logo": {"jpg", "jpeg", "png", "webp"},
               "payment": {"jpg", "jpeg", "png", "webp", "pdf"}}[kind]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Format file tidak didukung. Gunakan: {', '.join(sorted(allowed))}")
    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran file maksimal 2MB")
    mime = {"pdf": "application/pdf", "doc": "application/msword",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[ext]
    path = f"{APP_NAME}/uploads/{user_id}/{uuid.uuid4()}.{ext}"
    result = await asyncio.to_thread(put_object, path, data, mime)
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["path"], "original_filename": file.filename,
        "content_type": mime, "size": result["size"], "kind": kind, "owner_user_id": user_id,
        "is_deleted": False, "created_at": now_iso(),
    })
    return {"path": result["path"], "filename": file.filename}


# ---------- Pydantic models ----------
class RegisterCandidateIn(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str


class RegisterCompanyIn(BaseModel):
    company_name: str
    email: EmailStr
    phone: str
    password: str
    pic_name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class JobIn(BaseModel):
    title: str
    category: str
    location: str
    job_type: str
    salary_min: int = 0
    salary_max: int = 0
    education: str = "Tidak ada minimal"
    experience: str = ""
    age_requirement: str = ""
    description: str = ""
    responsibilities: str = ""
    requirements: str = ""
    benefits: str = ""
    deadline: str = ""
    whatsapp: str = ""


class CompanyProfileIn(BaseModel):
    name: str
    description: str = ""
    address: str = ""
    city: str = ""
    phone: str = ""
    website: str = ""
    instagram: str = ""
    founded_year: str = ""
    business_category: str = ""
    size: str = ""


class CandidateProfileIn(BaseModel):
    name: str
    phone: str = ""
    education: str = ""
    experience: str = ""
    about: str = ""


class ApplicationStatusIn(BaseModel):
    status: str


class RejectIn(BaseModel):
    reason: str = ""


class CompanyStatusIn(BaseModel):
    status: str


class UserBlockIn(BaseModel):
    blocked: bool


class CategoryIn(BaseModel):
    name: str


# ---------- Auth ----------
@api_router.post("/auth/register")
async def register_candidate(data: RegisterCandidateIn, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    user = {"id": str(uuid.uuid4()), "name": data.name.strip(), "email": email, "phone": data.phone.strip(),
            "password_hash": hash_password(data.password), "role": "candidate", "blocked": False,
            "education": "", "experience": "", "about": "", "cv_path": "", "cv_filename": "",
            "created_at": now_iso()}
    await db.users.insert_one(user)
    token = create_access_token(user["id"], email, "candidate")
    set_auth_cookie(response, token)
    user.pop("password_hash")
    user.pop("_id", None)
    return {"user": user, "token": token}


@api_router.post("/auth/register-company")
async def register_company(data: RegisterCompanyIn, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    user = {"id": str(uuid.uuid4()), "name": data.pic_name.strip(), "email": email, "phone": data.phone.strip(),
            "password_hash": hash_password(data.password), "role": "company", "blocked": False, "created_at": now_iso()}
    await db.users.insert_one(user)
    company = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": data.company_name.strip(),
               "slug": f"{slugify(data.company_name)}-{uuid.uuid4().hex[:6]}", "logo": "", "description": "",
               "address": "", "city": "", "phone": data.phone.strip(), "email": email, "website": "",
               "instagram": "", "founded_year": "", "business_category": "", "size": "",
               "status": "pending", "created_at": now_iso()}
    await db.companies.insert_one(company)
    token = create_access_token(user["id"], email, "company")
    set_auth_cookie(response, token)
    user.pop("password_hash")
    user.pop("_id", None)
    company.pop("_id", None)
    return {"user": user, "company": company, "token": token}


@api_router.post("/auth/login")
async def login(data: LoginIn, request: Request, response: Response):
    email = data.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        locked_until = attempts.get("locked_until", "")
        if locked_until and locked_until > now_iso():
            raise HTTPException(status_code=429, detail="Terlalu banyak percobaan login. Coba lagi dalam 15 menit.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        await db.login_attempts.update_one({"identifier": identifier},
            {"$set": {"identifier": identifier, "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()},
             "$inc": {"count": 1}}, upsert=True)
        raise HTTPException(status_code=401, detail="Email atau password salah")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Akun Anda diblokir. Hubungi admin.")
    await db.login_attempts.delete_one({"identifier": identifier})
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    result = {"user": user, "token": token}
    if user["role"] == "company":
        company = await db.companies.find_one({"user_id": user["id"]}, {"_id": 0})
        result["company"] = company
    return result


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Berhasil logout"}


@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    result = {"user": user}
    if user["role"] == "company":
        result["company"] = await db.companies.find_one({"user_id": user["id"]}, {"_id": 0})
    return result


# ---------- Public ----------
@api_router.get("/")
async def root():
    return {"message": "CirebonKarir.com API"}


@api_router.get("/meta")
async def get_meta():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    await expire_jobs()
    active_jobs = await db.jobs.count_documents({"status": "active"})
    companies = await db.companies.count_documents({"status": "verified"})
    return {
        "locations": LOCATIONS, "job_types": JOB_TYPES, "education_levels": EDUCATION_LEVELS,
        "categories": [c["name"] for c in cats] or DEFAULT_CATEGORIES,
        "stats": {"active_jobs": active_jobs, "companies": companies},
    }


@api_router.get("/jobs")
async def list_jobs(q: str = "", location: str = "", job_type: str = "", education: str = "",
                    salary: str = "", category: str = "", page: int = 1, limit: int = 12):
    await expire_jobs()
    cmap = await get_company_map()
    blocked_ids = [cid for cid, c in cmap.items() if c.get("status") == "blocked"]
    query = {"status": "active"}
    if blocked_ids:
        query["company_id"] = {"$nin": blocked_ids}
    if location:
        query["location"] = location
    if job_type:
        query["job_type"] = job_type
    if education:
        query["education"] = education
    if category:
        query["category"] = category
    if salary == "lt2":
        query["salary_max"] = {"$lte": 2000000}
    elif salary == "2-3":
        query["salary_min"] = {"$gte": 2000000, "$lt": 3000000}
    elif salary == "3-5":
        query["salary_min"] = {"$gte": 3000000, "$lte": 5000000}
    elif salary == "gt5":
        query["salary_min"] = {"$gt": 5000000}
    if q:
        regex = {"$regex": re.escape(q), "$options": "i"}
        matched_companies = [cid for cid, c in cmap.items() if re.search(re.escape(q), c.get("name", ""), re.I)]
        query["$or"] = [{"title": regex}, {"description": regex}, {"category": regex}]
        if matched_companies:
            query["$or"].append({"company_id": {"$in": matched_companies}})
    total = await db.jobs.count_documents(query)
    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).skip(max(page - 1, 0) * limit).limit(limit).to_list(limit)
    return {"items": [attach_company(j, cmap) for j in jobs], "total": total, "page": page,
            "pages": max(1, (total + limit - 1) // limit)}


@api_router.get("/jobs/{slug}")
async def job_detail(slug: str):
    await expire_jobs()
    job = await db.jobs.find_one({"$or": [{"slug": slug}, {"id": slug}]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Lowongan tidak ditemukan")
    cmap = await get_company_map()
    company = cmap.get(job.get("company_id"))
    if not company or company.get("status") == "blocked":
        raise HTTPException(status_code=404, detail="Lowongan tidak ditemukan")
    if job["status"] not in ("active", "expired", "nonaktif"):
        raise HTTPException(status_code=404, detail="Lowongan tidak ditemukan")
    attach_company(job, cmap)
    company_full = await db.companies.find_one({"id": job["company_id"]}, {"_id": 0, "user_id": 0})
    job["company"] = company_full
    return job


@api_router.get("/companies")
async def list_companies():
    companies = await db.companies.find({"status": "verified"}, {"_id": 0, "user_id": 0}).to_list(500)
    job_counts = {}
    async for row in db.jobs.aggregate([{"$match": {"status": "active"}}, {"$group": {"_id": "$company_id", "n": {"$sum": 1}}}]):
        job_counts[row["_id"]] = row["n"]
    for c in companies:
        c["active_jobs"] = job_counts.get(c["id"], 0)
    return companies


@api_router.get("/companies/{slug}")
async def company_detail(slug: str):
    company = await db.companies.find_one({"slug": slug, "status": "verified"}, {"_id": 0, "user_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Perusahaan tidak ditemukan")
    await expire_jobs()
    jobs = await db.jobs.find({"company_id": company["id"], "status": "active"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    cmap = {company["id"]: company}
    return {"company": company, "jobs": [attach_company(j, cmap) for j in jobs]}


# ---------- Blog ----------
@api_router.get("/blog")
async def list_blog_posts(limit: int = 20):
    posts = await db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return posts


@api_router.get("/blog/{slug}")
async def blog_post_detail(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Artikel tidak ditemukan")
    return post


async def seed_blog_posts():
    if await db.blog_posts.count_documents({}) > 0:
        return
    posts = [
        {"id": str(uuid.uuid4()), "slug": "5-tips-lolos-wawancara-kerja-fresh-graduate",
         "title": "5 Tips Lolos Wawancara Kerja untuk Fresh Graduate",
         "category": "Tips Karier",
         "image": "https://images.unsplash.com/photo-1521791136064-7986c2920216?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
         "excerpt": "Wawancara kerja pertama sering bikin gugup. Simak 5 tips praktis agar Anda tampil percaya diri dan lolos seleksi.",
         "content": "Wawancara kerja adalah momen penentu dalam proses rekrutmen. Bagi fresh graduate, pengalaman pertama ini sering kali menegangkan. Berikut lima tips yang bisa Anda terapkan.\n\nPertama, pelajari profil perusahaan sebelum wawancara. Ketahui bidang usaha, produk, dan budaya kerjanya. Kedua, siapkan jawaban untuk pertanyaan umum seperti kelebihan, kekurangan, dan alasan melamar. Latih jawaban Anda dengan bahasa yang natural, bukan hafalan kaku.\n\nKetiga, berpakaian rapi dan datang lebih awal, minimal 15 menit sebelum jadwal. Keempat, tunjukkan antusiasme melalui bahasa tubuh: jabat tangan dengan yakin, jaga kontak mata, dan tersenyum. Kelima, siapkan satu atau dua pertanyaan untuk pewawancara agar Anda terlihat serius dengan posisi tersebut.\n\nIngat, perusahaan lokal dan UMKM di Cirebon umumnya lebih menilai sikap, kejujuran, dan kemauan belajar dibanding pengalaman semata. Semoga sukses!",
         "created_at": "2026-06-20T08:00:00+00:00"},
        {"id": str(uuid.uuid4()), "slug": "cara-menulis-cv-yang-menarik-perhatian-hrd",
         "title": "Cara Menulis CV yang Menarik Perhatian HRD",
         "category": "Tips Karier",
         "image": "https://images.pexels.com/photos/590044/pexels-photo-590044.jpeg?auto=compress&cs=tinysrgb&w=800",
         "excerpt": "HRD hanya butuh beberapa detik untuk menilai CV Anda. Begini cara membuat CV yang langsung dilirik.",
         "content": "CV adalah kesan pertama Anda di mata HRD. Rata-rata rekruter hanya membaca CV selama 6-10 detik sebelum memutuskan lanjut atau tidak.\n\nMulailah dengan format yang rapi: satu halaman untuk pemula, font sederhana, dan struktur jelas berisi data diri, pendidikan, pengalaman, dan keahlian. Hindari foto yang tidak formal dan informasi yang tidak relevan.\n\nTulis pengalaman dengan fokus pada hasil, bukan sekadar tugas. Misalnya, bukan hanya 'melayani pelanggan', tetapi 'melayani rata-rata 50 pelanggan per hari dengan rating kepuasan 95%'. Angka membuat CV Anda lebih meyakinkan.\n\nTerakhir, sesuaikan CV dengan lowongan yang dilamar. Jika melamar posisi kasir, tonjolkan ketelitian dan pengalaman transaksi. Simpan CV dalam format PDF agar tampilannya tidak berubah saat dibuka perusahaan.",
         "created_at": "2026-06-12T08:00:00+00:00"},
        {"id": str(uuid.uuid4()), "slug": "mengenal-hak-pekerja-dan-umk-cirebon-2026",
         "title": "Mengenal Hak Pekerja dan UMK Cirebon 2026",
         "category": "Info Ketenagakerjaan",
         "image": "https://images.unsplash.com/photo-1592220769343-8a128527c5f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
         "excerpt": "Sebelum menandatangani kontrak, pahami dulu hak-hak dasar Anda sebagai pekerja, termasuk soal UMK dan jam kerja.",
         "content": "Setiap pekerja di Indonesia dilindungi oleh undang-undang ketenagakerjaan. Memahami hak dasar Anda penting agar tidak dirugikan saat bekerja.\n\nUpah Minimum Kabupaten/Kota (UMK) adalah standar upah terendah yang wajib dibayarkan perusahaan kepada pekerja dengan masa kerja kurang dari satu tahun. Besaran UMK berbeda di setiap daerah, termasuk Kota Cirebon, Kabupaten Cirebon, Majalengka, Kuningan, dan Indramayu. Pastikan gaji yang ditawarkan tidak di bawah UMK daerah tersebut.\n\nSelain upah, pekerja berhak atas jam kerja maksimal 40 jam per minggu, cuti tahunan, cuti melahirkan, serta jaminan BPJS Kesehatan dan Ketenagakerjaan untuk pekerja formal. Untuk pekerja informal atau harian, pastikan kesepakatan upah dan jam kerja tertulis jelas.\n\nJika Anda menemukan lowongan yang meminta biaya pendaftaran atau menahan ijazah asli, waspadalah — itu adalah ciri umum penipuan lowongan kerja. Semua lowongan di CirebonKarir.com telah melewati moderasi, namun tetap laporkan jika menemukan kejanggalan.",
         "created_at": "2026-06-05T08:00:00+00:00"},
        {"id": str(uuid.uuid4()), "slug": "strategi-jitu-mencari-kerja-di-tahun-2026",
         "title": "Strategi Jitu Mencari Kerja di Tahun 2026",
         "category": "Tips Karier",
         "image": "https://images.pexels.com/photos/5077060/pexels-photo-5077060.jpeg?auto=compress&cs=tinysrgb&w=800",
         "excerpt": "Persaingan kerja semakin ketat. Terapkan strategi ini agar pencarian kerja Anda lebih terarah dan cepat membuahkan hasil.",
         "content": "Mencari kerja di tahun 2026 membutuhkan strategi yang lebih cerdas dibanding sekadar mengirim lamaran ke banyak tempat.\n\nPertama, tentukan target yang jelas: posisi, lokasi, dan rentang gaji yang realistis. Dengan target spesifik, Anda bisa fokus pada lowongan yang benar-benar cocok. Kedua, manfaatkan portal lowongan lokal seperti CirebonKarir.com dan aktifkan rutinitas melamar setiap hari — konsistensi mengalahkan keberuntungan.\n\nKetiga, perkuat profil Anda: perbarui CV, lengkapi data diri, dan siapkan nomor WhatsApp aktif agar perusahaan mudah menghubungi. Keempat, jangan abaikan jaringan pertemanan — banyak lowongan UMKM justru tersebar dari mulut ke mulut.\n\nTerakhir, evaluasi setiap penolakan. Jika sering gagal di tahap wawancara, berarti kemampuan komunikasi yang perlu dilatih. Jika lamaran tidak pernah dilirik, perbaiki CV Anda. Terus bergerak dan semangat!",
         "created_at": "2026-05-28T08:00:00+00:00"},
    ]
    await db.blog_posts.insert_many(posts)
    logger.info("Blog posts seeded")


# ---------- File download ----------
@api_router.get("/files/{path:path}")
async def download_file(path: str, request: Request, auth: str = Query(None)):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    if record.get("kind") in ("cv", "payment"):
        token = extract_token(request, auth)
        user = await get_user_by_token(token) if token else None
        if not user:
            raise HTTPException(status_code=401, detail="Tidak memiliki akses")
        allowed = user["role"] == "admin" or user["id"] == record.get("owner_user_id")
        if not allowed and user["role"] == "company" and record.get("kind") == "cv":
            company = await db.companies.find_one({"user_id": user["id"]})
            if company:
                allowed = bool(await db.applications.find_one({"cv_path": path, "company_id": company["id"]}))
        if not allowed:
            raise HTTPException(status_code=403, detail="Tidak memiliki akses")
    try:
        data, content_type = await asyncio.to_thread(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    return RawResponse(content=data, media_type=record.get("content_type", content_type))


# ---------- Candidate ----------
@api_router.post("/jobs/{job_id}/apply")
async def apply_job(job_id: str, name: str = Form(...), email: str = Form(...), phone: str = Form(...),
                    education: str = Form(""), experience: str = Form(""), message: str = Form(""),
                    cv: Optional[UploadFile] = File(None), user=Depends(require_role("candidate"))):
    await expire_jobs()
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job or job["status"] != "active":
        raise HTTPException(status_code=400, detail="Lowongan tidak tersedia")
    if await db.applications.find_one({"job_id": job_id, "candidate_id": user["id"]}):
        raise HTTPException(status_code=400, detail="Anda sudah melamar lowongan ini")
    cv_path = user.get("cv_path", "")
    cv_filename = user.get("cv_filename", "")
    if cv and cv.filename:
        saved = await save_upload(user["id"], cv, "cv")
        cv_path, cv_filename = saved["path"], saved["filename"]
        await db.users.update_one({"id": user["id"]}, {"$set": {"cv_path": cv_path, "cv_filename": cv_filename}})
    if not cv_path:
        raise HTTPException(status_code=400, detail="CV wajib diunggah (PDF/DOC, maks 2MB)")
    company = await db.companies.find_one({"id": job["company_id"]}, {"_id": 0})
    application = {"id": str(uuid.uuid4()), "job_id": job["id"], "job_title": job["title"], "job_slug": job["slug"],
                   "company_id": job["company_id"], "company_name": company["name"] if company else "",
                   "candidate_id": user["id"], "name": name.strip(), "email": email.strip().lower(),
                   "phone": phone.strip(), "education": education, "experience": experience,
                   "cv_path": cv_path, "cv_filename": cv_filename, "message": message,
                   "status": "terkirim", "created_at": now_iso()}
    await db.applications.insert_one(application)
    application.pop("_id", None)
    return application


@api_router.get("/candidate/applications")
async def candidate_applications(user=Depends(require_role("candidate"))):
    apps = await db.applications.find({"candidate_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return apps


@api_router.get("/candidate/stats")
async def candidate_stats(user=Depends(require_role("candidate"))):
    apps = await db.applications.find({"candidate_id": user["id"]}, {"status": 1}).to_list(1000)
    return {
        "total": len(apps),
        "diproses": sum(1 for a in apps if a["status"] in ("dilihat", "diproses")),
        "interview": sum(1 for a in apps if a["status"] == "interview"),
        "ditolak": sum(1 for a in apps if a["status"] == "ditolak"),
        "diterima": sum(1 for a in apps if a["status"] == "diterima"),
    }


@api_router.put("/candidate/profile")
async def update_candidate_profile(data: CandidateProfileIn, user=Depends(require_role("candidate"))):
    update = {"name": data.name.strip(), "phone": data.phone.strip(), "education": data.education,
              "experience": data.experience, "about": data.about}
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    return await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})


@api_router.post("/candidate/cv")
async def upload_candidate_cv(file: UploadFile = File(...), user=Depends(require_role("candidate"))):
    saved = await save_upload(user["id"], file, "cv")
    await db.users.update_one({"id": user["id"]}, {"$set": {"cv_path": saved["path"], "cv_filename": saved["filename"]}})
    return saved


# ---------- Company ----------
async def get_my_company(user):
    company = await db.companies.find_one({"user_id": user["id"]}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Profil perusahaan tidak ditemukan")
    return company


@api_router.get("/company/profile")
async def company_profile(user=Depends(require_role("company"))):
    return await get_my_company(user)


@api_router.put("/company/profile")
async def update_company_profile(data: CompanyProfileIn, user=Depends(require_role("company"))):
    company = await get_my_company(user)
    update = {"name": data.name.strip(), "description": data.description, "address": data.address,
              "city": data.city, "phone": data.phone, "website": data.website, "instagram": data.instagram,
              "founded_year": data.founded_year, "business_category": data.business_category, "size": data.size}
    await db.companies.update_one({"id": company["id"]}, {"$set": update})
    return await db.companies.find_one({"id": company["id"]}, {"_id": 0})


@api_router.post("/company/logo")
async def upload_company_logo(file: UploadFile = File(...), user=Depends(require_role("company"))):
    company = await get_my_company(user)
    saved = await save_upload(user["id"], file, "logo")
    await db.companies.update_one({"id": company["id"]}, {"$set": {"logo": saved["path"]}})
    return {"logo": saved["path"]}


@api_router.get("/company/stats")
async def company_stats(user=Depends(require_role("company"))):
    company = await get_my_company(user)
    jobs = await db.jobs.find({"company_id": company["id"]}, {"status": 1}).to_list(1000)
    applicants = await db.applications.count_documents({"company_id": company["id"]})
    return {"total_jobs": len(jobs), "active_jobs": sum(1 for j in jobs if j["status"] == "active"),
            "pending_jobs": sum(1 for j in jobs if j["status"] == "pending"),
            "total_applicants": applicants, "company_status": company["status"], "company_name": company["name"]}


@api_router.get("/company/entitlement")
async def company_entitlement(user=Depends(require_role("company"))):
    company = await get_my_company(user)
    return await get_company_entitlement(company)


@api_router.get("/company/jobs")
async def company_jobs(user=Depends(require_role("company"))):
    company = await get_my_company(user)
    await expire_jobs()
    jobs = await db.jobs.find({"company_id": company["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    counts = {}
    async for row in db.applications.aggregate([{"$match": {"company_id": company["id"]}}, {"$group": {"_id": "$job_id", "n": {"$sum": 1}}}]):
        counts[row["_id"]] = row["n"]
    for j in jobs:
        j["applicants"] = counts.get(j["id"], 0)
        j["company_name"] = company["name"]
        j["company_logo"] = company.get("logo", "")
    return jobs


@api_router.post("/company/jobs")
async def create_job(data: JobIn, user=Depends(require_role("company"))):
    company = await get_my_company(user)
    ent = await get_company_entitlement(company)
    if not ent["can_post"]:
        raise HTTPException(status_code=403,
                            detail="Kuota posting gratis bulan ini telah digunakan. Upgrade ke Member Perusahaan untuk posting lowongan dengan masa tayang 30 hari.")
    if ent["mode"] == "free" and not await consume_free_quota(company["id"]):
        raise HTTPException(status_code=403, detail="Kuota posting gratis bulan ini telah digunakan.")
    job = {"id": str(uuid.uuid4()), "company_id": company["id"],
           "slug": f"{slugify(data.title)}-{slugify(data.location)}-{uuid.uuid4().hex[:6]}",
           **data.model_dump(), "status": "pending", "rejection_reason": "",
           "listing_days": ent["listing_days"], "posting_mode": ent["mode"], "expires_at": "",
           "created_at": now_iso()}
    await db.jobs.insert_one(job)
    job.pop("_id", None)
    return job


@api_router.put("/company/jobs/{job_id}")
async def update_job(job_id: str, data: JobIn, user=Depends(require_role("company"))):
    company = await get_my_company(user)
    job = await db.jobs.find_one({"id": job_id, "company_id": company["id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Lowongan tidak ditemukan")
    update = data.model_dump()
    update["status"] = "pending"
    update["rejection_reason"] = ""
    await db.jobs.update_one({"id": job_id}, {"$set": update})
    return await db.jobs.find_one({"id": job_id}, {"_id": 0})


@api_router.post("/company/jobs/{job_id}/toggle")
async def toggle_job(job_id: str, user=Depends(require_role("company"))):
    company = await get_my_company(user)
    job = await db.jobs.find_one({"id": job_id, "company_id": company["id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Lowongan tidak ditemukan")
    if job["status"] == "active":
        new_status = "nonaktif"
    elif job["status"] == "nonaktif":
        new_status = "active"
    else:
        raise HTTPException(status_code=400, detail="Hanya lowongan aktif/nonaktif yang dapat diubah")
    await db.jobs.update_one({"id": job_id}, {"$set": {"status": new_status}})
    return {"status": new_status}


@api_router.get("/company/applications")
async def company_applications(job_id: str = "", user=Depends(require_role("company"))):
    company = await get_my_company(user)
    query = {"company_id": company["id"]}
    if job_id:
        query["job_id"] = job_id
    return await db.applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.get("/company/applications/{app_id}")
async def company_application_detail(app_id: str, user=Depends(require_role("company"))):
    company = await get_my_company(user)
    application = await db.applications.find_one({"id": app_id, "company_id": company["id"]}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Lamaran tidak ditemukan")
    if application["status"] == "terkirim":
        await db.applications.update_one({"id": app_id}, {"$set": {"status": "dilihat"}})
        application["status"] = "dilihat"
    return application


@api_router.put("/company/applications/{app_id}")
async def update_application_status(app_id: str, data: ApplicationStatusIn, user=Depends(require_role("company"))):
    if data.status not in APPLICATION_STATUSES:
        raise HTTPException(status_code=400, detail="Status tidak valid")
    company = await get_my_company(user)
    result = await db.applications.update_one({"id": app_id, "company_id": company["id"]}, {"$set": {"status": data.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lamaran tidak ditemukan")
    return {"status": data.status}


# ---------- Admin ----------
@api_router.get("/admin/stats")
async def admin_stats(user=Depends(require_role("admin"))):
    await expire_jobs()
    return {
        "candidates": await db.users.count_documents({"role": "candidate"}),
        "companies": await db.companies.count_documents({}),
        "companies_pending": await db.companies.count_documents({"status": "pending"}),
        "companies_verified": await db.companies.count_documents({"status": "verified"}),
        "jobs": await db.jobs.count_documents({}),
        "jobs_pending": await db.jobs.count_documents({"status": "pending"}),
        "jobs_active": await db.jobs.count_documents({"status": "active"}),
        "applications": await db.applications.count_documents({}),
    }


@api_router.get("/admin/jobs")
async def admin_jobs(status: str = "", user=Depends(require_role("admin"))):
    await expire_jobs()
    query = {"status": status} if status else {}
    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    cmap = await get_company_map()
    return [attach_company(j, cmap) for j in jobs]


@api_router.post("/admin/jobs/{job_id}/approve")
async def admin_approve_job(job_id: str, user=Depends(require_role("admin"))):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Lowongan tidak ditemukan")
    update = {"status": "active", "rejection_reason": ""}
    if job.get("listing_days"):
        update["expires_at"] = (datetime.now(timezone.utc) + timedelta(days=job["listing_days"])).isoformat()
    await db.jobs.update_one({"id": job_id}, {"$set": update})
    return {"status": "active"}


@api_router.post("/admin/jobs/{job_id}/reject")
async def admin_reject_job(job_id: str, data: RejectIn, user=Depends(require_role("admin"))):
    result = await db.jobs.update_one({"id": job_id}, {"$set": {"status": "rejected", "rejection_reason": data.reason}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lowongan tidak ditemukan")
    return {"status": "rejected"}


@api_router.put("/admin/jobs/{job_id}")
async def admin_update_job(job_id: str, data: JobIn, user=Depends(require_role("admin"))):
    result = await db.jobs.update_one({"id": job_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lowongan tidak ditemukan")
    return await db.jobs.find_one({"id": job_id}, {"_id": 0})


@api_router.delete("/admin/jobs/{job_id}")
async def admin_delete_job(job_id: str, user=Depends(require_role("admin"))):
    await db.jobs.delete_one({"id": job_id})
    await db.applications.delete_many({"job_id": job_id})
    return {"message": "Lowongan dihapus"}


@api_router.get("/admin/companies")
async def admin_companies(status: str = "", user=Depends(require_role("admin"))):
    query = {"status": status} if status else {}
    return await db.companies.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.post("/admin/companies/{company_id}/status")
async def admin_company_status(company_id: str, data: CompanyStatusIn, user=Depends(require_role("admin"))):
    if data.status not in COMPANY_STATUSES:
        raise HTTPException(status_code=400, detail="Status tidak valid")
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Perusahaan tidak ditemukan")
    await db.companies.update_one({"id": company_id}, {"$set": {"status": data.status}})
    await db.users.update_one({"id": company["user_id"]}, {"$set": {"blocked": data.status == "blocked"}})
    return {"status": data.status}


@api_router.delete("/admin/companies/{company_id}")
async def admin_delete_company(company_id: str, user=Depends(require_role("admin"))):
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Perusahaan tidak ditemukan")
    job_ids = [j["id"] async for j in db.jobs.find({"company_id": company_id}, {"id": 1})]
    await db.applications.delete_many({"job_id": {"$in": job_ids}})
    await db.jobs.delete_many({"company_id": company_id})
    await db.companies.delete_one({"id": company_id})
    await db.users.delete_one({"id": company["user_id"]})
    return {"message": "Perusahaan dihapus"}


@api_router.get("/admin/candidates")
async def admin_candidates(user=Depends(require_role("admin"))):
    candidates = await db.users.find({"role": "candidate"}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(2000)
    counts = {}
    async for row in db.applications.aggregate([{"$group": {"_id": "$candidate_id", "n": {"$sum": 1}}}]):
        counts[row["_id"]] = row["n"]
    for c in candidates:
        c["applications_count"] = counts.get(c["id"], 0)
    return candidates


@api_router.post("/admin/users/{user_id}/status")
async def admin_user_status(user_id: str, data: UserBlockIn, user=Depends(require_role("admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if target["role"] == "admin":
        raise HTTPException(status_code=400, detail="Tidak dapat memblokir admin")
    await db.users.update_one({"id": user_id}, {"$set": {"blocked": data.blocked}})
    return {"blocked": data.blocked}


@api_router.get("/admin/applications")
async def admin_applications(user=Depends(require_role("admin"))):
    return await db.applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)


@api_router.get("/admin/categories")
async def admin_categories(user=Depends(require_role("admin"))):
    return await db.categories.find({}, {"_id": 0}).to_list(200)


@api_router.post("/admin/categories")
async def admin_add_category(data: CategoryIn, user=Depends(require_role("admin"))):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama kategori wajib diisi")
    if await db.categories.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Kategori sudah ada")
    cat = {"id": str(uuid.uuid4()), "name": name}
    await db.categories.insert_one(cat)
    cat.pop("_id", None)
    return cat


@api_router.delete("/admin/categories/{cat_id}")
async def admin_delete_category(cat_id: str, user=Depends(require_role("admin"))):
    await db.categories.delete_one({"id": cat_id})
    return {"message": "Kategori dihapus"}


# ---------- Membership & Monetisasi (sistem terpusat) ----------
async def mle_log(actor_id, action, entity_type, entity_id, metadata=None):
    await db.membership_audit_logs.insert_one({
        "id": str(uuid.uuid4()), "actor_id": actor_id, "action": action,
        "entity_type": entity_type, "entity_id": entity_id,
        "metadata": metadata or {}, "created_at": now_iso()})


async def seed_membership_products():
    if await db.membership_products.count_documents({}) == 0:
        now = now_iso()
        await db.membership_products.insert_many([
            {"id": str(uuid.uuid4()), "product_code": "cv_professional", "name": "CV Profesional",
             "target_role": "job_seeker", "price": 10000, "duration_days": 30,
             "description": "Template CV profesional, CV builder, import CV lama, dan download PDF selama 30 hari.",
             "active": True, "created_at": now, "updated_at": now},
            {"id": str(uuid.uuid4()), "product_code": "company_membership", "name": "Member Perusahaan",
             "target_role": "company", "price": 50000, "duration_days": 90,
             "description": "Masa tayang lowongan 30 hari dan posting tanpa batas kuota selama 3 bulan.",
             "active": True, "created_at": now, "updated_at": now},
        ])
        logger.info("Membership products seeded")


async def get_product(product_code):
    p = await db.membership_products.find_one({"product_code": product_code}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    return p


async def get_payment_settings():
    s = await db.payment_settings.find_one({"id": "payment_settings"}, {"_id": 0})
    if not s:
        legacy = await db.cv_settings.find_one({"id": "cv_settings"}, {"_id": 0})
        s = {"id": "payment_settings", "payment_methods": (legacy or {}).get("payment_methods", []),
             "updated_at": now_iso()}
        await db.payment_settings.insert_one(s)
        s.pop("_id", None)
    return s


async def expire_subscriptions():
    now = now_iso()
    expired = await db.subscriptions.find({"status": "active", "expires_at": {"$lte": now, "$ne": ""}}, {"_id": 0}).to_list(1000)
    for s in expired:
        await db.subscriptions.update_one({"id": s["id"]}, {"$set": {"status": "expired", "updated_at": now}})
        await mle_log("system", "Subscription expired", "subscription", s["id"], {"product_type": s["product_type"]})


async def has_entitlement(product_code, user_id=None, company_id=None):
    await expire_subscriptions()
    query = {"product_type": product_code, "status": "active", "expires_at": {"$gt": now_iso(), "$ne": ""}}
    if user_id:
        query["user_id"] = user_id
    if company_id:
        query["company_id"] = company_id
    return bool(await db.subscriptions.find_one(query))


async def get_active_subscription(product_code, user_id=None, company_id=None):
    await expire_subscriptions()
    query = {"product_type": product_code, "status": "active", "expires_at": {"$gt": now_iso(), "$ne": ""}}
    if user_id:
        query["user_id"] = user_id
    if company_id:
        query["company_id"] = company_id
    return await db.subscriptions.find_one(query, {"_id": 0})


async def get_or_create_quota(company_id):
    now = datetime.now(timezone.utc)
    key = {"company_id": company_id, "period_year": now.year, "period_month": now.month}
    doc = await db.company_posting_quotas.find_one(key, {"_id": 0})
    if not doc:
        doc = {"id": str(uuid.uuid4()), **key, "free_post_limit": 1, "free_post_used": 0,
               "created_at": now_iso(), "updated_at": now_iso()}
        try:
            await db.company_posting_quotas.insert_one(doc)
        except Exception:
            doc = await db.company_posting_quotas.find_one(key, {"_id": 0})
        doc.pop("_id", None)
    return doc


async def consume_free_quota(company_id):
    now = datetime.now(timezone.utc)
    await get_or_create_quota(company_id)
    result = await db.company_posting_quotas.find_one_and_update(
        {"company_id": company_id, "period_year": now.year, "period_month": now.month,
         "$expr": {"$lt": ["$free_post_used", "$free_post_limit"]}},
        {"$inc": {"free_post_used": 1}, "$set": {"updated_at": now_iso()}},
        return_document=ReturnDocument.AFTER)
    return result is not None


async def get_company_entitlement(company):
    member_sub = await get_active_subscription("company_membership", company_id=company["id"])
    quota = await get_or_create_quota(company["id"])
    now = datetime.now(timezone.utc)
    remaining = max(0, quota["free_post_limit"] - quota["free_post_used"])
    quota_info = {"limit": quota["free_post_limit"], "used": quota["free_post_used"],
                  "remaining": remaining, "period": f"{now.year}-{now.month:02d}"}
    if member_sub:
        return {"mode": "member", "can_post": True, "listing_days": 30, "is_member": True,
                "member_expires_at": member_sub["expires_at"], "member_started_at": member_sub.get("started_at", ""),
                "quota": quota_info}
    if remaining > 0:
        return {"mode": "free", "can_post": True, "listing_days": 7, "is_member": False,
                "member_expires_at": "", "member_started_at": "", "quota": quota_info}
    return {"mode": "none", "can_post": False, "listing_days": 0, "is_member": False,
            "member_expires_at": "", "member_started_at": "", "quota": quota_info}


@api_router.get("/membership/products")
async def membership_products(user=Depends(get_current_user)):
    return await db.membership_products.find({"active": True}, {"_id": 0}).to_list(20)


@api_router.get("/membership/payment-info")
async def membership_payment_info(user=Depends(get_current_user)):
    s = await get_payment_settings()
    return {"payment_methods": s.get("payment_methods", [])}


@api_router.post("/membership/payments")
async def create_payment(product_code: str = Form(...), payment_method: str = Form(...),
                         proof: UploadFile = File(...), user=Depends(get_current_user)):
    product = await get_product(product_code)
    if not product.get("active"):
        raise HTTPException(status_code=400, detail="Produk tidak tersedia")
    company = None
    if product["target_role"] == "job_seeker":
        if user["role"] != "candidate":
            raise HTTPException(status_code=403, detail="Produk ini khusus pencari kerja")
        if await has_entitlement(product_code, user_id=user["id"]):
            raise HTTPException(status_code=400, detail="Anda masih memiliki akses aktif untuk produk ini")
    else:
        if user["role"] != "company":
            raise HTTPException(status_code=403, detail="Produk ini khusus perusahaan")
        company = await get_my_company(user)
    pending_q = {"product_code": product_code, "status": "pending", "user_id": user["id"]}
    if company:
        pending_q["company_id"] = company["id"]
    if await db.payments.find_one(pending_q):
        raise HTTPException(status_code=400, detail="Pembayaran Anda sedang menunggu verifikasi admin")
    saved = await save_upload(user["id"], proof, "payment")
    now = now_iso()
    payment = {"id": str(uuid.uuid4()), "user_id": user["id"], "company_id": company["id"] if company else "",
               "product_id": product["id"], "product_code": product_code, "product_name": product["name"],
               "amount": product["price"], "duration_days": product["duration_days"],
               "payment_method": payment_method, "payment_proof": saved["path"],
               "payment_proof_filename": saved["filename"], "payment_provider": "manual",
               "status": "pending", "submitted_at": now, "verified_at": "", "verified_by": "",
               "rejection_reason": "", "created_at": now, "updated_at": now}
    await db.payments.insert_one(payment)
    await mle_log(user["id"], "Payment submitted", "payment", payment["id"],
                  {"product_code": product_code, "amount": product["price"]})
    payment.pop("_id", None)
    return payment


@api_router.get("/membership/payments")
async def my_payments(user=Depends(get_current_user)):
    return await db.payments.find({"user_id": user["id"]}, {"_id": 0}).sort("submitted_at", -1).to_list(100)


async def migrate_cv_subscriptions():
    if await db.migrations.find_one({"id": "cv_to_unified"}):
        return
    count = 0
    status_map = {"pending": "pending", "active": "approved", "expired": "approved",
                  "rejected": "rejected", "cancelled": "cancelled"}
    async for s in db.cv_subscriptions.find({}):
        pay_status = status_map.get(s["status"], "pending")
        payment_id = str(uuid.uuid4())
        await db.payments.insert_one({
            "id": payment_id, "user_id": s["user_id"], "company_id": "", "product_id": "",
            "product_code": "cv_professional", "product_name": s.get("package_name", "CV Profesional"),
            "amount": s.get("price", 10000), "duration_days": s.get("duration_days", 30),
            "payment_method": s.get("payment_method", ""), "payment_proof": s.get("payment_proof", ""),
            "payment_proof_filename": s.get("payment_proof_filename", ""), "payment_provider": "manual",
            "status": pay_status, "submitted_at": s.get("requested_at", now_iso()),
            "verified_at": s.get("activated_at", ""), "verified_by": s.get("activated_by", ""),
            "rejection_reason": s.get("rejection_reason", ""),
            "created_at": s.get("created_at", now_iso()), "updated_at": now_iso()})
        await db.subscriptions.insert_one({
            "id": str(uuid.uuid4()), "user_id": s["user_id"], "company_id": "",
            "product_type": "cv_professional", "package_id": "", "status": s["status"],
            "price": s.get("price", 10000), "duration_days": s.get("duration_days", 30),
            "started_at": s.get("activated_at", ""), "expires_at": s.get("expires_at", ""),
            "payment_id": payment_id, "activated_by": s.get("activated_by", ""),
            "created_at": s.get("created_at", now_iso()), "updated_at": now_iso()})
        count += 1
    await db.migrations.insert_one({"id": "cv_to_unified", "migrated": count, "created_at": now_iso()})
    logger.info(f"Migrated {count} CV subscriptions to unified system")


# ---------- CV Profesional ----------
CV_TEMPLATE_LIST = [
    {"id": "modern", "name": "Template Modern", "description": "Header berwarna dengan aksen profesional"},
    {"id": "ats", "name": "Template ATS", "description": "Format sederhana yang ramah sistem ATS"},
    {"id": "minimalis", "name": "Template Minimalis", "description": "Dua kolom bersih dan ringkas"},
]

CV_DEFAULT_SETTINGS = {
    "id": "cv_settings",
    "package_name": "CV Profesional 30 Hari",
    "price": 10000,
    "duration_days": 30,
    "payment_methods": [],
}


async def get_cv_settings():
    settings = await db.cv_settings.find_one({"id": "cv_settings"}, {"_id": 0})
    if not settings:
        settings = {**CV_DEFAULT_SETTINGS, "updated_at": now_iso()}
        await db.cv_settings.insert_one(settings)
        settings.pop("_id", None)
    return settings


async def write_cv_log(subscription_id, user_id, action, old_status, new_status, actor, notes=""):
    await db.cv_activation_logs.insert_one({
        "id": str(uuid.uuid4()), "subscription_id": subscription_id, "user_id": user_id,
        "action": action, "old_status": old_status, "new_status": new_status,
        "activated_by": actor, "notes": notes, "created_at": now_iso(),
    })


async def expire_cv_subscriptions():
    now = now_iso()
    expired = await db.cv_subscriptions.find({"status": "active", "expires_at": {"$lte": now, "$ne": ""}}, {"_id": 0}).to_list(500)
    for s in expired:
        await db.cv_subscriptions.update_one({"id": s["id"]}, {"$set": {"status": "expired", "updated_at": now}})
        await write_cv_log(s["id"], s["user_id"], "Subscription expired", "active", "expired", "system")


async def get_cv_subscriptions(user_id):
    await expire_cv_subscriptions()
    return await db.cv_subscriptions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)


def has_cv_access(subs):
    now = now_iso()
    return any(s["status"] == "active" and (s.get("expires_at") or "") > now for s in subs)


async def require_cv_premium(user=Depends(require_role("candidate"))):
    if not await has_entitlement("cv_professional", user_id=user["id"]):
        raise HTTPException(status_code=403, detail="Fitur ini memerlukan akses CV Profesional yang aktif")
    return user


class CvSettingsIn(BaseModel):
    package_name: str
    price: int
    duration_days: int
    payment_methods: list = []


class CvDocIn(BaseModel):
    name: str
    template: str = "modern"
    data: dict = {}


class CvRejectIn(BaseModel):
    reason: str = ""


@api_router.get("/cv-professional/status")
async def cv_status(user=Depends(require_role("candidate"))):
    product = await get_product("cv_professional")
    await expire_subscriptions()
    subs = await db.subscriptions.find({"user_id": user["id"], "product_type": "cv_professional"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    payments = await db.payments.find({"user_id": user["id"], "product_code": "cv_professional"}, {"_id": 0}).sort("submitted_at", -1).to_list(50)
    active = next((s for s in subs if s["status"] == "active" and (s.get("expires_at") or "") > now_iso()), None)
    pending_pay = next((p for p in payments if p["status"] == "pending"), None)
    sub = None
    if active:
        sub = {"status": "active", "package_name": product["name"], "price": active["price"],
               "duration_days": active["duration_days"], "requested_at": active.get("started_at", ""),
               "activated_at": active.get("started_at", ""), "expires_at": active.get("expires_at", ""),
               "rejection_reason": ""}
    elif pending_pay:
        sub = {"status": "pending", "package_name": product["name"], "price": pending_pay["amount"],
               "duration_days": pending_pay["duration_days"], "requested_at": pending_pay["submitted_at"],
               "expires_at": "", "rejection_reason": ""}
    elif payments and payments[0]["status"] == "rejected":
        sub = {"status": "rejected", "package_name": product["name"], "price": payments[0]["amount"],
               "duration_days": payments[0]["duration_days"], "requested_at": payments[0]["submitted_at"],
               "expires_at": "", "rejection_reason": payments[0].get("rejection_reason", "")}
    elif subs:
        latest = subs[0]
        sub = {"status": latest["status"], "package_name": product["name"], "price": latest["price"],
               "duration_days": latest["duration_days"], "requested_at": latest.get("started_at", ""),
               "expires_at": latest.get("expires_at", ""), "rejection_reason": ""}
    return {"settings": {"package_name": product["name"], "price": product["price"],
                         "duration_days": product["duration_days"]},
            "has_access": bool(active), "subscription": sub}


@api_router.get("/cv-professional/payment-info")
async def cv_payment_info(user=Depends(require_role("candidate"))):
    product = await get_product("cv_professional")
    settings = await get_payment_settings()
    return {"package_name": product["name"], "price": product["price"],
            "duration_days": product["duration_days"], "payment_methods": settings.get("payment_methods", [])}


@api_router.post("/cv-professional/subscribe")
async def cv_subscribe(payment_method: str = Form(...), proof: UploadFile = File(...),
                       user=Depends(require_role("candidate"))):
    return await create_payment(product_code="cv_professional", payment_method=payment_method,
                                proof=proof, user=user)


@api_router.get("/cv-professional/templates")
async def cv_templates(user=Depends(require_cv_premium)):
    return CV_TEMPLATE_LIST


@api_router.get("/cv-professional/my-cvs")
async def cv_my_list(user=Depends(require_role("candidate"))):
    return await db.cv_documents.find({"user_id": user["id"]}, {"_id": 0, "data": 0}).sort("updated_at", -1).to_list(100)


@api_router.get("/cv-professional/cvs/{cv_id}")
async def cv_get(cv_id: str, user=Depends(require_role("candidate"))):
    doc = await db.cv_documents.find_one({"id": cv_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="CV tidak ditemukan")
    return doc


@api_router.post("/cv-professional/cvs")
async def cv_create(data: CvDocIn, user=Depends(require_cv_premium)):
    if data.template not in {t["id"] for t in CV_TEMPLATE_LIST}:
        raise HTTPException(status_code=400, detail="Template tidak valid")
    now = now_iso()
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": data.name.strip() or "CV Tanpa Nama",
           "template": data.template, "data": data.data, "created_at": now, "updated_at": now}
    await db.cv_documents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/cv-professional/cvs/{cv_id}")
async def cv_update(cv_id: str, data: CvDocIn, user=Depends(require_cv_premium)):
    if data.template not in {t["id"] for t in CV_TEMPLATE_LIST}:
        raise HTTPException(status_code=400, detail="Template tidak valid")
    result = await db.cv_documents.update_one({"id": cv_id, "user_id": user["id"]},
        {"$set": {"name": data.name.strip() or "CV Tanpa Nama", "template": data.template,
                  "data": data.data, "updated_at": now_iso()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="CV tidak ditemukan")
    return await db.cv_documents.find_one({"id": cv_id}, {"_id": 0})


@api_router.post("/cv-professional/cvs/{cv_id}/duplicate")
async def cv_duplicate(cv_id: str, user=Depends(require_cv_premium)):
    doc = await db.cv_documents.find_one({"id": cv_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="CV tidak ditemukan")
    now = now_iso()
    new_doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": f"{doc['name']} (Salinan)",
               "template": doc["template"], "data": doc["data"], "created_at": now, "updated_at": now}
    await db.cv_documents.insert_one(new_doc)
    new_doc.pop("_id", None)
    return new_doc


@api_router.delete("/cv-professional/cvs/{cv_id}")
async def cv_delete(cv_id: str, user=Depends(require_role("candidate"))):
    result = await db.cv_documents.delete_one({"id": cv_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="CV tidak ditemukan")
    return {"message": "CV dihapus"}


def parse_cv_text(text: str) -> dict:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    phone_match = re.search(r"(\+62|62|08)\d[\d\s-]{7,13}", text)
    parsed = {
        "personal": {"name": lines[0] if lines else "", "email": email_match.group(0) if email_match else "",
                     "phone": re.sub(r"[\s-]", "", phone_match.group(0)) if phone_match else "",
                     "address": "", "city": ""},
        "summary": "", "education": [], "experience": [], "skills": [],
        "certifications": [], "organizations": [], "languages": [],
    }
    section_map = {"pendidikan": "education", "education": "education", "riwayat pendidikan": "education",
                   "pengalaman": "experience", "experience": "experience", "pengalaman kerja": "experience",
                   "keahlian": "skills", "skill": "skills", "keterampilan": "skills",
                   "sertifikat": "certifications", "sertifikasi": "certifications",
                   "organisasi": "organizations", "bahasa": "languages", "language": "languages"}
    current = None
    for line in lines[1:]:
        low = line.lower().strip(": ")
        matched = next((v for k, v in section_map.items() if low == k or low.startswith(k + " ")), None)
        if matched:
            current = matched
            continue
        if not current or len(line) < 3:
            continue
        clean = line.lstrip("-•* ")
        if current == "skills":
            parsed["skills"].append({"name": clean, "level": ""})
        elif current == "languages":
            parsed["languages"].append({"name": clean, "level": ""})
        elif current == "education":
            parsed["education"].append({"institution": clean, "major": "", "start_year": "", "end_year": "", "description": ""})
        elif current == "experience":
            parsed["experience"].append({"company": clean, "position": "", "start_date": "", "end_date": "", "description": ""})
        elif current == "certifications":
            parsed["certifications"].append({"name": clean, "issuer": "", "year": ""})
        elif current == "organizations":
            parsed["organizations"].append({"name": clean, "role": "", "period": "", "description": ""})
    return parsed


@api_router.post("/cv-professional/import-cv")
async def cv_import(file: UploadFile = File(...), user=Depends(require_cv_premium)):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="Format file harus PDF atau DOCX")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran file maksimal 5MB")
    try:
        import io
        if ext == "pdf":
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            text = "\n".join((page.extract_text() or "") for page in reader.pages)
        else:
            import docx
            document = docx.Document(io.BytesIO(data))
            text = "\n".join(p.text for p in document.paragraphs)
    except Exception:
        raise HTTPException(status_code=400, detail="File tidak dapat dibaca. Pastikan CV berisi teks (bukan hasil scan gambar).")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Tidak ada teks yang dapat dibaca dari file ini.")
    return {"parsed": parse_cv_text(text)}


# ---------- Admin: Membership & Monetisasi ----------
class ProductIn(BaseModel):
    name: str
    price: int
    duration_days: int
    description: str = ""
    active: bool = True


class PaymentSettingsIn(BaseModel):
    payment_methods: list = []


@api_router.get("/admin/monetization/overview")
async def admin_mon_overview(user=Depends(require_role("admin"))):
    await expire_subscriptions()
    payments = await db.payments.find({}, {"_id": 0, "status": 1, "amount": 1}).to_list(10000)
    subs = await db.subscriptions.find({}, {"_id": 0, "status": 1, "product_type": 1, "company_id": 1}).to_list(10000)
    active_company = [s for s in subs if s["status"] == "active" and s["product_type"] == "company_membership"]
    return {
        "revenue": sum(p.get("amount", 0) for p in payments if p["status"] == "approved"),
        "payments_pending": sum(1 for p in payments if p["status"] == "pending"),
        "payments_approved": sum(1 for p in payments if p["status"] == "approved"),
        "payments_rejected": sum(1 for p in payments if p["status"] == "rejected"),
        "cv_active": sum(1 for s in subs if s["status"] == "active" and s["product_type"] == "cv_professional"),
        "member_active": sum(1 for s in subs if s["status"] == "active" and s["product_type"] == "company_membership"),
        "subs_expired": sum(1 for s in subs if s["status"] == "expired"),
        "member_companies": len({s["company_id"] for s in active_company if s.get("company_id")}),
    }


@api_router.get("/admin/monetization/payments")
async def admin_mon_payments(status: str = "", product: str = "", q: str = "", page: int = 1,
                             limit: int = 10, user=Depends(require_role("admin"))):
    query = {}
    if status:
        query["status"] = status
    if product:
        query["product_code"] = product
    if q:
        regex = {"$regex": re.escape(q), "$options": "i"}
        users = await db.users.find({"$or": [{"name": regex}, {"email": regex}]}, {"id": 1}).to_list(500)
        comps = await db.companies.find({"name": regex}, {"id": 1}).to_list(500)
        query["$or"] = [{"user_id": {"$in": [u["id"] for u in users]}},
                        {"company_id": {"$in": [c["id"] for c in comps]}}]
    total = await db.payments.count_documents(query)
    items = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).skip(max(page - 1, 0) * limit).limit(limit).to_list(limit)
    user_map = {u["id"]: u for u in await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(3000)}
    comp_map = {c["id"]: c["name"] for c in await db.companies.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)}
    for p in items:
        u = user_map.get(p["user_id"], {})
        p["user_name"] = u.get("name", "-")
        p["user_email"] = u.get("email", "-")
        p["company_name"] = comp_map.get(p.get("company_id", ""), "")
    return {"items": items, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@api_router.get("/admin/monetization/payments/{payment_id}")
async def admin_mon_payment_detail(payment_id: str, user=Depends(require_role("admin"))):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan")
    u = await db.users.find_one({"id": payment["user_id"]}, {"_id": 0, "name": 1, "email": 1})
    payment["user_name"] = (u or {}).get("name", "-")
    payment["user_email"] = (u or {}).get("email", "-")
    if payment.get("company_id"):
        c = await db.companies.find_one({"id": payment["company_id"]}, {"_id": 0, "name": 1})
        payment["company_name"] = (c or {}).get("name", "")
    return payment


@api_router.post("/admin/monetization/payments/{payment_id}/approve")
async def admin_mon_approve(payment_id: str, user=Depends(require_role("admin"))):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan")
    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail="Hanya pembayaran berstatus pending yang dapat disetujui")
    product = await get_product(payment["product_code"])
    duration = payment.get("duration_days") or product["duration_days"]
    now = datetime.now(timezone.utc)
    await expire_subscriptions()
    owner_q = {"product_type": payment["product_code"], "status": "active"}
    if payment.get("company_id"):
        owner_q["company_id"] = payment["company_id"]
    else:
        owner_q["user_id"] = payment["user_id"]
    existing = await db.subscriptions.find_one(owner_q)
    if existing:
        base = now
        if existing.get("expires_at"):
            try:
                exp = datetime.fromisoformat(existing["expires_at"])
                if exp > now:
                    base = exp
            except ValueError:
                pass
        new_exp = base + timedelta(days=duration)
        await db.subscriptions.update_one({"id": existing["id"]}, {"$set": {
            "expires_at": new_exp.isoformat(), "payment_id": payment_id, "updated_at": now_iso()}})
        sub_id = existing["id"]
        action = "Subscription extended"
    else:
        sub_id = str(uuid.uuid4())
        new_exp = now + timedelta(days=duration)
        await db.subscriptions.insert_one({
            "id": sub_id, "user_id": payment["user_id"], "company_id": payment.get("company_id", ""),
            "product_type": payment["product_code"], "package_id": payment.get("product_id", ""),
            "status": "active", "price": payment["amount"], "duration_days": duration,
            "started_at": now.isoformat(), "expires_at": new_exp.isoformat(),
            "payment_id": payment_id, "activated_by": user["email"],
            "created_at": now_iso(), "updated_at": now_iso()})
        action = "Subscription activated"
    await db.payments.update_one({"id": payment_id}, {"$set": {
        "status": "approved", "verified_at": now_iso(), "verified_by": user["email"], "updated_at": now_iso()}})
    await mle_log(user["id"], "Payment approved", "payment", payment_id,
                  {"amount": payment["amount"], "product": payment["product_code"]})
    await mle_log(user["id"], action, "subscription", sub_id,
                  {"expires_at": new_exp.isoformat(), "duration_days": duration})
    return {"status": "approved", "expires_at": new_exp.isoformat()}


@api_router.post("/admin/monetization/payments/{payment_id}/reject")
async def admin_mon_reject(payment_id: str, data: CvRejectIn, user=Depends(require_role("admin"))):
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan")
    if payment["status"] != "pending":
        raise HTTPException(status_code=400, detail="Hanya pembayaran berstatus pending yang dapat ditolak")
    await db.payments.update_one({"id": payment_id}, {"$set": {
        "status": "rejected", "rejection_reason": data.reason, "verified_at": now_iso(),
        "verified_by": user["email"], "updated_at": now_iso()}})
    await mle_log(user["id"], "Payment rejected", "payment", payment_id, {"reason": data.reason})
    return {"status": "rejected"}


@api_router.get("/admin/monetization/subscriptions")
async def admin_mon_subs(product: str = "", status: str = "", page: int = 1, limit: int = 10,
                         user=Depends(require_role("admin"))):
    await expire_subscriptions()
    query = {}
    if product:
        query["product_type"] = product
    if status:
        query["status"] = status
    total = await db.subscriptions.count_documents(query)
    items = await db.subscriptions.find(query, {"_id": 0}).sort("created_at", -1).skip(max(page - 1, 0) * limit).limit(limit).to_list(limit)
    user_map = {u["id"]: u for u in await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(3000)}
    comp_map = {c["id"]: c["name"] for c in await db.companies.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)}
    job_counts = {}
    async for row in db.jobs.aggregate([{"$group": {"_id": "$company_id", "n": {"$sum": 1}}}]):
        job_counts[row["_id"]] = row["n"]
    for s in items:
        u = user_map.get(s["user_id"], {})
        s["user_name"] = u.get("name", "-")
        s["user_email"] = u.get("email", "-")
        s["company_name"] = comp_map.get(s.get("company_id", ""), "")
        s["jobs_count"] = job_counts.get(s.get("company_id", ""), 0) if s.get("company_id") else 0
    return {"items": items, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@api_router.post("/admin/monetization/subscriptions/{sub_id}/extend")
async def admin_mon_extend(sub_id: str, user=Depends(require_role("admin"))):
    sub = await db.subscriptions.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription tidak ditemukan")
    if sub["status"] not in ("active", "expired"):
        raise HTTPException(status_code=400, detail="Hanya subscription aktif/expired yang dapat diperpanjang")
    now = datetime.now(timezone.utc)
    base = now
    if sub.get("expires_at"):
        try:
            exp = datetime.fromisoformat(sub["expires_at"])
            if exp > now:
                base = exp
        except ValueError:
            pass
    new_exp = base + timedelta(days=sub.get("duration_days", 30))
    await db.subscriptions.update_one({"id": sub_id}, {"$set": {
        "status": "active", "expires_at": new_exp.isoformat(),
        "started_at": sub.get("started_at") or now.isoformat(),
        "activated_by": user["email"], "updated_at": now_iso()}})
    await mle_log(user["id"], "Subscription extended", "subscription", sub_id,
                  {"expires_at": new_exp.isoformat(), "old_status": sub["status"]})
    return {"status": "active", "expires_at": new_exp.isoformat()}


@api_router.post("/admin/monetization/subscriptions/{sub_id}/cancel")
async def admin_mon_cancel(sub_id: str, user=Depends(require_role("admin"))):
    sub = await db.subscriptions.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription tidak ditemukan")
    if sub["status"] != "active":
        raise HTTPException(status_code=400, detail="Hanya subscription aktif yang dapat dinonaktifkan")
    await db.subscriptions.update_one({"id": sub_id}, {"$set": {"status": "cancelled", "updated_at": now_iso()}})
    await mle_log(user["id"], "Subscription cancelled", "subscription", sub_id, {})
    return {"status": "cancelled"}


@api_router.get("/admin/monetization/products")
async def admin_mon_products(user=Depends(require_role("admin"))):
    return await db.membership_products.find({}, {"_id": 0}).to_list(50)


@api_router.put("/admin/monetization/products/{product_id}")
async def admin_mon_product_update(product_id: str, data: ProductIn, user=Depends(require_role("admin"))):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Nama produk wajib diisi")
    if data.price <= 0:
        raise HTTPException(status_code=400, detail="Harga tidak boleh kosong atau 0")
    if data.duration_days <= 0:
        raise HTTPException(status_code=400, detail="Durasi tidak boleh 0")
    result = await db.membership_products.update_one({"id": product_id}, {"$set": {
        "name": data.name.strip(), "price": data.price, "duration_days": data.duration_days,
        "description": data.description, "active": data.active, "updated_at": now_iso()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    await mle_log(user["id"], "Admin changes package", "product", product_id,
                  {"price": data.price, "duration_days": data.duration_days})
    return await db.membership_products.find_one({"id": product_id}, {"_id": 0})


@api_router.get("/admin/monetization/payment-settings")
async def admin_mon_payment_settings_get(user=Depends(require_role("admin"))):
    return await get_payment_settings()


@api_router.put("/admin/monetization/payment-settings")
async def admin_mon_payment_settings_put(data: PaymentSettingsIn, user=Depends(require_role("admin"))):
    await db.payment_settings.update_one({"id": "payment_settings"}, {"$set": {
        "payment_methods": data.payment_methods, "updated_at": now_iso()}}, upsert=True)
    await mle_log(user["id"], "Admin changes payment settings", "payment_settings", "payment_settings", {})
    return await get_payment_settings()


@api_router.get("/admin/monetization/audit-logs")
async def admin_mon_audit_logs(user=Depends(require_role("admin"))):
    return await db.membership_audit_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ---------- Seed ----------
async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({"id": str(uuid.uuid4()), "name": "Admin CirebonKarir", "email": ADMIN_EMAIL,
                                   "phone": "", "password_hash": hash_password(ADMIN_PASSWORD), "role": "admin",
                                   "blocked": False, "created_at": now_iso()})
        logger.info(f"Admin seeded: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})


async def seed_categories():
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([{"id": str(uuid.uuid4()), "name": n} for n in DEFAULT_CATEGORIES])


async def seed_demo_data():
    if await db.jobs.count_documents({}) > 0:
        return
    logger.info("Seeding demo data...")

    def make_user(name, email, phone, role):
        return {"id": str(uuid.uuid4()), "name": name, "email": email, "phone": phone,
                "password_hash": hash_password("password123"), "role": role, "blocked": False,
                "education": "", "experience": "", "about": "", "cv_path": "", "cv_filename": "",
                "created_at": now_iso()}

    candidate = make_user("Budi Santoso", "budi@example.com", "081298765432", "candidate")
    candidate["education"] = "SMA/SMK"
    candidate["experience"] = "2 tahun sebagai admin gudang"

    company_specs = [
        ("Batik Trusmi Cirebon", "demo@perusahaan.com", "Sari Wulandari", "Kota Cirebon", "BT", "0F172A", "Retail", "verified"),
        ("PT Grage Multimedia", "info@gragemultimedia.com", "Andi Prasetyo", "Kabupaten Cirebon", "GM", "0284C7", "IT", "verified"),
        ("Kopi Kangen Cirebon", "halo@kopikangen.com", "Rina Marlina", "Kota Cirebon", "KK", "78350F", "F&B", "verified"),
        ("UD Sumber Makmur", "ud.sumbermakmur@example.com", "Joko Susilo", "Kabupaten Cirebon", "SM", "047857", "Gudang", "verified"),
        ("Hotel Verse Cirebon", "hr@hotelverse.com", "Dewi Anggraini", "Kota Cirebon", "HV", "1D4ED8", "F&B", "pending"),
        ("Toko Berkah Elektronik", "berkah.elektronik@example.com", "Ahmad Fauzi", "Kota Cirebon", "BE", "B91C1C", "Retail", "verified"),
    ]
    users = [candidate]
    companies = []
    for name, email, pic, city, initials, color, biz, status in company_specs:
        u = make_user(pic, email, "081234567890", "company")
        users.append(u)
        companies.append({
            "id": str(uuid.uuid4()), "user_id": u["id"], "name": name,
            "slug": f"{slugify(name)}-{uuid.uuid4().hex[:6]}",
            "logo": f"https://ui-avatars.com/api/?name={initials}&background={color}&color=fff&size=128&bold=true",
            "description": f"{name} adalah perusahaan lokal terpercaya yang beroperasi di wilayah Cirebon dan sekitarnya.",
            "address": f"Jl. Raya Cirebon No. {len(name)}", "city": city, "phone": "081234567890", "email": email,
            "website": "", "instagram": "", "founded_year": "2015", "business_category": biz,
            "size": "10-50 karyawan", "status": status, "created_at": now_iso()})
    await db.users.insert_many(users)
    await db.companies.insert_many(companies)

    c = {comp["name"]: comp for comp in companies}

    def ago(hours=0, days=0):
        return (datetime.now(timezone.utc) - timedelta(hours=hours, days=days)).isoformat()

    def deadline(days=30):
        return (datetime.now(timezone.utc) + timedelta(days=days)).date().isoformat()

    def job(company, title, category, location, job_type, smin, smax, edu, exp, age, desc, reqs, resp, ben, wa, status, created, dl):
        return {"id": str(uuid.uuid4()), "company_id": c[company]["id"],
                "slug": f"{slugify(title)}-{slugify(location)}-{uuid.uuid4().hex[:6]}",
                "title": title, "category": category, "location": location, "job_type": job_type,
                "salary_min": smin, "salary_max": smax, "education": edu, "experience": exp,
                "age_requirement": age, "description": desc, "responsibilities": resp,
                "requirements": reqs, "benefits": ben, "deadline": dl, "whatsapp": wa,
                "status": status, "rejection_reason": "", "created_at": created}

    jobs = [
        job("Batik Trusmi Cirebon", "Staff Admin", "Admin", "Kota Cirebon", "Full Time", 2500000, 3500000, "SMA/SMK", "Minimal 1 tahun", "Maks. 30 tahun",
            "Kami membuka kesempatan bergabung sebagai Staff Admin untuk mengelola administrasi penjualan dan operasional toko batik kami.",
            "Pendidikan minimal SMA/SMK sederajat\nMenguasai Microsoft Office (Word, Excel)\nTeliti, jujur, dan bertanggung jawab\nMampu bekerja sama dalam tim",
            "Menginput data penjualan harian\nMembuat laporan administrasi\nMengarsipkan dokumen perusahaan\nMelayani pertanyaan pelanggan via WhatsApp",
            "Gaji pokok + tunjangan\nTHR\nMakan siang\nLingkungan kerja nyaman",
            "081234567890", "active", ago(hours=2), deadline(30)),
        job("Toko Berkah Elektronik", "Kasir Toko", "Retail", "Kota Cirebon", "Full Time", 1800000, 2300000, "SMA/SMK", "Tidak ada minimal", "Maks. 28 tahun",
            "Dibutuhkan segera kasir untuk toko elektronik di pusat Kota Cirebon. Fresh graduate dipersilakan melamar.",
            "Pendidikan minimal SMA/SMK\nRamah dan komunikatif\nBersedia bekerja shift\nJujur dan teliti",
            "Melayani transaksi pembayaran\nMenghitung kas harian\nMembantu penataan barang",
            "Gaji UMK + bonus\nTHR\nPelatihan kasir",
            "081298765001", "active", ago(hours=5), deadline(21)),
        job("PT Grage Multimedia", "Sales Marketing", "Sales", "Kabupaten Cirebon", "Full Time", 3000000, 5000000, "SMA/SMK", "Minimal 1 tahun di bidang sales", "Maks. 35 tahun",
            "Bergabunglah dengan tim sales kami untuk memasarkan produk multimedia dan percetakan ke wilayah Ciayumajakuning.",
            "Memiliki SIM A/C\nBerpenampilan menarik dan komunikatif\nBerorientasi pada target\nMemiliki kendaraan bermotor",
            "Mencari calon pelanggan baru\nMenjaga relasi dengan pelanggan existing\nMencapai target penjualan bulanan\nMembuat laporan kunjungan",
            "Gaji pokok + komisi menarik\nInsentif perjalanan\nTHR + bonus tahunan",
            "081298765002", "active", ago(days=1), deadline(45)),
        job("Kopi Kangen Cirebon", "Barista", "F&B", "Kota Cirebon", "Part Time", 1500000, 2000000, "SMA/SMK", "Tidak ada minimal", "18-25 tahun",
            "Kedai kopi kekinian di Cirebon membuka lowongan barista part time. Cocok untuk mahasiswa.",
            "Pendidikan minimal SMA/SMK atau mahasiswa aktif\nMenyukai dunia kopi\nBersedia bekerja weekend\nRamah dan rapi",
            "Meracik minuman kopi dan non-kopi\nMelayani pelanggan\nMenjaga kebersihan bar",
            "Gaji harian + tips\nPelatihan barista gratis\nDiskon karyawan",
            "081298765003", "active", ago(days=1), deadline(14)),
        job("UD Sumber Makmur", "Staff Gudang", "Gudang", "Kabupaten Cirebon", "Full Time", 2200000, 2800000, "SMA/SMK", "Tidak ada minimal", "Maks. 35 tahun",
            "Dibutuhkan staff gudang untuk mengelola stok barang distributor sembako.",
            "Pendidikan minimal SMA/SMK\nSehat jasmani\nTeliti dalam menghitung stok\nBersedia lembur jika dibutuhkan",
            "Bongkar muat barang\nPenataan stok gudang\nPencatatan keluar masuk barang",
            "Gaji pokok + uang lembur\nTHR\nMakan siang",
            "081298765004", "active", ago(days=2), deadline(30)),
        job("UD Sumber Makmur", "Driver Ekspedisi", "Driver", "Indramayu", "Kontrak", 2500000, 3500000, "SMP", "Minimal 2 tahun sebagai driver", "Maks. 40 tahun",
            "Dibutuhkan driver untuk pengiriman barang rute Cirebon - Indramayu.",
            "Memiliki SIM B1 aktif\nPengalaman mengemudikan mobil box\nHafal rute Ciayumajakuning\nSehat jasmani",
            "Mengantar barang sesuai jadwal\nMerawat kendaraan\nMelaporkan pengiriman harian",
            "Gaji + uang jalan\nTHR\nBPJS Ketenagakerjaan",
            "081298765004", "active", ago(days=2), deadline(30)),
        job("Hotel Verse Cirebon", "Waiter/Waitress", "F&B", "Kota Cirebon", "Full Time", 1800000, 2500000, "SMA/SMK", "Tidak ada minimal", "18-28 tahun",
            "Hotel bintang tiga di Cirebon membuka lowongan waiter/waitress untuk restoran hotel.",
            "Pendidikan minimal SMA/SMK perhotelan\nBerpenampilan menarik\nRamah dan sopan\nBersedia bekerja shift termasuk hari libur",
            "Melayani tamu restoran\nMencatat dan mengantar pesanan\nMenjaga kebersihan area restoran",
            "Gaji + service charge\nTHR\nMakan karyawan\nSeragam",
            "081298765005", "active", ago(days=3), deadline(25)),
        job("Batik Trusmi Cirebon", "Digital Marketing", "Marketing", "Kota Cirebon", "Full Time", 3000000, 4500000, "D3", "Minimal 1 tahun", "Maks. 32 tahun",
            "Kami mencari digital marketing untuk mengembangkan penjualan online batik melalui marketplace dan media sosial.",
            "Pendidikan minimal D3\nMenguasai Instagram, TikTok, dan marketplace\nMampu membuat konten sederhana\nKreatif dan update tren",
            "Mengelola akun media sosial\nMembuat konten promosi\nMengelola iklan online\nMelaporkan performa penjualan online",
            "Gaji pokok + bonus penjualan\nTHR\nLingkungan kerja muda dan kreatif",
            "081234567890", "active", ago(days=3), deadline(40)),
        job("PT Grage Multimedia", "Teknisi Komputer", "Teknisi", "Kuningan", "Full Time", 2200000, 3200000, "SMA/SMK", "Minimal 1 tahun", "Maks. 35 tahun",
            "Dibutuhkan teknisi untuk instalasi dan perbaikan komputer, printer, dan jaringan area Kuningan.",
            "SMK TKJ/Multimedia atau berpengalaman\nMenguasai instalasi jaringan dasar\nMemiliki kendaraan bermotor\nJujur dan bertanggung jawab",
            "Instalasi dan perbaikan komputer\nMaintenance pelanggan kantor\nInstalasi jaringan LAN",
            "Gaji pokok + insentif servis\nTHR\nUang transport",
            "081298765002", "active", ago(days=4), deadline(30)),
        job("PT Grage Multimedia", "Staff Finance", "Finance", "Kota Cirebon", "Full Time", 2800000, 4000000, "D3", "Minimal 1 tahun", "Maks. 32 tahun",
            "Membuka lowongan staff finance untuk mengelola keuangan dan pembukuan perusahaan.",
            "Pendidikan minimal D3 Akuntansi/Keuangan\nMenguasai Excel dan software akuntansi dasar\nTeliti dan jujur\nMampu membuat laporan keuangan sederhana",
            "Mencatat transaksi harian\nMembuat invoice dan kwitansi\nRekonsiliasi kas\nMembantu laporan pajak",
            "Gaji pokok + tunjangan\nTHR\nBPJS Kesehatan",
            "081298765002", "active", ago(days=4), deadline(35)),
        job("Kopi Kangen Cirebon", "Freelance Desainer Grafis", "Lainnya", "Kota Cirebon", "Freelance", 1500000, 3000000, "SMA/SMK", "Portofolio wajib dilampirkan", "Tidak ada batasan",
            "Kami membutuhkan desainer grafis freelance untuk konten media sosial dan kemasan produk.",
            "Menguasai CorelDRAW/Photoshop/Canva\nMemiliki portofolio desain\nKomunikatif dan tepat waktu\nBisa bekerja remote",
            "Membuat desain konten media sosial\nDesain kemasan produk\nRevisi sesuai brief",
            "Pembayaran per project\nWaktu kerja fleksibel",
            "081298765003", "active", ago(days=5), deadline(20)),
        job("Toko Berkah Elektronik", "Customer Service Online", "Admin", "Brebes", "Full Time", 2000000, 3000000, "SMA/SMK", "Tidak ada minimal", "Maks. 30 tahun",
            "Dibutuhkan CS online untuk melayani chat pelanggan marketplace dan WhatsApp.",
            "Pendidikan minimal SMA/SMK\nMengetik cepat dan rapi\nSabar melayani pelanggan\nMenguasai marketplace (Shopee/Tokopedia)",
            "Membalas chat pelanggan\nMemproses pesanan online\nMenangani komplain dengan baik",
            "Gaji pokok + bonus performa\nTHR",
            "081298765001", "active", ago(days=5), deadline(28)),
        job("UD Sumber Makmur", "Kurir Motor", "Driver", "Kota Cirebon", "Full Time", 2000000, 2800000, "SMP", "Tidak ada minimal", "Maks. 35 tahun",
            "Dibutuhkan kurir motor untuk pengiriman paket area Kota Cirebon.",
            "Memiliki SIM C aktif\nMemiliki motor sendiri\nHafal area Kota Cirebon\nJujur dan rajin",
            "Mengantar paket ke pelanggan\nMelaporkan status pengiriman",
            "Gaji + uang bensin\nTHR",
            "081298765004", "pending", ago(hours=6), deadline(30)),
        job("Toko Berkah Elektronik", "Kasir Minimarket", "Retail", "Brebes", "Full Time", 1800000, 2200000, "SMA/SMK", "Tidak ada minimal", "Maks. 27 tahun",
            "Dibutuhkan kasir untuk cabang baru di Brebes.",
            "Pendidikan minimal SMA/SMK\nJujur dan teliti\nRamah kepada pelanggan",
            "Melayani transaksi\nMenata display barang",
            "Gaji UMK\nTHR",
            "081298765001", "pending", ago(hours=10), deadline(30)),
    ]
    await db.jobs.insert_many(jobs)

    applications = [
        {"id": str(uuid.uuid4()), "job_id": jobs[0]["id"], "job_title": jobs[0]["title"], "job_slug": jobs[0]["slug"],
         "company_id": jobs[0]["company_id"], "company_name": "Batik Trusmi Cirebon", "candidate_id": candidate["id"],
         "name": candidate["name"], "email": candidate["email"], "phone": candidate["phone"],
         "education": "SMA/SMK", "experience": "2 tahun sebagai admin gudang", "cv_path": "", "cv_filename": "",
         "message": "Saya tertarik dengan posisi ini dan memiliki pengalaman administrasi.", "status": "diproses",
         "created_at": ago(days=1)},
        {"id": str(uuid.uuid4()), "job_id": jobs[3]["id"], "job_title": jobs[3]["title"], "job_slug": jobs[3]["slug"],
         "company_id": jobs[3]["company_id"], "company_name": "Kopi Kangen Cirebon", "candidate_id": candidate["id"],
         "name": candidate["name"], "email": candidate["email"], "phone": candidate["phone"],
         "education": "SMA/SMK", "experience": "Pernah magang di kafe 3 bulan", "cv_path": "", "cv_filename": "",
         "message": "Saya sangat menyukai dunia kopi dan ingin belajar menjadi barista.", "status": "terkirim",
         "created_at": ago(hours=8)},
    ]
    await db.applications.insert_many(applications)
    logger.info("Demo data seeded")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.jobs.create_index("slug", unique=True)
    await db.jobs.create_index("status")
    await db.companies.create_index("slug", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.cv_subscriptions.create_index("user_id")
    await db.cv_subscriptions.create_index("status")
    await db.payments.create_index("user_id")
    await db.payments.create_index("status")
    await db.subscriptions.create_index([("product_type", 1), ("status", 1)])
    await db.company_posting_quotas.create_index(
        [("company_id", 1), ("period_year", 1), ("period_month", 1)], unique=True)
    try:
        await asyncio.to_thread(init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await seed_admin()
    await seed_categories()
    await seed_demo_data()
    await seed_blog_posts()
    await seed_membership_products()
    await migrate_cv_subscriptions()
    await expire_jobs()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
