"""Backend API tests for CirebonKarir.com.

Covers: auth (3 roles), meta, public jobs listing/detail/filter,
candidate apply flow with CV upload, company job creation & applicants,
admin moderation (approve/reject job, verify company, block candidate),
RBAC, and blocked-account login prevention.

Uses BASE_URL from REACT_APP_BACKEND_URL (all endpoints prefixed with /api).
"""
import io
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "muhamadwahid.sih@gmail.com", "password": "admin123"}
COMPANY = {"email": "demo@perusahaan.com", "password": "password123"}
CANDIDATE = {"email": "budi@example.com", "password": "password123"}

PDF_BYTES = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000053 00000 n\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n89\n%%EOF"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(**ADMIN)


@pytest.fixture(scope="session")
def company_token():
    return _login(**COMPANY)


@pytest.fixture(scope="session")
def candidate_token():
    return _login(**CANDIDATE)


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Health / meta ----------
def test_root():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert "CirebonKarir" in r.json().get("message", "")


def test_meta():
    r = requests.get(f"{API}/meta", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "locations" in data and "categories" in data and "stats" in data
    assert data["stats"]["active_jobs"] >= 1


# ---------- Auth ----------
def test_admin_login():
    tok = _login(**ADMIN)
    assert isinstance(tok, str) and len(tok) > 20


def test_wrong_password_fails():
    # use a unique email to avoid triggering brute-force lock on real accounts
    r = requests.post(f"{API}/auth/login",
                      json={"email": f"nobody-{uuid.uuid4().hex[:6]}@example.com", "password": "bad"},
                      timeout=15)
    assert r.status_code == 401


def test_auth_me(candidate_token):
    r = requests.get(f"{API}/auth/me", headers=_h(candidate_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "candidate"


def test_auth_me_no_token():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


# ---------- Public jobs ----------
def test_list_jobs():
    r = requests.get(f"{API}/jobs", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    j = data["items"][0]
    for f in ("id", "slug", "title", "company_name"):
        assert f in j


def test_jobs_filter_location():
    r = requests.get(f"{API}/jobs", params={"location": "Kota Cirebon"}, timeout=15)
    assert r.status_code == 200
    for j in r.json()["items"]:
        assert j["location"] == "Kota Cirebon"


def test_jobs_search_keyword():
    r = requests.get(f"{API}/jobs", params={"q": "kasir"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_job_detail():
    r = requests.get(f"{API}/jobs", timeout=15)
    slug = r.json()["items"][0]["slug"]
    r2 = requests.get(f"{API}/jobs/{slug}", timeout=15)
    assert r2.status_code == 200
    data = r2.json()
    assert data["slug"] == slug
    assert "company" in data


def test_pending_job_not_public():
    # login as admin, list pending jobs, ensure they don't appear on public list
    admin = _login(**ADMIN)
    r = requests.get(f"{API}/admin/jobs", params={"status": "pending"}, headers=_h(admin), timeout=15)
    assert r.status_code == 200
    pending = r.json()
    if pending:
        pending_slug = pending[0]["slug"]
        pub = requests.get(f"{API}/jobs", params={"q": pending[0]["title"]}, timeout=15).json()
        assert not any(j["slug"] == pending_slug for j in pub["items"])


# ---------- RBAC ----------
def test_rbac_candidate_cannot_admin(candidate_token):
    r = requests.get(f"{API}/admin/stats", headers=_h(candidate_token), timeout=15)
    assert r.status_code == 403


def test_rbac_company_cannot_candidate(company_token):
    r = requests.get(f"{API}/candidate/applications", headers=_h(company_token), timeout=15)
    assert r.status_code == 403


def test_rbac_candidate_cannot_company(candidate_token):
    r = requests.get(f"{API}/company/stats", headers=_h(candidate_token), timeout=15)
    assert r.status_code == 403


# ---------- Candidate ----------
def test_candidate_stats(candidate_token):
    r = requests.get(f"{API}/candidate/stats", headers=_h(candidate_token), timeout=15)
    assert r.status_code == 200
    assert "total" in r.json()


def test_candidate_applications_list(candidate_token):
    r = requests.get(f"{API}/candidate/applications", headers=_h(candidate_token), timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Company job creation & approval flow ----------
@pytest.fixture(scope="session")
def created_pending_job(company_token):
    payload = {
        "title": f"TEST QA Position {uuid.uuid4().hex[:6]}",
        "category": "Admin",
        "location": "Kota Cirebon",
        "job_type": "Full Time",
        "salary_min": 2000000, "salary_max": 3000000,
        "education": "SMA/SMK", "experience": "1 tahun",
        "description": "Test job", "responsibilities": "test",
        "requirements": "test", "benefits": "test",
        "deadline": "", "whatsapp": "081234567890",
    }
    r = requests.post(f"{API}/company/jobs", json=payload, headers=_h(company_token), timeout=15)
    assert r.status_code == 200, r.text
    job = r.json()
    assert job["status"] == "pending"
    return job


def test_company_created_job_pending(created_pending_job):
    assert created_pending_job["status"] == "pending"


def test_company_jobs_list(company_token, created_pending_job):
    r = requests.get(f"{API}/company/jobs", headers=_h(company_token), timeout=15)
    assert r.status_code == 200
    ids = [j["id"] for j in r.json()]
    assert created_pending_job["id"] in ids


def test_admin_approve_job(admin_token, created_pending_job):
    r = requests.post(f"{API}/admin/jobs/{created_pending_job['id']}/approve",
                      headers=_h(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "active"
    # Now should be publicly visible via detail
    r2 = requests.get(f"{API}/jobs/{created_pending_job['slug']}", timeout=15)
    assert r2.status_code == 200


# ---------- Candidate apply flow (requires an active job we control) ----------
def test_candidate_apply_flow(candidate_token, created_pending_job):
    job_id = created_pending_job["id"]
    files = {"cv": ("test_cv.pdf", io.BytesIO(PDF_BYTES), "application/pdf")}
    data = {"name": "Budi Santoso", "email": "budi@example.com", "phone": "081298765432",
            "education": "SMA/SMK", "experience": "test", "message": "TEST application"}
    r = requests.post(f"{API}/jobs/{job_id}/apply", data=data, files=files,
                      headers=_h(candidate_token), timeout=60)
    assert r.status_code == 200, r.text
    app = r.json()
    assert app["status"] == "terkirim"
    assert app["job_id"] == job_id
    # duplicate application blocked
    files2 = {"cv": ("test_cv.pdf", io.BytesIO(PDF_BYTES), "application/pdf")}
    r2 = requests.post(f"{API}/jobs/{job_id}/apply", data=data, files=files2,
                       headers=_h(candidate_token), timeout=60)
    assert r2.status_code == 400
    # candidate can see it in their list
    r3 = requests.get(f"{API}/candidate/applications", headers=_h(candidate_token), timeout=15)
    assert any(a["id"] == app["id"] for a in r3.json())


def test_company_sees_applicant(company_token, created_pending_job):
    r = requests.get(f"{API}/company/applications", params={"job_id": created_pending_job["id"]},
                     headers=_h(company_token), timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 1
    app_id = r.json()[0]["id"]
    # update status to interview
    r2 = requests.put(f"{API}/company/applications/{app_id}",
                      json={"status": "interview"}, headers=_h(company_token), timeout=15)
    assert r2.status_code == 200
    assert r2.json()["status"] == "interview"


# ---------- Admin: companies / candidates / categories ----------
def test_admin_stats(admin_token):
    r = requests.get(f"{API}/admin/stats", headers=_h(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("candidates", "companies", "jobs", "applications"):
        assert k in d


def test_admin_companies_list(admin_token):
    r = requests.get(f"{API}/admin/companies", headers=_h(admin_token), timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_verify_pending_company(admin_token):
    r = requests.get(f"{API}/admin/companies", params={"status": "pending"}, headers=_h(admin_token), timeout=15)
    if r.status_code == 200 and r.json():
        cid = r.json()[0]["id"]
        r2 = requests.post(f"{API}/admin/companies/{cid}/status", json={"status": "verified"},
                           headers=_h(admin_token), timeout=15)
        assert r2.status_code == 200
        # revert to pending to keep seed clean
        requests.post(f"{API}/admin/companies/{cid}/status", json={"status": "pending"},
                      headers=_h(admin_token), timeout=15)


def test_admin_categories_crud(admin_token):
    name = f"TESTCAT-{uuid.uuid4().hex[:5]}"
    r = requests.post(f"{API}/admin/categories", json={"name": name}, headers=_h(admin_token), timeout=15)
    assert r.status_code == 200
    cid = r.json()["id"]
    r2 = requests.get(f"{API}/admin/categories", headers=_h(admin_token), timeout=15)
    assert any(c["id"] == cid for c in r2.json())
    r3 = requests.delete(f"{API}/admin/categories/{cid}", headers=_h(admin_token), timeout=15)
    assert r3.status_code == 200


def test_admin_reject_job(admin_token, company_token):
    # create a fresh pending job and reject it
    payload = {"title": f"TEST Reject {uuid.uuid4().hex[:6]}", "category": "Admin",
               "location": "Kota Cirebon", "job_type": "Full Time",
               "salary_min": 1000000, "salary_max": 2000000, "education": "SMA/SMK",
               "experience": "", "description": "x", "responsibilities": "x",
               "requirements": "x", "benefits": "x", "deadline": "", "whatsapp": "081234567890"}
    r = requests.post(f"{API}/company/jobs", json=payload, headers=_h(company_token), timeout=15)
    jid = r.json()["id"]
    r2 = requests.post(f"{API}/admin/jobs/{jid}/reject", json={"reason": "TEST reject"},
                       headers=_h(admin_token), timeout=15)
    assert r2.status_code == 200
    assert r2.json()["status"] == "rejected"
    requests.delete(f"{API}/admin/jobs/{jid}", headers=_h(admin_token), timeout=15)


# ---------- Blocked candidate cannot login ----------
def test_block_unblock_candidate(admin_token):
    # register a throwaway candidate
    email = f"test-block-{uuid.uuid4().hex[:6]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "Block Test", "email": email, "phone": "0812", "password": "password123"
    }, timeout=15)
    assert r.status_code == 200
    uid = r.json()["user"]["id"]
    # block
    rb = requests.post(f"{API}/admin/users/{uid}/status", json={"blocked": True},
                       headers=_h(admin_token), timeout=15)
    assert rb.status_code == 200
    # login attempt
    rl = requests.post(f"{API}/auth/login", json={"email": email, "password": "password123"}, timeout=15)
    assert rl.status_code == 403


# ---------- CV upload file download auth ----------
def test_cv_download_requires_auth(candidate_token):
    apps = requests.get(f"{API}/candidate/applications", headers=_h(candidate_token), timeout=15).json()
    cv_paths = [a["cv_path"] for a in apps if a.get("cv_path")]
    if not cv_paths:
        pytest.skip("no CVs uploaded yet")
    path = cv_paths[0]
    # no auth
    r = requests.get(f"{API}/files/{path}", timeout=15)
    assert r.status_code == 401
    # with auth (owner)
    r2 = requests.get(f"{API}/files/{path}", headers=_h(candidate_token), timeout=30)
    assert r2.status_code == 200
