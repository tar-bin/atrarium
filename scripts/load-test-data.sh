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
echo -e "${BLUE}🏘️  Creating communities...${NC}"

# Alice creates Design Community
DESIGN_RESULT=$(create_community_pds "$ALICE_JWT" "$ALICE_DID" "Design Community" "A community for designers")
if [ -n "$DESIGN_RESULT" ]; then
    DESIGN_ID=$(echo "$DESIGN_RESULT" | cut -d'|' -f1)
    DESIGN_HASHTAG=$(echo "$DESIGN_RESULT" | cut -d'|' -f2)
    DESIGN_URI=$(echo "$DESIGN_RESULT" | cut -d'|' -f3)
    echo -e "${GREEN}✅ Created Design Community${NC} (ID: $DESIGN_ID, Hashtag: $DESIGN_HASHTAG)"

    # Add Alice as owner
    if add_member_pds "$ALICE_JWT" "$ALICE_DID" "$DESIGN_URI" "owner"; then
        echo -e "${GREEN}   ✅ Added Alice as owner${NC}"
    fi

    # Add Bob as member
    if add_member_pds "$BOB_JWT" "$BOB_DID" "$DESIGN_URI" "member"; then
        echo -e "${GREEN}   ✅ Added Bob as member${NC}"
    fi

    # Add Moderator as moderator
    if add_member_pds "$MOD_JWT" "$MOD_DID" "$DESIGN_URI" "moderator"; then
        echo -e "${GREEN}   ✅ Added Moderator as moderator${NC}"
    fi
fi

# Alice creates Tech Community
TECH_RESULT=$(create_community_pds "$ALICE_JWT" "$ALICE_DID" "Tech Community" "Discuss latest tech trends")
if [ -n "$TECH_RESULT" ]; then
    TECH_ID=$(echo "$TECH_RESULT" | cut -d'|' -f1)
    TECH_HASHTAG=$(echo "$TECH_RESULT" | cut -d'|' -f2)
    TECH_URI=$(echo "$TECH_RESULT" | cut -d'|' -f3)
    echo -e "${GREEN}✅ Created Tech Community${NC} (ID: $TECH_ID, Hashtag: $TECH_HASHTAG)"

    # Add Alice as owner
    if add_member_pds "$ALICE_JWT" "$ALICE_DID" "$TECH_URI" "owner"; then
        echo -e "${GREEN}   ✅ Added Alice as owner${NC}"
    fi

    # Add Bob as member
    if add_member_pds "$BOB_JWT" "$BOB_DID" "$TECH_URI" "member"; then
        echo -e "${GREEN}   ✅ Added Bob as member${NC}"
    fi
fi

# Bob creates Game Community
GAME_RESULT=$(create_community_pds "$BOB_JWT" "$BOB_DID" "Game Community" "Gaming enthusiasts")
if [ -n "$GAME_RESULT" ]; then
    GAME_ID=$(echo "$GAME_RESULT" | cut -d'|' -f1)
    GAME_HASHTAG=$(echo "$GAME_RESULT" | cut -d'|' -f2)
    GAME_URI=$(echo "$GAME_RESULT" | cut -d'|' -f3)
    echo -e "${GREEN}✅ Created Game Community${NC} (ID: $GAME_ID, Hashtag: $GAME_HASHTAG)"

    # Add Bob as owner
    if add_member_pds "$BOB_JWT" "$BOB_DID" "$GAME_URI" "owner"; then
        echo -e "${GREEN}   ✅ Added Bob as owner${NC}"
    fi

    # Add Alice as member
    if add_member_pds "$ALICE_JWT" "$ALICE_DID" "$GAME_URI" "member"; then
        echo -e "${GREEN}   ✅ Added Alice as member${NC}"
    fi
fi

echo ""
echo -e "${BLUE}📝 Creating posts...${NC}"

# Posts in Design Community
if [ -n "$DESIGN_ID" ]; then
    if create_post_pds "$BOB_JWT" "$BOB_DID" "$DESIGN_ID" "$DESIGN_HASHTAG" "Hello from the Design Community! 🎨"; then
        echo -e "${GREEN}✅ Bob posted to Design Community${NC}"
    fi

    if create_post_pds "$ALICE_JWT" "$ALICE_DID" "$DESIGN_ID" "$DESIGN_HASHTAG" "Welcome everyone! Let's discuss UI/UX trends."; then
        echo -e "${GREEN}✅ Alice posted to Design Community${NC}"
    fi

    if create_post_pds "$BOB_JWT" "$BOB_DID" "$DESIGN_ID" "$DESIGN_HASHTAG" "Check out this cool design pattern I found!"; then
        echo -e "${GREEN}✅ Bob posted again to Design Community${NC}"
    fi
fi

# Posts in Tech Community
if [ -n "$TECH_ID" ]; then
    if create_post_pds "$ALICE_JWT" "$ALICE_DID" "$TECH_ID" "$TECH_HASHTAG" "What's everyone's favorite programming language? 💻"; then
        echo -e "${GREEN}✅ Alice posted to Tech Community${NC}"
    fi

    if create_post_pds "$BOB_JWT" "$BOB_DID" "$TECH_ID" "$TECH_HASHTAG" "Just learned about Cloudflare Workers - amazing!"; then
        echo -e "${GREEN}✅ Bob posted to Tech Community${NC}"
    fi
fi

# Posts in Game Community
if [ -n "$GAME_ID" ]; then
    if create_post_pds "$ALICE_JWT" "$ALICE_DID" "$GAME_ID" "$GAME_HASHTAG" "Anyone playing the new indie game? 🎮"; then
        echo -e "${GREEN}✅ Alice posted to Game Community${NC}"
    fi

    if create_post_pds "$BOB_JWT" "$BOB_DID" "$GAME_ID" "$GAME_HASHTAG" "Gaming session tonight at 8pm EST!"; then
        echo -e "${GREEN}✅ Bob posted to Game Community${NC}"
    fi
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✨ Test Data Loaded Successfully              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "   Communities: 3 (Design, Tech, Game)"
echo -e "   Users: 3 (Alice, Bob, Moderator)"
echo -e "   Posts: ~7 across communities"
echo ""
echo -e "${BLUE}🌐 Access Dashboard:${NC}"
echo -e "   URL: http://localhost:5173"
echo -e "   Login with: $ALICE_HANDLE / $ALICE_PASSWORD"
echo ""
echo -e "${YELLOW}💡 Note: Data is stored in PDS and Durable Objects${NC}"
echo -e "   To reset data, restart PDS and clear Durable Objects storage"
echo ""
