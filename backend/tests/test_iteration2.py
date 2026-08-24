"""Iteration 2 – NEW features regression:
- Total 14 active jobs + 2 new seeded (Operator Produksi @ Majalengka, Marketing Cafe @ Kuningan)
- Admin edit job via PUT /api/admin/jobs/{id} preserves status (does NOT reset to pending)
- Company cannot PUT another company's job (403/404)
- Register-company endpoint saves role=company
- Register endpoint saves role=candidate
- Search q=Admin, q=Cirebon, q=Kasir; nonsense returns 0
"""
import io
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "muhamadwahid.sih@gmail.com", "password": "admin123"}
COMPANY = {"email": "demo@perusahaan.com", "password": "password123"}   # Batik Trusmi
COMPANY2 = {"email": "info@gragemultimedia.com", "password": "password123"}  # PT Grage
CANDIDATE = {"email": "budi@example.com", "password": "password123"}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session")
def admin_token():
    return _login(**ADMIN)


@pytest.fixture(scope="session")
def company_token():
    return _login(**COMPANY)


@pytest.fixture(scope="session")
def company2_token():
    return _login(**COMPANY2)


@pytest.fixture(scope="session")
def candidate_token():
    return _login(**CANDIDATE)


# ---------- Seed data ----------
def test_active_jobs_count_is_14():
    r = requests.get(f"{API}/jobs", params={"limit": 100}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["total"] == 14, f"expected 14 active jobs, got {d['total']}"


def test_new_seeded_jobs_present():
    r = requests.get(f"{API}/jobs", params={"limit": 100}, timeout=15)
    titles = [(j["title"], j["location"]) for j in r.json()["items"]]
    assert ("Operator Produksi", "Majalengka") in titles
    assert ("Marketing Cafe", "Kuningan") in titles


# ---------- Search ----------
def test_search_admin():
    r = requests.get(f"{API}/jobs", params={"q": "Admin"}, timeout=15)
    assert r.status_code == 200 and r.json()["total"] >= 1


def test_search_cirebon_location_keyword():
    r = requests.get(f"{API}/jobs", params={"q": "Cirebon"}, timeout=15)
    assert r.status_code == 200 and r.json()["total"] >= 1


def test_search_kasir():
    r = requests.get(f"{API}/jobs", params={"q": "Kasir"}, timeout=15)
    assert r.status_code == 200 and r.json()["total"] >= 1


def test_search_nonsense_returns_zero():
    r = requests.get(f"{API}/jobs", params={"q": "zzzzznotexist_" + uuid.uuid4().hex}, timeout=15)
    assert r.status_code == 200 and r.json()["total"] == 0


def test_combined_filters():
    r = requests.get(f"{API}/jobs", params={
        "q": "Marketing", "location": "Kuningan", "category": "F&B", "job_type": "Full Time",
    }, timeout=15)
    assert r.status_code == 200


# ---------- Admin edit preserves status ----------
@pytest.fixture(scope="module")
def active_job_owned_by_batik(admin_token, company_token):
    # Create a fresh pending job then approve it -> active
    payload = {
        "title": f"TEST ItEdit {uuid.uuid4().hex[:6]}",
        "category": "Admin", "location": "Kota Cirebon", "job_type": "Full Time",
        "salary_min": 2000000, "salary_max": 3000000,
        "education": "SMA/SMK", "experience": "1 tahun", "age_requirement": "",
        "description": "x", "responsibilities": "x", "requirements": "x", "benefits": "x",
        "deadline": "", "whatsapp": "081234567890",
    }
    r = requests.post(f"{API}/company/jobs", json=payload, headers=_h(company_token), timeout=15)
    assert r.status_code == 200, r.text
    job = r.json()
    r2 = requests.post(f"{API}/admin/jobs/{job['id']}/approve", headers=_h(admin_token), timeout=15)
    assert r2.status_code == 200
    yield job
    requests.delete(f"{API}/admin/jobs/{job['id']}", headers=_h(admin_token), timeout=15)


def test_admin_edit_preserves_status(admin_token, active_job_owned_by_batik):
    job = active_job_owned_by_batik
    new_title = f"TEST ItEdited {uuid.uuid4().hex[:6]}"
    payload = {
        "title": new_title, "category": "Admin", "location": "Kota Cirebon",
        "job_type": "Full Time", "salary_min": 2500000, "salary_max": 3500000,
        "education": "SMA/SMK", "experience": "1 tahun", "age_requirement": "",
        "description": "updated", "responsibilities": "x", "requirements": "x", "benefits": "x",
        "deadline": "", "whatsapp": "081234567890",
    }
    r = requests.put(f"{API}/admin/jobs/{job['id']}", json=payload,
                     headers=_h(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["title"] == new_title
    # CRITICAL: status must NOT be reset to pending
    assert body["status"] == "active", f"admin edit reset status to {body['status']}!"
    # verify via GET
    r2 = requests.get(f"{API}/jobs/{job['slug']}", timeout=15)
    # NOTE: slug may have changed if server regenerates; check via admin list
    r3 = requests.get(f"{API}/admin/jobs", headers=_h(admin_token), timeout=15)
    persisted = next((j for j in r3.json() if j["id"] == job["id"]), None)
    assert persisted and persisted["status"] == "active"
    assert persisted["title"] == new_title


# ---------- Company cross-tenant isolation ----------
def test_company_cannot_edit_other_company_job(company2_token, active_job_owned_by_batik):
    job = active_job_owned_by_batik  # owned by Batik Trusmi (demo@)
    payload = {
        "title": "HIJACK", "category": "Admin", "location": "Kota Cirebon",
        "job_type": "Full Time", "salary_min": 1, "salary_max": 2,
        "education": "SMA/SMK", "experience": "", "age_requirement": "",
        "description": "x", "responsibilities": "x", "requirements": "x", "benefits": "x",
        "deadline": "", "whatsapp": "0812",
    }
    r = requests.put(f"{API}/company/jobs/{job['id']}", json=payload,
                     headers=_h(company2_token), timeout=15)
    assert r.status_code in (403, 404), f"expected 403/404, got {r.status_code}"


# ---------- Registration role saving ----------
def test_register_candidate_saves_role():
    email = f"test-cand-{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "Test Cand", "email": email, "phone": "0812", "password": "password123"
    }, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["role"] == "candidate"
    # verify via /me
    tok = body["token"]
    me = requests.get(f"{API}/auth/me", headers=_h(tok), timeout=15).json()
    assert me["user"]["role"] == "candidate"


def test_register_company_saves_role():
    email = f"test-comp-{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/register-company", json={
        "company_name": f"TEST Co {uuid.uuid4().hex[:4]}",
        "email": email, "phone": "0812345", "password": "password123",
        "pic_name": "Test PIC",
    }, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "company"
    tok = body["token"]
    me = requests.get(f"{API}/auth/me", headers=_h(tok), timeout=15).json()
    assert me["user"]["role"] == "company"


# ---------- CV auth: anon 401, owner 200 (spot check) ----------
def test_cv_anon_401_owner_200(candidate_token):
    apps = requests.get(f"{API}/candidate/applications", headers=_h(candidate_token), timeout=15).json()
    cvs = [a["cv_path"] for a in apps if a.get("cv_path")]
    if not cvs:
        pytest.skip("no CVs")
    p = cvs[0]
    assert requests.get(f"{API}/files/{p}", timeout=15).status_code == 401
    assert requests.get(f"{API}/files/{p}", headers=_h(candidate_token), timeout=30).status_code == 200
