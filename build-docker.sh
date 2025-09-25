#!/bin/bash

# Docker build script for Stream Deck Form Builder
# This script builds the Electron app using Wine in Docker

set -e

echo "🐳 Building Stream Deck Form Builder with Docker + Wine..."

# Build Docker image
echo "📦 Building Docker image..."
docker build \
  --build-arg USER_ID=$(id -u) \
  --build-arg GROUP_ID=$(id -g) \
  -t stream-deck-form-builder .

# Create cache directories
mkdir -p ~/.cache/electron
mkdir -p ~/.cache/electron-builder

# Create output directory with correct permissions
mkdir -p dist-electron

# Prepare files for electron-builder
echo "📋 Preparing files for electron-builder..."
cp src/FormBuilder.exe.cjs FormBuilder.exe.cjs
cp src/preload.js preload.js
cp src/form.html form.html
cp src/setup.html setup.html
cp src/pi.html pi.html
cp src/app.html app.html
cp src/manifest.json manifest.json
cp -r src/assets assets
cp -r src/css css

# Build the Electron app
echo "🔧 Building Electron app..."
docker run --rm -ti \
 --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_TAG|TRAVIS|TRAVIS_REPO_|TRAVIS_BUILD_|TRAVIS_BRANCH|TRAVIS_PULL_REQUEST_|APPVEYOR_|CSC_|GH_|GITHUB_|BT_|AWS_|STRIP|BUILD_') \
 --env ELECTRON_CACHE="/tmp/.cache/electron" \
 --env ELECTRON_BUILDER_CACHE="/tmp/.cache/electron-builder" \
 -v ${PWD}:/project \
 -v ${PWD##*/}-node-modules:/project/node_modules \
 -v ~/.cache/electron:/tmp/.cache/electron \
 -v ~/.cache/electron-builder:/tmp/.cache/electron-builder \
 --name stream-deck-form-builder-container \
 stream-deck-form-builder

echo "✅ Docker build completed successfully!"

# Check if the executable was created
if [ -f "dist-electron/win-unpacked/Stream Deck Form Builder.exe" ]; then
    echo "🎉 Electron executable created successfully!"
    echo "📁 Location: dist-electron/win-unpacked/Stream Deck Form Builder.exe"

    # First, let's see what's in the unpacked directory
    echo "📋 Contents of unpacked directory:"
    ls -la "dist-electron/win-unpacked/"
    
    # Copy the entire unpacked directory contents to plugin directory
    echo "📋 Copying all unpacked files to plugin directory..."
    cp -r "dist-electron/win-unpacked/"* "dist/com.leandro-menezes.formbuilder.sdPlugin/"
    
    # Rename the main executable to FormBuilder.exe
    mv "dist/com.leandro-menezes.formbuilder.sdPlugin/Stream Deck Form Builder.exe" "dist/com.leandro-menezes.formbuilder.sdPlugin/FormBuilder.exe"
    echo "📋 Copied all executable files and DLLs to plugin directory"

    # Clean up copied files (keep only the final executable and DLLs)
    echo "🧹 Cleaning up temporary files..."
    rm -f FormBuilder.exe.cjs preload.js form.html setup.html pi.html app.html manifest.json
    rm -rf assets css
    
    # Clean up build artifacts
    echo "🧹 Cleaning up build artifacts..."
    rm -rf dist-electron/

    # Package the plugin (without rebuilding electron)
    echo "📦 Creating final plugin package..."
    npm run package-only
    echo "✅ Plugin package created: release/com.leandro-menezes.formbuilder.sdPlugin.streamDeckPlugin"
else
    echo "❌ Build failed - executable not found"
    exit 1
fi