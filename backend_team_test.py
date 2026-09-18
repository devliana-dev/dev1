#!/usr/bin/env python3
"""
Backend Team & Access Feature Test
Tests all CRUD operations for company team management
"""

import requests
import json
import sys
from typing import Dict, Optional

# Backend URL from environment
BACKEND_URL = "https://cirebon-karir-home.preview.emergentagent.com/api"

# Test credentials
OWNER_EMAIL = "demo@umkm.com"
OWNER_PASSWORD = "password123"

# Test data
TEST_RECRUITER = {
    "name": "Rina Melati",
    "email": "rina.team@umkm.com",
    "password": "password123",
    "role": "recruiter"
}

TEST_ADMIN = {
    "name": "Andi Admin",
    "email": "andi.team@umkm.com",
    "password": "password123",
    "role": "admin"
}

TEST_RECRUITER_2 = {
    "name": "Sari Recruiter",
    "email": "sari.team@umkm.com",
    "password": "password123",
    "role": "recruiter"
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_test(step: int, description: str):
    print(f"\n{Colors.BLUE}[STEP {step}]{Colors.END} {description}")

def log_success(message: str):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def log_error(message: str):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def log_info(message: str):
    print(f"{Colors.YELLOW}ℹ️  {message}{Colors.END}")

def login(email: str, password: str) -> Optional[str]:
    """Login and return token"""
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            log_success(f"Login successful: {email}")
            return token
        else:
            log_error(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        log_error(f"Login exception: {str(e)}")
        return None

def test_get_team(token: str, step: int) -> tuple:
    """Test GET /api/company/team"""
    log_test(step, "GET /api/company/team → list anggota tim")
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/company/team",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        log_info(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_info(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
            
            # Verify it's an array
            if not isinstance(data, list):
                log_error("Response is not an array")
                return None, None
            
            # Verify first member is owner
            if len(data) > 0:
                first_member = data[0]
                if first_member.get("is_owner") == True:
                    log_success(f"✅ First member is owner: {first_member.get('name')} (is_owner=true, company_role={first_member.get('company_role')})")
                    owner_email = first_member.get("email")
                    owner_id = first_member.get("id")
                    log_info(f"Owner email: {owner_email}")
                    log_info(f"Owner ID: {owner_id}")
                    return owner_email, owner_id
                else:
                    log_error(f"First member is not owner: {first_member}")
                    return None, None
            else:
                log_error("Team list is empty")
                return None, None
        else:
            log_error(f"Failed: {response.status_code} - {response.text}")
            return None, None
            
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        return None, None

def test_add_member(token: str, member_data: dict, step: int) -> Optional[str]:
    """Test POST /api/company/team"""
    log_test(step, f"POST /api/company/team → tambah anggota {member_data['name']} ({member_data['role']})")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/company/team",
            headers={"Authorization": f"Bearer {token}"},
            json=member_data,
            timeout=10
        )
        
        log_info(f"Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            log_info(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
            
            member_id = data.get("id")
            company_role = data.get("company_role")
            
            if member_id and company_role == member_data["role"]:
                log_success(f"✅ Member added: id={member_id}, company_role={company_role}")
                return member_id
            else:
                log_error(f"Invalid response: {data}")
                return None
        else:
            log_error(f"Failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        return None

def test_add_duplicate(token: str, email: str, step: int) -> bool:
    """Test POST /api/company/team with duplicate email"""
    log_test(step, f"POST /api/company/team dengan email DUPLIKAT ({email}) → harus 400")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/company/team",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Duplicate Test",
                "email": email,
                "password": "password123",
                "role": "recruiter"
            },
            timeout=10
        )
        
        log_info(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            log_success(f"✅ Correctly returned 400 for duplicate email")
            log_info(f"Response: {response.text}")
            return True
        else:
            log_error(f"Expected 400, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        return False

def test_update_role(token: str, member_id: str, new_role: str, step: int, should_succeed: bool = True) -> bool:
    """Test PUT /api/company/team/{id}"""
    log_test(step, f"PUT /api/company/team/{member_id} → ubah role ke {new_role}")
    
    try:
        response = requests.put(
            f"{BACKEND_URL}/company/team/{member_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": new_role},
            timeout=10
        )
        
        log_info(f"Status: {response.status_code}")
        
        if should_succeed:
            if response.status_code == 200:
                data = response.json()
                log_info(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
                if data.get("company_role") == new_role:
                    log_success(f"✅ Role updated to {new_role}")
                    return True
                else:
                    log_error(f"Role not updated correctly: {data}")
                    return False
            else:
                log_error(f"Failed: {response.status_code} - {response.text}")
                return False
        else:
            if response.status_code == 400:
                log_success(f"✅ Correctly returned 400 (operation not allowed)")
                log_info(f"Response: {response.text}")
                return True
            else:
                log_error(f"Expected 400, got {response.status_code}: {response.text}")
                return False
            
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        return False

def test_delete_member(token: str, member_id: str, step: int, should_succeed: bool = True) -> bool:
    """Test DELETE /api/company/team/{id}"""
    log_test(step, f"DELETE /api/company/team/{member_id}")
    
    try:
        response = requests.delete(
            f"{BACKEND_URL}/company/team/{member_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        log_info(f"Status: {response.status_code}")
        
        if should_succeed:
            if response.status_code == 200:
                data = response.json()
                log_info(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
                if data.get("ok") == True:
                    log_success(f"✅ Member deleted successfully")
                    return True
                else:
                    log_error(f"Unexpected response: {data}")
                    return False
            else:
                log_error(f"Failed: {response.status_code} - {response.text}")
                return False
        else:
            if response.status_code == 400:
                log_success(f"✅ Correctly returned 400 (operation not allowed)")
                log_info(f"Response: {response.text}")
                return True
            else:
                log_error(f"Expected 400, got {response.status_code}: {response.text}")
                return False
            
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        return False

def test_member_login_and_stats(email: str, password: str, step: int) -> bool:
    """Test login as member and access company stats"""
    log_test(step, f"LOGIN sebagai anggota ({email}) → lalu GET /api/company/stats")
    
    # Login
    token = login(email, password)
    if not token:
        log_error("Login failed")
        return False
    
    # Get company stats
    try:
        response = requests.get(
            f"{BACKEND_URL}/company/stats",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        log_info(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_info(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
            
            company_name = data.get("company_name")
            if company_name == "Toko Sembako Barokah":
                log_success(f"✅ Company stats accessible, company_name={company_name}")
                return True
            else:
                log_error(f"Unexpected company_name: {company_name}")
                return False
        else:
            log_error(f"Failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        return False

def test_admin_permissions(email: str, password: str, step: int) -> bool:
    """Test admin permissions"""
    log_test(step, f"Dengan token admin ({email}): GET /api/company/team → 200, POST /api/company/team → 200")
    
    # Login
    token = login(email, password)
    if not token:
        log_error("Login failed")
        return False
    
    # Test GET /api/company/team
    try:
        response = requests.get(
            f"{BACKEND_URL}/company/team",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        log_info(f"GET /api/company/team Status: {response.status_code}")
        
        if response.status_code != 200:
            log_error(f"GET failed: {response.status_code} - {response.text}")
            return False
        
        log_success("✅ Admin can view team")
        
    except Exception as e:
        log_error(f"GET Exception: {str(e)}")
        return False
    
    # Test POST /api/company/team (add a test member)
    try:
        test_member = {
            "name": "Test Member Admin",
            "email": f"test.admin.{int(requests.get(f'{BACKEND_URL}/meta').json()['stats']['active_jobs'])}@umkm.com",
            "password": "password123",
            "role": "recruiter"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/company/team",
            headers={"Authorization": f"Bearer {token}"},
            json=test_member,
            timeout=10
        )
        
        log_info(f"POST /api/company/team Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            test_member_id = data.get("id")
            log_success(f"✅ Admin can add team member (id={test_member_id})")
            
            # Clean up: delete the test member
            requests.delete(
                f"{BACKEND_URL}/company/team/{test_member_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            log_info("Test member cleaned up")
            
            return True
        else:
            log_error(f"POST failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        log_error(f"POST Exception: {str(e)}")
        return False

def test_recruiter_permissions(email: str, password: str, step: int) -> tuple:
    """Test recruiter permissions (should get 403)"""
    log_test(step, f"Dengan token recruiter ({email}): GET /api/company/team → 403, POST /api/company/team → 403")
    
    # Login
    token = login(email, password)
    if not token:
        log_error("Login failed")
        return False, None
    
    success = True
    
    # Test GET /api/company/team (should be 403)
    try:
        response = requests.get(
            f"{BACKEND_URL}/company/team",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        log_info(f"GET /api/company/team Status: {response.status_code}")
        
        if response.status_code == 403:
            log_success("✅ Recruiter correctly denied access to view team (403)")
        else:
            log_error(f"Expected 403, got {response.status_code}: {response.text}")
            success = False
            
    except Exception as e:
        log_error(f"GET Exception: {str(e)}")
        success = False
    
    # Test POST /api/company/team (should be 403)
    try:
        test_member = {
            "name": "Test Member Recruiter",
            "email": "test.recruiter@umkm.com",
            "password": "password123",
            "role": "recruiter"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/company/team",
            headers={"Authorization": f"Bearer {token}"},
            json=test_member,
            timeout=10
        )
        
        log_info(f"POST /api/company/team Status: {response.status_code}")
        
        if response.status_code == 403:
            log_success("✅ Recruiter correctly denied access to add team member (403)")
        else:
            log_error(f"Expected 403, got {response.status_code}: {response.text}")
            success = False
            
    except Exception as e:
        log_error(f"POST Exception: {str(e)}")
        success = False
    
    return success, token

def main():
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}Backend Team & Access Feature Test{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    
    results = []
    
    # Login as owner
    print(f"\n{Colors.YELLOW}[SETUP] Login as owner{Colors.END}")
    owner_token = login(OWNER_EMAIL, OWNER_PASSWORD)
    if not owner_token:
        log_error("Failed to login as owner. Aborting tests.")
        sys.exit(1)
    
    # Step 1: GET /api/company/team
    owner_email, owner_id = test_get_team(owner_token, 1)
    results.append(("Step 1: GET /api/company/team", owner_email is not None))
    
    # Step 2: POST /api/company/team (add recruiter)
    rina_id = test_add_member(owner_token, TEST_RECRUITER, 2)
    results.append(("Step 2: POST /api/company/team (recruiter)", rina_id is not None))
    
    # Step 3: POST /api/company/team (add admin)
    andi_id = test_add_member(owner_token, TEST_ADMIN, 3)
    results.append(("Step 3: POST /api/company/team (admin)", andi_id is not None))
    
    # Step 4: POST duplicate email
    duplicate_result = test_add_duplicate(owner_token, TEST_RECRUITER["email"], 4)
    results.append(("Step 4: POST duplicate email → 400", duplicate_result))
    
    # Step 5: PUT /api/company/team/{rina_id} (change role to admin)
    if rina_id:
        update_result = test_update_role(owner_token, rina_id, "admin", 5, should_succeed=True)
        results.append(("Step 5: PUT /api/company/team/{rina_id} → admin", update_result))
    else:
        results.append(("Step 5: PUT /api/company/team/{rina_id} → admin", False))
    
    # Step 6: PUT /api/company/team/{owner_id} (should fail)
    if owner_id:
        update_owner_result = test_update_role(owner_token, owner_id, "recruiter", 6, should_succeed=False)
        results.append(("Step 6: PUT /api/company/team/{owner_id} → 400", update_owner_result))
    else:
        results.append(("Step 6: PUT /api/company/team/{owner_id} → 400", False))
    
    # Step 7: PUT /api/company/team/{self} (should fail)
    # Get current user ID from token
    try:
        me_response = requests.get(
            f"{BACKEND_URL}/auth/me",
            headers={"Authorization": f"Bearer {owner_token}"},
            timeout=10
        )
        if me_response.status_code == 200:
            current_user_id = me_response.json().get("id")
            update_self_result = test_update_role(owner_token, current_user_id, "recruiter", 7, should_succeed=False)
            results.append(("Step 7: PUT /api/company/team/{self} → 400", update_self_result))
        else:
            results.append(("Step 7: PUT /api/company/team/{self} → 400", False))
    except:
        results.append(("Step 7: PUT /api/company/team/{self} → 400", False))
    
    # Step 8: DELETE /api/company/team/{owner_id} (should fail)
    if owner_id:
        delete_owner_result = test_delete_member(owner_token, owner_id, 8, should_succeed=False)
        results.append(("Step 8: DELETE /api/company/team/{owner_id} → 400", delete_owner_result))
    else:
        results.append(("Step 8: DELETE /api/company/team/{owner_id} → 400", False))
    
    # Step 9: DELETE /api/company/team/{rina_id}
    if rina_id:
        delete_rina_result = test_delete_member(owner_token, rina_id, 9, should_succeed=True)
        results.append(("Step 9: DELETE /api/company/team/{rina_id} → 200", delete_rina_result))
    else:
        results.append(("Step 9: DELETE /api/company/team/{rina_id} → 200", False))
    
    # Step 10: LOGIN as admin member
    if andi_id:
        login_result = test_member_login_and_stats(TEST_ADMIN["email"], TEST_ADMIN["password"], 10)
        results.append(("Step 10: LOGIN as admin + GET /api/company/stats", login_result))
    else:
        results.append(("Step 10: LOGIN as admin + GET /api/company/stats", False))
    
    # Step 11: Already tested in step 10
    results.append(("Step 11: GET /api/company/stats with admin token", results[-1][1]))
    
    # Step 12: Test admin permissions
    if andi_id:
        admin_perm_result = test_admin_permissions(TEST_ADMIN["email"], TEST_ADMIN["password"], 12)
        results.append(("Step 12: Admin permissions (GET + POST team)", admin_perm_result))
    else:
        results.append(("Step 12: Admin permissions (GET + POST team)", False))
    
    # Step 13: Test recruiter permissions
    # First add a recruiter
    sari_id = test_add_member(owner_token, TEST_RECRUITER_2, 13)
    if sari_id:
        recruiter_perm_result, sari_token = test_recruiter_permissions(TEST_RECRUITER_2["email"], TEST_RECRUITER_2["password"], 13)
        results.append(("Step 13: Recruiter permissions → 403", recruiter_perm_result))
        
        # Delete sari with owner token
        if sari_token:
            log_info("Cleaning up: deleting Sari Recruiter")
            test_delete_member(owner_token, sari_id, 13, should_succeed=True)
    else:
        results.append(("Step 13: Recruiter permissions → 403", False))
    
    # Step 14: Cleanup - verify only owner + andi remain
    log_test(14, "Bersihkan: pastikan hanya owner + andi.team@umkm.com tersisa")
    try:
        response = requests.get(
            f"{BACKEND_URL}/company/team",
            headers={"Authorization": f"Bearer {owner_token}"},
            timeout=10
        )
        if response.status_code == 200:
            team = response.json()
            log_info(f"Current team members: {len(team)}")
            for member in team:
                log_info(f"  - {member.get('name')} ({member.get('email')}) - {member.get('company_role')}")
            
            # Should have 2 members: owner + andi
            if len(team) == 2:
                log_success("✅ Cleanup successful: only owner + andi remain")
                results.append(("Step 14: Cleanup verification", True))
            else:
                log_error(f"Expected 2 members, found {len(team)}")
                results.append(("Step 14: Cleanup verification", False))
        else:
            log_error(f"Failed to get team: {response.status_code}")
            results.append(("Step 14: Cleanup verification", False))
    except Exception as e:
        log_error(f"Exception: {str(e)}")
        results.append(("Step 14: Cleanup verification", False))
    
    # Step 15: Check backend logs
    log_test(15, "Cek log /var/log/supervisor/backend.err.log")
    try:
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        log_output = result.stdout
        
        # Check for tracebacks related to /company/team
        if "/company/team" in log_output and "Traceback" in log_output:
            log_error("Found traceback related to /company/team in logs")
            log_info(f"Log excerpt:\n{log_output}")
            results.append(("Step 15: Backend logs check", False))
        else:
            log_success("✅ No tracebacks related to /company/team in logs")
            results.append(("Step 15: Backend logs check", True))
            
    except Exception as e:
        log_error(f"Failed to check logs: {str(e)}")
        results.append(("Step 15: Backend logs check", False))
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{Colors.GREEN}✅ PASS{Colors.END}" if result else f"{Colors.RED}❌ FAIL{Colors.END}"
        print(f"{status} - {test_name}")
    
    print(f"\n{Colors.BLUE}Total: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print(f"{Colors.GREEN}🎉 ALL TESTS PASSED!{Colors.END}")
        return 0
    else:
        print(f"{Colors.RED}⚠️  SOME TESTS FAILED{Colors.END}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
