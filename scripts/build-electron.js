const { execSync } = require('child_process')
const fs = require('fs-extra')
const path = require('path')

console.log('🚀 Starting Electron build process...')

// Clean previous builds
console.log('🧹 Cleaning previous builds...')
fs.removeSync('dist')
fs.removeSync('out')

// Build Next.js app
console.log('🔨 Building Next.js app...')
execSync('npm run build', { stdio: 'inherit' })

// Create necessary directories
console.log('📁 Creating directories...')
fs.ensureDirSync('dist')
fs.ensureDirSync('out')

// Copy required files
console.log('📋 Copying files...')
fs.copySync('public', 'out/public')
fs.copySync('electron', 'dist/electron')
fs.copySync('package.json', 'dist/package.json')

console.log('✅ Build preparation complete!')
console.log('\n📦 To package the app, run:')
console.log('   npm run electron:build        # Build for current platform')
console.log('   npm run electron:build:win    # Build for Windows')
console.log('   npm run electron:build:mac    # Build for macOS')
console.log('   npm run electron:build:linux  # Build for Linux')