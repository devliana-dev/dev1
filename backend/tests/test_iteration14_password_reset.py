"""Iteration 14 — Forgot/Reset Password (admin-assisted) tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cbn-lowongan.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "muhamadwahid.sih@gmail.com", "password": "admin123"}
OWNER = {"email": "owner@cirebonkarir.com", "password": "owner123"}
CANDIDATE = {"email": "budi@example.com", "password": "password123"}
COMPANY = {"email": "demo@perusahaan.com", "password": "password123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def candidate_token():
    return _login(CANDIDATE)


# ---------- 1. Anti-enumeration on forgot-password ----------
def test_forgot_password_registered_email_returns_generic_200():
    r = requests.post(f"{API}/auth/forgot-password", json={"email": CANDIDATE["email"]})
    assert r.status_code == 200
    msg1 = r.json().get("message", "")
    assert "reset" in msg1.lower() or "admin" in msg1.lower()

    r2 = requests.post(f"{API}/auth/forgot-password", json={"email": "nonexistent-xyz@nowhere.com"})
    assert r2.status_code == 200
    assert r2.json().get("message") == msg1  # identical generic response


def test_forgot_password_dedupe_pending(admin_token):
    # After the prior call, budi has a pending request. Second call must not create another.
    requests.post(f"{API}/auth/forgot-password", json={"email": CANDIDATE["email"]})
    time.sleep(0.3)
    r = requests.get(f"{API}/admin/password-resets", params={"status": "pending"},
                     headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    pendings = [x for x in r.json() if x["email"] == CANDIDATE["email"]]
    assert len(pendings) == 1, f"Expected exactly 1 pending for budi, got {len(pendings)}"


def test_forgot_password_admin_role_no_record_but_generic_response(admin_token):
    r = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN["email"]})
    assert r.status_code == 200
    r2 = requests.post(f"{API}/auth/forgot-password", json={"email": OWNER["email"]})
    assert r2.status_code == 200
    # Verify no pending record created for admin/owner emails
    lst = requests.get(f"{API}/admin/password-resets",
                       headers={"Authorization": f"Bearer {admin_token}"}).json()
    admin_records = [x for x in lst if x["email"] in (ADMIN["email"], OWNER["email"])]
    assert admin_records == [], f"Admin/owner should not have reset records: {admin_records}"


# ---------- 2. Authz on admin endpoints ----------
def test_admin_password_resets_requires_auth():
    r = requests.get(f"{API}/admin/password-resets")
    assert r.status_code in (401, 403)


def test_admin_password_resets_forbidden_for_candidate(candidate_token):
    r = requests.get(f"{API}/admin/password-resets",
                     headers={"Authorization": f"Bearer {candidate_token}"})
    assert r.status_code == 403


def test_admin_password_resets_ok_for_admin(admin_token):
    r = requests.get(f"{API}/admin/password-resets",
                     headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- 3. Complete flow ----------
def _get_pending_id(admin_token, email):
    lst = requests.get(f"{API}/admin/password-resets", params={"status": "pending"},
                       headers={"Authorization": f"Bearer {admin_token}"}).json()
    for x in lst:
        if x["email"] == email:
            return x["id"]
    return None


def test_complete_password_too_short(admin_token):
    req_id = _get_pending_id(admin_token, CANDIDATE["email"])
    assert req_id, "No pending request for budi"
    r = requests.post(f"{API}/admin/password-resets/{req_id}/complete",
                      json={"new_password": "abc"},
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 400


def test_complete_flow_and_token_invalidation(admin_token):
    # Get an old token for budi FIRST
    old_token = _login(CANDIDATE)

    req_id = _get_pending_id(admin_token, CANDIDATE["email"])
    assert req_id

    time.sleep(1.2)  # ensure new iat > old iat second precision

    new_pwd = "newpass456"
    r = requests.post(f"{API}/admin/password-resets/{req_id}/complete",
                      json={"new_password": new_pwd},
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "completed"

    # Old password no longer works
    r_old = requests.post(f"{API}/auth/login", json=CANDIDATE)
    assert r_old.status_code == 401

    # New password works
    r_new = requests.post(f"{API}/auth/login", json={"email": CANDIDATE["email"], "password": new_pwd})
    assert r_new.status_code == 200

    # Old token invalidated (iat < pwd_reset_at)
    r_me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert r_me.status_code == 401, f"Old token should be invalid, got {r_me.status_code}"


# ---------- 4. Reject flow ----------
def test_reject_flow(admin_token):
    # Create a new pending request for a company user
    requests.post(f"{API}/auth/forgot-password", json={"email": COMPANY["email"]})
    time.sleep(0.3)
    req_id = _get_pending_id(admin_token, COMPANY["email"])
    assert req_id, "No pending request for company"

    r = requests.post(f"{API}/admin/password-resets/{req_id}/reject",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"

    # Re-completing a rejected/non-pending request → 404
    r2 = requests.post(f"{API}/admin/password-resets/{req_id}/complete",
                       json={"new_password": "anotherpass"},
                       headers={"Authorization": f"Bearer {admin_token}"})
    assert r2.status_code == 404


# ---------- 5. Auth regression ----------
def test_auth_me_and_login_after_reset():
    r = requests.post(f"{API}/auth/login",
                      json={"email": CANDIDATE["email"], "password": "newpass456"})
    assert r.status_code == 200
    tok = r.json()["token"]
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 200
    body = me.json()
    email = body.get("email") or body.get("user", {}).get("email")
    assert email == CANDIDATE["email"]


def test_register_new_candidate_and_logout():
    ts = int(time.time())
    email = f"TEST_reset_{ts}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "TEST Reset User", "email": email, "phone": "081234567890", "password": "abcdef"
    })
    assert r.status_code == 200
    tok = r.json()["token"]
    lo = requests.post(f"{API}/auth/logout", headers={"Authorization": f"Bearer {tok}"})
    assert lo.status_code in (200, 204)


# ---------- 6. Light regression on other features ----------
def test_meta_and_jobs():
    r = requests.get(f"{API}/meta")
    assert r.status_code == 200
    r2 = requests.get(f"{API}/jobs")
    assert r2.status_code == 200


# ---------- 7. CLEANUP: restore budi password to 'password123' ----------
def test_zz_cleanup_restore_budi_password(admin_token):
    # Trigger new forgot request then complete with password123
    requests.post(f"{API}/auth/forgot-password", json={"email": CANDIDATE["email"]})
    time.sleep(0.3)
    req_id = _get_pending_id(admin_token, CANDIDATE["email"])
    assert req_id, "Could not create restore request for budi"
    r = requests.post(f"{API}/admin/password-resets/{req_id}/complete",
                      json={"new_password": "password123"},
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200

    # Verify budi can login with password123
    time.sleep(0.5)
    lr = requests.post(f"{API}/auth/login", json=CANDIDATE)
    assert lr.status_code == 200, "Cleanup failed: budi cannot login with password123"


def test_zz_cleanup_reject_leftover_pending(admin_token):
    lst = requests.get(f"{API}/admin/password-resets", params={"status": "pending"},
                      headers={"Authorization": f"Bearer {admin_token}"}).json()
    for x in lst:
        requests.post(f"{API}/admin/password-resets/{x['id']}/reject",
                     headers={"Authorization": f"Bearer {admin_token}"})
    # Verify no pending left
    lst2 = requests.get(f"{API}/admin/password-resets", params={"status": "pending"},
                       headers={"Authorization": f"Bearer {admin_token}"}).json()
    assert lst2 == []
