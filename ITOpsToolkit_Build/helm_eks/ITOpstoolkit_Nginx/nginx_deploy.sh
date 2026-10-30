#!/bin/bash
 
# ITOps Platform Deployment Script
 
set -e
 
echo "Starting ITOps Platform deployment..."
 
# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    echo "Helm is not installed. Please install Helm first."
    exit 1
fi
 
# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Ask user for namespace
read -p "Enter Kubernetes namespace (leave blank for default): " NAMESPACE

# If namespace is empty, warn and ask for confirmation
if [ -z "$NAMESPACE" ]; then
    echo "Going ahead with default namespace.. Are you sure? Press 'yes' to go ahead else will exit"
    read confirm
    if [ "$confirm" != "yes" ]; then
        echo "Exiting without doing anything."
        exit 1
    fi
    NAMESPACE="default"
fi
 
# Update Helm dependencies
echo "Updating Helm dependencies..."
helm dependency update
 
# Deploy the platform
echo "Deploying ITOps Platform..."
helm upgrade --install itops-platform-nginx . \
    --namespace $NAMESPACE \
    --create-namespace \
    --wait \
    --timeout 10m
 
# Check deployment status
echo "Checking deployment status..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get secrets -n $NAMESPACE
kubectl get ingress -n $NAMESPACE
 
echo "ITOps Platform deployed successfully!"
