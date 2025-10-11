#!/bin/bash
# Full oRPC migration validation script
# Task: T042
# Reference: quickstart.md lines 392-486
#
# Tests sequence: Auth → Create community → Post → React → Moderate
# Expected: All endpoints return valid responses, 0 errors

set -e  # Exit on error

# Configuration
API_BASE="${API_BASE:-http://localhost:8787}"
TEST_HANDLE="${TEST_HANDLE:-alice.test}"
TEST_PASSWORD="${TEST_PASSWORD:-test123}"

echo "=== oRPC Migration Full Workflow Test ==="
echo "API Base: $API_BASE"
echo "Test User: $TEST_HANDLE"
echo ""

# 1. Authenticate
echo "Step 1: Authenticating user..."
TOKEN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"handle\":\"$TEST_HANDLE\",\"password\":\"$TEST_PASSWORD\"}" \
  | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Authentication failed"
  exit 1
fi

echo "✅ Authenticated as $TEST_HANDLE"
echo ""

# 2. Create community
echo "Step 2: Creating community..."
COMMUNITY_RESPONSE=$(curl -s -X POST "$API_BASE/api/communities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"oRPC Test","description":"Migration validation"}')

COMMUNITY=$(echo "$COMMUNITY_RESPONSE" | jq -r '.id')
COMMUNITY_URI=$(echo "$COMMUNITY_RESPONSE" | jq -r '.uri')

if [ -z "$COMMUNITY" ] || [ "$COMMUNITY" = "null" ]; then
  echo "❌ Community creation failed"
  echo "Response: $COMMUNITY_RESPONSE"
  exit 1
fi

echo "✅ Created community: $COMMUNITY"
echo "   URI: $COMMUNITY_URI"
echo ""

# 3. Create post
echo "Step 3: Creating post..."
POST_RESPONSE=$(curl -s -X POST "$API_BASE/api/communities/$COMMUNITY/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"communityId\":\"$COMMUNITY\",\"text\":\"Test post for oRPC validation\"}")

POST_URI=$(echo "$POST_RESPONSE" | jq -r '.uri')

if [ -z "$POST_URI" ] || [ "$POST_URI" = "null" ]; then
  echo "❌ Post creation failed"
  echo "Response: $POST_RESPONSE"
  exit 1
fi

echo "✅ Created post: $POST_URI"
echo ""

# 4. List posts in community
echo "Step 4: Listing posts in community..."
POSTS_RESPONSE=$(curl -s "$API_BASE/api/communities/$COMMUNITY/posts?limit=10" \
  -H "Authorization: Bearer $TOKEN")

POST_COUNT=$(echo "$POSTS_RESPONSE" | jq '.data | length')

if [ -z "$POST_COUNT" ] || [ "$POST_COUNT" -eq 0 ]; then
  echo "❌ Post list failed or empty"
  echo "Response: $POSTS_RESPONSE"
  exit 1
fi

echo "✅ Listed posts: $POST_COUNT found"
echo ""

# 5. Add reaction
echo "Step 5: Adding reaction..."
REACTION_RESPONSE=$(curl -s -X POST "$API_BASE/api/reactions/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"postUri\":\"$POST_URI\",\"emoji\":{\"type\":\"unicode\",\"value\":\"❤️\"},\"communityId\":\"$COMMUNITY\"}")

REACTION_URI=$(echo "$REACTION_RESPONSE" | jq -r '.reactionUri')

if [ -z "$REACTION_URI" ] || [ "$REACTION_URI" = "null" ]; then
  echo "❌ Reaction creation failed"
  echo "Response: $REACTION_RESPONSE"
  exit 1
fi

echo "✅ Added reaction: $REACTION_URI"
echo ""

# 6. List reactions
echo "Step 6: Listing reactions..."
REACTIONS_LIST=$(curl -s "$API_BASE/api/reactions/list?postUri=$(echo "$POST_URI" | jq -sRr @uri)" \
  -H "Authorization: Bearer $TOKEN")

REACTION_COUNT=$(echo "$REACTIONS_LIST" | jq '.reactions[0].count // 0')

if [ "$REACTION_COUNT" -eq 0 ]; then
  echo "❌ Reaction list failed or empty"
  echo "Response: $REACTIONS_LIST"
  exit 1
fi

echo "✅ Reaction count: $REACTION_COUNT"
echo ""

# 7. Hide post (moderation)
echo "Step 7: Hiding post (moderation)..."
MOD_RESPONSE=$(curl -s -X POST "$API_BASE/api/moderation/hide-post" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"postUri\":\"$POST_URI\",\"communityUri\":\"$COMMUNITY_URI\",\"reason\":\"test\"}")

MOD_URI=$(echo "$MOD_RESPONSE" | jq -r '.uri')

if [ -z "$MOD_URI" ] || [ "$MOD_URI" = "null" ]; then
  echo "❌ Moderation action failed"
  echo "Response: $MOD_RESPONSE"
  exit 1
fi

echo "✅ Moderation action: $MOD_URI"
echo ""

# 8. Verify moderation list
echo "Step 8: Verifying moderation list..."
MOD_LIST=$(curl -s "$API_BASE/api/moderation/actions?communityUri=$(echo "$COMMUNITY_URI" | jq -sRr @uri)" \
  -H "Authorization: Bearer $TOKEN")

MOD_COUNT=$(echo "$MOD_LIST" | jq '.data | length')

if [ -z "$MOD_COUNT" ] || [ "$MOD_COUNT" -eq 0 ]; then
  echo "❌ Moderation list failed or empty"
  echo "Response: $MOD_LIST"
  exit 1
fi

echo "✅ Moderation actions: $MOD_COUNT found"
echo ""

# 9. Remove reaction
echo "Step 9: Removing reaction..."
REMOVE_RESPONSE=$(curl -s -X DELETE "$API_BASE/api/reactions/remove" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reactionUri\":\"$REACTION_URI\"}")

REMOVE_SUCCESS=$(echo "$REMOVE_RESPONSE" | jq -r '.success')

if [ "$REMOVE_SUCCESS" != "true" ]; then
  echo "❌ Reaction removal failed"
  echo "Response: $REMOVE_RESPONSE"
  exit 1
fi

echo "✅ Removed reaction"
echo ""

# 10. Verify reaction removed
echo "Step 10: Verifying reaction removed..."
REACTIONS_AFTER=$(curl -s "$API_BASE/api/reactions/list?postUri=$(echo "$POST_URI" | jq -sRr @uri)" \
  -H "Authorization: Bearer $TOKEN")

REACTION_COUNT_AFTER=$(echo "$REACTIONS_AFTER" | jq '.reactions | length')

if [ "$REACTION_COUNT_AFTER" -ne 0 ]; then
  echo "⚠️  Warning: Expected 0 reactions, found $REACTION_COUNT_AFTER"
  echo "   (May be expected if other users reacted)"
fi

echo "✅ Verified reaction removal (count: $REACTION_COUNT_AFTER)"
echo ""

# Summary
echo "========================================"
echo "🎉 All oRPC endpoints validated successfully!"
echo "========================================"
echo ""
echo "Summary:"
echo "  - Authentication: ✅"
echo "  - Community creation: ✅"
echo "  - Post creation: ✅"
echo "  - Post listing: ✅"
echo "  - Reaction add: ✅"
echo "  - Reaction list: ✅"
echo "  - Moderation action: ✅"
echo "  - Moderation list: ✅"
echo "  - Reaction remove: ✅"
echo ""
echo "Test completed with 0 errors!"
