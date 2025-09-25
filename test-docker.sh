#!/bin/bash

# Test script to verify Docker build setup
echo "🐳 Testing Docker build setup..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    echo "Please install Docker first:"
    echo "  sudo apt update && sudo apt install docker.io"
    echo "  sudo systemctl start docker && sudo systemctl enable docker"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running"
    echo "Please start Docker:"
    echo "  sudo systemctl start docker"
    exit 1
fi

# Build the Docker image (test)
echo "📦 Building Docker image..."
docker build -t stream-deck-form-builder-test .

# Check if the image was built successfully
if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo "📋 Image ID: $(docker images stream-deck-form-builder-test --format 'table {{.ID}}\t{{.Size}}' | tail -1)"

    # Clean up test image
    docker rmi stream-deck-form-builder-test

    echo ""
    echo "🎉 Docker build environment is ready!"
    echo "You can now run: npm run build-electron-docker"
else
    echo "❌ Docker image build failed"
    exit 1
fi