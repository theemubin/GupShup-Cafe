@echo off
REM AI Roundtable Discussion Platform - Setup Script for Windows
REM This script sets up the development environment

echo 🚀 Setting up AI Roundtable Discussion Platform...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM Install root dependencies
echo.
echo 📦 Installing root dependencies...
npm install

REM Install client dependencies
echo.
echo 📦 Installing client dependencies...
cd client
npm install
cd ..

REM Install server dependencies
echo.
echo 📦 Installing server dependencies...
cd server
npm install
cd ..

REM Create data directory for SQLite
echo.
echo 📁 Creating data directory...
if not exist "server\data" mkdir server\data

REM Copy environment files if they don't exist
echo.
echo ⚙️ Setting up environment files...

if not exist "client\.env" (
    copy "client\.env.example" "client\.env"
    echo ✅ Created client\.env from template
) else (
    echo ℹ️ client\.env already exists
)

if not exist "server\.env" (
    copy "server\.env.example" "server\.env"
    echo ✅ Created server\.env from template
) else (
    echo ℹ️ server\.env already exists
)

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Review and update environment files:
echo    - client\.env
echo    - server\.env
echo.
echo 2. Optional: Get a free Hugging Face API key for AI topics:
echo    - Visit: https://huggingface.co/settings/tokens
echo    - Add the key to both .env files
echo.
echo 3. Start the development servers:
echo    npm run dev
echo.
echo 4. Access the application:
echo    - Frontend: http://localhost:5173
echo    - Backend:  http://localhost:3001
echo.
echo 📚 For more information, see docs\development.md
echo.
pause
