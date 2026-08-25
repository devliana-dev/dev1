"""
Iteration 7 backend tests: Launch Program, Company Plan, Career Profile,
One-Click Apply, Saved Jobs, Job Alerts, Application Tracking,
Applicant Management, Shortlist, Interview, Candidate Search, Invite,
Notifications, Admin launch/membership/career-pro, Security gating.
"""
import io
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("muhamadwahid.sih@gmail.com", "admin123")
COMPANY_DEMO = ("demo@perusahaan.com", "password123")           # Batik Trusmi
COMPANY_KOPI = ("halo@kopikangen.com", "password123")           # Kopi Kangen
CAND_BUDI = ("budi@example.com", "password123")                 # Career Pro
CAND_ANDI = ("andi.pratama@example.com", "password123")         # free
CAND_SITI = ("siti.rahma@example.com", "password123")           # expired
CAND_DEWI = ("dewi.lestari@example.com", "password123")         # rejected


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text}"
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Fixtures ----------

@pytest.fixture(scope="session")
def tokens():
    return {
        "admin": _login(*ADMIN),
        "demo": _login(*COMPANY_DEMO),
        "kopi": _login(*COMPANY_KOPI),
        "budi": _login(*CAND_BUDI),
        "andi": _login(*CAND_ANDI),
        "siti": _login(*CAND_SITI),
        "dewi": _login(*CAND_DEWI),
    }


@pytest.fixture(scope="session")
def demo_company(tokens):
    r = requests.get(f"{API}/company/profile", headers=H(tokens["demo"]), timeout=20)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session")
def kopi_company(tokens):
    r = requests.get(f"{API}/company/profile", headers=H(tokens["kopi"]), timeout=20)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="session", autouse=True)
def restore_launch(tokens):
    """Ensure launch program is at 2026-06-25 → 2026-10-25 active BEFORE + AFTER."""
    def set_launch(start, end, active):
        r = requests.put(f"{API}/admin/launch-program", headers=H(tokens["admin"]),
                         json={"start_date": start, "end_date": end, "is_active": active}, timeout=20)
        assert r.status_code == 200, r.text

    set_launch("2026-06-25T00:00:00+00:00", "2026-10-25T23:59:59+00:00", True)
    yield
    set_launch("2026-06-25T00:00:00+00:00", "2026-10-25T23:59:59+00:00", True)


# ---------- 1. Launch program ----------

class TestLaunchProgram:
    def test_public_launch(self):
        r = requests.get(f"{API}/launch-program", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["is_enabled"] is True
        assert d["end_date"].startswith("2026-10-25")
        # active depends on current date being within window; may be false if now < 2026-06-25.

    def test_admin_launch_status(self, tokens):
        r = requests.get(f"{API}/admin/launch-program", headers=H(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "plan_counts" in d and "days_remaining" in d and d["total_companies"] > 0
        assert d["program"]["end_date"].startswith("2026-10-25")

    def test_admin_update_invalid(self, tokens):
        r = requests.put(f"{API}/admin/launch-program", headers=H(tokens["admin"]),
                         json={"start_date": "2026-06-25T00:00:00+00:00",
                               "end_date": "2026-06-20T00:00:00+00:00", "is_active": True}, timeout=20)
        assert r.status_code == 400

    def test_admin_update_ok(self, tokens):
        # push end to +5 days from now, then restore in autouse fixture
        new_end = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        r = requests.put(f"{API}/admin/launch-program", headers=H(tokens["admin"]),
                         json={"start_date": "2026-06-25T00:00:00+00:00", "end_date": new_end,
                               "is_active": True}, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["program"]["end_date"].startswith(new_end[:10])


# ---------- 2. Company plan / entitlement ----------

class TestCompanyPlan:
    def test_demo_launch_free(self, tokens):
        # ensure launch active (now is Jan 2026 → before 2026-06-25). Simulate active by moving start to past.
        # set start = yesterday, end = 2026-10-25
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        r = requests.put(f"{API}/admin/launch-program", headers=H(tokens["admin"]),
                         json={"start_date": yesterday, "end_date": "2026-10-25T23:59:59+00:00",
                               "is_active": True}, timeout=20)
        assert r.status_code == 200

        r = requests.get(f"{API}/company/entitlement", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("listing_days") == 30
        assert d.get("mode") == "launch_free" or d.get("is_member") is True

    def test_admin_activate_member_and_deactivate(self, tokens, kopi_company):
        cid = kopi_company["id"]
        r = requests.post(f"{API}/admin/companies/{cid}/membership",
                          headers=H(tokens["admin"]), json={"action": "activate"}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "active"

        # verify plan == member on admin list
        r = requests.get(f"{API}/admin/companies?plan=member", headers=H(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        assert any(c["id"] == cid for c in r.json())

        r = requests.post(f"{API}/admin/companies/{cid}/membership",
                          headers=H(tokens["admin"]), json={"action": "deactivate"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"

    def test_launch_ended_makes_free(self, tokens):
        # set launch ended yesterday
        yest = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        start = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        r = requests.put(f"{API}/admin/launch-program", headers=H(tokens["admin"]),
                         json={"start_date": start, "end_date": yest, "is_active": True}, timeout=20)
        assert r.status_code == 200

        r = requests.get(f"{API}/company/entitlement", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200
        d = r.json()
        # demo has no paid membership; should fall back to free
        assert d.get("mode") == "free" or d.get("is_member") is False

        # gated endpoint must 403 for demo (now free)
        r = requests.get(f"{API}/company/shortlists", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 403

    def test_re_enable_launch(self, tokens):
        past_start = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        r = requests.put(f"{API}/admin/launch-program", headers=H(tokens["admin"]),
                         json={"start_date": past_start, "end_date": "2026-10-25T23:59:59+00:00",
                               "is_active": True}, timeout=20)
        assert r.status_code == 200
        r = requests.get(f"{API}/company/shortlists", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200


# ---------- 3. Career Profile ----------

class TestCareerProfile:
    def test_get_and_update(self, tokens):
        r = requests.get(f"{API}/candidate/career-profile", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200
        before = r.json()["completion"]["percent"]

        payload = {
            "photo_path": "", "address": "Jl. Sudirman", "city": "Kota Cirebon",
            "summary": "Admin gudang berpengalaman",
            "target_position": "Admin Gudang", "target_category": "Gudang",
            "target_location": "Kota Cirebon", "target_job_type": "Full-time",
            "expected_salary": 3500000, "visibility": "public",
            "education": [{"level": "SMA/SMK", "school": "SMKN 1 Cirebon", "year": "2018"}],
            "experience": [{"title": "Admin Gudang", "company": "PT XYZ", "years": "2018-2020"}],
            "skills": [{"name": "MS Excel"}, {"name": "Inventory"}, {"name": "Komunikasi"}],
            "certifications": [], "languages": [], "organizations": [], "achievements": [],
            "portfolios": [],
        }
        r = requests.put(f"{API}/candidate/career-profile", headers=H(tokens["budi"]),
                         json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["profile"]["visibility"] == "public"
        assert d["profile"]["target_position"] == "Admin Gudang"
        assert d["completion"]["percent"] >= before

    def test_invalid_visibility(self, tokens):
        r = requests.put(f"{API}/candidate/career-profile", headers=H(tokens["budi"]),
                         json={"visibility": "world"}, timeout=20)
        assert r.status_code == 400


# ---------- 4. Apply Quota / One-Click Apply ----------

def _upload_dummy_cv(token):
    files = {"file": ("cv.pdf", b"%PDF-1.4 dummy cv content\n%%EOF", "application/pdf")}
    r = requests.post(f"{API}/candidate/cv", headers=H(token), files=files, timeout=30)
    return r


def _get_active_jobs():
    r = requests.get(f"{API}/jobs?limit=50", timeout=20)
    assert r.status_code == 200
    return r.json().get("items", []) if isinstance(r.json(), dict) else r.json()


class TestApplyQuota:
    def test_budi_pro_quota(self, tokens):
        r = requests.get(f"{API}/candidate/apply-quota", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # Budi has active cv_professional subscription
        assert d["plan"] in ("career_pro", "free")
        if d["plan"] == "career_pro":
            assert d["limit"] == 30
        assert d["used"] <= d["limit"]

    def test_free_quota_limit(self, tokens):
        # dewi has rejected subscription → free
        r = requests.get(f"{API}/candidate/apply-quota", headers=H(tokens["dewi"]), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["plan"] == "free"
        assert d["limit"] == 3


class TestQuickApply:
    def test_needs_cv(self, tokens):
        # dewi likely has no cv_path uploaded
        # try quick-apply → expect 400 "Unggah CV..."
        jobs = _get_active_jobs()
        assert jobs, "no active jobs"
        job_id = jobs[0]["id"]

        # Attempt quick apply for dewi (free, no CV)
        r = requests.post(f"{API}/jobs/{job_id}/quick-apply",
                          headers=H(tokens["dewi"]), data={"message": ""}, timeout=20)
        # Either 400 (no cv) or 400 (already applied). Not 500.
        assert r.status_code in (400, 403), r.text

    def test_budi_quick_apply(self, tokens):
        # ensure cv uploaded
        _upload_dummy_cv(tokens["budi"])
        # get job budi has NOT applied to
        applied = requests.get(f"{API}/candidate/applications", headers=H(tokens["budi"]), timeout=20).json()
        applied_ids = {a["job_id"] for a in (applied if isinstance(applied, list) else [])}
        jobs = _get_active_jobs()
        target = next((j for j in jobs if j["id"] not in applied_ids), None)
        if not target:
            pytest.skip("no unapplied active job available")

        q_before = requests.get(f"{API}/candidate/apply-quota", headers=H(tokens["budi"]), timeout=20).json()
        r = requests.post(f"{API}/jobs/{target['id']}/quick-apply",
                          headers=H(tokens["budi"]), data={"message": "Saya tertarik"}, timeout=20)
        assert r.status_code == 200, r.text
        app_obj = r.json()
        assert app_obj["apply_method"] == "one_click"
        assert app_obj["status"] == "terkirim"
        # quota consumed
        q_after = app_obj.get("quota") or requests.get(f"{API}/candidate/apply-quota",
                                                       headers=H(tokens["budi"]), timeout=20).json()
        assert q_after["used"] >= q_before["used"] + 1 or q_after["used"] == q_before["used"] + 1

        # duplicate → 400
        r2 = requests.post(f"{API}/jobs/{target['id']}/quick-apply",
                           headers=H(tokens["budi"]), data={"message": ""}, timeout=20)
        assert r2.status_code == 400


# ---------- 5. Saved Jobs ----------

class TestSavedJobs:
    def test_save_list_delete(self, tokens):
        jobs = _get_active_jobs()
        assert jobs
        job_id = jobs[-1]["id"]
        r = requests.post(f"{API}/candidate/saved-jobs/{job_id}", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code in (200, 201)

        r = requests.get(f"{API}/candidate/saved-jobs", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert any(x.get("id") == job_id or x.get("job_id") == job_id for x in items)

        r = requests.get(f"{API}/candidate/saved-jobs/ids", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200

        r = requests.delete(f"{API}/candidate/saved-jobs/{job_id}", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200


# ---------- 6. Job Alert ----------

class TestJobAlerts:
    def test_crud(self, tokens):
        r = requests.post(f"{API}/candidate/job-alerts", headers=H(tokens["budi"]),
                          json={"q": "Kasir", "location": "", "category": "", "job_type": ""}, timeout=20)
        assert r.status_code in (200, 201), r.text
        alert = r.json()
        aid = alert["id"]

        r = requests.get(f"{API}/candidate/job-alerts", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200
        assert any(a["id"] == aid for a in r.json())

        r = requests.delete(f"{API}/candidate/job-alerts/{aid}", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200


# ---------- 7. Applications / Timeline ----------

class TestApplications:
    def test_candidate_timeline(self, tokens):
        apps = requests.get(f"{API}/candidate/applications", headers=H(tokens["budi"]), timeout=20).json()
        if not apps:
            pytest.skip("no applications")
        aid = apps[0]["id"]
        r = requests.get(f"{API}/candidate/applications/{aid}/timeline",
                         headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200
        data = r.json()
        # timeline may be list or {history, interviews}
        assert data is not None


# ---------- 8. Applicant management, shortlist, notes, interview, history ----------

class TestCompanyApplicants:
    def test_full_flow(self, tokens, demo_company):
        # get budi's application at demo company (from seeds)
        apps = requests.get(f"{API}/company/applications", headers=H(tokens["demo"]), timeout=20).json()
        assert apps, "demo has no applications"
        budi_app = next((a for a in apps if a.get("email") == CAND_BUDI[0]), apps[0])
        aid = budi_app["id"]

        # detail should include career_profile + match
        r = requests.get(f"{API}/company/applications/{aid}", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200, r.text
        detail = r.json()
        assert "career_profile" in detail

        # update status → shortlist
        r = requests.put(f"{API}/company/applications/{aid}", headers=H(tokens["demo"]),
                         json={"status": "shortlist"}, timeout=20)
        assert r.status_code == 200

        # toggle star shortlist true
        r = requests.post(f"{API}/company/applications/{aid}/shortlist",
                          headers=H(tokens["demo"]), json={"shortlisted": True}, timeout=20)
        assert r.status_code == 200

        # add note
        r = requests.post(f"{API}/company/applications/{aid}/notes", headers=H(tokens["demo"]),
                          json={"note": "Kandidat kuat, jadwalkan interview"}, timeout=20)
        assert r.status_code == 200
        note_id = r.json()["id"]

        # get notes
        r = requests.get(f"{API}/company/applications/{aid}/notes", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200 and any(n["id"] == note_id for n in r.json())

        # history
        r = requests.get(f"{API}/company/applications/{aid}/history",
                         headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200
        assert len(r.json()) >= 1

        # create interview
        when = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        r = requests.post(f"{API}/company/applications/{aid}/interviews", headers=H(tokens["demo"]),
                         json={"scheduled_at": when, "method": "online", "link": "https://meet.example",
                               "location": "", "notes": "Interview HR"}, timeout=20)
        assert r.status_code == 200, r.text
        interview_id = r.json()["id"]

        # list interviews
        r = requests.get(f"{API}/company/interviews", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200 and any(i["id"] == interview_id for i in r.json())

        # confirm interview
        r = requests.post(f"{API}/company/interviews/{interview_id}/status",
                          headers=H(tokens["demo"]), json={"status": "confirmed"}, timeout=20)
        assert r.status_code == 200

        # shortlists list
        r = requests.get(f"{API}/company/shortlists", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200
        assert any(a["id"] == aid for a in r.json())

        # cleanup: unstar, delete note, delete interview
        requests.delete(f"{API}/company/interviews/{interview_id}",
                        headers=H(tokens["demo"]), timeout=20)
        requests.delete(f"{API}/company/applications/{aid}/notes/{note_id}",
                        headers=H(tokens["demo"]), timeout=20)
        requests.post(f"{API}/company/applications/{aid}/shortlist",
                      headers=H(tokens["demo"]), json={"shortlisted": False}, timeout=20)


# ---------- 9. Candidate search & invite ----------

class TestCandidateSearch:
    def test_search_and_invite(self, tokens, demo_company):
        # ensure budi public done in profile test; run again to be safe
        requests.put(f"{API}/candidate/career-profile", headers=H(tokens["budi"]),
                     json={"visibility": "public", "target_position": "Admin Gudang",
                           "skills": [{"name": "Excel"}, {"name": "Inventory"}]}, timeout=20)

        r = requests.get(f"{API}/company/candidates?q=Admin", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200
        results = r.json()
        # Budi should appear
        budi_hit = next((c for c in results if "budi" in c.get("name", "").lower()), None)
        if not budi_hit:
            pytest.skip("Budi not found in public search")

        # get an active demo job
        jobs = requests.get(f"{API}/company/jobs", headers=H(tokens["demo"]), timeout=20).json()
        active = next((j for j in jobs if j["status"] == "active"), None)
        if not active:
            pytest.skip("no active job at demo")

        r = requests.post(f"{API}/company/candidates/{budi_hit['user_id']}/invite",
                          headers=H(tokens["demo"]), json={"job_id": active["id"]}, timeout=20)
        # First run: 200; second run: 400 (already invited). Both acceptable — assert it doesn't 500.
        assert r.status_code in (200, 400), r.text


# ---------- 10. Stats ----------

class TestStats:
    def test_company_stats(self, tokens):
        r = requests.get(f"{API}/company/stats", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, dict)

    def test_company_job_stats(self, tokens):
        r = requests.get(f"{API}/company/job-stats", headers=H(tokens["demo"]), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- 11. Notifications ----------

class TestNotifications:
    def test_list_and_read_all(self, tokens):
        r = requests.get(f"{API}/notifications", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "unread" in d

        r = requests.get(f"{API}/notifications/unread-count", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200 and "unread" in r.json()

        r = requests.post(f"{API}/notifications/read-all", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 200


# ---------- 12. Admin career-pro ----------

class TestAdminCareerPro:
    def test_list(self, tokens):
        r = requests.get(f"{API}/admin/career-pro", headers=H(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- 13. Security ----------

class TestSecurity:
    def test_company_cannot_access_other_company_application(self, tokens):
        # get an application from Kopi (assume kopi has none → skip); use demo app id, try with kopi token
        apps = requests.get(f"{API}/company/applications", headers=H(tokens["demo"]), timeout=20).json()
        if not apps:
            pytest.skip("no apps")
        aid = apps[0]["id"]
        r = requests.get(f"{API}/company/applications/{aid}", headers=H(tokens["kopi"]), timeout=20)
        assert r.status_code == 404

    def test_candidate_cannot_search(self, tokens):
        r = requests.get(f"{API}/company/candidates", headers=H(tokens["budi"]), timeout=20)
        assert r.status_code == 403

    def test_anon_cannot_hit_admin(self):
        r = requests.get(f"{API}/admin/launch-program", timeout=20)
        assert r.status_code == 401

    def test_free_company_403_on_gated(self, tokens):
        # Register a fresh company (no active launch bypass? launch is active in autouse
        # so their plan will be launch_free too and it should NOT 403 during launch).
        # Instead: disable launch, then a non-member company should 403.
        # Save previous, set is_active False.
        prev = requests.get(f"{API}/admin/launch-program", headers=H(tokens["admin"]), timeout=20).json()["program"]
        r = requests.put(f"{API}/admin/launch-program", headers=H(tokens["admin"]),
                         json={"start_date": prev["start_date"], "end_date": prev["end_date"],
                               "is_active": False}, timeout=20)
        assert r.status_code == 200
        try:
            r = requests.get(f"{API}/company/shortlists", headers=H(tokens["demo"]), timeout=20)
            assert r.status_code == 403
        finally:
            requests.put(f"{API}/admin/launch-program", headers=H(tokens["admin"]),
                         json={"start_date": prev["start_date"], "end_date": prev["end_date"],
                               "is_active": True}, timeout=20)
