#!/usr/bin/env python3
"""Backend testing for media storage verification (Vercel serverless bug fix)."""
import os
import sys
import json
import requests
from pathlib import Path

# Base URL from frontend/.env
BASE_URL = "https://alsabbat-resend-otp.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@alsabbat.com"
ADMIN_PASSWORD = "Alsabbat2026!"

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print('='*80)

def get_admin_token():
    """Login as admin and get access token."""
    print_section("A. LOCAL ENVIRONMENT TEST - Admin Login")
    response = requests.post(
        f"{API_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    print(f"Login status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✓ Admin login successful")
        return token
    else:
        print(f"✗ Admin login failed: {response.text}")
        return None

def test_media_status(token):
    """Test GET /api/media/storage/status endpoint."""
    print_section("A. LOCAL ENVIRONMENT TEST - Media Storage Status")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_URL}/media/storage/status", headers=headers)
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        provider = data.get("provider")
        configured = data.get("configured")
        
        if provider == "LOCAL":
            print(f"✓ Provider is LOCAL (expected for dev environment)")
        else:
            print(f"✗ Provider is {provider} (expected LOCAL)")
            
        if configured:
            print(f"✓ Storage is configured")
        else:
            print(f"✗ Storage is not configured")
            
        return provider == "LOCAL" and configured
    else:
        print(f"✗ Failed to get media status: {response.text}")
        return False

def test_serverless_simulation():
    """Test serverless environment simulation via subprocess."""
    print_section("B. SERVERLESS SIMULATION TESTS")
    
    # Test Case 1: VERCEL=1, provider=cloudinary (lowercase), with Cloudinary credentials
    print("\n--- Case 1: Vercel + MEDIA_STORAGE_PROVIDER=cloudinary (lowercase) + Cloudinary creds ---")
    test_env_1 = {
        "VERCEL": "1",
        "VERCEL_ENV": "preview",
        "ENVIRONMENT": "staging",
        "MEDIA_STORAGE_PROVIDER": "cloudinary",  # lowercase
        "CLOUDINARY_CLOUD_NAME": "dummy-cloud",
        "CLOUDINARY_API_KEY": "123456789",
        "CLOUDINARY_API_SECRET": "dummy-secret-key-for-testing",
        "CLOUDINARY_FOLDER": "alsabbat/staging",
        "MEDIA_LOCAL_DIR": "/var/task/media_storage",
        # Required for staging validation
        "CORS_ORIGINS": "https://staging-test.vercel.app",
        "MONGODB_URI": "mongodb+srv://u:p@cluster0.test.mongodb.net",
        "MONGODB_DB_NAME": "alsabbat_platform_staging",
        "JWT_SECRET": "a" * 40,  # 40 char dummy
    }
    
    test_code_1 = """
import sys
import os
from pathlib import Path

sys.path.insert(0, "/app/backend")

# Import app.main to trigger module-level initialization
try:
    import app.main
    from app.services.media_service import media_service
    
    provider = media_service.provider.value
    print(f"PROVIDER={provider}")
    
    # Check if /var/task/media_storage was created
    media_dir = Path(os.environ.get("MEDIA_LOCAL_DIR", "/var/task/media_storage"))
    if media_dir.exists():
        print(f"DIRECTORY_CREATED=YES")
    else:
        print(f"DIRECTORY_CREATED=NO")
    
    sys.exit(0)
except OSError as e:
    if "Read-only file system" in str(e):
        print(f"ERROR=OSError_ReadOnly: {e}")
        sys.exit(1)
    raise
except Exception as e:
    print(f"ERROR={type(e).__name__}: {e}")
    sys.exit(1)
"""
    
    result_1 = run_subprocess_test(test_code_1, test_env_1)
    analyze_result("Case 1", result_1, expected_provider="CLOUDINARY", expected_dir_created=False)
    
    # Test Case 2: VERCEL=1, provider=LOCAL but Cloudinary creds available (should force Cloudinary)
    print("\n--- Case 2: Vercel + MEDIA_STORAGE_PROVIDER=LOCAL + Cloudinary creds (should use Cloudinary) ---")
    test_env_2 = test_env_1.copy()
    test_env_2["MEDIA_STORAGE_PROVIDER"] = "LOCAL"
    
    result_2 = run_subprocess_test(test_code_1, test_env_2)
    analyze_result("Case 2", result_2, expected_provider="CLOUDINARY", expected_dir_created=False)
    
    # Test Case 3: VERCEL=1, no Cloudinary credentials (should log ERROR but not crash)
    print("\n--- Case 3: Vercel + no Cloudinary creds (should not crash with OSError) ---")
    test_env_3 = {
        "VERCEL": "1",
        "VERCEL_ENV": "preview",
        "ENVIRONMENT": "staging",
        "MEDIA_STORAGE_PROVIDER": "LOCAL",
        "MEDIA_LOCAL_DIR": "/var/task/media_storage",
        "CORS_ORIGINS": "https://staging-test.vercel.app",
        "MONGODB_URI": "mongodb+srv://u:p@cluster0.test.mongodb.net",
        "MONGODB_DB_NAME": "alsabbat_platform_staging",
        "JWT_SECRET": "a" * 40,
    }
    
    result_3 = run_subprocess_test(test_code_1, test_env_3)
    # Should exit 0 (no crash), provider will be LOCAL, directory should NOT be created
    if result_3["exit_code"] == 0:
        print(f"✓ Import succeeded (no OSError crash)")
        if "OSError" not in result_3["output"] and "Read-only" not in result_3["output"]:
            print(f"✓ No 'Read-only file system' error")
        else:
            print(f"✗ Found OSError in output: {result_3['output']}")
    else:
        print(f"✗ Import failed with exit code {result_3['exit_code']}")
        print(f"Output: {result_3['output']}")

def run_subprocess_test(code, env):
    """Run Python code in subprocess with isolated environment."""
    import subprocess
    
    # Merge with minimal required env
    full_env = os.environ.copy()
    full_env.update(env)
    
    result = subprocess.run(
        ["python3", "-c", code],
        env=full_env,
        capture_output=True,
        text=True,
        timeout=30
    )
    
    return {
        "exit_code": result.returncode,
        "output": result.stdout + result.stderr
    }

def analyze_result(case_name, result, expected_provider=None, expected_dir_created=False):
    """Analyze subprocess test result."""
    print(f"\nResult for {case_name}:")
    print(f"Exit code: {result['exit_code']}")
    print(f"Output:\n{result['output']}")
    
    if result["exit_code"] == 0:
        print(f"✓ Import successful (no crash)")
    else:
        print(f"✗ Import failed")
        return
    
    # Check provider
    if "PROVIDER=" in result["output"]:
        provider = result["output"].split("PROVIDER=")[1].split()[0]
        if expected_provider and provider == expected_provider:
            print(f"✓ Provider is {provider} (expected)")
        elif expected_provider:
            print(f"✗ Provider is {provider} (expected {expected_provider})")
        else:
            print(f"Provider: {provider}")
    
    # Check directory creation
    if "DIRECTORY_CREATED=" in result["output"]:
        dir_created = "YES" in result["output"].split("DIRECTORY_CREATED=")[1].split()[0]
        if dir_created == expected_dir_created:
            print(f"✓ Directory created: {dir_created} (expected)")
        else:
            print(f"✗ Directory created: {dir_created} (expected {expected_dir_created})")
    
    # Check for OSError
    if "OSError" in result["output"] or "Read-only" in result["output"]:
        print(f"✗ Found OSError/Read-only error in output")
    else:
        print(f"✓ No OSError/Read-only error")

def test_local_storage_save():
    """Test LocalStorageBackend.save() actually writes files in dev environment."""
    print_section("C. LOCAL STORAGE BACKEND SAVE TEST")
    
    test_code = """
import sys
import asyncio
from pathlib import Path
import tempfile
import shutil

sys.path.insert(0, "/app/backend")

from app.services.media_service import LocalStorageBackend

async def test_save():
    # Use a temporary directory for testing
    test_dir = Path("/tmp/agent_lazy_test")
    if test_dir.exists():
        shutil.rmtree(test_dir)
    
    backend = LocalStorageBackend(str(test_dir), "/api/media/files")
    
    # Test save - directory should be created lazily
    test_content = b"test image content"
    test_key = "image/2026/09/test-file.jpg"
    
    try:
        result = await backend.save(test_key, test_content, "image/jpeg")
        print(f"SAVE_SUCCESS=YES")
        print(f"URL={result.url}")
        print(f"STORAGE_KEY={result.storage_key}")
        
        # Check if file was actually written
        target_file = test_dir / test_key
        if target_file.exists():
            print(f"FILE_EXISTS=YES")
            content = target_file.read_bytes()
            if content == test_content:
                print(f"CONTENT_MATCH=YES")
            else:
                print(f"CONTENT_MATCH=NO")
        else:
            print(f"FILE_EXISTS=NO")
        
        # Cleanup
        shutil.rmtree(test_dir)
        print(f"CLEANUP=SUCCESS")
        
    except Exception as e:
        print(f"ERROR={type(e).__name__}: {e}")
        sys.exit(1)

asyncio.run(test_save())
"""
    
    import subprocess
    result = subprocess.run(
        ["python3", "-c", test_code],
        capture_output=True,
        text=True,
        timeout=30
    )
    
    print(f"Exit code: {result.returncode}")
    print(f"Output:\n{result.stdout}")
    if result.stderr:
        print(f"Stderr:\n{result.stderr}")
    
    if result.returncode == 0:
        if "SAVE_SUCCESS=YES" in result.stdout and "FILE_EXISTS=YES" in result.stdout and "CONTENT_MATCH=YES" in result.stdout:
            print(f"✓ LocalStorageBackend.save() works correctly (lazy directory creation + file write)")
            return True
        else:
            print(f"✗ LocalStorageBackend.save() test failed")
            return False
    else:
        print(f"✗ Test failed with exit code {result.returncode}")
        return False

def check_backend_logs():
    """Check backend logs for 'Read-only file system' errors."""
    print_section("D. BACKEND LOGS CHECK")
    
    import subprocess
    result = subprocess.run(
        ["grep", "-i", "read-only", "/var/log/supervisor/backend.err.log"],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print(f"✗ Found 'read-only' in backend logs:")
        print(result.stdout)
        return False
    else:
        print(f"✓ No 'Read-only file system' errors in backend logs")
        return True

def main():
    print("="*80)
    print("MEDIA STORAGE VERIFICATION - Vercel Serverless Bug Fix")
    print("="*80)
    
    results = {}
    
    # A. Local environment test
    token = get_admin_token()
    if token:
        results["media_status"] = test_media_status(token)
    else:
        results["media_status"] = False
        print("✗ Cannot proceed without admin token")
    
    # B. Serverless simulation
    test_serverless_simulation()
    
    # C. Local storage save test
    results["local_save"] = test_local_storage_save()
    
    # D. Backend logs check
    results["logs_clean"] = check_backend_logs()
    
    # Summary
    print_section("SUMMARY")
    print(f"A. Local environment (dev): {'✓ PASS' if results.get('media_status') else '✗ FAIL'}")
    print(f"B. Serverless simulation: See detailed output above")
    print(f"C. LocalStorageBackend.save(): {'✓ PASS' if results.get('local_save') else '✗ FAIL'}")
    print(f"D. Backend logs clean: {'✓ PASS' if results.get('logs_clean') else '✗ FAIL'}")
    
    print("\n" + "="*80)
    print("Testing complete. Review results above.")
    print("="*80)

if __name__ == "__main__":
    main()
