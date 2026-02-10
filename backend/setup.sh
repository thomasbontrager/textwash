#!/bin/bash

echo "🧼 TextWash Backend Setup"
echo "=========================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Make sure PostgreSQL is installed and running."
else
    echo "✅ PostgreSQL client detected"
fi

echo ""
echo "Step 1: Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"

echo ""
echo "Step 2: Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration:"
    echo "   - DATABASE_URL (PostgreSQL connection string)"
    echo "   - JWT_SECRET (generate a secure random string)"
    echo "   - STRIPE_* keys (optional, for billing)"
    echo "   - LLM_* settings (optional, for AI features)"
    echo ""
    echo "   After editing .env, run this script again."
    exit 0
else
    echo "✅ .env file exists"
fi

echo ""
echo "Step 3: Generating Prisma client..."
npm run prisma:generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi
echo "✅ Prisma client generated"

echo ""
echo "Step 4: Running database migrations..."
npm run prisma:migrate

if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    echo "   Make sure PostgreSQL is running and DATABASE_URL is correct"
    exit 1
fi
echo "✅ Database migrations completed"

echo ""
echo "Step 5: Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build successful"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start development server: npm run dev"
echo "2. Or start production server: npm start"
echo "3. Access API at: http://localhost:3000"
echo "4. View database: npm run prisma:studio"
echo ""
echo "Create your first admin user by signing up, then manually"
echo "update the user role to ADMIN in the database."
