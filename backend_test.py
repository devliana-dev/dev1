#!/usr/bin/env python3
"""
Backend API Testing for CirebonKarir Homepage Public Endpoints
Tests all public APIs used by the new homepage
"""

import requests
import sys
import json

# Backend URL from frontend/.env
BACKEND_URL = "https://042058c7-b101-4d70-9089-5574b7d231cb.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

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

def test_root_endpoint():
    """Test GET /api"""
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                log_test("GET /api", True, f"Response: {data}")
                return True
            else:
                log_test("GET /api", False, f"Missing 'message' field in response: {data}")
                return False
        else:
            log_test("GET /api", False, f"Status code: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api", False, f"Exception: {str(e)}")
        return False

def test_meta_endpoint():
    """Test GET /api/meta"""
    try:
        response = requests.get(f"{API_BASE}/meta", timeout=10)
        if response.status_code != 200:
            log_test("GET /api/meta - Status Code", False, f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Check required fields
        required_fields = ["locations", "job_types", "education_levels", "categories", "stats"]
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            log_test("GET /api/meta - Required Fields", False, f"Missing fields: {missing_fields}")
            return False
        
        # Check locations includes required cities
        required_locations = ["Kota Cirebon", "Majalengka", "Kuningan", "Indramayu"]
        locations = data.get("locations", [])
        missing_locations = [loc for loc in required_locations if loc not in locations]
        if missing_locations:
            log_test("GET /api/meta - Locations", False, f"Missing locations: {missing_locations}. Got: {locations}")
            return False
        
        # Check categories is non-empty array
        categories = data.get("categories", [])
        if not isinstance(categories, list) or len(categories) == 0:
            log_test("GET /api/meta - Categories", False, f"Categories should be non-empty array, got: {categories}")
            return False
        
        # Check stats structure
        stats = data.get("stats", {})
        if "active_jobs" not in stats or "companies" not in stats:
            log_test("GET /api/meta - Stats", False, f"Stats missing required fields. Got: {stats}")
            return False
        
        log_test("GET /api/meta", True, f"All checks passed. Stats: {stats}, Categories count: {len(categories)}")
        return True
        
    except Exception as e:
        log_test("GET /api/meta", False, f"Exception: {str(e)}")
        return False

def test_jobs_endpoint():
    """Test GET /api/jobs?limit=10"""
    try:
        response = requests.get(f"{API_BASE}/jobs?limit=10", timeout=10)
        if response.status_code != 200:
            log_test("GET /api/jobs?limit=10 - Status Code", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return False
        
        data = response.json()
        
        # Check items field exists
        if "items" not in data:
            log_test("GET /api/jobs?limit=10 - Items Field", False, f"Missing 'items' field in response: {data}")
            return False
        
        items = data.get("items", [])
        
        # Items can be empty or less than 10 if limited data
        if not isinstance(items, list):
            log_test("GET /api/jobs?limit=10 - Items Type", False, f"Items should be array, got: {type(items)}")
            return False
        
        # If there are items, check required fields
        if len(items) > 0:
            required_fields = ["id", "title", "slug", "company_name", "company_logo", "company_verified", 
                             "location", "job_type", "education", "experience", "category", "created_at", "employer_type"]
            
            first_item = items[0]
            missing_fields = [f for f in required_fields if f not in first_item]
            if missing_fields:
                log_test("GET /api/jobs?limit=10 - Item Fields", False, f"First item missing fields: {missing_fields}. Item: {first_item}")
                return False
        
        log_test("GET /api/jobs?limit=10", True, f"Returned {len(items)} items. All checks passed.")
        return True
        
    except Exception as e:
        log_test("GET /api/jobs?limit=10", False, f"Exception: {str(e)}")
        return False

def test_jobs_umkm_endpoint():
    """Test GET /api/jobs?employer_type=umkm&limit=5"""
    try:
        response = requests.get(f"{API_BASE}/jobs?employer_type=umkm&limit=5", timeout=10)
        if response.status_code != 200:
            log_test("GET /api/jobs?employer_type=umkm - Status Code", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return False
        
        data = response.json()
        
        # Check items field exists
        if "items" not in data:
            log_test("GET /api/jobs?employer_type=umkm - Items Field", False, f"Missing 'items' field in response: {data}")
            return False
        
        items = data.get("items", [])
        
        # Items can be empty if no UMKM jobs
        if not isinstance(items, list):
            log_test("GET /api/jobs?employer_type=umkm - Items Type", False, f"Items should be array, got: {type(items)}")
            return False
        
        # If there are items, verify all have employer_type="umkm"
        if len(items) > 0:
            non_umkm = [item for item in items if item.get("employer_type") != "umkm"]
            if non_umkm:
                log_test("GET /api/jobs?employer_type=umkm - Filter", False, f"Found {len(non_umkm)} non-UMKM items: {non_umkm}")
                return False
        
        log_test("GET /api/jobs?employer_type=umkm", True, f"Returned {len(items)} UMKM jobs. All checks passed.")
        return True
        
    except Exception as e:
        log_test("GET /api/jobs?employer_type=umkm", False, f"Exception: {str(e)}")
        return False

def test_companies_endpoint():
    """Test GET /api/companies"""
    try:
        response = requests.get(f"{API_BASE}/companies", timeout=10)
        if response.status_code != 200:
            log_test("GET /api/companies - Status Code", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return False
        
        data = response.json()
        
        # Should return array
        if not isinstance(data, list):
            log_test("GET /api/companies - Response Type", False, f"Expected array, got: {type(data)}")
            return False
        
        # If there are companies, check required fields
        if len(data) > 0:
            required_fields = ["id", "name", "slug", "logo", "status", "active_jobs"]
            
            first_company = data[0]
            missing_fields = [f for f in required_fields if f not in first_company]
            if missing_fields:
                log_test("GET /api/companies - Company Fields", False, f"First company missing fields: {missing_fields}. Company: {first_company}")
                return False
            
            # All companies should have status="verified"
            non_verified = [c for c in data if c.get("status") != "verified"]
            if non_verified:
                log_test("GET /api/companies - Verified Status", False, f"Found {len(non_verified)} non-verified companies: {non_verified}")
                return False
            
            # active_jobs should be a number
            if not isinstance(first_company.get("active_jobs"), (int, float)):
                log_test("GET /api/companies - Active Jobs Type", False, f"active_jobs should be number, got: {type(first_company.get('active_jobs'))}")
                return False
        
        log_test("GET /api/companies", True, f"Returned {len(data)} verified companies. All checks passed.")
        return True
        
    except Exception as e:
        log_test("GET /api/companies", False, f"Exception: {str(e)}")
        return False

def test_blog_endpoint():
    """Test GET /api/blog?limit=3"""
    try:
        response = requests.get(f"{API_BASE}/blog?limit=3", timeout=10)
        if response.status_code != 200:
            log_test("GET /api/blog?limit=3 - Status Code", False, f"Expected 200, got {response.status_code}. Response: {response.text}")
            return False
        
        data = response.json()
        
        # Should return array
        if not isinstance(data, list):
            log_test("GET /api/blog?limit=3 - Response Type", False, f"Expected array, got: {type(data)}")
            return False
        
        # Should return max 3 posts
        if len(data) > 3:
            log_test("GET /api/blog?limit=3 - Limit", False, f"Expected max 3 posts, got {len(data)}")
            return False
        
        # If there are posts, check required fields
        if len(data) > 0:
            required_fields = ["title", "slug"]
            
            first_post = data[0]
            missing_fields = [f for f in required_fields if f not in first_post]
            if missing_fields:
                log_test("GET /api/blog?limit=3 - Post Fields", False, f"First post missing fields: {missing_fields}. Post: {first_post}")
                return False
        
        log_test("GET /api/blog?limit=3", True, f"Returned {len(data)} blog posts. All checks passed.")
        return True
        
    except Exception as e:
        log_test("GET /api/blog?limit=3", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("CirebonKarir Backend API Testing - Homepage Public Endpoints")
    print("=" * 80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print("=" * 80)
    print()
    
    # Run all tests
    test_root_endpoint()
    print()
    test_meta_endpoint()
    print()
    test_jobs_endpoint()
    print()
    test_jobs_umkm_endpoint()
    print()
    test_companies_endpoint()
    print()
    test_blog_endpoint()
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
