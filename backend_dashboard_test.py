#!/usr/bin/env python3
"""
Backend API Testing for CirebonKarir Dashboard Endpoints
Tests candidate and company dashboard APIs
"""

import requests
import sys
import json

# Backend URL from frontend/.env
BACKEND_URL = "https://cirebon-karir-home.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials from /app/memory/test_credentials.md
CANDIDATE_EMAIL = "budi.demo@cirebonkarir.id"
CANDIDATE_PASSWORD = "password123"

COMPANY_EMAIL = "demo@umkm.com"
COMPANY_PASSWORD = "password123"

# Test results tracking
test_results = []
failed_tests = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {"name": name, "passed": passed, "details": details}
    test_results.append(result)
    if not passed:
        failed_tests.append(result)
    print(f"{status}: {name}")
    if details:
        print(f"   Details: {details}")

def test_candidate_login():
    """Test candidate login and get token"""
    try:
        response = requests.post(f"{API_BASE}/auth/login", 
                                json={"email": CANDIDATE_EMAIL, "password": CANDIDATE_PASSWORD},
                                timeout=10)
        if response.status_code != 200:
            log_test("Candidate Login", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
        
        data = response.json()
        if "token" not in data or "user" not in data:
            log_test("Candidate Login", False, f"Missing token or user in response: {data}")
            return None
        
        log_test("Candidate Login", True, f"Token received, user: {data['user'].get('name')}")
        return data["token"]
    except Exception as e:
        log_test("Candidate Login", False, f"Exception: {str(e)}")
        return None

def test_company_login():
    """Test company login and get token"""
    try:
        response = requests.post(f"{API_BASE}/auth/login",
                                json={"email": COMPANY_EMAIL, "password": COMPANY_PASSWORD},
                                timeout=10)
        if response.status_code != 200:
            log_test("Company Login", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
        
        data = response.json()
        if "token" not in data or "user" not in data:
            log_test("Company Login", False, f"Missing token or user in response: {data}")
            return None
        
        log_test("Company Login", True, f"Token received, user: {data['user'].get('name')}")
        return data["token"]
    except Exception as e:
        log_test("Company Login", False, f"Exception: {str(e)}")
        return None

def test_wrong_password():
    """Test login with wrong password should return 400/401"""
    try:
        response = requests.post(f"{API_BASE}/auth/login",
                                json={"email": CANDIDATE_EMAIL, "password": "wrongpassword"},
                                timeout=10)
        if response.status_code in [400, 401]:
            log_test("Login with Wrong Password", True, f"Correctly returned {response.status_code}")
            return True
        else:
            log_test("Login with Wrong Password", False, 
                    f"Expected 400/401, got {response.status_code}. Response: {response.text}")
            return False
    except Exception as e:
        log_test("Login with Wrong Password", False, f"Exception: {str(e)}")
        return False

def test_candidate_auth_me(token):
    """Test GET /api/auth/me for candidate"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/auth/me (Candidate)", False, 
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        user = data.get("user", {})
        
        if "name" not in user:
            log_test("GET /api/auth/me (Candidate)", False, f"Missing 'name' field: {data}")
            return False
        
        if user.get("role") != "candidate":
            log_test("GET /api/auth/me (Candidate)", False, 
                    f"Expected role='candidate', got '{user.get('role')}'")
            return False
        
        log_test("GET /api/auth/me (Candidate)", True, 
                f"name={user['name']}, role={user['role']}")
        return True
    except Exception as e:
        log_test("GET /api/auth/me (Candidate)", False, f"Exception: {str(e)}")
        return False

def test_candidate_stats(token):
    """Test GET /api/candidate/stats"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/candidate/stats", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/candidate/stats", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        required_fields = ["total", "diproses", "interview", "ditolak", "diterima"]
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            log_test("GET /api/candidate/stats", False, f"Missing fields: {missing}. Got: {data}")
            return False
        
        log_test("GET /api/candidate/stats", True, f"Stats: {data}")
        return True
    except Exception as e:
        log_test("GET /api/candidate/stats", False, f"Exception: {str(e)}")
        return False

def test_candidate_applications(token):
    """Test GET /api/candidate/applications"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/candidate/applications", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/candidate/applications", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        if not isinstance(data, list):
            log_test("GET /api/candidate/applications", False, 
                    f"Expected array, got {type(data)}")
            return False
        
        log_test("GET /api/candidate/applications", True, 
                f"Returned {len(data)} applications")
        return True
    except Exception as e:
        log_test("GET /api/candidate/applications", False, f"Exception: {str(e)}")
        return False

def test_candidate_career_profile(token):
    """Test GET /api/candidate/career-profile"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/candidate/career-profile", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/candidate/career-profile", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        
        # Check profile exists
        profile = data.get("profile", {})
        if not profile:
            log_test("GET /api/candidate/career-profile", False,
                    f"Missing 'profile' field. Got: {data}")
            return False
        
        # Check education is list of objects with 'level' key
        education = profile.get("education", [])
        if not isinstance(education, list):
            log_test("GET /api/candidate/career-profile", False,
                    f"education should be list, got {type(education)}")
            return False
        
        if len(education) > 0:
            if not isinstance(education[0], dict) or "level" not in education[0]:
                log_test("GET /api/candidate/career-profile", False,
                        f"education items should be objects with 'level' key. Got: {education[0]}")
                return False
        
        # Check skills is list of objects with 'name' key
        skills = profile.get("skills", [])
        if not isinstance(skills, list):
            log_test("GET /api/candidate/career-profile", False,
                    f"skills should be list, got {type(skills)}")
            return False
        
        if len(skills) > 0:
            if not isinstance(skills[0], dict) or "name" not in skills[0]:
                log_test("GET /api/candidate/career-profile", False,
                        f"skills items should be objects with 'name' key. Got: {skills[0]}")
                return False
        
        log_test("GET /api/candidate/career-profile", True,
                f"education={len(education)} items (with 'level' key), skills={len(skills)} items (with 'name' key)")
        return True
    except Exception as e:
        log_test("GET /api/candidate/career-profile", False, f"Exception: {str(e)}")
        return False

def test_candidate_recommendations(token):
    """Test GET /api/candidate/recommendations - MUST NOT 500"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/candidate/recommendations", headers=headers, timeout=10)
        
        if response.status_code == 500:
            log_test("GET /api/candidate/recommendations", False,
                    f"CRITICAL: Returned 500 error. Response: {response.text}")
            return False
        
        if response.status_code != 200:
            log_test("GET /api/candidate/recommendations", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        if not isinstance(data, list):
            log_test("GET /api/candidate/recommendations", False,
                    f"Expected array, got {type(data)}")
            return False
        
        # Check if items have match.score
        if len(data) > 0:
            first_item = data[0]
            if "match" not in first_item or "score" not in first_item.get("match", {}):
                log_test("GET /api/candidate/recommendations", False,
                        f"Items should have match.score. Got: {first_item}")
                return False
        
        log_test("GET /api/candidate/recommendations", True,
                f"Returned {len(data)} recommendations with match scores")
        return True
    except Exception as e:
        log_test("GET /api/candidate/recommendations", False, f"Exception: {str(e)}")
        return False

def test_candidate_apply_quota(token):
    """Test GET /api/candidate/apply-quota"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/candidate/apply-quota", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/candidate/apply-quota", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        
        # Check required fields
        if data.get("plan") != "career_pro":
            log_test("GET /api/candidate/apply-quota", False,
                    f"Expected plan='career_pro', got '{data.get('plan')}'")
            return False
        
        if data.get("limit") != 30:
            log_test("GET /api/candidate/apply-quota", False,
                    f"Expected limit=30, got {data.get('limit')}")
            return False
        
        if "used" not in data or "remaining" not in data:
            log_test("GET /api/candidate/apply-quota", False,
                    f"Missing 'used' or 'remaining' fields. Got: {data}")
            return False
        
        log_test("GET /api/candidate/apply-quota", True,
                f"plan={data['plan']}, limit={data['limit']}, used={data['used']}, remaining={data['remaining']}")
        return True
    except Exception as e:
        log_test("GET /api/candidate/apply-quota", False, f"Exception: {str(e)}")
        return False

def test_cv_professional_status(token):
    """Test GET /api/cv-professional/status"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/cv-professional/status", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/cv-professional/status", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        
        if not data.get("has_access"):
            log_test("GET /api/cv-professional/status", False,
                    f"Expected has_access=true, got {data.get('has_access')}")
            return False
        
        subscription = data.get("subscription", {})
        if "expires_at" not in subscription:
            log_test("GET /api/cv-professional/status", False,
                    f"Missing subscription.expires_at. Got: {data}")
            return False
        
        log_test("GET /api/cv-professional/status", True,
                f"has_access=true, expires_at={subscription['expires_at']}")
        return True
    except Exception as e:
        log_test("GET /api/cv-professional/status", False, f"Exception: {str(e)}")
        return False

def test_referral_me(token):
    """Test GET /api/referral/me"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/referral/me", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/referral/me", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        
        if "code" not in data:
            log_test("GET /api/referral/me", False, f"Missing 'code' field. Got: {data}")
            return False
        
        # Check for conversions and wallet/commission data
        required_fields = ["code", "conversions"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            log_test("GET /api/referral/me", False, f"Missing fields: {missing}. Got: {data}")
            return False
        
        log_test("GET /api/referral/me", True,
                f"code={data['code']}, conversions={data.get('conversions', 0)}")
        return True
    except Exception as e:
        log_test("GET /api/referral/me", False, f"Exception: {str(e)}")
        return False

def test_candidate_saved_jobs_ids(token):
    """Test GET /api/candidate/saved-jobs/ids"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/candidate/saved-jobs/ids", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/candidate/saved-jobs/ids", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        if not isinstance(data, list):
            log_test("GET /api/candidate/saved-jobs/ids", False,
                    f"Expected array, got {type(data)}")
            return False
        
        log_test("GET /api/candidate/saved-jobs/ids", True, f"Returned {len(data)} saved job IDs")
        return True
    except Exception as e:
        log_test("GET /api/candidate/saved-jobs/ids", False, f"Exception: {str(e)}")
        return False

def test_company_auth_me(token):
    """Test GET /api/auth/me for company"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/auth/me (Company)", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        user = data.get("user", {})
        
        if user.get("role") != "company":
            log_test("GET /api/auth/me (Company)", False,
                    f"Expected role='company', got '{user.get('role')}'")
            return False
        
        if "company" not in data:
            log_test("GET /api/auth/me (Company)", False,
                    f"Missing 'company' field in response")
            return False
        
        log_test("GET /api/auth/me (Company)", True,
                f"role={user['role']}, company={data['company'].get('name')}")
        return True
    except Exception as e:
        log_test("GET /api/auth/me (Company)", False, f"Exception: {str(e)}")
        return False

def test_company_stats(token):
    """Test GET /api/company/stats"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/company/stats", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/company/stats", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        required_fields = ["active_jobs", "total_applicants", "new_applicants", "interview", "company_name"]
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            log_test("GET /api/company/stats", False, f"Missing fields: {missing}. Got: {data}")
            return False
        
        log_test("GET /api/company/stats", True,
                f"active_jobs={data['active_jobs']}, total_applicants={data['total_applicants']}, "
                f"new_applicants={data['new_applicants']}, interview={data['interview']}, "
                f"company_name={data['company_name']}")
        return True
    except Exception as e:
        log_test("GET /api/company/stats", False, f"Exception: {str(e)}")
        return False

def test_company_entitlement(token):
    """Test GET /api/company/entitlement"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/company/entitlement", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/company/entitlement", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        required_fields = ["is_member", "mode"]
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            log_test("GET /api/company/entitlement", False, f"Missing fields: {missing}. Got: {data}")
            return False
        
        plan = data.get("plan", {})
        if "plan_type" not in plan:
            log_test("GET /api/company/entitlement", False,
                    f"Missing plan.plan_type. Got: {data}")
            return False
        
        log_test("GET /api/company/entitlement", True,
                f"is_member={data['is_member']}, plan.plan_type={plan['plan_type']}, mode={data['mode']}")
        return True
    except Exception as e:
        log_test("GET /api/company/entitlement", False, f"Exception: {str(e)}")
        return False

def test_company_jobs(token):
    """Test GET /api/company/jobs"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/company/jobs", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/company/jobs", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        if not isinstance(data, list):
            log_test("GET /api/company/jobs", False, f"Expected array, got {type(data)}")
            return False
        
        # Check required fields if there are jobs
        if len(data) > 0:
            first_job = data[0]
            required_fields = ["title", "status", "created_at"]
            missing = [f for f in required_fields if f not in first_job]
            
            if missing:
                log_test("GET /api/company/jobs", False,
                        f"Missing fields in job: {missing}. Got: {first_job}")
                return False
        
        log_test("GET /api/company/jobs", True, f"Returned {len(data)} jobs")
        return True
    except Exception as e:
        log_test("GET /api/company/jobs", False, f"Exception: {str(e)}")
        return False

def test_company_applications(token):
    """Test GET /api/company/applications"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/company/applications", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/company/applications", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            return False
        
        data = response.json()
        if not isinstance(data, list):
            log_test("GET /api/company/applications", False, f"Expected array, got {type(data)}")
            return False
        
        # Check required fields if there are applications
        if len(data) > 0:
            first_app = data[0]
            required_fields = ["name", "job_title", "status", "created_at"]
            missing = [f for f in required_fields if f not in first_app]
            
            if missing:
                log_test("GET /api/company/applications", False,
                        f"Missing fields in application: {missing}. Got: {first_app}")
                return False
        
        log_test("GET /api/company/applications", True, f"Returned {len(data)} applications")
        return True
    except Exception as e:
        log_test("GET /api/company/applications", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("CirebonKarir Backend API Testing - Dashboard Endpoints")
    print("=" * 80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print("=" * 80)
    print()
    
    # Test wrong password first
    print("=== AUTH TESTS ===")
    test_wrong_password()
    print()
    
    # Test candidate endpoints
    print("=== CANDIDATE DASHBOARD TESTS ===")
    candidate_token = test_candidate_login()
    print()
    
    if candidate_token:
        test_candidate_auth_me(candidate_token)
        print()
        test_candidate_stats(candidate_token)
        print()
        test_candidate_applications(candidate_token)
        print()
        test_candidate_career_profile(candidate_token)
        print()
        test_candidate_recommendations(candidate_token)
        print()
        test_candidate_apply_quota(candidate_token)
        print()
        test_cv_professional_status(candidate_token)
        print()
        test_referral_me(candidate_token)
        print()
        test_candidate_saved_jobs_ids(candidate_token)
        print()
    else:
        print("⚠️  Skipping candidate tests due to login failure")
        print()
    
    # Test company endpoints
    print("=== COMPANY DASHBOARD TESTS ===")
    company_token = test_company_login()
    print()
    
    if company_token:
        test_company_auth_me(company_token)
        print()
        test_company_stats(company_token)
        print()
        test_company_entitlement(company_token)
        print()
        test_company_jobs(company_token)
        print()
        test_company_applications(company_token)
        print()
    else:
        print("⚠️  Skipping company tests due to login failure")
        print()
    
    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    total_tests = len(test_results)
    passed_tests = sum(1 for t in test_results if t["passed"])
    failed_count = len(failed_tests)
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_count}")
    print()
    
    if failed_tests:
        print("FAILED TESTS:")
        for test in failed_tests:
            print(f"  ❌ {test['name']}")
            print(f"     {test['details']}")
        print()
        sys.exit(1)
    else:
        print("✅ ALL TESTS PASSED!")
        sys.exit(0)

if __name__ == "__main__":
    main()
