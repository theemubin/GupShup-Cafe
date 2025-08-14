#!/bin/bash

# AI Roundtable Discussion Platform - Setup Script
# This script sets up the development environment

echo "🚀 Setting up AI Roundtable Discussion Platform..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -c 2-)
REQUIRED_VERSION="18.0.0"

if ! [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $REQUIRED_VERSION or higher is required. Current version: $NODE_VERSION"
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies
echo ""
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Install server dependencies
echo ""
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Create data directory for SQLite
echo ""
echo "📁 Creating data directory..."
mkdir -p server/data

# Copy environment files if they don't exist
echo ""
echo "⚙️ Setting up environment files..."

if [ ! -f "client/.env" ]; then
    cp client/.env.example client/.env
    echo "✅ Created client/.env from template"
else
    echo "ℹ️ client/.env already exists"
fi

if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo "✅ Created server/.env from template"
else
    echo "ℹ️ server/.env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Review and update environment files:"
echo "   - client/.env"
echo "   - server/.env"
echo ""
echo "2. Optional: Get a free Hugging Face API key for AI topics:"
echo "   - Visit: https://huggingface.co/settings/tokens"
echo "   - Add the key to both .env files"
echo ""
echo "3. Start the development servers:"
echo "   npm run dev"
echo ""
echo "4. Access the application:"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend:  http://localhost:3001"
echo ""
echo "📚 For more information, see docs/development.md"
echo ""
