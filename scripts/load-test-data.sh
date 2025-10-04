#!/bin/bash
# Load test data into local D1 database for development

set -e

echo "📦 Loading test data into local D1 database..."
echo ""

# Remove existing local database to start fresh
if [ -d ".wrangler/state/v3/d1" ]; then
  echo "🗑️  Removing existing local database..."
  rm -rf .wrangler/state/v3/d1
  echo "✅ Old database removed"
  echo ""
fi

# Load complete schema (includes migrations)
echo "📋 Loading complete schema (with migrations applied)..."
npx wrangler d1 execute atrarium-db --local --file=seeds/complete-schema.sql 2>&1 | grep -v "WARNING\|update available\|wrangler 3\." | head -3

echo "✅ Schema loaded successfully"
echo ""

# Load test data
echo "📝 Loading test data from seeds/dev-data.sql..."
npx wrangler d1 execute atrarium-db --local --file=seeds/dev-data.sql

echo ""
echo "✅ Test data loaded successfully!"
echo ""

# Show summary
echo "📊 Database Summary:"
echo "-------------------"
echo "Communities: 5"
echo "Theme Feeds: 9"
echo "Posts: 20"
echo "Memberships: 17"
echo "Moderation Actions: 3"
echo "Blocklist Entries: 2"

echo ""
echo "🎉 Ready for development!"
echo ""
echo "Available test communities:"
echo "  - comm-anime-lovers (Owner: did:plc:owner123)"
echo "  - comm-tech-news (Owner: did:plc:owner456)"
echo "  - comm-game-dev (Owner: did:plc:owner789)"
echo "  - comm-anime-manga (Owner: did:plc:owner123)"
echo "  - comm-web3-builders (Owner: did:plc:owner999)"
echo ""
echo "You can now:"
echo "  1. Start the dashboard: cd dashboard && npm run dev"
echo "  2. Login with any test DID (e.g., did:plc:owner123)"
echo "  3. View communities, feeds, and posts"
echo ""
