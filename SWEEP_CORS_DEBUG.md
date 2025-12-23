# SWEEP FUNCTION CORS DEBUGGING GUIDE

## 1. DEPLOY THE UPDATED FUNCTION

```powershell
# Deploy only the sweepCompleteBookings function to save time
firebase deploy --only functions:sweepCompleteBookings
```

**Expected output:**
- ✓ functions[sweepCompleteBookings(us-central1)] Successful update operation.
- Function URL: https://us-central1-sanchez-services-11fd0.cloudfunctions.net/sweepCompleteBookings

## 2. TEST WITH CURL COMMANDS

### Test OPTIONS (Preflight)
```powershell
curl -i -X OPTIONS "https://us-central1-sanchez-services-11fd0.cloudfunctions.net/sweepCompleteBookings" `
  -H "Origin: http://localhost:5173" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type,authorization"
```

### Test GET (Should fail but handler should run)
```powershell
curl -i -X GET "https://us-central1-sanchez-services-11fd0.cloudfunctions.net/sweepCompleteBookings"
```

### Test POST (Without auth, should get 401)
```powershell
curl -i -X POST "https://us-central1-sanchez-services-11fd0.cloudfunctions.net/sweepCompleteBookings" `
  -H "Content-Type: application/json" `
  -d "{}"
```

## 3. INTERPRETING RESULTS

### Status Code Meanings:

| Status | Meaning | Diagnosis |
|--------|---------|-----------|
| **204** | OPTIONS succeeded | ✅ CORS working, handler ran |
| **405** | Method not allowed | ✅ Handler ran, rejected GET |
| **401** | Unauthorized | ✅ Handler ran, auth check rejected request |
| **403** | Forbidden (IAM) | ❌ **IAM blocking before handler runs** |
| **404** | Not found | ❌ Function doesn't exist or wrong URL |
| **500** | Internal error | ❌ Handler crashed (check logs) |
| **503** | Service unavailable | ❌ Function not deployed or cold start timeout |

### Response Body Meanings:

- **HTML page**: IAM is blocking (platform error, not your code)
- **JSON `{"ok": false, ...}`**: Your handler code ran and returned error
- **Empty/204**: OPTIONS preflight succeeded

### Critical Test:

**If GET returns 405 with JSON, your handler IS running.**
- This proves the function is deployed and reachable
- If OPTIONS returns 500/503 but GET returns 405, then IAM may be blocking OPTIONS specifically

## 4. FUNCTION TYPE: GEN1 vs GEN2

**Your function is Gen1** (confirmed by `firebase-functions/v1` import on line 3)

### Where to find logs:

**Cloud Functions Gen1:**
```powershell
# View logs in real-time
firebase functions:log --only sweepCompleteBookings

# Or use gcloud
gcloud functions logs read sweepCompleteBookings --region=us-central1 --limit=50
```

**Look for the "SWEEP HIT" log entry:**
- ✅ **If you see it**: Handler is running, issue is in your code or auth
- ❌ **If you don't see it**: Request never reached handler (IAM or routing issue)

## 5. IAM PERMISSIONS CHECK & FIX

### Check current IAM policy (Gen1):
```powershell
gcloud functions get-iam-policy sweepCompleteBookings --region=us-central1
```

**Expected output for public access:**
```yaml
bindings:
- members:
  - allUsers
  role: roles/cloudfunctions.invoker
```

### Add public invoker role if missing (Gen1):
```powershell
gcloud functions add-iam-policy-binding sweepCompleteBookings `
  --region=us-central1 `
  --member=allUsers `
  --role=roles/cloudfunctions.invoker
```

### Alternative: If somehow deployed as Gen2 (Cloud Run):
```powershell
# Check Gen2 IAM
gcloud run services get-iam-policy sweepCompleteBookings --region=us-central1

# Add public invoker for Gen2
gcloud run services add-iam-policy-binding sweepCompleteBookings `
  --region=us-central1 `
  --member=allUsers `
  --role=roles/run.invoker
```

## 6. DEBUGGING WORKFLOW

1. **Deploy** the function with the new console.log
2. **Test GET** first - if this returns 405, handler is working
3. **Test OPTIONS** - if this fails but GET works, IAM is the issue
4. **Check logs** for "SWEEP HIT" - if missing, request never arrived
5. **Check IAM** - if no allUsers binding, add it
6. **Retest** after adding IAM policy

## 7. EXPECTED BEHAVIOR AFTER FIX

### OPTIONS Request:
```
HTTP/2 204
access-control-allow-origin: http://localhost:5173
access-control-allow-methods: POST, OPTIONS
access-control-allow-headers: Content-Type, Authorization
access-control-max-age: 3600
```

### GET Request:
```
HTTP/2 405
access-control-allow-origin: *
content-type: application/json

{"ok":false,"error":"Method not allowed. Use POST."}
```

### POST Request (no auth):
```
HTTP/2 401
access-control-allow-origin: *
content-type: application/json

{"ok":false,"error":"Missing Bearer token in Authorization header"}
```

## 8. WHY IAM BLOCKS OPTIONS

**The Issue:**
- Cloud Functions platform intercepts ALL requests before your code
- If IAM policy doesn't allow public access, OPTIONS fails with 403/500
- Your CORS headers in code never execute
- Browser sees "CORS Missing Allow Origin" error

**The Solution:**
- Add `allUsers` to IAM policy (`roles/cloudfunctions.invoker`)
- This allows OPTIONS to reach your handler
- Your handler returns proper CORS headers (line 236-243)
- Your code still enforces auth with `REQUIRE_AUTH` and Bearer token check
- Unauthenticated users get 401 from YOUR code, not IAM

**Security Note:**
Public invoker access is SAFE because:
- Your function code checks `REQUIRE_AUTH` (line 256-280)
- Requires valid Firebase ID token in `Authorization: Bearer <token>`
- Validates admin status via `isAdminByUidAndEmail()`
- Only returns 401/403 to non-admins AFTER they reach your code
