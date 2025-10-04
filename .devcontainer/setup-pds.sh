#!/bin/bash
# Setup script for local PDS test accounts
# Run this after DevContainer starts

set -e

PDS_URL="${PDS_URL:-http://pds:3000}"

echo "🔧 Setting up Bluesky PDS for Atrarium testing..."

# Wait for PDS to be ready
echo "⏳ Waiting for PDS to start..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -sf "$PDS_URL/xrpc/_health" > /dev/null 2>&1; then
        echo "✅ PDS is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ PDS failed to start within timeout"
    exit 1
fi

# Create test accounts via API
echo ""
echo "👤 Creating test accounts via API..."

# Function to create account
create_account() {
    local email=$1
    local handle=$2
    local password=$3

    # Try to create account
    response=$(curl -s -X POST "$PDS_URL/xrpc/com.atproto.server.createAccount" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"handle\": \"$handle\",
            \"password\": \"$password\"
        }" 2>&1)

    # Check if account already exists or was created
    if echo "$response" | grep -q "\"did\":"; then
        echo "   ✅ Created $handle"
        return 0
    elif echo "$response" | grep -qi "already exists\|handle already taken"; then
        echo "   $handle already exists"
        return 0
    else
        echo "   ⚠️  Failed to create $handle: $response"
        return 1
    fi
}

create_account "alice@test.local" "alice.test" "test123"
create_account "bob@test.local" "bob.test" "test123"
create_account "moderator@test.local" "moderator.test" "test123"

echo ""
echo "✨ PDS setup complete!"
echo ""
echo "📋 Test Accounts:"
echo "   - alice.test / test123"
echo "   - bob.test / test123"
echo "   - moderator.test / test123"
echo ""
echo "🌐 PDS URL: $PDS_URL"
echo "📖 Health check: curl $PDS_URL/xrpc/_health"
echo ""
echo "🧪 Run integration tests:"
echo "   npm test tests/integration/pds-posting.test.ts"
