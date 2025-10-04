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
    all         Start all services (PDS + Dashboard + Backend)
    dashboard   Start only dashboard dev server
    backend     Start only backend Workers
    pds         Start only local PDS
    help        Show this help message

Examples:
    ./start-dev.sh all         # Start everything
    ./start-dev.sh dashboard   # Start dashboard only
    ./start-dev.sh             # Start dashboard only (default)

Services:
    📦 PDS:        http://localhost:3000
    🎨 Dashboard:  http://localhost:5173
    ⚙️  Backend:    http://localhost:8787

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

start_dashboard() {
    echo -e "${BLUE}🎨 Starting dashboard dev server...${NC}"
    cd dashboard

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dashboard dependencies...${NC}"
        npm install
    fi

    echo -e "${GREEN}✅ Dashboard will start at http://localhost:5173${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
    npm run dev
}

start_backend() {
    echo -e "${BLUE}⚙️  Starting backend Workers...${NC}"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
        npm install
    fi

    echo -e "${GREEN}✅ Backend will start at http://localhost:8787${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
    npm run dev
}

start_all() {
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  🚀 Starting All Atrarium Services             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""

    # Start PDS
    start_pds
    echo ""

    # Start backend in background
    echo -e "${BLUE}⚙️  Starting backend Workers in background...${NC}"
    npm run dev > /tmp/atrarium-backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Backend PID: $BACKEND_PID${NC}"
    sleep 2

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ All Services Running                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📦 PDS:${NC}        http://localhost:3000"
    echo -e "${BLUE}🎨 Dashboard:${NC}  http://localhost:5173 (will start next)"
    echo -e "${BLUE}⚙️  Backend:${NC}    http://localhost:8787"
    echo ""
    echo -e "${YELLOW}📋 Test Accounts:${NC}"
    echo -e "   - alice.test / test123"
    echo -e "   - bob.test / test123"
    echo -e "   - moderator.test / test123"
    echo ""
    echo -e "${YELLOW}💡 Backend logs: tail -f /tmp/atrarium-backend.log${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop dashboard (backend will keep running)${NC}"
    echo ""

    # Start dashboard in foreground
    start_dashboard

    # Cleanup when dashboard stops
    echo -e "${YELLOW}Stopping backend...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
}

# Main
MODE="${1:-dashboard}"

case "$MODE" in
    help|--help|-h)
        show_help
        ;;
    all)
        start_all
        ;;
    dashboard)
        start_dashboard
        ;;
    backend)
        start_backend
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
