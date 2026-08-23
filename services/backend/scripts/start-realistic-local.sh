#!/bin/bash

# ===================================================================
# InstaShop Backend - Realistic Local Development Startup Script
# ===================================================================

echo "🚀 Starting InstaShop Backend in Realistic Local Mode"
echo "======================================================="

# Check if Docker is running for PostgreSQL
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL container if not running
echo "🐘 Setting up PostgreSQL database..."
if [ ! "$(docker ps -q -f name=instashop-postgres)" ]; then
    if [ "$(docker ps -aq -f status=exited -f name=instashop-postgres)" ]; then
        echo "   Starting existing PostgreSQL container..."
        docker start instashop-postgres
    else
        echo "   Creating new PostgreSQL container..."
        docker run -d \
            --name instashop-postgres \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=localpassword \
            -e POSTGRES_DB=instashop_local \
            -p 5432:5432 \
            postgres:14
    fi
    
    echo "   Waiting for PostgreSQL to be ready..."
    sleep 5
fi

echo "✅ PostgreSQL is running"

# Set environment for realistic testing
export ENV=local
export ENABLE_MOCK_SERVICES=false
export SKIP_SMS_VERIFICATION=false
export SKIP_EMAIL_VERIFICATION=false

# Kill any existing test server on port 8088
if lsof -Pi :8088 -sTCP:LISTEN -t >/dev/null ; then
    echo "🛑 Stopping existing test server on port 8088..."
    lsof -ti:8088 | xargs kill -9
fi

# Build the application
echo "🔨 Building application..."
go build -o ./bin/instashop-api ./main.go

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"

# Run realistic seeding
echo "🌱 Running realistic data seeding..."
go run scripts/seed-realistic.go

echo ""
echo "🎯 InstaShop Backend is ready for realistic testing!"
echo "======================================================="
echo "📍 API URL: http://localhost:8088"
echo "📍 Health: http://localhost:8088/health"
echo "🗄️  Database: PostgreSQL on port 5432"
echo "🎨 Frontend CORS: localhost:3000, localhost:3001"
echo ""
echo "✨ Features enabled for realistic testing:"
echo "   ✅ Real database with minimal seed data"
echo "   ✅ Real API endpoints (no mocks)"
echo "   ✅ SMS/Email verification required"
echo "   ✅ Real payment processing (test mode)"
echo "   ✅ Proper user registration flow"
echo ""
echo "🚀 Starting server..."
./bin/instashop-api