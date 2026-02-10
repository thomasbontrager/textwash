#!/bin/bash
# Quick start script for TextWash SaaS

set -e

echo "🚀 TextWash Quick Start Setup"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "${BLUE}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi

echo "${GREEN}✓ Node.js $(node --version)${NC}"
echo "${GREEN}✓ npm $(npm --version)${NC}"

# Setup backend
echo ""
echo "${BLUE}Setting up backend...${NC}"
cd backend

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "${YELLOW}⚠️ Edit backend/.env with your configuration${NC}"
fi

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npm run prisma:generate

echo "${GREEN}✓ Backend ready${NC}"
cd ..

# Setup frontend
echo ""
echo "${BLUE}Setting up frontend...${NC}"

if [ ! -f ".env" ]; then
    echo "Creating frontend .env file..."
    cp .env.example .env
    echo "${YELLOW}⚠️ Edit .env with your API URL${NC}"
fi

echo "${GREEN}✓ Frontend ready${NC}"

# Summary
echo ""
echo "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Backend:"
echo "   cd backend"
echo "   Edit .env with your configuration"
echo "   npm run prisma:migrate (if this is first time)"
echo "   npm run dev"
echo ""
echo "2. Frontend:"
echo "   Start a local server:"
echo "   python -m http.server 3001"
echo "   OR"
echo "   npx http-server -p 3001"
echo ""
echo "3. Visit:"
echo "   http://localhost:3001"
echo ""
echo "For full setup guide, see README.md"
echo ""
