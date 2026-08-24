"""Backend API tests for CV Profesional module (Iteration 5).

Covers:
- Public status/payment-info security (401 anon)
- Candidate subscribe (payment upload) & pending guard
- require_cv_premium 403 for non-premium candidate on /cvs POST and templates
- Premium candidate (budi) CRUD on cv_documents (create/get/update/duplicate/delete)
- PDF import (parse_cv_text) with generated PDF
- Admin: stats, list, detail (logs), approve/reject/extend/cancel
- Admin settings PUT with revert to price=10000, duration=30
- File auth: payment proof anon 401, owner 200, other candidate 403
- RBAC candidate cannot access /admin/cv-professional/stats
"""
import io
import os
import re
import uuid
import time
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "muhamadwahid.sih@gmail.com", "password": "admin123"}
BUDI = {"email": "budi@example.com", "password": "password123"}       # active
ANDI = {"email": "andi.pratama@example.com", "password": "password123"}  # pending
SITI = {"email": "siti.rahma@example.com", "password": "password123"}    # expired
DEWI = {"email": "dewi.lestari@example.com", "password": "password123"}  # rejected


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session")
def admin_token():
    return _login(**ADMIN)


@pytest.fixture(scope="session")
def budi_token():
    return _login(**BUDI)


@pytest.fixture(scope="session")
def new_candidate():
    """Register a fresh candidate for the new-user upgrade flow."""
    email = f"cvtester+{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "CV Tester", "email": email, "phone": "081211112222", "password": "password123"
    }, timeout=30)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    uid = r.json()["user"]["id"]
    return {"email": email, "token": token, "id": uid}


# Minimal PDF built with reportlab (available) to ensure text extraction
def _make_cv_pdf_bytes():
    try:
        from reportlab.pdfgen import canvas
    except ImportError:
        pytest.skip("reportlab not installed")
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    y = 800
    for line in [
        "Ahmad Fadli Rahman",
        "Email: ahmad.fadli@example.com",
        "Telepon: 081298765432",
        "",
        "Pendidikan",
        "Universitas Cirebon - S1 Teknik Informatika",
        "",
        "Pengalaman Kerja",
        "PT Contoh - Programmer",
        "",
        "Keahlian",
        "Python",
        "React",
    ]:
        c.drawString(50, y, line)
        y -= 20
    c.save()
    return buf.getvalue()


PNG_BYTES = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
             b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
             b"\x00\x00\x00\x03\x00\x01[\xe6\x02\x8d\x00\x00\x00\x00IEND\xaeB`\x82")


# ---------- Security ----------
def test_status_requires_auth():
    r = requests.get(f"{API}/cv-professional/status", timeout=15)
    assert r.status_code == 401


def test_budi_cannot_admin_stats(budi_token):
    r = requests.get(f"{API}/admin/cv-professional/stats", headers=_h(budi_token), timeout=15)
    assert r.status_code == 403


# ---------- Premium candidate access ----------
def test_budi_has_access(budi_token):
    r = requests.get(f"{API}/cv-professional/status", headers=_h(budi_token), timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["has_access"] is True
    assert data["subscription"]["status"] == "active"
    assert data["settings"]["price"] == 10000
    assert data["settings"]["duration_days"] == 30


def test_budi_templates(budi_token):
    r = requests.get(f"{API}/cv-professional/templates", headers=_h(budi_token), timeout=15)
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()]
    assert set(ids) == {"modern", "ats", "minimalis"}


# ---------- New candidate flow: guard, subscribe, admin approve ----------
def test_new_candidate_no_access_guard(new_candidate):
    tok = new_candidate["token"]
    r = requests.get(f"{API}/cv-professional/status", headers=_h(tok), timeout=15)
    assert r.status_code == 200 and r.json()["has_access"] is False
    # Guard: create cv blocked
    r2 = requests.post(f"{API}/cv-professional/cvs",
                       json={"name": "X", "template": "modern", "data": {}},
                       headers=_h(tok), timeout=15)
    assert r2.status_code == 403
    # Templates blocked too
    r3 = requests.get(f"{API}/cv-professional/templates", headers=_h(tok), timeout=15)
    assert r3.status_code == 403


def test_new_candidate_subscribe_and_admin_approve(new_candidate, admin_token):
    tok = new_candidate["token"]
    files = {"proof": ("bukti.png", io.BytesIO(PNG_BYTES), "image/png")}
    data = {"payment_method": "Transfer Bank BCA 1234567890"}
    r = requests.post(f"{API}/cv-professional/subscribe", data=data, files=files,
                     headers=_h(tok), timeout=30)
    assert r.status_code == 200, r.text
    sub = r.json()
    assert sub["status"] == "pending"
    assert sub["payment_proof"]
    sub_id = sub["id"]

    # Resubmit blocked while pending
    files2 = {"proof": ("bukti.png", io.BytesIO(PNG_BYTES), "image/png")}
    r_dup = requests.post(f"{API}/cv-professional/subscribe", data=data, files=files2,
                          headers=_h(tok), timeout=30)
    assert r_dup.status_code == 400

    # Admin sees pending in list
    r_list = requests.get(f"{API}/admin/cv-professional/subscriptions",
                          params={"status": "pending", "q": new_candidate["email"]},
                          headers=_h(admin_token), timeout=15)
    assert r_list.status_code == 200
    items = r_list.json()["items"]
    assert any(s["id"] == sub_id for s in items)

    # Approve
    before = datetime.now(timezone.utc)
    r_ap = requests.post(f"{API}/admin/cv-professional/subscriptions/{sub_id}/approve",
                         headers=_h(admin_token), timeout=15)
    assert r_ap.status_code == 200, r_ap.text
    body = r_ap.json()
    assert body["status"] == "active"
    exp = datetime.fromisoformat(body["expires_at"])
    delta_days = (exp - before).days
    assert 29 <= delta_days <= 31, f"expected ~30 days, got {delta_days}"

    # User status reflects active
    r_st = requests.get(f"{API}/cv-professional/status", headers=_h(tok), timeout=15)
    assert r_st.status_code == 200
    st = r_st.json()
    assert st["has_access"] is True
    assert st["subscription"]["status"] == "active"
    assert st["subscription"]["expires_at"]

    # cleanup: cancel to keep seed clean
    requests.post(f"{API}/admin/cv-professional/subscriptions/{sub_id}/cancel",
                  headers=_h(admin_token), timeout=15)


# ---------- CV documents CRUD (budi) ----------
def test_budi_cv_crud(budi_token):
    payload = {"name": "TEST_CV Budi", "template": "minimalis",
               "data": {"personal": {"name": "Budi Santoso", "email": "budi@example.com"},
                        "summary": "Test", "experience": [], "skills": []}}
    r = requests.post(f"{API}/cv-professional/cvs", json=payload,
                      headers=_h(budi_token), timeout=15)
    assert r.status_code == 200, r.text
    doc = r.json()
    cv_id = doc["id"]
    assert doc["template"] == "minimalis"

    # GET
    r2 = requests.get(f"{API}/cv-professional/cvs/{cv_id}", headers=_h(budi_token), timeout=15)
    assert r2.status_code == 200
    assert r2.json()["data"]["personal"]["name"] == "Budi Santoso"

    # UPDATE
    payload["name"] = "TEST_CV Budi Updated"
    payload["template"] = "modern"
    r3 = requests.put(f"{API}/cv-professional/cvs/{cv_id}", json=payload,
                      headers=_h(budi_token), timeout=15)
    assert r3.status_code == 200
    assert r3.json()["name"] == "TEST_CV Budi Updated"
    assert r3.json()["template"] == "modern"

    # DUPLICATE
    r4 = requests.post(f"{API}/cv-professional/cvs/{cv_id}/duplicate",
                       headers=_h(budi_token), timeout=15)
    assert r4.status_code == 200
    dup_id = r4.json()["id"]
    assert "(Salinan)" in r4.json()["name"]

    # LIST
    r5 = requests.get(f"{API}/cv-professional/my-cvs", headers=_h(budi_token), timeout=15)
    assert r5.status_code == 200
    ids = [c["id"] for c in r5.json()]
    assert cv_id in ids and dup_id in ids

    # DELETE both
    for _id in (cv_id, dup_id):
        rd = requests.delete(f"{API}/cv-professional/cvs/{_id}",
                             headers=_h(budi_token), timeout=15)
        assert rd.status_code == 200

    # 404 after delete
    r6 = requests.get(f"{API}/cv-professional/cvs/{cv_id}", headers=_h(budi_token), timeout=15)
    assert r6.status_code == 404


def test_invalid_template_rejected(budi_token):
    r = requests.post(f"{API}/cv-professional/cvs",
                      json={"name": "x", "template": "invalid", "data": {}},
                      headers=_h(budi_token), timeout=15)
    assert r.status_code == 400


# ---------- PDF import ----------
def test_import_pdf_parse(budi_token):
    pdf = _make_cv_pdf_bytes()
    files = {"file": ("cv.pdf", io.BytesIO(pdf), "application/pdf")}
    r = requests.post(f"{API}/cv-professional/import-cv", files=files,
                      headers=_h(budi_token), timeout=30)
    assert r.status_code == 200, r.text
    parsed = r.json()["parsed"]
    assert parsed["personal"]["name"] == "Ahmad Fadli Rahman"
    assert parsed["personal"]["email"] == "ahmad.fadli@example.com"
    assert parsed["personal"]["phone"] == "081298765432"
    assert len(parsed["education"]) >= 1
    assert len(parsed["experience"]) >= 1
    assert len(parsed["skills"]) >= 1


def test_import_wrong_format_rejected(budi_token):
    files = {"file": ("cv.txt", io.BytesIO(b"nothing"), "text/plain")}
    r = requests.post(f"{API}/cv-professional/import-cv", files=files,
                      headers=_h(budi_token), timeout=15)
    assert r.status_code == 400


# ---------- Admin actions on seeded subs (siti expired -> extend, andi pending -> reject) ----------
def _find_sub(admin_token, email, status=None):
    params = {"q": email}
    if status:
        params["status"] = status
    r = requests.get(f"{API}/admin/cv-professional/subscriptions",
                     params=params, headers=_h(admin_token), timeout=15)
    assert r.status_code == 200
    items = r.json()["items"]
    return items[0] if items else None


def test_admin_stats(admin_token):
    r = requests.get(f"{API}/admin/cv-professional/stats", headers=_h(admin_token), timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("total", "pending", "active", "expired", "rejected", "revenue"):
        assert k in d
    assert d["total"] >= 4  # seeded 4


def test_admin_extend_siti(admin_token):
    sub = _find_sub(admin_token, SITI["email"])
    if not sub:
        pytest.skip("siti sub not seeded")
    # It might already be active from previous runs; only extend if expired/active
    if sub["status"] not in ("expired", "active"):
        pytest.skip(f"siti status is {sub['status']}, cannot extend")
    before = datetime.now(timezone.utc)
    r = requests.post(f"{API}/admin/cv-professional/subscriptions/{sub['id']}/extend",
                      headers=_h(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "active"
    new_exp = datetime.fromisoformat(body["expires_at"])
    # If was expired -> ~30 days from now; if was active -> extended further
    assert new_exp > before

    # detail has logs
    r2 = requests.get(f"{API}/admin/cv-professional/subscriptions/{sub['id']}",
                      headers=_h(admin_token), timeout=15)
    assert r2.status_code == 200
    logs = r2.json()["logs"]
    assert any("Diperpanjang" in l.get("notes", "") or l.get("action") == "Subscription diperpanjang"
               for l in logs)


def test_admin_reject_pending(admin_token):
    sub = _find_sub(admin_token, ANDI["email"], status="pending")
    if not sub:
        pytest.skip("no pending sub for andi")
    r = requests.post(f"{API}/admin/cv-professional/subscriptions/{sub['id']}/reject",
                      json={"reason": "TEST bukti tidak jelas"},
                      headers=_h(admin_token), timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


# ---------- Payment proof file auth ----------
def test_payment_proof_file_auth(new_candidate, budi_token, admin_token):
    # subscribe a fresh candidate (may already have been done in prior test; make separate)
    email = f"cvfile+{uuid.uuid4().hex[:6]}@example.com"
    reg = requests.post(f"{API}/auth/register", json={
        "name": "File Auth", "email": email, "phone": "0812", "password": "password123"
    }, timeout=30)
    assert reg.status_code == 200
    tok = reg.json()["token"]

    files = {"proof": ("p.png", io.BytesIO(PNG_BYTES), "image/png")}
    r = requests.post(f"{API}/cv-professional/subscribe",
                      data={"payment_method": "TEST"}, files=files,
                      headers=_h(tok), timeout=30)
    assert r.status_code == 200
    path = r.json()["payment_proof"]

    # anon 401
    r1 = requests.get(f"{API}/files/{path}", timeout=15, allow_redirects=False)
    assert r1.status_code == 401
    # owner 200
    r2 = requests.get(f"{API}/files/{path}", headers=_h(tok), timeout=15)
    assert r2.status_code == 200
    # other candidate (budi) 403
    r3 = requests.get(f"{API}/files/{path}", headers=_h(budi_token), timeout=15)
    assert r3.status_code == 403
    # admin can access
    r4 = requests.get(f"{API}/files/{path}", headers=_h(admin_token), timeout=15)
    assert r4.status_code == 200


# ---------- Admin settings PUT with revert ----------
def test_admin_settings_update_and_revert(admin_token):
    # Change to 15000/45 + add payment method
    payload = {"package_name": "CV Profesional 30 Hari", "price": 15000, "duration_days": 45,
               "payment_methods": [{"type": "bank", "name": "BCA", "account_number": "1234567890",
                                     "account_holder": "Admin CirebonKarir"}]}
    r = requests.put(f"{API}/admin/cv-professional/settings", json=payload,
                     headers=_h(admin_token), timeout=15)
    assert r.status_code == 200
    got = r.json()
    assert got["price"] == 15000 and got["duration_days"] == 45
    assert len(got["payment_methods"]) == 1

    # payment-info reflects it (via a candidate token — use budi)
    budi_tok = _login(**BUDI)
    r2 = requests.get(f"{API}/cv-professional/payment-info", headers=_h(budi_tok), timeout=15)
    assert r2.status_code == 200
    assert r2.json()["price"] == 15000
    assert len(r2.json()["payment_methods"]) == 1

    # REVERT to 10000/30 (keep payment method removed to be safe)
    revert = {"package_name": "CV Profesional 30 Hari", "price": 10000, "duration_days": 30,
              "payment_methods": []}
    r3 = requests.put(f"{API}/admin/cv-professional/settings", json=revert,
                      headers=_h(admin_token), timeout=15)
    assert r3.status_code == 200
    assert r3.json()["price"] == 10000
    assert r3.json()["duration_days"] == 30


def test_admin_settings_validation(admin_token):
    r = requests.put(f"{API}/admin/cv-professional/settings",
                     json={"package_name": "", "price": 0, "duration_days": 0, "payment_methods": []},
                     headers=_h(admin_token), timeout=15)
    assert r.status_code == 400
