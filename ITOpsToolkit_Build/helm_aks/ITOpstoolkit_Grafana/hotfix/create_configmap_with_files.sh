#!/bin/bash
#Ask user for namespace
read -p "Enter Kubernetes namespace (leave blank for default): " namespace
# If namespace is empty, warn and ask for confirmation
if [ -z "$namespace" ]; then
    echo "Going ahead with default namespace.. Are you sure? Press 'yes' to go ahead else will exit"
    read confirm
    if [ "$confirm" != "yes" ]; then
        echo "Exiting without doing anything."
        exit 1
    fi
    namespace="default"
fi
# Check if the namespace exists
if ! kubectl get namespace "$namespace" &>/dev/null; then
    echo "Error: Namespace '$namespace' does not exist in the cluster."
    echo "Please create it first using: kubectl create namespace $namespace"
    exit 1
fi
declare -A seen
# Loop through each file in the present directory
for file in ./*; do
    name="$(basename "$file")"
    base="${name%.*}"   # strip extension
    # Normalize base: replace underscores and other symbols with '-'    base=$(echo "$base" | sed 's/[^a-zA-Z0-9-]/-/g')
    base=$(echo "$base" | tr '[:upper:]' '[:lower:]')
    base=$(echo "$base" | sed 's/[^a-zA-Z0-9-]/-/g')
    # Only process regular files
    if [ -f "$file" ] && [ "$(basename "$file")" != "$(basename "$0")" ]; then
        if [[ -n "${seen[$base]}" ]]; then
            echo "File with same name found! $name"
            echo "Please execute below command to create the configmap as per your convenience:"
            echo "kubectl create configmap ${base}-custom --from-file=$file -n $namespace"
        else
            # Check if configmap already exists, delete if so
            if kubectl get configmap "$base" -n "$namespace" &>/dev/null; then
                echo "Configmap '$base' already exists in namespace '$namespace'. Deleting it first..."
                kubectl delete configmap "$base" -n "$namespace"
            fi
            echo "Executing: kubectl create configmap $base --from-file=$file -n $namespace"
            kubectl create configmap "$base" --from-file="$file" -n "$namespace"
            seen[$base]=1
        fi
    fi
done
