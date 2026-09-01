# Cloudinary Direct-Upload Signing & Diagnostics Verification Report

**Date**: 2026-09-01
**Environment**: Staging Preview (https://exhaustive-deps-fix.preview.emergentagent.com)
**Scope**: Limited to Cloudinary direct-upload signing & diagnostics only

## A. BASIC REGRESSION TESTS

### A1. Health Check
**Test**: `GET /api/health`
**Result**: ✅ PASS
- Status: 200 OK
- Response: `{"status": "ok", "database": "connected", "environment": "staging"}`

### A2. Media Storage Status  
**Test**: `GET /api/media/storage/status` (with admin token)
**Result**: ✅ PASS
- Status: 200 OK
- Provider: LOCAL (as expected in dev environment)

## B. ACCESS PROTECTION TESTS

### B1. Diagnostics Endpoint Without Token
**Test**: `GET /api/media/direct-upload/diagnostics` (no auth)
**Result**: ✅ PASS
- Status: 401 Unauthorized (correctly rejected)

### B2. Self-Test Endpoint Without Token
**Test**: `POST /api/media/direct-upload/self-test` (no auth)
**Result**: ✅ PASS
- Status: 401 Unauthorized (correctly rejected)

### B3. Admin Login
**Test**: `POST /api/auth/login` with admin@alsabbat.com
**Result**: ✅ PASS
- Status: 200 OK
- Received valid JWT access_token

### B4. Diagnostics Endpoint With Admin Token (LOCAL Provider)
**Test**: `GET /api/media/direct-upload/diagnostics` (with admin token)
**Result**: ✅ PASS
- Status: 200 OK
- Response: `{"provider": "LOCAL", "message": "Provider aktif bukan CLOUDINARY, diagnostik tidak berlaku."}`
- Correctly reports that provider is not CLOUDINARY (not 500 error)

### B5. Self-Test Endpoint With Admin Token (LOCAL Provider)
**Test**: `POST /api/media/direct-upload/self-test` (with admin token)
**Result**: ✅ PASS
- Status: 422 Unprocessable Entity
- Response: `{"error": {"message": "Direct upload hanya tersedia bila MEDIA_STORAGE_PROVIDER=CLOUDINARY."}}`
- Returns clear error message (not 500 traceback)

## C. CLOUDINARY PATH TESTS (Isolated Subprocess)

All tests run in isolated Python subprocess with dummy Cloudinary credentials:
- `CLOUDINARY_CLOUD_NAME=demo`
- `CLOUDINARY_API_KEY=123456789012345`
- `CLOUDINARY_API_SECRET=DummySecretForLocalCheck123`
- `CLOUDINARY_FOLDER=alsabbat/staging`
- `CLOUDINARY_URL=cloudinary://999999999999999:OtherSecretXYZ@other-cloud`

### C1. MediaService().cloudinary_diagnostics()
**Result**: ✅ PASS

Verified fields:
- ✅ `credential_source` = "CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET" (trio wins)
- ✅ `sdk_uses_env_trio` = true
- ✅ `cloudinary_url_conflict` = all true (detected CLOUDINARY_URL differs from trio)
- ✅ `folder` = "alsabbat/staging"
- ✅ `api_key_last4` = "2345" (last 4 digits of 123456789012345)
- ✅ `api_secret_fingerprint` = "88ce1eea" (8 hex SHA-256 fingerprint)
- ✅ `api_secret_length` = 27
- ✅ `signature_algorithm` = "sha1"

### C2. direct_upload_signature() - Signature Formula Verification
**Result**: ✅ PASS

Test: `await direct_upload_signature('download (54).jpg', 'image/jpeg')`

Verified:
- ✅ Signature matches official Cloudinary formula: `sha1(string_to_sign + api_secret)`
- ✅ `diagnostics.string_to_sign` = `"public_id=alsabbat/staging/image/2026/09/...&timestamp=..."`
- ✅ `public_id` is under folder `alsabbat/staging/`
- ✅ Manual calculation: `hashlib.sha1((string_to_sign + "DummySecretForLocalCheck123").encode()).hexdigest()` matches returned signature

### C3. Sanitization Test (Dirty Env Values)
**Result**: ✅ PASS

Test with dirty credentials:
- `CLOUDINARY_API_KEY='  123456789012345\n'` (spaces + newline)
- `CLOUDINARY_API_SECRET='  "DummySecretForLocalCheck123"  '` (spaces + quotes)

Verified:
- ✅ Settings values are cleaned (no spaces, newlines, or quotes)
- ✅ Signature with dirty env matches signature with clean env (identical)
- ✅ `_clean()` function working correctly

### C4. Algorithm Test (SHA-256)
**Result**: ✅ PASS

Test: `CLOUDINARY_SIGNATURE_ALGORITHM=sha256`

Verified:
- ✅ Signature matches `hashlib.sha256((string_to_sign + api_secret).encode()).hexdigest()`
- ✅ Algorithm parameter correctly passed to Cloudinary SDK
- ✅ Log shows `algorithm=sha256`

### C5. direct_upload_self_test() - Real Cloudinary Upload Test
**Result**: ✅ PASS (expected failure with dummy credentials)

Test: `await direct_upload_self_test()`

Verified:
- ✅ 2 attempts made (sha1 then sha256)
- ✅ Contains `diagnostics` object
- ✅ Contains actual Cloudinary error message: "Invalid Signature ... String to sign - 'public_id=...&timestamp=...'"
- ✅ Did NOT crash (exit code 0)
- ✅ Returns structured error response with helpful message explaining possible causes
- ✅ Expected to fail because credentials are dummy (not real Cloudinary account)

## D. SECURITY TESTS (No Secret Leakage)

### D1. Subprocess Output Check
**Result**: ✅ PASS

Searched for secrets in all subprocess outputs:
- ❌ NOT FOUND: `DummySecretForLocalCheck123`
- ❌ NOT FOUND: `OtherSecretXYZ`
- ✅ Only fingerprints and last 4 digits appear

### D2. Backend Logs Check
**Result**: ✅ PASS

Searched `/var/log/supervisor/backend.*.log` for secrets:
- ❌ NOT FOUND: `DummySecretForLocalCheck123`
- ❌ NOT FOUND: `OtherSecretXYZ`
- ✅ No secret values in logs

### D3. API Response Check
**Result**: ✅ PASS

Checked all API responses (`/diagnostics`, `/sign`, `/self-test`):
- ✅ Only `api_secret_fingerprint` (8 hex) appears
- ✅ Only `api_key_last4` (4 digits) appears
- ✅ Full secret values NEVER exposed

## E. SERVER LOGS VERIFICATION

### E1. cloudinary.sign Log Lines
**Result**: ✅ PASS

Found in subprocess stderr output:
```
cloudinary.sign cloud=demo api_key_last4=2345 source=CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET algorithm=sha1 secret_fp=88ce1eea string_to_sign=public_id=alsabbat/staging/image/2026/09/...&timestamp=...
```

Verified:
- ✅ Contains `secret_fp=` (fingerprint, not actual secret)
- ✅ Contains `string_to_sign=` (safe to log)
- ✅ Contains `algorithm=`
- ✅ Contains `source=` (credential source)

### E2. Credential Conflict Warning
**Result**: ✅ PASS

Found warning log:
```
cloudinary.sign.credential_conflict CLOUDINARY_URL berbeda dari trio CLOUDINARY_* ({'cloud_name_differs': True, 'api_key_differs': True, 'api_secret_differs': True}) — hapus salah satu agar tidak tercampur.
```

Verified:
- ✅ Warning logged when CLOUDINARY_URL conflicts with trio
- ✅ No secret values in warning message

## SUMMARY

### Overall Results
- ✅ **A. Basic Regression**: 2/2 PASS
- ✅ **B. Access Protection**: 5/5 PASS
- ✅ **C. Cloudinary Path**: 5/5 PASS
- ✅ **D. Security**: 3/3 PASS (NO SECRET LEAKAGE)
- ✅ **E. Server Logs**: 2/2 PASS

### Key Findings

1. **Hardening & Diagnostics Working**:
   - `_clean()` function successfully strips spaces, newlines, and quotes from all CLOUDINARY_* values
   - Deterministic credential precedence: trio CLOUDINARY_* wins, CLOUDINARY_URL is fallback
   - `config_diagnostics()` returns safe data only (fingerprints, last 4 digits, no secrets)

2. **Signature Verification**:
   - Signature formula matches official Cloudinary: `sha1(string_to_sign + api_secret)`
   - `string_to_sign` correctly includes only signed parameters: `public_id` and `timestamp`
   - Both SHA-1 and SHA-256 algorithms work correctly

3. **Security**:
   - ✅ CLOUDINARY_API_SECRET NEVER appears in any response, log, or output
   - ✅ Only 8-hex SHA-256 fingerprint and last 4 digits of API key are exposed
   - ✅ All diagnostics are safe for admin viewing

4. **Access Protection**:
   - ✅ Both `/diagnostics` and `/self-test` endpoints require `media:write` permission
   - ✅ Correctly reject unauthenticated requests with 401
   - ✅ On LOCAL provider, return clear error messages (not 500 crashes)

5. **Logging**:
   - ✅ `cloudinary.sign` log lines include safe diagnostics
   - ✅ Credential conflict warnings logged when CLOUDINARY_URL differs from trio
   - ✅ No secret values in any log output

### Recommendations for Production

When deploying to Vercel Preview with real Cloudinary credentials:

1. Set ONLY the trio (not CLOUDINARY_URL):
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

2. If Cloudinary account uses SHA-256:
   - Set `CLOUDINARY_SIGNATURE_ALGORITHM=sha256`

3. Use `/api/media/direct-upload/diagnostics` (admin only) to verify:
   - `credential_source` shows trio
   - `sdk_uses_env_trio` is true
   - No `cloudinary_url_conflict`
   - `api_secret_fingerprint` matches your secret's SHA-256 fingerprint

4. Use `/api/media/direct-upload/self-test` (admin only) to verify:
   - Real upload to Cloudinary succeeds
   - Signature algorithm is correct
   - No "Invalid Signature" errors

### Conclusion

✅ **ALL VERIFICATION REQUIREMENTS MET**

The Cloudinary direct-upload signing and diagnostics implementation is:
- ✅ Functionally correct (signature formula matches Cloudinary spec)
- ✅ Secure (no secret leakage anywhere)
- ✅ Hardened (credential sanitization, deterministic precedence)
- ✅ Observable (safe diagnostics for troubleshooting)
- ✅ Protected (auth required, clear error messages)

The 401 "Invalid Signature" issue on Vercel Preview is NOT caused by the signing logic itself (which is correct), but likely by:
- Credential mismatch (API key/secret from different Cloudinary product environments)
- Algorithm mismatch (account uses SHA-256 but env uses SHA-1)
- Whitespace/quotes in pasted credentials (now fixed by `_clean()`)

The diagnostics and self-test endpoints will help identify the exact cause in production.
