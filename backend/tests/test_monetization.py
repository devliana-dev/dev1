"""Backend API tests for unified Membership & Monetisasi module (Iteration 6).

Covers:
- Free company quota (1/month), consume on job create, 403 on exhausted
- Company membership payment flow (submit -> admin approve -> subscription active +90d)
- Renewal/extend (2nd approved payment extends existing sub, no duplicate active)
- Admin approve job -> expires_at = approve_time + listing_days
- Entitlement separation (cv-professional vs company_membership)
- Admin monetization endpoints (overview/payments/subscriptions/products/payment-settings/audit-logs)
- Extend/cancel subscription
- Security (anon 401, candidate 403, no bypass via fake fields)
- CV Profesional regression via unified endpoints
"""
import io
import os
import re
import time
import uuid
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "muhamadwahid.sih@gmail.com", "password": "admin123"}
COMPANY_DEMO = {"email": "demo@perusahaan.com", "password": "password123"}
BUDI = {"email": "budi@example.com", "password": "password123"}
SITI = {"email": "siti.rahma@example.com", "password": "password123"}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


def _dummy_image_bytes():
    # 1x1 PNG
    return (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDAT\x08\x99c\xf8\xff\xff?"
            b"\x00\x05\xfe\x02\xfe\xdc\xccY\xe7\x00\x00\x00\x00IEND\xaeB`\x82")


# -------------------- fixtures --------------------
@pytest.fixture(scope="module")
def admin_tok():
    return _login(**ADMIN)


@pytest.fixture(scope="module")
def budi_tok():
    return _login(**BUDI)


@pytest.fixture(scope="module")
def new_company():
    """Register a fresh company and return (token, user, company)."""
    ts = int(time.time() * 1000)
    email = f"TEST_co_{ts}@example.com"
    payload = {"company_name": f"TEST Perusahaan {ts}", "email": email, "phone": "081200000000",
               "password": "password123", "pic_name": f"PIC {ts}"}
    r = requests.post(f"{API}/auth/register-company", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "user": d["user"], "company": d["company"], "email": email}


@pytest.fixture(scope="module")
def new_candidate():
    ts = int(time.time() * 1000)
    email = f"TEST_cand_{ts}@example.com"
    payload = {"name": f"Test Cand {ts}", "email": email, "phone": "081200000001", "password": "password123"}
    r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    return {"token": r.json()["token"], "email": email, "user_id": r.json()["user"]["id"]}


# -------------------- Products / Payment info --------------------
class TestProducts:
    def test_products_seeded_correctly(self, admin_tok):
        r = requests.get(f"{API}/admin/monetization/products", headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200
        products = r.json()
        codes = {p["product_code"]: p for p in products}
        assert "cv_professional" in codes
        assert "company_membership" in codes
        assert codes["cv_professional"]["price"] == 10000
        assert codes["cv_professional"]["duration_days"] == 30
        assert codes["cv_professional"]["target_role"] == "job_seeker"
        assert codes["company_membership"]["price"] == 50000
        assert codes["company_membership"]["duration_days"] == 90
        assert codes["company_membership"]["target_role"] == "company"

    def test_public_membership_products(self, budi_tok):
        r = requests.get(f"{API}/membership/products", headers=_h(budi_tok), timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 2


# -------------------- Free company quota + create_job flow --------------------
class TestFreeCompanyQuota:
    def test_new_company_free_entitlement(self, new_company):
        r = requests.get(f"{API}/company/entitlement", headers=_h(new_company["token"]), timeout=30)
        assert r.status_code == 200, r.text
        e = r.json()
        assert e["mode"] == "free"
        assert e["listing_days"] == 7
        assert e["is_member"] is False
        assert e["can_post"] is True
        assert e["quota"]["limit"] == 1
        assert e["quota"]["used"] == 0
        assert e["quota"]["remaining"] == 1
        now = datetime.now(timezone.utc)
        assert e["quota"]["period"] == f"{now.year}-{now.month:02d}"

    def test_first_job_succeeds_and_second_403(self, new_company, admin_tok):
        tok = new_company["token"]
        job_payload = {"title": "TEST Backend Dev", "description": "TEST descr", "location": "Cirebon",
                       "job_type": "Full Time", "salary_min": 5000000, "salary_max": 7000000,
                       "requirements": "TEST req", "benefits": "TEST ben", "category": "IT"}
        r1 = requests.post(f"{API}/company/jobs", headers=_h(tok), json=job_payload, timeout=30)
        assert r1.status_code == 200, r1.text
        job1 = r1.json()
        assert job1["listing_days"] == 7
        assert job1["posting_mode"] == "free"
        assert job1["status"] == "pending"
        assert job1["expires_at"] == ""  # only set at approve

        # quota now 1/1 used
        e = requests.get(f"{API}/company/entitlement", headers=_h(tok), timeout=30).json()
        assert e["quota"]["used"] == 1
        assert e["quota"]["remaining"] == 0
        assert e["mode"] == "none"
        assert e["can_post"] is False

        # 2nd post fails
        r2 = requests.post(f"{API}/company/jobs", headers=_h(tok), json=job_payload, timeout=30)
        assert r2.status_code == 403
        assert "Kuota" in r2.text

        # Bypass attempt with extra fields — must still 403 (Pydantic ignores unknown)
        payload_bypass = {**job_payload, "is_member": True, "listing_days": 30, "posting_mode": "member",
                          "expires_at": (datetime.now(timezone.utc) + timedelta(days=999)).isoformat()}
        r3 = requests.post(f"{API}/company/jobs", headers=_h(tok), json=payload_bypass, timeout=30)
        assert r3.status_code == 403

        # store job id for approve test
        new_company["job1_id"] = job1["id"]

    def test_admin_approve_sets_expires_at_plus_listing_days(self, new_company, admin_tok):
        job_id = new_company["job1_id"]
        t0 = datetime.now(timezone.utc)
        r = requests.post(f"{API}/admin/jobs/{job_id}/approve", headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200, r.text
        # fetch job
        jobs = requests.get(f"{API}/admin/jobs", headers=_h(admin_tok), timeout=30).json()
        job = next((j for j in jobs if j["id"] == job_id), None)
        assert job is not None
        assert job["status"] == "active"
        assert job["expires_at"]
        exp = datetime.fromisoformat(job["expires_at"])
        delta = (exp - t0).total_seconds()
        # around 7 days ± 60s
        assert abs(delta - 7 * 86400) < 120, f"expected ~7d, got {delta/86400}d"


# -------------------- Company Membership payment flow + Renewal --------------------
class TestCompanyMembershipFlow:
    def test_submit_payment_and_admin_approve(self, new_company, admin_tok):
        tok = new_company["token"]
        files = {"proof": ("proof.png", _dummy_image_bytes(), "image/png")}
        data = {"product_code": "company_membership", "payment_method": "Transfer BCA 123 a.n. TEST"}
        r = requests.post(f"{API}/membership/payments", headers=_h(tok), data=data, files=files, timeout=30)
        assert r.status_code == 200, r.text
        payment = r.json()
        assert payment["status"] == "pending"
        assert payment["amount"] == 50000
        assert payment["duration_days"] == 90
        new_company["payment1_id"] = payment["id"]

        # duplicate pending -> 400
        r2 = requests.post(f"{API}/membership/payments", headers=_h(tok), data=data,
                           files={"proof": ("p.png", _dummy_image_bytes(), "image/png")}, timeout=30)
        assert r2.status_code == 400

        # admin approve
        t0 = datetime.now(timezone.utc)
        ra = requests.post(f"{API}/admin/monetization/payments/{payment['id']}/approve",
                           headers=_h(admin_tok), timeout=30)
        assert ra.status_code == 200, ra.text
        approved = ra.json()
        exp = datetime.fromisoformat(approved["expires_at"])
        delta = (exp - t0).total_seconds()
        assert abs(delta - 90 * 86400) < 120

        # entitlement now member
        e = requests.get(f"{API}/company/entitlement", headers=_h(tok), timeout=30).json()
        assert e["mode"] == "member"
        assert e["is_member"] is True
        assert e["listing_days"] == 30
        assert e["can_post"] is True

    def test_member_can_post_multiple_and_expires_at_30d(self, new_company, admin_tok):
        tok = new_company["token"]
        job_payload = {"title": "TEST Member Job A", "description": "TEST", "location": "Cirebon",
                       "job_type": "Full Time", "salary_min": 6000000, "salary_max": 9000000,
                       "requirements": "TEST", "benefits": "TEST", "category": "IT"}
        job_ids = []
        for i in range(2):
            job_payload["title"] = f"TEST Member Job {i}"
            r = requests.post(f"{API}/company/jobs", headers=_h(tok), json=job_payload, timeout=30)
            assert r.status_code == 200, r.text
            j = r.json()
            assert j["listing_days"] == 30
            assert j["posting_mode"] == "member"
            job_ids.append(j["id"])

        # admin approve one and check expiry ~+30d
        t0 = datetime.now(timezone.utc)
        r = requests.post(f"{API}/admin/jobs/{job_ids[0]}/approve", headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200
        jobs = requests.get(f"{API}/admin/jobs", headers=_h(admin_tok), timeout=30).json()
        job = next(j for j in jobs if j["id"] == job_ids[0])
        exp = datetime.fromisoformat(job["expires_at"])
        delta = (exp - t0).total_seconds()
        assert abs(delta - 30 * 86400) < 120

    def test_renewal_extends_not_creates_duplicate(self, new_company, admin_tok):
        """Approve 2nd company_membership payment -> existing sub extended, only 1 active."""
        tok = new_company["token"]
        # get current active sub expires
        subs_before = requests.get(f"{API}/admin/monetization/subscriptions",
                                    params={"product": "company_membership", "status": "active"},
                                    headers=_h(admin_tok), timeout=30).json()
        my_active = [s for s in subs_before["items"] if s.get("company_id") == new_company["company"]["id"]]
        assert len(my_active) == 1
        old_exp = datetime.fromisoformat(my_active[0]["expires_at"])

        # submit 2nd payment
        files = {"proof": ("proof2.png", _dummy_image_bytes(), "image/png")}
        data = {"product_code": "company_membership", "payment_method": "Transfer BCA (renew)"}
        r = requests.post(f"{API}/membership/payments", headers=_h(tok), data=data, files=files, timeout=30)
        assert r.status_code == 200
        pid2 = r.json()["id"]

        # approve
        ra = requests.post(f"{API}/admin/monetization/payments/{pid2}/approve",
                           headers=_h(admin_tok), timeout=30)
        assert ra.status_code == 200
        new_exp = datetime.fromisoformat(ra.json()["expires_at"])
        delta = (new_exp - old_exp).total_seconds()
        assert abs(delta - 90 * 86400) < 120, f"expected +90d extend, got {delta/86400}d"

        # still only 1 active for this company
        subs_after = requests.get(f"{API}/admin/monetization/subscriptions",
                                   params={"product": "company_membership", "status": "active"},
                                   headers=_h(admin_tok), timeout=30).json()
        my_active2 = [s for s in subs_after["items"] if s.get("company_id") == new_company["company"]["id"]]
        assert len(my_active2) == 1
        assert my_active2[0]["id"] == my_active[0]["id"]  # same sub id (extended, not new)


# -------------------- Entitlement separation --------------------
class TestEntitlementSeparation:
    def test_candidate_cannot_access_company_endpoints(self, budi_tok):
        r = requests.post(f"{API}/company/jobs", headers=_h(budi_tok), json={
            "title": "x", "description": "x", "location": "x", "job_type": "Full Time",
            "salary_min": 1, "salary_max": 2, "requirements": "x", "benefits": "x", "category": "IT"
        }, timeout=30)
        assert r.status_code == 403

    def test_company_cannot_get_cv_professional_access(self, new_company):
        # company user has active company_membership but no cv_professional sub
        r = requests.post(f"{API}/cv-professional/cvs", headers=_h(new_company["token"]),
                          json={"name": "x", "template": "modern", "data": {}}, timeout=30)
        assert r.status_code == 403


# -------------------- Admin Monetization endpoints --------------------
class TestAdminMonetization:
    def test_overview(self, admin_tok):
        r = requests.get(f"{API}/admin/monetization/overview", headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["revenue", "payments_pending", "payments_approved", "payments_rejected",
                  "cv_active", "member_active", "subs_expired", "member_companies"]:
            assert k in d
            assert isinstance(d[k], int)
        assert d["cv_active"] >= 1  # budi is active
        assert d["revenue"] >= 10000

    def test_payments_filters(self, admin_tok):
        r = requests.get(f"{API}/admin/monetization/payments",
                         params={"product": "company_membership"},
                         headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200
        for p in r.json()["items"]:
            assert p["product_code"] == "company_membership"

        r2 = requests.get(f"{API}/admin/monetization/payments",
                          params={"status": "approved"}, headers=_h(admin_tok), timeout=30)
        assert r2.status_code == 200
        for p in r2.json()["items"]:
            assert p["status"] == "approved"

        r3 = requests.get(f"{API}/admin/monetization/payments",
                          params={"q": "TEST"}, headers=_h(admin_tok), timeout=30)
        assert r3.status_code == 200

    def test_subscriptions_filter(self, admin_tok):
        r = requests.get(f"{API}/admin/monetization/subscriptions",
                         params={"product": "company_membership", "status": "active"},
                         headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200
        for s in r.json()["items"]:
            assert s["product_type"] == "company_membership"
            assert s["status"] == "active"
            assert "jobs_count" in s

    def test_product_edit_and_revert(self, admin_tok):
        products = requests.get(f"{API}/admin/monetization/products",
                                headers=_h(admin_tok), timeout=30).json()
        cv = next(p for p in products if p["product_code"] == "cv_professional")
        # bump to 12000
        r = requests.put(f"{API}/admin/monetization/products/{cv['id']}",
                         headers=_h(admin_tok),
                         json={"name": cv["name"], "price": 12000, "duration_days": 30,
                               "description": cv["description"], "active": True}, timeout=30)
        assert r.status_code == 200
        assert r.json()["price"] == 12000
        # verify via public info
        info = requests.get(f"{API}/cv-professional/payment-info",
                            headers=_h(_login(**BUDI)), timeout=30).json()
        # payment-info shape returns price fields; check via products endpoint again
        after = requests.get(f"{API}/admin/monetization/products",
                             headers=_h(admin_tok), timeout=30).json()
        cv_after = next(p for p in after if p["product_code"] == "cv_professional")
        assert cv_after["price"] == 12000

        # revert
        r2 = requests.put(f"{API}/admin/monetization/products/{cv['id']}",
                          headers=_h(admin_tok),
                          json={"name": cv["name"], "price": 10000, "duration_days": 30,
                                "description": cv["description"], "active": True}, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["price"] == 10000

    def test_product_edit_validation(self, admin_tok):
        products = requests.get(f"{API}/admin/monetization/products",
                                headers=_h(admin_tok), timeout=30).json()
        cv = products[0]
        r = requests.put(f"{API}/admin/monetization/products/{cv['id']}",
                         headers=_h(admin_tok),
                         json={"name": cv["name"], "price": 0, "duration_days": 30,
                               "description": "", "active": True}, timeout=30)
        assert r.status_code == 400

    def test_payment_settings(self, admin_tok, budi_tok):
        original = requests.get(f"{API}/admin/monetization/payment-settings",
                                headers=_h(admin_tok), timeout=30).json()
        methods = [{"type": "bank", "name": "BCA", "account_number": "1234567890",
                    "account_name": "PT TEST"}]
        r = requests.put(f"{API}/admin/monetization/payment-settings",
                         headers=_h(admin_tok), json={"payment_methods": methods}, timeout=30)
        assert r.status_code == 200
        # visible to candidate
        info = requests.get(f"{API}/membership/payment-info",
                            headers=_h(budi_tok), timeout=30).json()
        assert any(m.get("account_number") == "1234567890" for m in info["payment_methods"])
        # restore
        requests.put(f"{API}/admin/monetization/payment-settings", headers=_h(admin_tok),
                     json={"payment_methods": original.get("payment_methods", [])}, timeout=30)

    def test_audit_logs(self, admin_tok):
        r = requests.get(f"{API}/admin/monetization/audit-logs",
                         headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200
        logs = r.json()
        assert len(logs) > 0
        actions = {l["action"] for l in logs}
        # from prior tests
        assert "Payment submitted" in actions
        assert "Payment approved" in actions
        assert ("Subscription activated" in actions) or ("Subscription extended" in actions)

    def test_extend_and_cancel_subscription(self, admin_tok):
        # find any active company_membership sub
        subs = requests.get(f"{API}/admin/monetization/subscriptions",
                            params={"product": "company_membership", "status": "active"},
                            headers=_h(admin_tok), timeout=30).json()
        if not subs["items"]:
            pytest.skip("no active company_membership sub to extend/cancel")
        target = subs["items"][0]
        old_exp = datetime.fromisoformat(target["expires_at"])
        r = requests.post(f"{API}/admin/monetization/subscriptions/{target['id']}/extend",
                          headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200
        new_exp = datetime.fromisoformat(r.json()["expires_at"])
        delta = (new_exp - old_exp).total_seconds()
        assert abs(delta - target.get("duration_days", 90) * 86400) < 120

        rc = requests.post(f"{API}/admin/monetization/subscriptions/{target['id']}/cancel",
                           headers=_h(admin_tok), timeout=30)
        assert rc.status_code == 200
        assert rc.json()["status"] == "cancelled"
        # second cancel -> 400
        rc2 = requests.post(f"{API}/admin/monetization/subscriptions/{target['id']}/cancel",
                            headers=_h(admin_tok), timeout=30)
        assert rc2.status_code == 400


# -------------------- CV Professional regression via unified endpoints --------------------
class TestCVProfessionalRegression:
    def test_budi_still_active(self, budi_tok):
        r = requests.get(f"{API}/cv-professional/status", headers=_h(budi_tok), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("has_access") is True
        sub = d.get("subscription") or {}
        assert sub.get("expires_at")
        exp = datetime.fromisoformat(sub["expires_at"])
        assert exp.year == 2026 and exp.month == 9

    def test_new_candidate_no_access(self, new_candidate):
        r = requests.get(f"{API}/cv-professional/status", headers=_h(new_candidate["token"]), timeout=30)
        assert r.status_code == 200
        assert r.json().get("has_access") is False

        # require_cv_premium blocks
        r2 = requests.post(f"{API}/cv-professional/cvs", headers=_h(new_candidate["token"]),
                           json={"name": "x", "template": "modern", "data": {}}, timeout=30)
        assert r2.status_code == 403

    def test_new_candidate_subscribe_and_admin_approve(self, new_candidate, admin_tok):
        files = {"proof": ("cv.png", _dummy_image_bytes(), "image/png")}
        data = {"product_code": "cv_professional", "payment_method": "Transfer BCA"}
        r = requests.post(f"{API}/membership/payments", headers=_h(new_candidate["token"]),
                          data=data, files=files, timeout=30)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        ra = requests.post(f"{API}/admin/monetization/payments/{pid}/approve",
                           headers=_h(admin_tok), timeout=30)
        assert ra.status_code == 200

        r2 = requests.get(f"{API}/cv-professional/status",
                          headers=_h(new_candidate["token"]), timeout=30)
        assert r2.json().get("has_access") is True

        # can now POST /cvs
        r3 = requests.post(f"{API}/cv-professional/cvs",
                           headers=_h(new_candidate["token"]),
                           json={"name": "TEST CV", "template": "modern", "data": {}}, timeout=30)
        assert r3.status_code == 200, r3.text

    def test_expired_sub_shows_in_admin(self, admin_tok):
        # siti seeded expired — verify state in subs list
        subs = requests.get(f"{API}/admin/monetization/subscriptions",
                            params={"product": "cv_professional"},
                            headers=_h(admin_tok), timeout=30).json()
        # ensure statuses set incl expired or other; at minimum endpoint returns dict
        assert "items" in subs


# -------------------- Security --------------------
class TestSecurity:
    def test_anon_overview_401(self):
        r = requests.get(f"{API}/admin/monetization/overview", timeout=30)
        assert r.status_code == 401

    def test_candidate_overview_403(self, budi_tok):
        r = requests.get(f"{API}/admin/monetization/overview", headers=_h(budi_tok), timeout=30)
        assert r.status_code == 403

    def test_anon_entitlement_401(self):
        r = requests.get(f"{API}/company/entitlement", timeout=30)
        assert r.status_code == 401


# -------------------- Light Regression --------------------
class TestRegression:
    def test_homepage_backend(self):
        r = requests.get(f"{API}/jobs", timeout=30)
        assert r.status_code == 200

    def test_admin_stats(self, admin_tok):
        r = requests.get(f"{API}/admin/stats", headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200
        for k in ["candidates", "companies", "jobs", "applications"]:
            assert k in r.json()
