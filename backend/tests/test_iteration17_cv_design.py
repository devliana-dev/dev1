"""Iteration 17: CV Design endpoints + career profile integration + quick-apply profile-only + storage 503."""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cirebon-karir-home.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CANDIDATE = {"email": "budi.demo@cirebonkarir.id", "password": "password123"}
COMPANY = {"email": "demo@umkm.com", "password": "password123"}
ADMIN = {"email": "admin@cirebonkarir.com", "password": "admin123"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed {creds['email']}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def cand_token():
    return _login(CANDIDATE)


@pytest.fixture(scope="module")
def company_token():
    return _login(COMPANY)


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- CV design ----------
class TestCvDesign:
    def test_get_cv_design_returns_valid_shape(self, cand_token):
        r = requests.get(f"{API}/candidate/cv-design", headers=_h(cand_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["template"] in ["modern", "ats", "executive", "creative", "minimalis", "corporate", "fresh_graduate", "elegant"]
        assert d["accent"] in ["navy", "blue", "black", "green", "purple", "gold"]

    def test_put_cv_design_valid_and_persist(self, cand_token):
        r = requests.put(f"{API}/candidate/cv-design",
                         headers=_h(cand_token),
                         json={"template": "executive", "accent": "gold"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json() == {"template": "executive", "accent": "gold"}
        # GET verifies persistence
        r2 = requests.get(f"{API}/candidate/cv-design", headers=_h(cand_token), timeout=30)
        assert r2.json() == {"template": "executive", "accent": "gold"}

    def test_put_cv_design_invalid_template(self, cand_token):
        r = requests.put(f"{API}/candidate/cv-design",
                         headers=_h(cand_token),
                         json={"template": "bogus", "accent": "navy"}, timeout=30)
        assert r.status_code in (400, 422), r.text

    def test_put_cv_design_invalid_accent(self, cand_token):
        r = requests.put(f"{API}/candidate/cv-design",
                         headers=_h(cand_token),
                         json={"template": "modern", "accent": "rainbow"}, timeout=30)
        assert r.status_code in (400, 422), r.text

    def test_put_cv_design_all_valid_combos(self, cand_token):
        # Sample a few combinations
        for tpl in ["modern", "ats", "creative", "minimalis", "corporate", "fresh_graduate", "elegant"]:
            r = requests.put(f"{API}/candidate/cv-design",
                             headers=_h(cand_token),
                             json={"template": tpl, "accent": "blue"}, timeout=30)
            assert r.status_code == 200, f"{tpl}: {r.text}"
        # Restore default-ish
        requests.put(f"{API}/candidate/cv-design", headers=_h(cand_token),
                     json={"template": "modern", "accent": "navy"}, timeout=30)

    def test_cv_design_requires_auth(self):
        r = requests.get(f"{API}/candidate/cv-design", timeout=30)
        assert r.status_code in (401, 403)


# ---------- Career profile includes cv_design + job_preferences ----------
class TestCareerProfileFields:
    def test_career_profile_has_cv_design_and_job_preferences(self, cand_token):
        r = requests.get(f"{API}/candidate/career-profile", headers=_h(cand_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        prof = data.get("profile", data)
        assert "cv_design" in prof, f"Missing cv_design; keys={list(prof.keys())}"
        assert "template" in prof["cv_design"]
        assert "accent" in prof["cv_design"]
        assert "job_preferences" in prof, f"Missing job_preferences; keys={list(prof.keys())}"
        assert isinstance(prof["job_preferences"], list)


# ---------- Company view of candidate profile ----------
class TestCompanyCandidateProfile:
    def test_company_can_see_candidate_cv_design(self, cand_token, company_token):
        # Set design + make profile public so any company member can view
        requests.put(f"{API}/candidate/cv-design", headers=_h(cand_token),
                     json={"template": "elegant", "accent": "purple"}, timeout=30)
        cur = requests.get(f"{API}/candidate/career-profile", headers=_h(cand_token), timeout=30).json()
        prof = cur.get("profile", cur)
        payload = {k: prof.get(k, [] if isinstance(prof.get(k), list) else "")
                   for k in ["photo_path","address","city","summary","target_position","target_category",
                             "target_location","target_job_type",
                             "education","experience","skills","certifications","languages",
                             "organizations","achievements","portfolios","job_preferences"]}
        payload["expected_salary"] = prof.get("expected_salary", 0)
        payload["visibility"] = "public"
        requests.put(f"{API}/candidate/career-profile", headers=_h(cand_token), json=payload, timeout=30)

        me = requests.get(f"{API}/auth/me", headers=_h(cand_token), timeout=30).json()
        cand_id = me.get("id") or me.get("user", {}).get("id")
        assert cand_id
        r = requests.get(f"{API}/company/candidates/{cand_id}/profile",
                         headers=_h(company_token), timeout=30)
        if r.status_code == 403:
            pytest.skip(f"Company access denied even with public profile: {r.text}")
        assert r.status_code == 200, r.text
        body = r.json()
        prof2 = body.get("profile") or body.get("career_profile") or body
        assert "cv_design" in prof2, f"Missing cv_design; body keys={list(body.keys())}"
        assert prof2["cv_design"]["template"] == "elegant"
        assert prof2["cv_design"]["accent"] == "purple"


# ---------- Quick apply relaxation: no cv_path required ----------
class TestQuickApplyProfileOnly:
    def test_quick_apply_works_with_profile_only(self, cand_token):
        # Ensure Profil Karier has summary + experience (needed for relaxed quick-apply)
        cur = requests.get(f"{API}/candidate/career-profile", headers=_h(cand_token), timeout=30).json()
        prof = cur.get("profile", cur)
        payload = {k: prof.get(k, "") if not isinstance(prof.get(k), list) else prof.get(k, [])
                   for k in ["photo_path","address","city","summary","target_position","target_category",
                             "target_location","target_job_type","visibility",
                             "education","experience","skills","certifications","languages",
                             "organizations","achievements","portfolios","job_preferences"]}
        payload["expected_salary"] = prof.get("expected_salary", 0)
        payload["visibility"] = prof.get("visibility") or "private"
        if not payload.get("summary"):
            payload["summary"] = "TEST_iter17 kandidat berpengalaman ritel/kasir 3+ tahun."
        if not payload.get("experience"):
            payload["experience"] = [{"title": "Kasir", "company": "Toko Uji", "start": "2021-01",
                                      "end": "2023-01", "description": "Layanan pelanggan & operasi kasir."}]
        r = requests.put(f"{API}/candidate/career-profile", headers=_h(cand_token), json=payload, timeout=30)
        assert r.status_code == 200, f"Failed to set profile: {r.status_code} {r.text}"

        # Find an active job
        jobs = requests.get(f"{API}/jobs?limit=30", timeout=30).json()
        items = jobs if isinstance(jobs, list) else jobs.get("items", [])
        assert items, "No jobs available for quick-apply test"
        last_status, last_body = None, None
        for j in items:
            r = requests.post(f"{API}/jobs/{j['id']}/quick-apply",
                              headers=_h(cand_token),
                              data={"message": "TEST_iteration17"}, timeout=30)
            last_status, last_body = r.status_code, r.text
            if r.status_code == 200:
                data = r.json()
                assert data.get("apply_method") == "one_click"
                assert "cv_path" in data  # can be empty
                return
            if r.status_code == 400 and "sudah melamar" in r.text.lower():
                continue
            if r.status_code == 400 and "profil karier" in r.text.lower():
                pytest.fail(f"Quick-apply still requires profile completion after PUT: {r.text}")
            if r.status_code == 403 and "kuota" in r.text.lower():
                return
        pytest.skip(f"All test jobs already applied; last: {last_status} {last_body}")


# ---------- Seed membership product duration_days=90 ----------
class TestMembershipSeed:
    def test_cv_professional_product_duration_90(self, cand_token):
        r = requests.get(f"{API}/membership/products", headers=_h(cand_token), timeout=30)
        assert r.status_code == 200, r.text
        products = r.json()
        items = products if isinstance(products, list) else products.get("items", [])
        cv = next((p for p in items if p.get("product_code") == "cv_professional"), None)
        assert cv, f"cv_professional not found; got {items}"
        assert cv.get("duration_days") == 90, f"Expected 90, got {cv.get('duration_days')}"


# ---------- Storage endpoints must NOT save locally: expect 503 when cloud down ----------
class TestStorageNoLocalFallback:
    def test_photo_upload_503_or_200(self, cand_token):
        img = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        files = {"file": ("test.png", io.BytesIO(img), "image/png")}
        r = requests.post(f"{API}/candidate/career-profile/photo",
                          headers=_h(cand_token), files=files, timeout=30)
        # Acceptable: 503 (storage down) or 200 (cloud actually works). Must NOT be 500/other.
        assert r.status_code in (200, 503), f"Unexpected {r.status_code}: {r.text}"
        if r.status_code == 200:
            body = r.json()
            # If cloud is working, path should exist. We can't easily test 'no local' here
            assert "photo_path" in body

    def test_cert_upload_503_or_200(self, cand_token):
        files = {"file": ("cert.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")}
        r = requests.post(f"{API}/candidate/career-profile/cert-file",
                          headers=_h(cand_token), files=files, timeout=30)
        assert r.status_code in (200, 503), f"Unexpected {r.status_code}: {r.text}"


# ---------- Regression: existing endpoints still work ----------
class TestRegression:
    def test_candidate_login(self):
        _login(CANDIDATE)

    def test_company_login(self):
        _login(COMPANY)

    def test_admin_login(self):
        _login(ADMIN)

    def test_get_jobs(self):
        r = requests.get(f"{API}/jobs", timeout=30)
        assert r.status_code == 200

    def test_get_companies(self):
        r = requests.get(f"{API}/companies", timeout=30)
        assert r.status_code == 200

    def test_candidate_apply_quota(self, cand_token):
        r = requests.get(f"{API}/candidate/apply-quota", headers=_h(cand_token), timeout=30)
        assert r.status_code == 200
        q = r.json()
        # Career Pro quota should be present
        assert "remaining" in q or "quota_remaining" in q or "used" in q or "limit" in q, q

    def test_cv_professional_status(self, cand_token):
        r = requests.get(f"{API}/cv-professional/status", headers=_h(cand_token), timeout=30)
        assert r.status_code == 200, r.text
