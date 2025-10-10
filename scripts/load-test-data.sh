#!/bin/bash
# Load test data into local development environment
# Requires: Local PDS (http://localhost:3000) and Atrarium server (http://localhost:8787)
# Usage: ./scripts/load-test-data.sh

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PDS_URL="${PDS_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:8787}"

# Test accounts (must exist in PDS)
ALICE_HANDLE="alice.test"
ALICE_PASSWORD="test123"
BOB_HANDLE="bob.test"
BOB_PASSWORD="test123"
MODERATOR_HANDLE="moderator.test"
MODERATOR_PASSWORD="test123"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📦 Atrarium Test Data Loader                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if services are running
echo -e "${YELLOW}🔍 Checking services...${NC}"

if ! curl -sf "$PDS_URL/xrpc/_health" > /dev/null 2>&1; then
    echo -e "${RED}❌ PDS is not running at $PDS_URL${NC}"
    echo "   Start PDS with: ./start-dev.sh pds"
    exit 1
fi
echo -e "${GREEN}✅ PDS is running at $PDS_URL${NC}"

if ! curl -sf "$API_URL/.well-known/did.json" > /dev/null 2>&1; then
    echo -e "${RED}❌ Atrarium server is not running at $API_URL${NC}"
    echo "   Start server with: pnpm --filter server dev"
    exit 1
fi
echo -e "${GREEN}✅ Atrarium server is running at $API_URL${NC}"
echo ""

# Function to login and get PDS JWT + DID
login_pds() {
    local handle=$1
    local password=$2

    # Login to PDS
    local pds_response=$(curl -s -X POST "$PDS_URL/xrpc/com.atproto.server.createSession" \
        -H "Content-Type: application/json" \
        -d "{\"identifier\":\"$handle\",\"password\":\"$password\"}")

    local pds_access_jwt=$(echo "$pds_response" | grep -o '"accessJwt":"[^"]*"' | cut -d'"' -f4)
    local did=$(echo "$pds_response" | grep -o '"did":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$pds_access_jwt" ] || [ -z "$did" ]; then
        echo -e "${RED}❌ Failed to login to PDS as $handle${NC}"
        echo "   Response: $pds_response"
        exit 1
    fi

    # Return PDS JWT and DID (separated by |)
    echo "$pds_access_jwt|$did"
}

# Function to generate hashtag (8-character hex)
generate_hashtag() {
    # Generate 8 random hex characters
    local hashtag=$(openssl rand -hex 4)
    echo "#atrarium_$hashtag"
}

# Function to create community (directly in PDS)
create_community_pds() {
    local pds_jwt=$1
    local did=$2
    local name=$3
    local description=$4

    # Generate unique hashtag
    local hashtag=$(generate_hashtag)
    local now=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

    # Create community config record in PDS
    local response=$(curl -s -X POST "$PDS_URL/xrpc/com.atproto.repo.createRecord" \
        -H "Authorization: Bearer $pds_jwt" \
        -H "Content-Type: application/json" \
        -d "{
            \"repo\": \"$did\",
            \"collection\": \"net.atrarium.community.config\",
            \"record\": {
                \"\$type\": \"net.atrarium.community.config\",
                \"name\": \"$name\",
                \"description\": \"$description\",
                \"hashtag\": \"$hashtag\",
                \"stage\": \"theme\",
                \"createdAt\": \"$now\"
            }
        }")

    local uri=$(echo "$response" | grep -o '"uri":"[^"]*"' | cut -d'"' -f4)
    local rkey=$(echo "$uri" | rev | cut -d'/' -f1 | rev)

    if [ -z "$rkey" ]; then
        echo -e "${YELLOW}⚠️  Failed to create community: $name${NC}"
        echo "   Response: $response"
        return 1
    fi

    # Return rkey|hashtag|uri
    echo "$rkey|$hashtag|$uri"
}

# Function to add member to community (directly in PDS)
add_member_pds() {
    local pds_jwt=$1
    local member_did=$2
    local community_uri=$3
    local role=$4

    local now=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

    # Create membership record in member's PDS
    local response=$(curl -s -X POST "$PDS_URL/xrpc/com.atproto.repo.createRecord" \
        -H "Authorization: Bearer $pds_jwt" \
        -H "Content-Type: application/json" \
        -d "{
            \"repo\": \"$member_did\",
            \"collection\": \"net.atrarium.community.membership\",
            \"record\": {
                \"\$type\": \"net.atrarium.community.membership\",
                \"community\": \"$community_uri\",
                \"role\": \"$role\",
                \"status\": \"active\",
                \"active\": true,
                \"joinedAt\": \"$now\"
            }
        }")

    if echo "$response" | grep -q '"uri"'; then
        return 0
    else
        echo -e "${YELLOW}⚠️  Failed to add member to community${NC}"
        echo "   Response: $response"
        return 1
    fi
}

# Function to create post (directly in PDS)
create_post_pds() {
    local pds_jwt=$1
    local author_did=$2
    local community_id=$3
    local hashtag=$4
    local text=$5

    local now=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

    # Create post record in author's PDS
    local response=$(curl -s -X POST "$PDS_URL/xrpc/com.atproto.repo.createRecord" \
        -H "Authorization: Bearer $pds_jwt" \
        -H "Content-Type: application/json" \
        -d "{
            \"repo\": \"$author_did\",
            \"collection\": \"net.atrarium.community.post\",
            \"record\": {
                \"\$type\": \"net.atrarium.community.post\",
                \"text\": \"$text $hashtag\",
                \"communityId\": \"$community_id\",
                \"createdAt\": \"$now\"
            }
        }")

    if echo "$response" | grep -q '"uri"'; then
        return 0
    else
        echo -e "${YELLOW}⚠️  Failed to create post${NC}"
        echo "   Response: $response"
        return 1
    fi
}

# ============================================================================
# Main test data loading
# ============================================================================

echo -e "${BLUE}👤 Logging in test accounts...${NC}"

# Login Alice
ALICE_AUTH=$(login_pds "$ALICE_HANDLE" "$ALICE_PASSWORD")
ALICE_JWT=$(echo "$ALICE_AUTH" | cut -d'|' -f1)
ALICE_DID=$(echo "$ALICE_AUTH" | cut -d'|' -f2)
echo -e "${GREEN}✅ Alice logged in${NC} (DID: $ALICE_DID)"

# Login Bob
BOB_AUTH=$(login_pds "$BOB_HANDLE" "$BOB_PASSWORD")
BOB_JWT=$(echo "$BOB_AUTH" | cut -d'|' -f1)
BOB_DID=$(echo "$BOB_AUTH" | cut -d'|' -f2)
echo -e "${GREEN}✅ Bob logged in${NC} (DID: $BOB_DID)"

# Login Moderator
MOD_AUTH=$(login_pds "$MODERATOR_HANDLE" "$MODERATOR_PASSWORD")
MOD_JWT=$(echo "$MOD_AUTH" | cut -d'|' -f1)
MOD_DID=$(echo "$MOD_AUTH" | cut -d'|' -f2)
echo -e "${GREEN}✅ Moderator logged in${NC} (DID: $MOD_DID)"

echo ""
echo -e "${BLUE}🏘️  Creating communities and themes...${NC}"

# ============================================================================
# 1. Design Community (community stage) + UI/UX Theme (theme stage)
# ============================================================================
echo -e "${YELLOW}Creating Design Community with UI/UX Theme...${NC}"

# Alice creates Design Community (parent community)
DESIGN_RESULT=$(create_community_pds "$ALICE_JWT" "$ALICE_DID" "Design Community" "A community for designers")
if [ -n "$DESIGN_RESULT" ]; then
    DESIGN_ID=$(echo "$DESIGN_RESULT" | cut -d'|' -f1)
    DESIGN_HASHTAG=$(echo "$DESIGN_RESULT" | cut -d'|' -f2)
    DESIGN_URI=$(echo "$DESIGN_RESULT" | cut -d'|' -f3)
    echo -e "${GREEN}✅ Created Design Community (community)${NC} (Hashtag: $DESIGN_HASHTAG)"

    # Update stage to community
    curl -s -X POST "$PDS_URL/xrpc/com.atproto.repo.putRecord" \
        -H "Authorization: Bearer $ALICE_JWT" \
        -H "Content-Type: application/json" \
        -d "{
            \"repo\": \"$ALICE_DID\",
            \"collection\": \"net.atrarium.community.config\",
            \"rkey\": \"$DESIGN_ID\",
            \"record\": {
                \"\$type\": \"net.atrarium.community.config\",
                \"name\": \"Design Community\",
                \"description\": \"A community for designers\",
                \"hashtag\": \"$DESIGN_HASHTAG\",
                \"stage\": \"community\",
                \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
            }
        }" > /dev/null

    # Add members
    add_member_pds "$ALICE_JWT" "$ALICE_DID" "$DESIGN_URI" "owner"
    add_member_pds "$BOB_JWT" "$BOB_DID" "$DESIGN_URI" "member"
    add_member_pds "$MOD_JWT" "$MOD_DID" "$DESIGN_URI" "moderator"
    echo -e "${GREEN}   ✅ Added members (Alice: owner, Bob: member, Moderator: moderator)${NC}"
fi

# Alice creates UI/UX Theme (child theme of Design Community)
UIUX_RESULT=$(create_community_pds "$ALICE_JWT" "$ALICE_DID" "UI/UX Design" "Discuss user interface and experience design")
if [ -n "$UIUX_RESULT" ]; then
    UIUX_ID=$(echo "$UIUX_RESULT" | cut -d'|' -f1)
    UIUX_HASHTAG=$(echo "$UIUX_RESULT" | cut -d'|' -f2)
    UIUX_URI=$(echo "$UIUX_RESULT" | cut -d'|' -f3)
    echo -e "${GREEN}✅ Created UI/UX Design Theme (theme)${NC} (Hashtag: $UIUX_HASHTAG)"

    # Add members (theme stage stays as default)
    add_member_pds "$ALICE_JWT" "$ALICE_DID" "$UIUX_URI" "owner"
    add_member_pds "$BOB_JWT" "$BOB_DID" "$UIUX_URI" "member"
    echo -e "${GREEN}   ✅ Added members (Alice: owner, Bob: member)${NC}"
fi

# ============================================================================
# 2. Tech Community (community stage) + AI Theme (theme stage)
# ============================================================================
echo -e "${YELLOW}Creating Tech Community with AI Theme...${NC}"

# Bob creates Tech Community (parent community)
TECH_RESULT=$(create_community_pds "$BOB_JWT" "$BOB_DID" "Tech Community" "Discuss latest tech trends")
if [ -n "$TECH_RESULT" ]; then
    TECH_ID=$(echo "$TECH_RESULT" | cut -d'|' -f1)
    TECH_HASHTAG=$(echo "$TECH_RESULT" | cut -d'|' -f2)
    TECH_URI=$(echo "$TECH_RESULT" | cut -d'|' -f3)
    echo -e "${GREEN}✅ Created Tech Community (community)${NC} (Hashtag: $TECH_HASHTAG)"

    # Update stage to community
    curl -s -X POST "$PDS_URL/xrpc/com.atproto.repo.putRecord" \
        -H "Authorization: Bearer $BOB_JWT" \
        -H "Content-Type: application/json" \
        -d "{
            \"repo\": \"$BOB_DID\",
            \"collection\": \"net.atrarium.community.config\",
            \"rkey\": \"$TECH_ID\",
            \"record\": {
                \"\$type\": \"net.atrarium.community.config\",
                \"name\": \"Tech Community\",
                \"description\": \"Discuss latest tech trends\",
                \"hashtag\": \"$TECH_HASHTAG\",
                \"stage\": \"community\",
                \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
            }
        }" > /dev/null

    # Add members
    add_member_pds "$BOB_JWT" "$BOB_DID" "$TECH_URI" "owner"
    add_member_pds "$ALICE_JWT" "$ALICE_DID" "$TECH_URI" "member"
    echo -e "${GREEN}   ✅ Added members (Bob: owner, Alice: member)${NC}"
fi

# Bob creates AI Theme (child theme of Tech Community)
AI_RESULT=$(create_community_pds "$BOB_JWT" "$BOB_DID" "AI & Machine Learning" "Artificial intelligence and ML discussions")
if [ -n "$AI_RESULT" ]; then
    AI_ID=$(echo "$AI_RESULT" | cut -d'|' -f1)
    AI_HASHTAG=$(echo "$AI_RESULT" | cut -d'|' -f2)
    AI_URI=$(echo "$AI_RESULT" | cut -d'|' -f3)
    echo -e "${GREEN}✅ Created AI & Machine Learning Theme (theme)${NC} (Hashtag: $AI_HASHTAG)"

    # Add members
    add_member_pds "$BOB_JWT" "$BOB_DID" "$AI_URI" "owner"
    add_member_pds "$ALICE_JWT" "$ALICE_DID" "$AI_URI" "member"
    echo -e "${GREEN}   ✅ Added members (Bob: owner, Alice: member)${NC}"
fi

# ============================================================================
# 3. Game Community (independent community, no themes)
# ============================================================================
echo -e "${YELLOW}Creating Game Community (independent)...${NC}"

# Alice creates Game Community (independent, no child themes)
GAME_RESULT=$(create_community_pds "$ALICE_JWT" "$ALICE_DID" "Game Community" "Gaming enthusiasts")
if [ -n "$GAME_RESULT" ]; then
    GAME_ID=$(echo "$GAME_RESULT" | cut -d'|' -f1)
    GAME_HASHTAG=$(echo "$GAME_RESULT" | cut -d'|' -f2)
    GAME_URI=$(echo "$GAME_RESULT" | cut -d'|' -f3)
    echo -e "${GREEN}✅ Created Game Community (community, independent)${NC} (Hashtag: $GAME_HASHTAG)"

    # Update stage to community
    curl -s -X POST "$PDS_URL/xrpc/com.atproto.repo.putRecord" \
        -H "Authorization: Bearer $ALICE_JWT" \
        -H "Content-Type: application/json" \
        -d "{
            \"repo\": \"$ALICE_DID\",
            \"collection\": \"net.atrarium.community.config\",
            \"rkey\": \"$GAME_ID\",
            \"record\": {
                \"\$type\": \"net.atrarium.community.config\",
                \"name\": \"Game Community\",
                \"description\": \"Gaming enthusiasts\",
                \"hashtag\": \"$GAME_HASHTAG\",
                \"stage\": \"community\",
                \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
            }
        }" > /dev/null

    # Add members
    add_member_pds "$ALICE_JWT" "$ALICE_DID" "$GAME_URI" "owner"
    add_member_pds "$BOB_JWT" "$BOB_DID" "$GAME_URI" "member"
    echo -e "${GREEN}   ✅ Added members (Alice: owner, Bob: member)${NC}"
fi

echo ""
echo -e "${BLUE}📝 Creating posts...${NC}"

# ============================================================================
# Posts to Design Community (community-level feed)
# ============================================================================
if [ -n "$DESIGN_ID" ]; then
    echo -e "${YELLOW}Creating posts for Design Community...${NC}"

    create_post_pds "$ALICE_JWT" "$ALICE_DID" "$DESIGN_ID" "$DESIGN_HASHTAG" "Welcome to Design Community! Let's share creative ideas 🎨"
    create_post_pds "$BOB_JWT" "$BOB_DID" "$DESIGN_ID" "$DESIGN_HASHTAG" "Excited to be part of this community!"
    create_post_pds "$MOD_JWT" "$MOD_DID" "$DESIGN_ID" "$DESIGN_HASHTAG" "Looking forward to great discussions here."

    echo -e "${GREEN}✅ Created 3 posts in Design Community feed${NC}"
fi

# ============================================================================
# Posts to UI/UX Theme (theme-specific feed under Design)
# ============================================================================
if [ -n "$UIUX_ID" ]; then
    echo -e "${YELLOW}Creating posts for UI/UX Theme...${NC}"

    create_post_pds "$ALICE_JWT" "$ALICE_DID" "$UIUX_ID" "$UIUX_HASHTAG" "What are your favorite UI frameworks in 2025? I'm currently exploring shadcn/ui 💻"
    create_post_pds "$BOB_JWT" "$BOB_DID" "$UIUX_ID" "$UIUX_HASHTAG" "Just finished a UX audit - the importance of user research cannot be overstated!"
    create_post_pds "$ALICE_JWT" "$ALICE_DID" "$UIUX_ID" "$UIUX_HASHTAG" "Hot take: Dark mode should be the default for design tools 🌙"

    echo -e "${GREEN}✅ Created 3 posts in UI/UX Theme feed${NC}"
fi

# ============================================================================
# Posts to Tech Community (community-level feed)
# ============================================================================
if [ -n "$TECH_ID" ]; then
    echo -e "${YELLOW}Creating posts for Tech Community...${NC}"

    create_post_pds "$BOB_JWT" "$BOB_DID" "$TECH_ID" "$TECH_HASHTAG" "Welcome to Tech Community! Share your latest tech discoveries 🚀"
    create_post_pds "$ALICE_JWT" "$ALICE_DID" "$TECH_ID" "$TECH_HASHTAG" "Just learned about Cloudflare Workers - serverless is the future!"
    create_post_pds "$BOB_JWT" "$BOB_DID" "$TECH_ID" "$TECH_HASHTAG" "What's everyone working on this week?"

    echo -e "${GREEN}✅ Created 3 posts in Tech Community feed${NC}"
fi

# ============================================================================
# Posts to AI Theme (theme-specific feed under Tech)
# ============================================================================
if [ -n "$AI_ID" ]; then
    echo -e "${YELLOW}Creating posts for AI Theme...${NC}"

    create_post_pds "$BOB_JWT" "$BOB_DID" "$AI_ID" "$AI_HASHTAG" "GPT-5 rumors are heating up - anyone following the latest developments? 🤖"
    create_post_pds "$ALICE_JWT" "$ALICE_DID" "$AI_ID" "$AI_HASHTAG" "Experimenting with local LLMs - the performance improvements are impressive!"
    create_post_pds "$BOB_JWT" "$BOB_DID" "$AI_ID" "$AI_HASHTAG" "Reminder: AI ethics discussions are just as important as technical advancements 💭"

    echo -e "${GREEN}✅ Created 3 posts in AI Theme feed${NC}"
fi

# ============================================================================
# Posts to Game Community (independent community feed)
# ============================================================================
if [ -n "$GAME_ID" ]; then
    echo -e "${YELLOW}Creating posts for Game Community...${NC}"

    create_post_pds "$ALICE_JWT" "$ALICE_DID" "$GAME_ID" "$GAME_HASHTAG" "Welcome to Game Community! What are you playing? 🎮"
    create_post_pds "$BOB_JWT" "$BOB_DID" "$GAME_ID" "$GAME_HASHTAG" "Just finished Baldur's Gate 3 - what an incredible RPG experience!"
    create_post_pds "$ALICE_JWT" "$ALICE_DID" "$GAME_ID" "$GAME_HASHTAG" "Indie game recommendations? I'm looking for something relaxing 🌟"
    create_post_pds "$BOB_JWT" "$BOB_DID" "$GAME_ID" "$GAME_HASHTAG" "Gaming session tonight at 8pm EST - who's in?"

    echo -e "${GREEN}✅ Created 4 posts in Game Community feed${NC}"
fi

echo ""
echo -e "${BLUE}🛡️  Creating moderation test data...${NC}"

# ============================================================================
# Moderation Actions (net.atrarium.moderation.action)
# ============================================================================
if [ -n "$DESIGN_ID" ] && [ -n "$DESIGN_URI" ]; then
    echo -e "${YELLOW}Creating moderation actions in Design Community...${NC}"

    # Get a post URI for moderation test (use first post by Bob)
    POSTS_RESPONSE=$(curl -s -X GET "$PDS_URL/xrpc/com.atproto.repo.listRecords?repo=$BOB_DID&collection=net.atrarium.community.post&limit=1")
    POST_URI=$(echo "$POSTS_RESPONSE" | grep -o '"uri":"[^"]*"' | head -1 | cut -d'"' -f4)
    POST_CID=$(echo "$POSTS_RESPONSE" | grep -o '"cid":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$POST_URI" ] && [ -n "$POST_CID" ]; then
        # Moderator hides a post for spam
        local now=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
        curl -s -X POST "$PDS_URL/xrpc/com.atproto.repo.createRecord" \
            -H "Authorization: Bearer $MOD_JWT" \
            -H "Content-Type: application/json" \
            -d "{
                \"repo\": \"$MOD_DID\",
                \"collection\": \"net.atrarium.moderation.action\",
                \"record\": {
                    \"\$type\": \"net.atrarium.moderation.action\",
                    \"action\": \"hide_post\",
                    \"target\": {
                        \"uri\": \"$POST_URI\",
                        \"cid\": \"$POST_CID\"
                    },
                    \"community\": \"$DESIGN_URI\",
                    \"reason\": \"spam\",
                    \"createdAt\": \"$now\"
                }
            }" > /dev/null

        echo -e "${GREEN}✅ Created moderation action (hide_post for spam)${NC}"
    fi
fi

echo ""
echo -e "${BLUE}💬 Adding reactions to posts...${NC}"

# ============================================================================
# Reactions (net.atrarium.community.reaction)
# ============================================================================
if [ -n "$DESIGN_ID" ]; then
    echo -e "${YELLOW}Creating reactions in Design Community...${NC}"

    # Get recent posts from Design Community
    POSTS_RESPONSE=$(curl -s -X GET "$PDS_URL/xrpc/com.atproto.repo.listRecords?repo=$ALICE_DID&collection=net.atrarium.community.post&limit=5")
    FIRST_POST_URI=$(echo "$POSTS_RESPONSE" | grep -o '"uri":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$FIRST_POST_URI" ]; then
        # Alice adds thumbs up reaction
        local now=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
        curl -s -X POST "$PDS_URL/xrpc/com.atproto.repo.createRecord" \
            -H "Authorization: Bearer $ALICE_JWT" \
            -H "Content-Type: application/json" \
            -d "{
                \"repo\": \"$ALICE_DID\",
                \"collection\": \"net.atrarium.community.reaction\",
                \"record\": {
                    \"\$type\": \"net.atrarium.community.reaction\",
                    \"reactorDid\": \"$ALICE_DID\",
                    \"postUri\": \"$FIRST_POST_URI\",
                    \"emoji\": {
                        \"type\": \"unicode\",
                        \"value\": \"U+1F44D\"
                    },
                    \"communityId\": \"$DESIGN_ID\",
                    \"createdAt\": \"$now\"
                }
            }" > /dev/null

        # Bob adds heart reaction to same post
        curl -s -X POST "$PDS_URL/xrpc/com.atproto.repo.createRecord" \
            -H "Authorization: Bearer $BOB_JWT" \
            -H "Content-Type: application/json" \
            -d "{
                \"repo\": \"$BOB_DID\",
                \"collection\": \"net.atrarium.community.reaction\",
                \"record\": {
                    \"\$type\": \"net.atrarium.community.reaction\",
                    \"reactorDid\": \"$BOB_DID\",
                    \"postUri\": \"$FIRST_POST_URI\",
                    \"emoji\": {
                        \"type\": \"unicode\",
                        \"value\": \"U+2764\"
                    },
                    \"communityId\": \"$DESIGN_ID\",
                    \"createdAt\": \"$now\"
                }
            }" > /dev/null

        echo -e "${GREEN}✅ Created 2 reactions (👍, ❤️)${NC}"
    fi
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✨ Test Data Loaded Successfully              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo ""
echo -e "${BLUE}Communities & Themes:${NC}"
echo -e "   1. ${GREEN}Design Community${NC} (community stage)"
echo -e "      ├─ Members: Alice (owner), Bob (member), Moderator (moderator)"
echo -e "      ├─ Feed: 3 posts"
echo -e "      └─ ${YELLOW}UI/UX Design${NC} (theme)"
echo -e "         ├─ Members: Alice (owner), Bob (member)"
echo -e "         └─ Feed: 3 posts"
echo ""
echo -e "   2. ${GREEN}Tech Community${NC} (community stage)"
echo -e "      ├─ Members: Bob (owner), Alice (member)"
echo -e "      ├─ Feed: 3 posts"
echo -e "      └─ ${YELLOW}AI & Machine Learning${NC} (theme)"
echo -e "         ├─ Members: Bob (owner), Alice (member)"
echo -e "         └─ Feed: 3 posts"
echo ""
echo -e "   3. ${GREEN}Game Community${NC} (community stage, independent)"
echo -e "      ├─ Members: Alice (owner), Bob (member)"
echo -e "      └─ Feed: 4 posts"
echo ""
echo -e "${BLUE}Users:${NC} 3 (Alice, Bob, Moderator)"
echo -e "${BLUE}Total Posts:${NC} 16 (across all feeds)"
echo -e "${BLUE}Structure:${NC} 3 communities + 2 themes"
echo ""
echo -e "${BLUE}Lexicon Coverage:${NC}"
echo -e "   ✅ net.atrarium.community.config (3 communities, 2 themes)"
echo -e "   ✅ net.atrarium.community.membership (7 memberships across communities)"
echo -e "   ✅ net.atrarium.community.post (16 posts)"
echo -e "   ✅ net.atrarium.community.reaction (2 reactions: 👍, ❤️)"
echo -e "   ✅ net.atrarium.moderation.action (1 hide_post action)"
echo -e "   ⚠️  net.atrarium.emoji.custom (not included - requires blob upload via PDS)"
echo -e "   ⚠️  net.atrarium.emoji.approval (not included - depends on emoji.custom)"
echo ""
echo -e "${BLUE}🌐 Access Dashboard:${NC}"
echo -e "   URL: http://localhost:5173"
echo -e "   Login: $ALICE_HANDLE / $ALICE_PASSWORD"
echo -e "   Alt:   $BOB_HANDLE / $BOB_PASSWORD"
echo ""
echo -e "${YELLOW}💡 Test Data Structure:${NC}"
echo -e "   ✓ Communities with child themes (Design → UI/UX, Tech → AI)"
echo -e "   ✓ Independent community without themes (Game)"
echo -e "   ✓ Separate feeds for communities and themes"
echo -e "   ✓ Posts distributed across all feed levels"
echo -e "   ✓ Moderation actions (hide_post for spam)"
echo -e "   ✓ Unicode emoji reactions (👍, ❤️)"
echo ""
echo -e "${YELLOW}💡 Reset Data:${NC}"
echo -e "   1. Restart PDS: docker compose -f .devcontainer/docker-compose.yml restart pds"
echo -e "   2. Restart server: Ctrl+C and pnpm --filter server dev"
echo -e "   3. Re-run: ./scripts/load-test-data.sh"
echo ""
