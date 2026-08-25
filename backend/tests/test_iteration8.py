"""
Iteration 8 - Admin/Owner Command Center backend tests.
Tests: owner login, owner/admin/perm-based access, overview, analytics endpoints,
       search, export CSV, settings CRUD, staff CRUD, audit logs, authorization.
"""
import os
import pytest
import requests

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "https://cbn-lowongan.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

OWNER = ("owner@cirebonkarir.com", "owner123")
ADMIN = ("muhamadwahid.sih@gmail.com", "admin123")
COMPANY = ("demo@perusahaan.com", "password123")
CANDIDATE = ("budi@example.com", "password123")


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="module")
def owner_token():
    return login(*OWNER)


@pytest.fixture(scope="module")
def admin_token():
    return login(*ADMIN)


@pytest.fixture(scope="module")
def company_token():
    return login(*COMPANY)


@pytest.fixture(scope="module")
def candidate_token():
    return login(*CANDIDATE)


# ---------------- Owner login + role ----------------
class TestOwner:
    def test_owner_login_role(self):
        r = requests.post(f"{API}/auth/login", json={"email": OWNER[0], "password": OWNER[1]})
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["role"] == "owner"
        assert d["user"]["email"] == OWNER[0]

    def test_owner_me(self, owner_token):
        r = requests.get(f"{API}/auth/me", headers=H(owner_token))
        assert r.status_code == 200
        d = r.json()
        user = d.get("user", d)
        assert user["role"] == "owner"


# ---------------- Overview / Analytics ----------------
class TestOverviewAnalytics:
    def test_overview(self, owner_token):
        r = requests.get(f"{API}/admin/overview", headers=H(owner_token))
        assert r.status_code == 200, r.text
        d = r.json()
        # Should contain KPI-like fields
        assert isinstance(d, dict)
        assert len(d.keys()) >= 3

    def test_growth(self, owner_token):
        for days in [7, 30, 90]:
            r = requests.get(f"{API}/admin/analytics/growth?days={days}", headers=H(owner_token))
            assert r.status_code == 200, r.text

    def test_funnel(self, owner_token):
        r = requests.get(f"{API}/admin/analytics/funnel", headers=H(owner_token))
        assert r.status_code == 200

    def test_market(self, owner_token):
        r = requests.get(f"{API}/admin/analytics/market", headers=H(owner_token))
        assert r.status_code == 200

    def test_talent(self, owner_token):
        r = requests.get(f"{API}/admin/analytics/talent", headers=H(owner_token))
        assert r.status_code == 200

    def test_monetization(self, owner_token):
        r = requests.get(f"{API}/admin/analytics/monetization", headers=H(owner_token))
        assert r.status_code == 200

    def test_live_activity_pagination(self, owner_token):
        r = requests.get(f"{API}/admin/analytics/live-activity?page=1", headers=H(owner_token))
        assert r.status_code == 200
        r2 = requests.get(f"{API}/admin/analytics/live-activity?page=2", headers=H(owner_token))
        assert r2.status_code == 200

    def test_top_performers(self, owner_token):
        r = requests.get(f"{API}/admin/analytics/top-performers", headers=H(owner_token))
        assert r.status_code == 200

    def test_search(self, owner_token):
        r = requests.get(f"{API}/admin/search?q=budi", headers=H(owner_token))
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, dict)

    def test_audit_logs(self, owner_token):
        r = requests.get(f"{API}/admin/audit-logs?page=1", headers=H(owner_token))
        assert r.status_code == 200


# ---------------- Authorization ----------------
class TestAuthorization:
    def test_no_token(self):
        r = requests.get(f"{API}/admin/overview")
        assert r.status_code in (401, 403)

    def test_candidate_forbidden(self, candidate_token):
        r = requests.get(f"{API}/admin/overview", headers=H(candidate_token))
        assert r.status_code == 403

    def test_company_forbidden_monetization(self, company_token):
        r = requests.get(f"{API}/admin/analytics/monetization", headers=H(company_token))
        assert r.status_code == 403

    def test_admin_can_access_overview(self, admin_token):
        r = requests.get(f"{API}/admin/overview", headers=H(admin_token))
        assert r.status_code == 200

    def test_admin_cannot_access_staff(self, admin_token):
        r = requests.get(f"{API}/admin/staff", headers=H(admin_token))
        assert r.status_code == 403

    def test_owner_can_access_staff(self, owner_token):
        r = requests.get(f"{API}/admin/staff", headers=H(owner_token))
        assert r.status_code == 200


# ---------------- Settings ----------------
class TestSettings:
    def test_settings_get_put_restore(self, owner_token):
        r = requests.get(f"{API}/admin/settings", headers=H(owner_token))
        assert r.status_code == 200, r.text
        orig = r.json()
        # update free_job_days -> 10
        payload = {"free_apply_limit": orig.get("free_apply_limit", 3),
                   "pro_apply_limit": orig.get("pro_apply_limit", 30),
                   "free_post_limit": orig.get("free_post_limit", 1),
                   "free_job_days": 10,
                   "member_job_days": orig.get("member_job_days", 30)}
        r2 = requests.put(f"{API}/admin/settings", headers=H(owner_token), json=payload)
        assert r2.status_code == 200, r2.text
        r3 = requests.get(f"{API}/admin/settings", headers=H(owner_token))
        assert r3.json()["free_job_days"] == 10
        # restore to 7
        payload["free_job_days"] = 7
        r4 = requests.put(f"{API}/admin/settings", headers=H(owner_token), json=payload)
        assert r4.status_code == 200
        r5 = requests.get(f"{API}/admin/settings", headers=H(owner_token))
        assert r5.json()["free_job_days"] == 7


# ---------------- Export CSV ----------------
class TestExport:
    def test_export_companies_csv(self, owner_token):
        r = requests.get(f"{API}/admin/export/companies", headers=H(owner_token))
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert len(r.text) > 0

    def test_export_subscriptions(self, owner_token):
        r = requests.get(f"{API}/admin/export/subscriptions", headers=H(owner_token))
        assert r.status_code == 200


# ---------------- Staff CRUD ----------------
class TestStaffCRUD:
    """Create admin, verify perms, deactivate, restore."""
    created_id = None
    created_token = None

    def test_create_admin(self, owner_token):
        payload = {"name": "Admin Uji", "email": "admin.uji@cirebonkarir.com",
                   "password": "adminuji123", "permissions": ["users", "jobs"]}
        # First deactivate/delete if leftover
        r_existing = requests.get(f"{API}/admin/staff", headers=H(owner_token))
        if r_existing.status_code == 200:
            for s in r_existing.json() if isinstance(r_existing.json(), list) else r_existing.json().get("items", []):
                if s.get("email") == payload["email"]:
                    TestStaffCRUD.created_id = s["id"]
        if not TestStaffCRUD.created_id:
            r = requests.post(f"{API}/admin/staff", headers=H(owner_token), json=payload)
            assert r.status_code in (200, 201), r.text
            TestStaffCRUD.created_id = r.json().get("id")
        assert TestStaffCRUD.created_id

    def test_login_new_admin(self):
        # Try to login (may require password reset if pre-existing)
        r = requests.post(f"{API}/auth/login",
                          json={"email": "admin.uji@cirebonkarir.com", "password": "adminuji123"})
        if r.status_code != 200:
            pytest.skip(f"New admin login not usable: {r.status_code}")
        TestStaffCRUD.created_token = r.json()["token"]

    def test_new_admin_cannot_access_staff(self):
        if not TestStaffCRUD.created_token:
            pytest.skip("no token")
        r = requests.get(f"{API}/admin/staff", headers=H(TestStaffCRUD.created_token))
        assert r.status_code == 403

    def test_new_admin_cannot_put_settings(self):
        if not TestStaffCRUD.created_token:
            pytest.skip("no token")
        r = requests.put(f"{API}/admin/settings", headers=H(TestStaffCRUD.created_token),
                         json={"free_apply_limit": 3, "pro_apply_limit": 30,
                               "free_post_limit": 1, "free_job_days": 7, "member_job_days": 30})
        assert r.status_code == 403

    def test_new_admin_cannot_export(self):
        if not TestStaffCRUD.created_token:
            pytest.skip("no token")
        r = requests.get(f"{API}/admin/export/users", headers=H(TestStaffCRUD.created_token))
        assert r.status_code == 403

    def test_new_admin_can_overview(self):
        if not TestStaffCRUD.created_token:
            pytest.skip("no token")
        r = requests.get(f"{API}/admin/overview", headers=H(TestStaffCRUD.created_token))
        assert r.status_code == 200

    def test_deactivate_admin_uji(self, owner_token):
        if not TestStaffCRUD.created_id:
            pytest.skip("no created")
        r = requests.post(f"{API}/admin/staff/{TestStaffCRUD.created_id}/status",
                          headers=H(owner_token), json={"blocked": True})
        assert r.status_code == 200, r.text


# ---------------- Audit log after action ----------------
class TestAuditFlow:
    def test_add_category_creates_audit(self, owner_token):
        import time
        name = f"TEST_CAT_{int(time.time())}"
        r = requests.post(f"{API}/admin/categories", headers=H(owner_token), json={"name": name})
        assert r.status_code in (200, 201), r.text
        # verify audit log
        r2 = requests.get(f"{API}/admin/audit-logs?page=1", headers=H(owner_token))
        assert r2.status_code == 200
        body = r2.json()
        logs = body if isinstance(body, list) else body.get("items", [])
        actions = " ".join([l.get("action", "") + " " + str(l.get("metadata", {})) for l in logs])
        assert "Tambah kategori" in actions or name in actions


# ---------------- Regression quick ----------------
class TestRegression:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN[0], "password": ADMIN[1]})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_company_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": COMPANY[0], "password": COMPANY[1]})
        assert r.status_code == 200

    def test_candidate_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": CANDIDATE[0], "password": CANDIDATE[1]})
        assert r.status_code == 200

    def test_jobs_list_public(self):
        r = requests.get(f"{API}/jobs")
        assert r.status_code == 200
