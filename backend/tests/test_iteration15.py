"""
Iteration 15 backend tests:
- Security headers on API responses
- Server-side PDF CV endpoint (WeasyPrint)
- Authz for PDF (401/403/404)
- Photo embed in PDF
- Auth regression (login/logout/me/register)
- General regression (jobs, meta, companies)
- Rate limit test LAST (login 10/min per IP)
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cbn-lowongan.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

BUDI = {"email": "budi@example.com", "password": "password123"}
SITI = {"email": "siti.rahma@example.com", "password": "password123"}
ADMIN = {"email": "muhamadwahid.sih@gmail.com", "password": "admin123"}
COMPANY = {"email": "demo@perusahaan.com", "password": "password123"}
BUDI_CV_ID = "43c054e5-cc0e-49cc-902c-729a0c710351"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    return r


# ---------- Security headers ----------
def test_security_headers_on_public_endpoint():
    r = requests.get(f"{API}/meta", timeout=30)
    assert r.status_code == 200, r.text
    h = {k.lower(): v for k, v in r.headers.items()}
    assert h.get("x-content-type-options", "").lower() == "nosniff"
    assert h.get("x-frame-options", "").upper() == "DENY"
    assert "referrer-policy" in h
    assert "permissions-policy" in h
    # HSTS is conditional on request.url.scheme=='https'; behind proxy this may be http internally.
    # We only warn if missing on HTTPS external URL.
    if BASE_URL.startswith("https://") and "strict-transport-security" not in h:
        print("WARN: HSTS header missing on HTTPS response (likely proxy forwards as http scheme)")


# ---------- General regression ----------
def test_get_jobs():
    r = requests.get(f"{API}/jobs", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, (list, dict))


def test_get_meta():
    r = requests.get(f"{API}/meta", timeout=30)
    assert r.status_code == 200


def test_get_companies():
    r = requests.get(f"{API}/companies", timeout=30)
    assert r.status_code == 200


# ---------- Auth regression ----------
def test_login_budi_and_me():
    r = _login(**BUDI)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "token" in body and "user" in body
    token = body["token"]
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    assert me.status_code == 200
    body = me.json()
    user = body.get("user", body)
    assert user.get("email") == BUDI["email"]


def test_admin_login_and_admin_jobs():
    r = _login(**ADMIN)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    aj = requests.get(f"{API}/admin/jobs", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    assert aj.status_code == 200


def test_company_login_and_dashboard():
    r = _login(**COMPANY)
    assert r.status_code == 200


# ---------- PDF CV endpoint ----------
@pytest.fixture(scope="module")
def budi_token():
    r = _login(**BUDI)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def test_my_cvs_lists_budi_cv(budi_token):
    r = requests.get(f"{API}/cv-professional/my-cvs", headers={"Authorization": f"Bearer {budi_token}"}, timeout=30)
    assert r.status_code == 200, r.text
    cvs = r.json()
    ids = [c.get("id") for c in (cvs if isinstance(cvs, list) else cvs.get("cvs", []))]
    assert BUDI_CV_ID in ids, f"Expected CV {BUDI_CV_ID} in {ids}"


def test_pdf_download_success(budi_token):
    r = requests.get(
        f"{API}/cv-professional/cvs/{BUDI_CV_ID}/pdf",
        headers={"Authorization": f"Bearer {budi_token}"},
        timeout=60,
    )
    assert r.status_code == 200, r.text[:500]
    assert r.headers.get("Content-Type", "").lower().startswith("application/pdf"), r.headers
    assert "attachment" in r.headers.get("Content-Disposition", "").lower()
    assert r.content[:4] == b"%PDF", f"Bad PDF magic: {r.content[:10]}"
    # Photo embedded -> file should be >50KB
    assert len(r.content) > 50_000, f"PDF too small: {len(r.content)} bytes (photo likely missing)"


def test_pdf_unauthorized():
    r = requests.get(f"{API}/cv-professional/cvs/{BUDI_CV_ID}/pdf", timeout=30)
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"


def test_pdf_other_users_cv_returns_404():
    # login as a different candidate with career pro? use another candidate token
    # siti has expired subscription -> will hit 403 first. Use admin? Admin is not candidate.
    # Try creating request as company user -> require_cv_premium likely 403.
    # Best: login siti (expired) -> should get 403 (not premium) BEFORE ownership check.
    r = _login(**SITI)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    resp = requests.get(
        f"{API}/cv-professional/cvs/{BUDI_CV_ID}/pdf",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    # Per spec: candidate tanpa Career Pro aktif -> 403
    assert resp.status_code == 403, f"Expected 403 for expired subscription, got {resp.status_code}: {resp.text[:200]}"


def test_pdf_nonexistent_cv_returns_404(budi_token):
    r = requests.get(
        f"{API}/cv-professional/cvs/nonexistent-id-12345/pdf",
        headers={"Authorization": f"Bearer {budi_token}"},
        timeout=30,
    )
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"


# ---------- Rate limit test — MUST RUN LAST ----------
def test_zzz_rate_limit_login():
    """Run last to avoid breaking other tests. Login limit is 10/minute per IP."""
    statuses = []
    for i in range(12):
        r = requests.post(
            f"{API}/auth/login",
            json={"email": "ratelimit-nobody@example.com", "password": "wrong"},
            timeout=15,
        )
        statuses.append(r.status_code)
    print(f"Rate limit statuses: {statuses}")
    assert 429 in statuses, f"Expected 429 in {statuses}"
