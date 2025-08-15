#!/bin/bash

# AI Gupshup Platform - Repository Setup Script
# This script helps create a dedicated repository for the AI Gupshup platform

echo "🎯 AI Gupshup Platform - Repository Setup"
echo "=========================================="
echo ""

echo "📋 Step 1: Manual GitHub Repository Creation"
echo "1. Go to: https://github.com/theemubin"
echo "2. Click 'New repository'"
echo "3. Repository name: AI-Gupshup"
echo "4. Description: AI-powered educational roundtable discussion platform"
echo "5. Make it Public (for open source)"
echo "6. Don't initialize with README"
echo "7. Click 'Create repository'"
echo ""

read -p "Have you created the repository? Press Enter to continue..."

echo "🚀 Step 2: Setting up remote and pushing code"

# Add new remote for the dedicated repository
echo "Adding remote repository..."
git remote add gupshup https://github.com/theemubin/AI-Gupshup.git

# Push to the new repository
echo "Pushing code to AI-Gupshup repository..."
git push -u gupshup main

echo ""
echo "✅ Success! Your AI Gupshup Platform is now available at:"
echo "📁 Repository: https://github.com/theemubin/AI-Gupshup"
echo ""
echo "🚀 Next Steps:"
echo "1. Deploy backend to Render: https://render.com"
echo "2. Deploy frontend to Vercel: https://vercel.com" 
echo "3. See DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
echo "🎉 Happy coding!"
