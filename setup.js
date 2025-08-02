#!/usr/bin/env node
/**
 * Setup Script for My Calendar App
 * Run this after installing Node.js to set up your development environment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up My Calendar App...\n');

// Check if Node.js is installed
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js detected: ${nodeVersion}`);
} catch (error) {
  console.error('❌ Node.js is not installed. Please install Node.js from https://nodejs.org/');
  process.exit(1);
}

// Check if npm is installed
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm detected: v${npmVersion}`);
} catch (error) {
  console.error('❌ npm is not installed. Please install npm.');
  process.exit(1);
}

console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully!');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Create .env file if it doesn't exist
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('\n📝 Creating .env file from .env.example...');
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ .env file created! Please edit it with your configuration.');
}

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Edit the .env file with your database and API credentials');
console.log('2. Set up a PostgreSQL database (local or cloud)');
console.log('3. Run "npm run db:push" to set up the database schema');
console.log('4. Run "npm run dev" to start the development server');
console.log('5. Open http://localhost:5000 in your browser');

console.log('\n🔗 Useful commands:');
console.log('npm run dev      - Start development server');
console.log('npm run build    - Build for production');
console.log('npm run start    - Start production server');
console.log('npm run check    - Run TypeScript checks');
console.log('npm run db:push  - Update database schema');

console.log('\n📚 Documentation: Check out the README.md file for more details!');
