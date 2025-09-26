#!/bin/bash

# Docker build script for Stream Deck Form Builder
# This script builds the Electron app using Wine in Docker
# Note: React assets are prepared by npm run prepare-electron-assets
npm run build 

set -e

echo "🐳 Building Stream Deck Form Builder with Docker + Wine..."

# Build Docker image
echo "📦 Building Docker image..."
docker build \
  --no-cache \
  --progress=plain \
  --build-arg USER_ID=$(id -u) \
  --build-arg GROUP_ID=$(id -g) \
  -t stream-deck-form-builder .

# Create cache directories
mkdir -p ~/.cache/electron
mkdir -p ~/.cache/electron-builder

# Create output directory with correct permissions
mkdir -p dist-electron

# Files are now copied inside the Docker container via Dockerfile

# Build the Electron app
echo "🔧 Building Electron app..."
docker run --rm -ti \
 --env ELECTRON_CACHE="/tmp/.cache/electron" \
 --env ELECTRON_BUILDER_CACHE="/tmp/.cache/electron-builder" \
 -v ${PWD}/dist-electron:/project/dist-electron \
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
    cp -r "dist-electron/win-unpacked/"* "dist/"
    
    # Rename the main executable to FormBuilder.exe
    mv "dist/Stream Deck Form Builder.exe" "dist/FormBuilder.exe"
    echo "📋 Copied all executable files and DLLs to plugin directory"

    # No cleanup needed since files are handled inside Docker container
    
    # Clean up build artifacts
    echo "🧹 Cleaning up build artifacts..."
    #rm -rf dist-electron/

    # Package the plugin (without rebuilding electron)
    echo "📦 Creating final plugin package..."
    npm run package-only
    echo "✅ Plugin package created: release/com.leandro-menezes.formbuilder.sdPlugin.streamDeckPlugin"
else
    echo "❌ Build failed - executable not found"
    exit 1
fi