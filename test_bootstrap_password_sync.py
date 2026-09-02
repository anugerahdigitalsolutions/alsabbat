#!/usr/bin/env python3
"""Test bootstrap admin password synchronization in isolated database.

Tests scenarios:
1. ENVIRONMENT=staging + BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET=true → password synced
2. ENVIRONMENT=development + VERCEL_ENV=preview + flag true → password synced
3. ENVIRONMENT=staging WITHOUT flag → password NOT changed
4. ENVIRONMENT=production + flag true → reset_enabled MUST be False
"""
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.security import hash_password, verify_password
from app.models.base import new_id


TEST_DB_NAME = "alsabbat_agent_auth_test"
TEST_EMAIL = "developer@alsabbat.com"
OLD_PASSWORD = "OldPassword123!"
NEW_PASSWORD = "StagingBaru#2026"


async def setup_test_user(db):
    """Create a test user with old password."""
    now = datetime.utcnow().isoformat() + "Z"
    user_id = new_id()
    await db.users.insert_one({
        "id": user_id,
        "email": TEST_EMAIL,
        "name": "Test Developer",
        "role": "SUPER_ADMIN",
        "is_active": True,
        "avatar_url": None,
        "password_hash": hash_password(OLD_PASSWORD),
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
    })
    return user_id


async def get_user(db):
    """Get the test user."""
    return await db.users.find_one({"email": TEST_EMAIL})


async def test_scenario(scenario_name: str, env_vars: dict, expected_synced: bool):
    """Test a single scenario."""
    print(f"\n{'='*70}")
    print(f"SCENARIO: {scenario_name}")
    print(f"{'='*70}")
    
    # Save original env vars
    original_env = {}
    for key in env_vars:
        original_env[key] = os.environ.get(key)
    
    try:
        # Set test env vars
        for key, value in env_vars.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        
        # Force reload of settings
        import importlib
        from app.core import config
        # Clear the lru_cache
        config.get_settings.cache_clear()
        importlib.reload(config)
        from app.core.config import settings
        
        print(f"Environment: {settings.ENVIRONMENT}")
        print(f"VERCEL_ENV: {os.environ.get('VERCEL_ENV', 'not set')}")
        print(f"BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET: {env_vars.get('BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET', 'not set')}")
        print(f"bootstrap_admin_password_reset_enabled: {settings.bootstrap_admin_password_reset_enabled}")
        
        # Connect to test database
        client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db = client[TEST_DB_NAME]
        
        # Clean up any existing test data
        await db.users.delete_many({})
        
        # Create test user with old password
        user_id = await setup_test_user(db)
        user_before = await get_user(db)
        hash_before = user_before["password_hash"]
        updated_at_before = user_before["updated_at"]
        
        print(f"\nUser created with OLD password")
        print(f"  - ID: {user_id}")
        print(f"  - Email: {TEST_EMAIL}")
        print(f"  - Role: {user_before['role']}")
        print(f"  - is_active: {user_before['is_active']}")
        print(f"  - Hash starts with: {hash_before[:10]}...")
        print(f"  - Updated at: {updated_at_before}")
        
        # Import and run seed_super_admin
        # Monkey-patch get_db to use our test database
        from app.core import database
        original_get_db = database.get_db
        database.get_db = lambda: db
        database._db = db
        
        # Reload bootstrap module to pick up new settings
        from app.services import bootstrap
        import importlib
        importlib.reload(bootstrap)
        from app.services.bootstrap import seed_super_admin
        
        print(f"\nRunning seed_super_admin()...")
        await seed_super_admin()
        
        # Check results
        user_after = await get_user(db)
        hash_after = user_after["password_hash"]
        updated_at_after = user_after["updated_at"]
        
        print(f"\nAfter seed_super_admin():")
        print(f"  - ID: {user_after['id']} (unchanged: {user_after['id'] == user_id})")
        print(f"  - Email: {user_after['email']} (unchanged: {user_after['email'] == TEST_EMAIL})")
        print(f"  - Role: {user_after['role']} (unchanged: {user_after['role'] == 'SUPER_ADMIN'})")
        print(f"  - is_active: {user_after['is_active']} (unchanged: {user_after['is_active'] == True})")
        print(f"  - Hash changed: {hash_after != hash_before}")
        print(f"  - Hash starts with $2: {hash_after.startswith('$2')}")
        print(f"  - Updated at changed: {updated_at_after != updated_at_before}")
        
        # Verify password
        old_password_valid = verify_password(OLD_PASSWORD, hash_after)
        new_password_valid = verify_password(NEW_PASSWORD, hash_after)
        
        print(f"\nPassword verification:")
        print(f"  - OLD password valid: {old_password_valid}")
        print(f"  - NEW password valid: {new_password_valid}")
        
        # Check expectations
        if expected_synced:
            assert not old_password_valid, "OLD password should be INVALID after sync"
            assert new_password_valid, "NEW password should be VALID after sync"
            assert hash_after != hash_before, "Hash should have changed"
            assert hash_after.startswith("$2"), "Hash should be bcrypt"
            assert user_after["role"] == "SUPER_ADMIN", "Role should remain SUPER_ADMIN"
            assert user_after["is_active"] == True, "is_active should remain True"
            assert user_after["id"] == user_id, "User ID should not change"
            assert user_after["email"] == TEST_EMAIL, "Email should not change"
            print(f"\n✅ PASS: Password was synced as expected")
            
            # Test idempotency - run again
            print(f"\nTesting idempotency (running seed_super_admin() again)...")
            await seed_super_admin()
            user_second = await get_user(db)
            assert user_second["updated_at"] == updated_at_after, "updated_at should NOT change on second run (idempotent)"
            print(f"✅ PASS: Idempotent (updated_at unchanged on second run)")
        else:
            assert old_password_valid, "OLD password should still be VALID (no sync)"
            assert not new_password_valid, "NEW password should be INVALID (no sync)"
            assert hash_after == hash_before, "Hash should NOT have changed"
            print(f"\n✅ PASS: Password was NOT synced as expected")
        
        # Clean up
        await db.users.delete_many({})
        # Don't close client here - will be closed at the end
        
        return True
        
    except Exception as e:
        print(f"\n❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Restore original env vars
        for key, value in original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


async def test_production_guard():
    """Test that production environment never enables reset."""
    print(f"\n{'='*70}")
    print(f"SCENARIO: Production guard check (property only)")
    print(f"{'='*70}")
    
    original_env = os.environ.get("ENVIRONMENT")
    try:
        os.environ["ENVIRONMENT"] = "production"
        os.environ["BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET"] = "true"
        os.environ["BOOTSTRAP_ADMIN_PASSWORD"] = NEW_PASSWORD
        
        import importlib
        from app.core import config
        importlib.reload(config)
        from app.core.config import settings
        
        print(f"Environment: {settings.ENVIRONMENT}")
        print(f"BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET: true")
        print(f"bootstrap_admin_password_reset_enabled: {settings.bootstrap_admin_password_reset_enabled}")
        
        assert settings.bootstrap_admin_password_reset_enabled == False, \
            "Production should NEVER enable password reset"
        
        print(f"\n✅ PASS: Production guard working (reset_enabled = False)")
        return True
    except Exception as e:
        print(f"\n❌ FAIL: {e}")
        return False
    finally:
        if original_env:
            os.environ["ENVIRONMENT"] = original_env
        else:
            os.environ.pop("ENVIRONMENT", None)


async def cleanup_test_db():
    """Drop the test database."""
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    await client.drop_database(TEST_DB_NAME)
    client.close()
    print(f"\n✅ Test database '{TEST_DB_NAME}' dropped")


async def main():
    print("="*70)
    print("BOOTSTRAP ADMIN PASSWORD SYNC VERIFICATION")
    print("="*70)
    
    results = []
    
    # Scenario 1: staging + flag ON → should sync
    results.append(await test_scenario(
        "Staging + flag ON → password SHOULD sync",
        {
            "ENVIRONMENT": "staging",
            "BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET": "true",
            "BOOTSTRAP_ADMIN_EMAIL": TEST_EMAIL,
            "BOOTSTRAP_ADMIN_PASSWORD": NEW_PASSWORD,
            "MONGO_URL": os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
            "JWT_SECRET": "test_secret_key_for_isolated_testing",
            "VERCEL_ENV": None,
        },
        expected_synced=True
    ))
    
    # Scenario 2: development + VERCEL_ENV=preview + flag ON → should sync
    results.append(await test_scenario(
        "Development + VERCEL_ENV=preview + flag ON → password SHOULD sync",
        {
            "ENVIRONMENT": "development",
            "VERCEL_ENV": "preview",
            "BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET": "true",
            "BOOTSTRAP_ADMIN_EMAIL": TEST_EMAIL,
            "BOOTSTRAP_ADMIN_PASSWORD": NEW_PASSWORD,
            "MONGO_URL": os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
            "JWT_SECRET": "test_secret_key_for_isolated_testing",
        },
        expected_synced=True
    ))
    
    # Scenario 3: staging WITHOUT flag → should NOT sync
    results.append(await test_scenario(
        "Staging WITHOUT flag → password should NOT sync",
        {
            "ENVIRONMENT": "staging",
            "BOOTSTRAP_ADMIN_ALLOW_PASSWORD_RESET": None,  # Not set
            "BOOTSTRAP_ADMIN_EMAIL": TEST_EMAIL,
            "BOOTSTRAP_ADMIN_PASSWORD": NEW_PASSWORD,
            "MONGO_URL": os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
            "JWT_SECRET": "test_secret_key_for_isolated_testing",
            "VERCEL_ENV": None,
        },
        expected_synced=False
    ))
    
    # Scenario 4: production + flag ON → reset_enabled should be False
    results.append(await test_production_guard())
    
    # Cleanup
    await cleanup_test_db()
    
    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    total = len(results)
    passed = sum(results)
    print(f"Total scenarios: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    
    if all(results):
        print(f"\n✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print(f"\n❌ SOME TESTS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
