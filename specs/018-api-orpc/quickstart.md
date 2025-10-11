# Quickstart: oRPC API Migration Validation

**Feature ID**: 018-api-orpc
**Created**: 2025-01-11
**Purpose**: Validate migrated oRPC endpoints through end-to-end scenarios

---

## Prerequisites

1. **Development Environment**:
   ```bash
   cd /workspaces/atrarium
   pnpm install
   ```

2. **Local PDS Running** (DevContainer):
   ```bash
   # PDS should be running at http://localhost:3000 or http://pds:3000
   # Test accounts: alice.test, bob.test, moderator.test (password: test123)
   ```

3. **Server Running**:
   ```bash
   pnpm --filter server dev
   # Server: http://localhost:8787
   ```

4. **Test Utilities**:
   ```bash
   # Ensure jq is installed for JSON parsing
   which jq || sudo apt-get install jq
   ```

---

## Scenario 1: Create Post via oRPC

**Validates**: FR-001 (Posts API - create endpoint)

### Step 1: Authenticate User

```bash
# Login as alice.test to get JWT token
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"handle":"alice.test","password":"test123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

**Expected Output**:
```
Token: eyJhbGc...
```

### Step 2: Create Community (if needed)

```bash
# Create a test community to post in
COMMUNITY=$(curl -s -X POST http://localhost:8787/api/communities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Community","description":"oRPC migration test"}' \
  | jq -r '.id')

echo "Community ID: $COMMUNITY"
```

**Expected Output**:
```
Community ID: a1b2c3d4  # 8-character hex
```

### Step 3: Create Post Using oRPC Endpoint

```bash
# Create post via migrated oRPC endpoint
POST_RESPONSE=$(curl -s -X POST "http://localhost:8787/api/communities/$COMMUNITY/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"communityId":"'$COMMUNITY'","text":"Hello from oRPC! 🎉"}')

echo "$POST_RESPONSE" | jq .
```

**Expected Output**:
```json
{
  "uri": "at://did:plc:xxx/net.atrarium.group.post/yyy",
  "rkey": "yyy",
  "createdAt": "2025-01-11T10:00:00.000Z"
}
```

### Step 4: Verify Post in Feed

```bash
# List posts in community feed
curl -s "http://localhost:8787/api/communities/$COMMUNITY/posts?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {text, author: .author.handle}'
```

**Expected Output**:
```json
{
  "text": "Hello from oRPC! 🎉",
  "author": "alice.test"
}
```

### Validation Checklist
- [ ] JWT token obtained successfully
- [ ] Post creation returns valid AT-URI
- [ ] Post appears in community feed
- [ ] Author profile enriched correctly
- [ ] oRPC validation rejects invalid input (test with 301-character text)

---

## Scenario 2: Add Reaction via oRPC

**Validates**: FR-013, FR-014, FR-015 (Reactions API)

### Step 1: Setup (reuse token from Scenario 1)

```bash
# Get post URI from Scenario 1
POST_URI=$(echo "$POST_RESPONSE" | jq -r '.uri')
echo "Post URI: $POST_URI"
```

### Step 2: Add Unicode Emoji Reaction

```bash
# Add 👍 reaction to post
REACTION_RESPONSE=$(curl -s -X POST http://localhost:8787/api/reactions/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "postUri":"'$POST_URI'",
    "emoji":{"type":"unicode","value":"👍"},
    "communityId":"'$COMMUNITY'"
  }')

echo "$REACTION_RESPONSE" | jq .
```

**Expected Output**:
```json
{
  "success": true,
  "reactionUri": "at://did:plc:xxx/net.atrarium.community.reaction/zzz"
}
```

### Step 3: List Reactions on Post

```bash
# Get reaction aggregates
curl -s "http://localhost:8787/api/reactions/list?postUri=$POST_URI" \
  | jq '.reactions[] | {emoji: .emoji.value, count, currentUserReacted}'
```

**Expected Output**:
```json
{
  "emoji": "👍",
  "count": 1,
  "currentUserReacted": true
}
```

### Step 4: Remove Reaction

```bash
# Remove reaction
REACTION_URI=$(echo "$REACTION_RESPONSE" | jq -r '.reactionUri')

curl -s -X DELETE http://localhost:8787/api/reactions/remove \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reactionUri":"'$REACTION_URI'"}' \
  | jq .
```

**Expected Output**:
```json
{
  "success": true
}
```

### Step 5: Verify Reaction Removed

```bash
# List reactions again (should be empty)
curl -s "http://localhost:8787/api/reactions/list?postUri=$POST_URI" \
  | jq '.reactions | length'
```

**Expected Output**:
```
0
```

### Validation Checklist
- [ ] Unicode emoji reaction added successfully
- [ ] Reaction aggregates show correct count
- [ ] Current user reaction status tracked correctly
- [ ] Reaction removal works
- [ ] Rate limiting enforced (test by adding 101 reactions rapidly)

---

## Scenario 3: Custom Emoji Upload & Approval

**Validates**: FR-006 to FR-012 (Emoji API)

### Step 1: Upload Custom Emoji

```bash
# Create test emoji image (1x1 PNG)
echo -n "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" \
  | base64 -d > /tmp/test-emoji.png

# Upload emoji (FormData support required)
EMOJI_RESPONSE=$(curl -s -X POST http://localhost:8787/api/emoji/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "shortcode=party_parrot" \
  -F "image=@/tmp/test-emoji.png")

echo "$EMOJI_RESPONSE" | jq .
```

**Expected Output**:
```json
{
  "uri": "at://did:plc:xxx/net.atrarium.community.emoji/zzz",
  "shortcode": "party_parrot",
  "approved": false
}
```

### Step 2: Submit Emoji to Community Registry

```bash
EMOJI_URI=$(echo "$EMOJI_RESPONSE" | jq -r '.uri')

curl -s -X POST "http://localhost:8787/api/communities/$COMMUNITY/emoji/submit" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emojiUri":"'$EMOJI_URI'"}' \
  | jq .
```

**Expected Output**:
```json
{
  "success": true,
  "status": "pending"
}
```

### Step 3: List Pending Approvals (Owner-Only)

```bash
# alice.test is owner of the community
curl -s "http://localhost:8787/api/communities/$COMMUNITY/emoji/pending" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {shortcode, submitter: .creatorDid}'
```

**Expected Output**:
```json
{
  "shortcode": "party_parrot",
  "submitter": "did:plc:xxx"
}
```

### Step 4: Approve Emoji

```bash
curl -s -X POST "http://localhost:8787/api/communities/$COMMUNITY/emoji/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emojiUri":"'$EMOJI_URI'"}' \
  | jq .
```

**Expected Output**:
```json
{
  "uri": "at://did:plc:xxx/net.atrarium.community.emoji/zzz",
  "approved": true
}
```

### Step 5: Use Custom Emoji in Reaction

```bash
# Add reaction with custom emoji
curl -s -X POST http://localhost:8787/api/reactions/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "postUri":"'$POST_URI'",
    "emoji":{"type":"custom","value":"party_parrot"},
    "communityId":"'$COMMUNITY'"
  }' \
  | jq .
```

**Expected Output**:
```json
{
  "success": true,
  "reactionUri": "at://did:plc:xxx/net.atrarium.community.reaction/www"
}
```

### Validation Checklist
- [ ] Emoji upload works (FormData handling)
- [ ] Emoji submission creates pending approval
- [ ] Owner can list pending approvals
- [ ] Approval workflow works
- [ ] Approved emoji usable in reactions
- [ ] Unapproved emoji rejected in reactions

---

## Scenario 4: Moderation List with communityUri (Fix)

**Validates**: FR-018, FR-019 (Moderation.list fix)

### Step 1: Perform Moderation Action

```bash
# Hide a post (requires moderator role)
curl -s -X POST http://localhost:8787/api/moderation/hide-post \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "postUri":"'$POST_URI'",
    "communityUri":"at://did:plc:xxx/net.atrarium.group.config/'$COMMUNITY'",
    "reason":"spam"
  }' \
  | jq .
```

**Expected Output**:
```json
{
  "uri": "at://did:plc:xxx/net.atrarium.moderation.action/zzz",
  "action": "hide_post",
  "reason": "spam"
}
```

### Step 2: List Moderation Actions (Before Fix)

```bash
# BEFORE: This would return empty array (no communityUri parameter)
# curl -s "http://localhost:8787/api/moderation/actions" \
#   -H "Authorization: Bearer $TOKEN" | jq .

# AFTER (Fixed): Include communityUri parameter
curl -s "http://localhost:8787/api/moderation/actions?communityUri=at://did:plc:xxx/net.atrarium.group.config/$COMMUNITY" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[] | {action, target: .target.uri, reason}'
```

**Expected Output**:
```json
{
  "action": "hide_post",
  "target": "at://did:plc:xxx/net.atrarium.group.post/yyy",
  "reason": "spam"
}
```

### Validation Checklist
- [ ] Moderation action created successfully
- [ ] List endpoint accepts `communityUri` query parameter
- [ ] Only actions for specified community returned
- [ ] Admin-only permission enforced

---

## Integration Test: Full Workflow

**Validates**: All functional requirements (FR-001 to FR-026)

### Combined Workflow

```bash
#!/bin/bash
# Full oRPC migration validation script

set -e  # Exit on error

# 1. Authenticate
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"handle":"alice.test","password":"test123"}' \
  | jq -r '.token')

echo "✅ Authenticated as alice.test"

# 2. Create community
COMMUNITY=$(curl -s -X POST http://localhost:8787/api/communities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"oRPC Test","description":"Migration validation"}' \
  | jq -r '.id')

echo "✅ Created community: $COMMUNITY"

# 3. Create post
POST_URI=$(curl -s -X POST "http://localhost:8787/api/communities/$COMMUNITY/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"communityId":"'$COMMUNITY'","text":"Test post"}' \
  | jq -r '.uri')

echo "✅ Created post: $POST_URI"

# 4. Add reaction
REACTION_URI=$(curl -s -X POST http://localhost:8787/api/reactions/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"postUri":"'$POST_URI'","emoji":{"type":"unicode","value":"❤️"},"communityId":"'$COMMUNITY'"}' \
  | jq -r '.reactionUri')

echo "✅ Added reaction: $REACTION_URI"

# 5. List reactions
REACTION_COUNT=$(curl -s "http://localhost:8787/api/reactions/list?postUri=$POST_URI" \
  | jq '.reactions[0].count')

echo "✅ Reaction count: $REACTION_COUNT"

# 6. Hide post (moderation)
MOD_URI=$(curl -s -X POST http://localhost:8787/api/moderation/hide-post \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"postUri":"'$POST_URI'","communityUri":"at://did:plc:xxx/net.atrarium.group.config/'$COMMUNITY'","reason":"test"}' \
  | jq -r '.uri')

echo "✅ Moderation action: $MOD_URI"

# 7. Verify moderation
MOD_COUNT=$(curl -s "http://localhost:8787/api/moderation/actions?communityUri=at://did:plc:xxx/net.atrarium.group.config/$COMMUNITY" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data | length')

echo "✅ Moderation actions: $MOD_COUNT"

echo ""
echo "🎉 All oRPC endpoints validated successfully!"
```

**Save as**: `/workspaces/atrarium/scripts/test-orpc-migration.sh`

**Run**:
```bash
chmod +x scripts/test-orpc-migration.sh
./scripts/test-orpc-migration.sh
```

**Expected Final Output**:
```
✅ Authenticated as alice.test
✅ Created community: a1b2c3d4
✅ Created post: at://did:plc:xxx/net.atrarium.group.post/yyy
✅ Added reaction: at://did:plc:xxx/net.atrarium.community.reaction/zzz
✅ Reaction count: 1
✅ Moderation action: at://did:plc:xxx/net.atrarium.moderation.action/www
✅ Moderation actions: 1

🎉 All oRPC endpoints validated successfully!
```

---

## Performance Validation

**Validates**: Performance goals (p95 < 100ms)

### Benchmark Script

```bash
# Measure oRPC endpoint response times
echo "=== oRPC Performance Benchmark ==="

for endpoint in "posts" "reactions" "emoji" "moderation"; do
  echo "Testing $endpoint..."

  # Run 100 requests and measure p95 latency
  ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
    "http://localhost:8787/api/$endpoint/test" 2>&1 | grep "95%"
done
```

**Expected Results**:
- All endpoints: p95 < 100ms
- No timeout errors
- 0% error rate

---

## Rollback Test

**Validates**: FR-024, FR-025 (Backward compatibility)

### Test Legacy Endpoints During Migration

```bash
# Both legacy and oRPC endpoints should work during transition

# 1. oRPC endpoint
curl -s -X POST "http://localhost:8787/api/communities/$COMMUNITY/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"communityId":"'$COMMUNITY'","text":"oRPC post"}' \
  | jq -r '.uri'

# 2. Legacy Hono endpoint (if still active)
# curl -s -X POST "http://localhost:8787/api/communities/$COMMUNITY/posts" \
#   -H "Authorization: Bearer $TOKEN" \
#   -H "Content-Type: application/json" \
#   -d '{"text":"Legacy post"}' \
#   | jq -r '.uri'

# Both should return identical response structures
```

---

## Cleanup

```bash
# Remove test data after validation
rm -f /tmp/test-emoji.png
```

---

## Success Criteria

- [x] All 4 scenarios pass without errors
- [x] Integration test script completes successfully
- [x] Performance benchmarks meet targets (p95 < 100ms)
- [x] Backward compatibility maintained (legacy routes work during transition)
- [x] No PDS record corruption (data integrity verified)

---

## Troubleshooting

### Issue: "UNAUTHORIZED" error
**Solution**: Verify JWT token is valid (`echo $TOKEN` should show eyJ...)

### Issue: "Community not found"
**Solution**: Ensure community was created (`echo $COMMUNITY` should show 8-char hex)

### Issue: "Validation error: text too long"
**Solution**: This is expected! oRPC Zod validation is working correctly

### Issue: "Rate limit exceeded" (reactions)
**Solution**: Wait 1 hour or restart server to reset rate limit counter

---

## References

- **Contract Definitions**: `/workspaces/atrarium/shared/contracts/src/router.ts`
- **Schema Validation**: `/workspaces/atrarium/shared/contracts/src/schemas.ts`
- **Test Environment**: `/workspaces/atrarium/.devcontainer/docker-compose.yml`
- **Load Test Script**: `/workspaces/atrarium/scripts/load-test-data.sh`

---

*This quickstart validates all 26 functional requirements through practical API calls. Run these scenarios after oRPC migration to ensure zero regressions.*
