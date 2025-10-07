#!/bin/bash
# Start all Atrarium development services
# Usage: ./start-dev.sh [dashboard|backend|pds|all]

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_help() {
    cat <<EOF
🚀 Atrarium Development Starter

Usage: ./start-dev.sh [OPTION]

Options:
    all         Start all services (PDS + Client + Server)
    client      Start only client dev server (dashboard)
    server      Start only server Workers (backend)
    pds         Start only local PDS
    help        Show this help message

Examples:
    ./start-dev.sh all         # Start everything
    ./start-dev.sh client      # Start client only
    ./start-dev.sh             # Start client only (default)

Services:
    📦 PDS:        http://localhost:3000
    🎨 Client:     http://localhost:5173
    ⚙️  Server:     http://localhost:8787

EOF
}

start_pds() {
    echo -e "${BLUE}📦 Starting local PDS...${NC}"
    docker compose -f .devcontainer/docker-compose.yml up -d pds

    echo -e "${YELLOW}⏳ Waiting for PDS to be ready...${NC}"
    sleep 3

    if curl -sf http://localhost:3000/xrpc/_health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PDS is running at http://localhost:3000${NC}"

        # Check if test accounts exist
        if bash .devcontainer/setup-pds.sh > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Test accounts configured${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  PDS may still be starting up...${NC}"
    fi
}

start_client() {
    echo -e "${BLUE}🎨 Starting client dev server...${NC}"

    # Check if node_modules exists
    if [ ! -d "client/node_modules" ]; then
        echo -e "${YELLOW}📦 Installing client dependencies...${NC}"
        pnpm install
    fi

    echo -e "${GREEN}✅ Client will start at http://localhost:5173${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
    pnpm --filter client dev
}

start_server() {
    echo -e "${BLUE}⚙️  Starting server Workers...${NC}"

    # Check if node_modules exists
    if [ ! -d "server/node_modules" ]; then
        echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
        pnpm install
    fi

    echo -e "${GREEN}✅ Server will start at http://localhost:8787${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
    pnpm --filter server dev
}

start_all() {
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  🚀 Starting All Atrarium Services             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""

    # Start PDS
    start_pds
    echo ""

    # Start server in background
    echo -e "${BLUE}⚙️  Starting server Workers in background...${NC}"
    pnpm --filter server dev > /tmp/atrarium-server.log 2>&1 &
    SERVER_PID=$!
    echo -e "${GREEN}✅ Server PID: $SERVER_PID${NC}"
    sleep 2

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ All Services Running                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📦 PDS:${NC}        http://localhost:3000"
    echo -e "${BLUE}🎨 Client:${NC}     http://localhost:5173 (will start next)"
    echo -e "${BLUE}⚙️  Server:${NC}     http://localhost:8787"
    echo ""
    echo -e "${YELLOW}📋 Test Accounts:${NC}"
    echo -e "   - alice.test / test123"
    echo -e "   - bob.test / test123"
    echo -e "   - moderator.test / test123"
    echo ""
    echo -e "${YELLOW}💡 Server logs: tail -f /tmp/atrarium-server.log${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop client (server will keep running)${NC}"
    echo ""

    # Start client in foreground
    start_client

    # Cleanup when client stops
    echo -e "${YELLOW}Stopping server...${NC}"
    kill $SERVER_PID 2>/dev/null || true
}

# Main
MODE="${1:-client}"

case "$MODE" in
    help|--help|-h)
        show_help
        ;;
    all)
        start_all
        ;;
    client)
        start_client
        ;;
    server)
        start_server
        ;;
    pds)
        start_pds
        ;;
    *)
        echo -e "${YELLOW}⚠️  Unknown option: $MODE${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
