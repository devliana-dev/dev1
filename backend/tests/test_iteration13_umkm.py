"""Backend tests for LOKER UMKM feature (iteration 13)"""
import os
import pytest
import requests
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cbn-lowongan.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def umkm_token():
    return _login("demo@umkm.com", "password123")


@pytest.fixture(scope="module")
def laundry_token():
    return _login("laundry@umkm.com", "password123")


@pytest.fixture(scope="module")
def company_token():
    return _login("demo@perusahaan.com", "password123")


@pytest.fixture(scope="module")
def candidate_token():
    return _login("budi@example.com", "password123")


@pytest.fixture(scope="module")
def admin_token():
    return _login("muhamadwahid.sih@gmail.com", "admin123")


# ---------- Public /api/jobs filters ----------

class TestJobsFilterByEmployerType:
    def test_jobs_filter_umkm(self):
        r = requests.get(f"{API}/jobs", params={"employer_type": "umkm"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) > 0, "Expected at least 1 UMKM job"
        for job in items:
            assert job.get("employer_type") == "umkm", f"Non-UMKM job returned: {job.get('title')} etype={job.get('employer_type')}"

    def test_jobs_filter_company(self):
        r = requests.get(f"{API}/jobs", params={"employer_type": "company"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) > 0
        for job in items:
            assert job.get("employer_type") == "company"

    def test_jobs_no_filter_returns_both(self):
        r = requests.get(f"{API}/jobs", timeout=30)
        assert r.status_code == 200
        data = r.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        etypes = {j.get("employer_type") for j in items}
        assert "umkm" in etypes and "company" in etypes, f"Expected both types, got {etypes}"

    def test_jobs_filter_umkm_search_laundry(self):
        r = requests.get(f"{API}/jobs", params={"employer_type": "umkm", "q": "laundry"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) >= 1
        for j in items:
            assert j.get("employer_type") == "umkm"


class TestJobDetailUmkmFields:
    def test_umkm_job_detail_has_new_fields(self):
        r = requests.get(f"{API}/jobs", params={"employer_type": "umkm"}, timeout=30)
        items = r.json().get("items", r.json()) if isinstance(r.json(), dict) else r.json()
        assert items
        job_id = items[0]["id"]
        d = requests.get(f"{API}/jobs/{job_id}", timeout=30)
        assert d.status_code == 200
        job = d.json()
        assert job.get("employer_type") == "umkm"
        # These fields may be optional but should exist as keys
        assert "business_category" in job
        assert "work_hours" in job
        assert "slots" in job

    def test_company_job_detail_has_employer_type_company(self):
        r = requests.get(f"{API}/jobs", params={"employer_type": "company"}, timeout=30)
        items = r.json().get("items", r.json()) if isinstance(r.json(), dict) else r.json()
        assert items
        job_id = items[0]["id"]
        d = requests.get(f"{API}/jobs/{job_id}", timeout=30)
        assert d.status_code == 200
        assert d.json().get("employer_type") == "company"


# ---------- Company stats ----------

class TestCompanyStatsUmkm:
    def test_umkm_company_stats(self, umkm_token):
        r = requests.get(f"{API}/company/stats", headers={"Authorization": f"Bearer {umkm_token}"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("employer_type") == "umkm"
        assert "new_applicants" in data
        assert "expired_jobs" in data


# ---------- Admin jobs filter ----------

class TestAdminJobsFilter:
    def test_admin_jobs_umkm(self, admin_token):
        r = requests.get(f"{API}/admin/jobs", params={"employer_type": "umkm"},
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) > 0
        for j in items:
            assert j.get("employer_type") == "umkm"

    def test_admin_jobs_company(self, admin_token):
        r = requests.get(f"{API}/admin/jobs", params={"employer_type": "company"},
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        for j in items:
            assert j.get("employer_type") == "company"


# ---------- Post UMKM job → admin approve → visible ----------

class TestPostAndApproveUmkmJob:
    def test_post_umkm_then_admin_approve(self, laundry_token, admin_token):
        payload = {
            "title": "TEST_ Karyawan Laundry Baru",
            "description": "Karyawan laundry untuk shift pagi",
            "requirements": "Rajin, jujur",
            "location": "Cirebon",
            "job_type": "full_time",
            "category": "Umum",
            "salary_min": 2000000,
            "salary_max": 2500000,
            "employer_type": "umkm",
            "business_category": "Laundry",
            "work_hours": "08:00-16:00",
            "slots": 2,
        }
        r = requests.post(f"{API}/company/jobs", json=payload,
                          headers={"Authorization": f"Bearer {laundry_token}"}, timeout=30)
        if r.status_code == 403 or (r.status_code == 400 and "kuota" in r.text.lower()):
            pytest.skip(f"Free plan quota exhausted (expected existing behavior): {r.text}")
        assert r.status_code in (200, 201), r.text
        job = r.json()
        job_id = job.get("id") or job.get("_id")
        assert job.get("employer_type") == "umkm"
        assert job.get("status") in ("pending", "menunggu", "waiting")

        # Admin approve
        ar = requests.post(f"{API}/admin/jobs/{job_id}/approve",
                           headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert ar.status_code in (200, 201), ar.text

        # Verify visible in umkm list
        time.sleep(1)
        list_r = requests.get(f"{API}/jobs", params={"employer_type": "umkm"}, timeout=30)
        items = list_r.json().get("items", list_r.json()) if isinstance(list_r.json(), dict) else list_r.json()
        assert any(j.get("id") == job_id for j in items), "Approved UMKM job not visible in public list"


# ---------- Register company with employer_type=umkm ----------

class TestRegisterCompanyUmkm:
    def test_register_company_umkm(self):
        ts = int(time.time())
        payload = {
            "company_name": f"TEST_UMKM_{ts}",
            "email": f"test_umkm_{ts}@example.com",
            "phone": "081234567890",
            "password": "password123",
            "pic_name": "Test PIC",
            "employer_type": "umkm",
        }
        r = requests.post(f"{API}/auth/register-company", json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        # Login and check profile
        tok = _login(payload["email"], payload["password"])
        p = requests.get(f"{API}/company/profile", headers={"Authorization": f"Bearer {tok}"}, timeout=30)
        assert p.status_code == 200
        assert p.json().get("employer_type") == "umkm"


# ---------- Regression ----------

class TestRegression:
    def test_meta(self):
        assert requests.get(f"{API}/meta", timeout=30).status_code == 200

    def test_companies(self):
        assert requests.get(f"{API}/companies", timeout=30).status_code == 200

    def test_jobs_no_filter(self):
        assert requests.get(f"{API}/jobs", timeout=30).status_code == 200

    def test_candidate_apply_quota(self, candidate_token):
        r = requests.get(f"{API}/candidate/apply-quota",
                         headers={"Authorization": f"Bearer {candidate_token}"}, timeout=30)
        assert r.status_code == 200
