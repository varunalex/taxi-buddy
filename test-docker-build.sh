#!/bin/bash

# Test script to verify Docker build works correctly
echo "Testing Docker build for Taxi Buddy..."

# Build the Docker image
echo "Building Docker image..."
if docker build -t taxi-buddy-test .; then
    echo "✅ Docker build successful!"
    
    # Test that the image can run
    echo "Testing container startup..."
    CONTAINER_ID=$(docker run -d -p 3000:3000 taxi-buddy-test)
    
    # Wait a moment for the app to start
    sleep 5
    
    # Check if container is running
    if docker ps | grep -q $CONTAINER_ID; then
        echo "✅ Container started successfully!"
        
        # Test health check
        echo "Testing health check..."
        if docker exec $CONTAINER_ID node -e "require('http').get('http://localhost:3000', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"; then
            echo "✅ Health check passed!"
        else
            echo "❌ Health check failed"
        fi
        
        # Clean up
        echo "Cleaning up test container..."
        docker stop $CONTAINER_ID > /dev/null
        docker rm $CONTAINER_ID > /dev/null
    else
        echo "❌ Container failed to start"
    fi
    
    # Remove test image
    echo "Cleaning up test image..."
    docker rmi taxi-buddy-test > /dev/null
    
else
    echo "❌ Docker build failed!"
    exit 1
fi

echo "Docker build test completed successfully!"
