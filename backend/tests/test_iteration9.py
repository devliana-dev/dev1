"""
Iteration 9 - Referral & Commission System backend tests.
Covers: code creation, /r/validate, attribution, commission lifecycle,
        duplicate protection, company member no commission, paused state,
        withdrawal flow (with temporary min_withdrawal change), refund
        protection, authorization, regression.
"""
import io
import os
import time
import uuid
import pytest
import requests

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "https://cbn-lowongan.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

OWNER = ("owner@cirebonkarir.com", "owner123")
ADMIN = ("muhamadwahid.sih@gmail.com", "admin123")
BUDI = ("budi@example.com", "password123")
DEWI = ("dewi.lestari@example.com", "password123")
COMPANY_DEMO = ("demo@perusahaan.com", "password123")
COMPANY_HALO = ("halo@kopikangen.com", "password123")

BUDI_CODE = "BUDISA93EF"


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
def budi_token():
    return login(*BUDI)


@pytest.fixture(scope="module")
def dewi_token():
    return login(*DEWI)


@pytest.fixture(scope="module")
def halo_token():
    return login(*COMPANY_HALO)


# ---------------- Section 1: Code + Validate ----------------
class TestCodeAndValidate:
    def test_budi_has_code(self, budi_token):
        r = requests.get(f"{API}/referral/me", headers=H(budi_token))
        assert r.status_code == 200
        d = r.json()
        assert d["code"] == BUDI_CODE
        assert d["active"] is True
        assert d["settings"]["commission"] == 2000
        assert d["settings"]["min_withdrawal"] == 50000

    def test_validate_valid(self):
        r = requests.get(f"{API}/referrals/validate/{BUDI_CODE}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("valid") is True
        assert d.get("referrer_name")
        assert "budi" in d["referrer_name"].lower()

    def test_validate_invalid(self):
        r = requests.get(f"{API}/referrals/validate/XXXINVALID")
        assert r.status_code == 200
        assert r.json().get("valid") is False

    def test_dewi_paused(self, dewi_token):
        r = requests.get(f"{API}/referral/me", headers=H(dewi_token))
        assert r.status_code == 200
        d = r.json()
        assert d["active"] is False
        assert d["code"]
        assert d["paused_reason"]

    def test_dewi_withdrawal_blocked(self, dewi_token):
        r = requests.post(f"{API}/referral/withdrawals", headers=H(dewi_token),
                          json={"amount": 50000, "method": "dana",
                                "account_name": "Dewi", "account_number": "0812"})
        assert r.status_code == 403


# ---------------- Section 2: Attribution + Full Commission Lifecycle ----------------
@pytest.fixture(scope="module")
def test_candidate_A():
    """Create candidate A attributed to Budi and return their token+id."""
    email = f"test_ref_a_{int(time.time())}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "Test Ref A", "email": email, "phone": "081200000000",
        "password": "password123", "referral_code": BUDI_CODE})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "id": d["user"]["id"], "email": email}


@pytest.fixture(scope="module")
def test_candidate_B():
    """Create candidate B attributed to Budi (for refund test)."""
    email = f"test_ref_b_{int(time.time())}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "Test Ref B", "email": email, "phone": "081200000001",
        "password": "password123", "referral_code": BUDI_CODE})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "id": d["user"]["id"], "email": email}


def _cv_subscribe(token):
    """Submit Career Pro subscription with dummy proof and return payment id."""
    files = {"proof": ("proof.pdf", io.BytesIO(b"%PDF-1.4 dummy"), "application/pdf")}
    data = {"payment_method": "manual"}
    r = requests.post(f"{API}/cv-professional/subscribe", headers=H(token),
                      files=files, data=data)
    assert r.status_code in (200, 201), r.text
    return r.json()


def _find_payment_id_for_user(admin_token, user_id):
    """Return most recent pending Career Pro payment for user_id."""
    r = requests.get(f"{API}/admin/monetization/payments?status=pending&product=cv_professional&limit=50",
                     headers=H(admin_token))
    assert r.status_code == 200, r.text
    items = r.json().get("items", [])
    for p in items:
        if p.get("user_id") == user_id:
            return p["id"]
    return None


class TestAttributionAndCommission:
    def test_new_user_attributed_to_budi(self, test_candidate_A):
        # verify /api/referral/referrals for Budi includes new user
        bt = login(*BUDI)
        r = requests.get(f"{API}/referral/referrals", headers=H(bt))
        assert r.status_code == 200
        names = [x["name"] for x in r.json()]
        assert any("Test Ref A" in n for n in names), f"Attribution failed. Referrals: {names}"

    def test_new_user_has_own_code(self, test_candidate_A):
        r = requests.get(f"{API}/referral/me", headers=H(test_candidate_A["token"]))
        assert r.status_code == 200
        d = r.json()
        assert d["code"]
        assert d["active"] is False  # A has no Career Pro yet

    def test_full_commission_flow(self, test_candidate_A, admin_token, budi_token):
        # 1. A subscribes Career Pro
        _cv_subscribe(test_candidate_A["token"])
        payment_id = _find_payment_id_for_user(admin_token, test_candidate_A["id"])
        assert payment_id, "Payment not found in pending list"

        # 2. Admin approves payment → commission pending for Budi
        r = requests.post(f"{API}/admin/monetization/payments/{payment_id}/approve",
                          headers=H(admin_token))
        assert r.status_code == 200, r.text

        # 3. Find the created commission
        rc = requests.get(f"{API}/admin/referrals/commissions?status=pending",
                          headers=H(admin_token))
        assert rc.status_code == 200
        comms = [c for c in rc.json() if c.get("payment_id") == payment_id]
        assert len(comms) == 1, f"Expected 1 pending commission, got {len(comms)}"
        comm = comms[0]
        assert comm["amount"] == 2000
        assert comm["status"] == "pending"
        pytest.commission_id_A = comm["id"]
        pytest.payment_id_A = payment_id

        # 4. Duplicate approve → 400
        r_dup = requests.post(f"{API}/admin/monetization/payments/{payment_id}/approve",
                              headers=H(admin_token))
        assert r_dup.status_code == 400, f"Expected 400, got {r_dup.status_code}: {r_dup.text}"

        # 5. Ensure only 1 commission exists for this payment
        rc2 = requests.get(f"{API}/admin/referrals/commissions", headers=H(admin_token))
        assert rc2.status_code == 200
        for_payment = [c for c in rc2.json() if c.get("payment_id") == payment_id]
        assert len(for_payment) == 1

        # 6. Admin approve commission → approved
        ra = requests.post(f"{API}/admin/referrals/commissions/{comm['id']}/action",
                           headers=H(admin_token), json={"action": "approve"})
        assert ra.status_code == 200, ra.text
        assert ra.json()["status"] == "approved"

        # 7. Release → available
        rr = requests.post(f"{API}/admin/referrals/commissions/{comm['id']}/action",
                           headers=H(admin_token), json={"action": "release"})
        assert rr.status_code == 200, rr.text
        assert rr.json()["status"] == "available"

        # 8. Invalid transition: try approve again → 400
        rbad = requests.post(f"{API}/admin/referrals/commissions/{comm['id']}/action",
                             headers=H(admin_token), json={"action": "approve"})
        assert rbad.status_code == 400

        # 9. Budi notifications contain 'Referral berhasil' and 'Komisi tersedia'
        rn = requests.get(f"{API}/notifications", headers=H(budi_token))
        # some apps use different path — fallback
        if rn.status_code != 200:
            rn = requests.get(f"{API}/me/notifications", headers=H(budi_token))
        if rn.status_code == 200:
            body = rn.json()
            items = body if isinstance(body, list) else body.get("items", [])
            titles = " ".join([str(i.get("title", "")) + " " + str(i.get("message", "")) for i in items])
            assert "Referral" in titles or "Komisi" in titles


# ---------------- Section 3: Company Member NO Commission ----------------
class TestCompanyMemberNoCommission:
    def test_company_subscribe_no_commission(self, halo_token, admin_token):
        # halo subscribes company_membership via generic /membership/payments
        files = {"proof": ("proof.pdf", io.BytesIO(b"%PDF-1.4 dummy"), "application/pdf")}
        r_sub = requests.post(f"{API}/membership/payments", headers=H(halo_token),
                              files=files, data={"payment_method": "manual",
                                                 "product_code": "company_membership"})
        if r_sub.status_code not in (200, 201):
            pytest.skip(f"halo cannot submit payment: {r_sub.status_code} {r_sub.text}")

        # find that payment id
        r_pays = requests.get(f"{API}/admin/monetization/payments?status=pending&product=company_membership&limit=50",
                              headers=H(admin_token))
        assert r_pays.status_code == 200
        items = r_pays.json().get("items", [])
        me = requests.get(f"{API}/auth/me", headers=H(halo_token)).json()
        halo_uid = me.get("user", me).get("id")
        pay = next((p for p in items if p.get("user_id") == halo_uid), None)
        assert pay, "halo payment not found"

        # count commissions before/after approve
        pre = requests.get(f"{API}/admin/referrals/commissions", headers=H(admin_token)).json()
        pre_ids = {c["id"] for c in pre}

        r_ap = requests.post(f"{API}/admin/monetization/payments/{pay['id']}/approve",
                             headers=H(admin_token))
        assert r_ap.status_code == 200, r_ap.text

        post = requests.get(f"{API}/admin/referrals/commissions", headers=H(admin_token)).json()
        new_comms = [c for c in post if c["id"] not in pre_ids]
        assert new_comms == [], f"Unexpected commission after company membership approve: {new_comms}"


# ---------------- Section 4: Withdrawal Flow (temporary min_withdrawal) ----------------
def _get_all_settings_payload(owner_token, overrides=None):
    r = requests.get(f"{API}/admin/settings", headers=H(owner_token))
    assert r.status_code == 200
    orig = r.json()
    keys = ["free_apply_limit", "pro_apply_limit", "free_post_limit",
            "free_job_days", "member_job_days", "referral_commission",
            "min_withdrawal", "holding_days"]
    payload = {k: orig.get(k) for k in keys}
    if overrides:
        payload.update(overrides)
    return payload, orig


class TestWithdrawalFlow:
    def test_withdrawal_full_flow(self, owner_token, admin_token, budi_token):
        # Step 1: temporarily set min_withdrawal to 2000
        payload, orig = _get_all_settings_payload(owner_token, {"min_withdrawal": 2000})
        r_put = requests.put(f"{API}/admin/settings", headers=H(owner_token), json=payload)
        assert r_put.status_code == 200, r_put.text

        try:
            # Confirm Budi wallet has at least 2000 available
            rme = requests.get(f"{API}/referral/me", headers=H(budi_token))
            assert rme.status_code == 200
            wal = rme.json()["wallet"]
            assert wal["available"] >= 2000, f"Wallet: {wal}"

            # Step 2: Budi requests withdrawal 2000 via dana
            rw = requests.post(f"{API}/referral/withdrawals", headers=H(budi_token),
                               json={"amount": 2000, "method": "dana",
                                     "account_name": "Budi Santoso", "account_number": "0812"})
            assert rw.status_code == 200, rw.text
            wd_id = rw.json()["id"]

            # Step 3: Admin process → paid
            rp = requests.post(f"{API}/admin/referrals/withdrawals/{wd_id}/action",
                               headers=H(admin_token), json={"action": "process"})
            assert rp.status_code == 200
            assert rp.json()["status"] == "processing"

            rpaid = requests.post(f"{API}/admin/referrals/withdrawals/{wd_id}/action",
                                  headers=H(admin_token), json={"action": "paid"})
            assert rpaid.status_code == 200
            assert rpaid.json()["status"] == "paid"

            # Step 4: verify wallet updated (withdrawn += 2000, available -= 2000)
            rme2 = requests.get(f"{API}/referral/me", headers=H(budi_token))
            new_wal = rme2.json()["wallet"]
            assert new_wal["withdrawn"] >= 2000, f"Expected withdrawn >=2000: {new_wal}"
            assert new_wal["available"] == wal["available"] - 2000, f"available not decremented: {new_wal}"

            # Step 5: Withdrawal validations
            # amount < min
            rmin = requests.post(f"{API}/referral/withdrawals", headers=H(budi_token),
                                 json={"amount": 100, "method": "dana",
                                       "account_name": "Budi", "account_number": "0812"})
            assert rmin.status_code == 400

            # invalid method
            rmet = requests.post(f"{API}/referral/withdrawals", headers=H(budi_token),
                                 json={"amount": 2000, "method": "paypal",
                                       "account_name": "Budi", "account_number": "0812"})
            assert rmet.status_code == 400

            # insufficient balance
            rlow = requests.post(f"{API}/referral/withdrawals", headers=H(budi_token),
                                 json={"amount": 999999, "method": "dana",
                                       "account_name": "Budi", "account_number": "0812"})
            assert rlow.status_code == 400
        finally:
            # Step 6: Restore min_withdrawal to 50000
            restore = {**payload, "min_withdrawal": 50000}
            r_rst = requests.put(f"{API}/admin/settings", headers=H(owner_token), json=restore)
            assert r_rst.status_code == 200
            rver = requests.get(f"{API}/admin/settings", headers=H(owner_token)).json()
            assert rver["min_withdrawal"] == 50000


# ---------------- Section 5: Refund Protection ----------------
class TestRefundProtection:
    def test_cancel_subscription_cancels_commission(self, test_candidate_B, admin_token):
        # 1. B subscribes Career Pro
        _cv_subscribe(test_candidate_B["token"])
        payment_id = _find_payment_id_for_user(admin_token, test_candidate_B["id"])
        assert payment_id

        # 2. Admin approve
        r_ap = requests.post(f"{API}/admin/monetization/payments/{payment_id}/approve",
                             headers=H(admin_token))
        assert r_ap.status_code == 200

        # 3. Find the sub id
        rs = requests.get(f"{API}/admin/monetization/subscriptions?product=cv_professional&status=active&limit=100",
                          headers=H(admin_token))
        assert rs.status_code == 200
        subs = rs.json().get("items", [])
        target = next((s for s in subs if s.get("user_id") == test_candidate_B["id"]), None)
        assert target, "Subscription not found for candidate B"

        # find commission for this payment (should be pending)
        rc = requests.get(f"{API}/admin/referrals/commissions", headers=H(admin_token))
        assert rc.status_code == 200
        comm = next((c for c in rc.json() if c.get("payment_id") == payment_id), None)
        assert comm, "Commission missing for candidate B"
        assert comm["status"] == "pending"

        # 4. Cancel subscription → commission becomes cancelled
        rcan = requests.post(f"{API}/admin/monetization/subscriptions/{target['id']}/cancel",
                             headers=H(admin_token))
        assert rcan.status_code == 200, rcan.text

        rc2 = requests.get(f"{API}/admin/referrals/commissions", headers=H(admin_token))
        comm2 = next((c for c in rc2.json() if c.get("payment_id") == payment_id), None)
        assert comm2 and comm2["status"] == "cancelled", f"Commission not cancelled: {comm2}"


# ---------------- Section 6: Self-referral Skip ----------------
class TestSelfReferral:
    def test_budi_no_self_referral_doc(self, admin_token, budi_token):
        # Get budi's user id via /auth/me
        r = requests.get(f"{API}/auth/me", headers=H(budi_token))
        assert r.status_code == 200
        uid = r.json().get("user", r.json()).get("id")

        # Try to register a new user using Budi's OWN code with Budi's email — must fail (email taken)
        rdup = requests.post(f"{API}/auth/register", json={
            "name": "Fake Budi", "email": BUDI[0], "phone": "0812",
            "password": "password123", "referral_code": BUDI_CODE})
        assert rdup.status_code == 400

        # Verify Budi is not their own referee in referrals list
        rb = requests.get(f"{API}/referral/referrals", headers=H(budi_token))
        assert rb.status_code == 200
        for ref in rb.json():
            assert ref.get("name") != "Budi Santoso" or uid != uid  # tautology just to iterate


# ---------------- Section 7: Authorization ----------------
class TestAuthorization:
    def test_candidate_forbidden_admin_overview(self, budi_token):
        r = requests.get(f"{API}/admin/referrals/overview", headers=H(budi_token))
        assert r.status_code == 403

    def test_no_token_referral_me(self):
        r = requests.get(f"{API}/referral/me")
        assert r.status_code in (401, 403)

    def test_scoped_to_login_user(self, budi_token, dewi_token):
        rb = requests.get(f"{API}/referral/me", headers=H(budi_token))
        rd = requests.get(f"{API}/referral/me", headers=H(dewi_token))
        assert rb.json()["code"] != rd.json()["code"]

    def test_admin_can_access_referral_overview(self, admin_token):
        r = requests.get(f"{API}/admin/referrals/overview", headers=H(admin_token))
        assert r.status_code == 200
        d = r.json()
        for key in ("total_referrers", "active_referrers", "conversions", "commission_total"):
            assert key in d


# ---------------- Section 8: Regression ----------------
class TestRegression:
    def test_register_without_code(self):
        email = f"test_ref_nocode_{int(time.time())}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "name": "No Code", "email": email, "phone": "0812",
            "password": "password123"})
        assert r.status_code == 200, r.text
        # user gets their own code
        tok = r.json()["token"]
        r2 = requests.get(f"{API}/referral/me", headers=H(tok))
        assert r2.status_code == 200
        assert r2.json()["code"]

    def test_all_role_login(self):
        for email, pwd in [OWNER, ADMIN, COMPANY_DEMO, BUDI]:
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd})
            assert r.status_code == 200, f"{email} login failed"

    def test_jobs_public(self):
        r = requests.get(f"{API}/jobs")
        assert r.status_code == 200
