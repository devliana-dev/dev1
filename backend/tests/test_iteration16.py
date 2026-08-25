"""Iteration 16 backend tests: candidate applications enrichment, change-password, regression endpoints."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cbn-lowongan.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

BUDI = {"email": "budi@example.com", "password": "password123"}
TEMP_PWD = "kenan456"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    return r


@pytest.fixture(scope="module")
def budi_token():
    r = _login(BUDI["email"], BUDI["password"])
    assert r.status_code == 200, f"Login budi failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- (1) candidate/applications enrichment ---
def test_candidate_applications_has_company_logo_and_location(budi_token):
    r = requests.get(f"{API}/candidate/applications", headers=_auth(budi_token), timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1, "Expected at least 1 application for budi"
    for app in data:
        assert "company_logo" in app, f"Missing company_logo in {app}"
        assert "job_location" in app, f"Missing job_location in {app}"


# --- (3) regression endpoints ---
def test_candidate_stats(budi_token):
    r = requests.get(f"{API}/candidate/stats", headers=_auth(budi_token), timeout=20)
    assert r.status_code == 200
    d = r.json()
    for k in ("total", "diproses", "interview", "diterima", "ditolak"):
        assert k in d


def test_candidate_recommendations(budi_token):
    r = requests.get(f"{API}/candidate/recommendations", headers=_auth(budi_token), timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_cv_professional_my_cvs(budi_token):
    r = requests.get(f"{API}/cv-professional/my-cvs", headers=_auth(budi_token), timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_saved_jobs_ids(budi_token):
    r = requests.get(f"{API}/candidate/saved-jobs/ids", headers=_auth(budi_token), timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_career_profile(budi_token):
    r = requests.get(f"{API}/candidate/career-profile", headers=_auth(budi_token), timeout=20)
    assert r.status_code == 200


# --- (2) change-password flow (must restore to password123 at the end) ---
def test_change_password_full_flow():
    # Fresh login
    r = _login(BUDI["email"], BUDI["password"])
    assert r.status_code == 200, r.text
    old_token = r.json()["token"]

    # Wrong old password -> 400
    r = requests.put(f"{API}/auth/change-password",
                     json={"old_password": "wrong-pwd", "new_password": TEMP_PWD},
                     headers=_auth(old_token), timeout=20)
    assert r.status_code == 400

    # Correct change -> 200
    r = requests.put(f"{API}/auth/change-password",
                     json={"old_password": BUDI["password"], "new_password": TEMP_PWD},
                     headers=_auth(old_token), timeout=20)
    assert r.status_code == 200, r.text

    # Old token should now be invalid (pwd_reset_at invalidates)
    r_me = requests.get(f"{API}/auth/me", headers=_auth(old_token), timeout=20)
    assert r_me.status_code == 401, f"Old token still valid: {r_me.status_code}"

    # Old password login fails
    r = _login(BUDI["email"], BUDI["password"])
    assert r.status_code == 401

    # New password login succeeds
    r = _login(BUDI["email"], TEMP_PWD)
    assert r.status_code == 200
    new_token = r.json()["token"]

    # Restore back to original
    r = requests.put(f"{API}/auth/change-password",
                     json={"old_password": TEMP_PWD, "new_password": BUDI["password"]},
                     headers=_auth(new_token), timeout=20)
    assert r.status_code == 200

    # Confirm restore
    time.sleep(1)
    r = _login(BUDI["email"], BUDI["password"])
    assert r.status_code == 200, "FAILED to restore budi password!"
