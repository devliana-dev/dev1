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
    allowed = {"cv": {"pdf", "doc", "docx"}, "logo": {"jpg", "jpeg", "png", "webp"}}[kind]
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
    if record.get("kind") == "cv":
        token = extract_token(request, auth)
        user = await get_user_by_token(token) if token else None
        if not user:
            raise HTTPException(status_code=401, detail="Tidak memiliki akses")
        allowed = user["role"] == "admin" or user["id"] == record.get("owner_user_id")
        if not allowed and user["role"] == "company":
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
    job = {"id": str(uuid.uuid4()), "company_id": company["id"],
           "slug": f"{slugify(data.title)}-{slugify(data.location)}-{uuid.uuid4().hex[:6]}",
           **data.model_dump(), "status": "pending", "rejection_reason": "", "created_at": now_iso()}
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
    result = await db.jobs.update_one({"id": job_id}, {"$set": {"status": "active", "rejection_reason": ""}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lowongan tidak ditemukan")
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
    try:
        await asyncio.to_thread(init_storage)
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await seed_admin()
    await seed_categories()
    await seed_demo_data()
    await seed_blog_posts()
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
