@echo off
echo 🚀 Setting up My Calendar App...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo After installation, restart your terminal/command prompt
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

:: Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available
    pause
    exit /b 1
)

echo ✅ npm is available
npm --version

echo.
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully!

:: Create .env file if it doesn't exist
if not exist ".env" (
    if exist ".env.example" (
        echo.
        echo 📝 Creating .env file from .env.example...
        copy ".env.example" ".env"
        echo ✅ .env file created! Please edit it with your configuration.
    )
)

echo.
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. Edit the .env file with your database and API credentials
echo 2. Set up a PostgreSQL database (local or cloud)
echo 3. Run "npm run db:push" to set up the database schema
echo 4. Run "npm run dev" to start the development server
echo 5. Open http://localhost:5000 in your browser
echo.
echo 🔗 Useful commands:
echo npm run dev      - Start development server
echo npm run build    - Build for production
echo npm run start    - Start production server
echo npm run check    - Run TypeScript checks
echo npm run db:push  - Update database schema
echo.
echo 📚 Documentation: Check out the README.md file for more details!
echo.
pause
