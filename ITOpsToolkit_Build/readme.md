# Kubernetes Helm Deployment Guide

## Overview
This document provides step-by-step instructions to deploy Keycloak, Backend, and Frontend components on a Kubernetes cluster using Helm-based scripts.

---

## 1. Create Namespace

Create a namespace if it does not already exist:

kubectl create namespace <NAMESPACE>

---

## 2. Create TLS Secret

Create the TLS secret within the namespace:

kubectl create secret tls <SECRET_NAME> \
  --cert=<PATH_TO_CERT (fullchain.pem) > \
  --key=<PATH_TO_KEY (privkey.pem) >\
  -n <NAMESPACE> \
  --dry-run=client -o yaml | kubectl apply -f -

---

## 3. Deployment Order

Deploy components in the following order:

1. Keycloak  
2. Backend  
3. Frontend  

---

################################## Keycloak Deployment ##################################

Give least privilege executable permission to the below file 
keycloak_deploy.sh              (chmod +x keycloak_deploy.sh)

### Configure Values
Update all required fields in:
values.yaml

### Deploy
./keycloak_deploy.sh

################################## Out of the Box Backend Deployment ##################################

Give least privilege executable permission to the below files
backend_deploy.sh                    (chmod +x backend_deploy.sh)

### Configure Values
Update:
values.yaml

### Deploy Backend
./backend_deploy.sh

################################## Out of the Box Frontend Deployment ##################################

Give least privilege executable permission to the below files
frontend_deploy.sh                    (chmod +x backend_deploy.sh)

### Update Configuration
Navigate to:
hotfix/

Update:
config.json -> with customer/account-specific endpoint details & logo files.

### Configure Values
Update:
values.yaml

### Deploy Frontend
./frontend_deploy.sh

------------------------------------------------------------------------------------------

################################## Customized Developed Backend Deployment ##################################

Give least privilege executable permission to the below files
create_configmap_with_files.sh       (chmod +x hotfix/create_configmap_with_files.sh)
backend_deploy.sh                    (chmod +x backend_deploy.sh)

### Upload Configuration Files
Place all customized files inside:
hotfix/

### Create ConfigMap
Navigate to ./hotfix folder

Run:
./create_configmap_with_files.sh

### Verify ConfigMaps
kubectl get configmaps -n <NAMESPACE>

### Configure Values with the configmaps and other required details as given in the section of values.yaml
Update:
values.yaml

### Deploy Backend
./backend_deploy.sh

################################## Customized Developed Frontend Deployment ##################################

Give least privilege executable permission to the below files
create_configmap_with_files.sh       (chmod +x hotfix/create_configmap_with_files.sh)
frontend_deploy.sh                    (chmod +x backend_deploy.sh)

### Update Configuration
Navigate to:
hotfix/

Update:
config.json -> with customer/account-specific endpoint details.

### Create ConfigMap
Run:
./create_configmap_with_files.sh

### Verify ConfigMaps
kubectl get configmaps -n <NAMESPACE>

### Configure Values with the configmaps and other required details as given in the section of values.yaml
Update:
values.yaml

### Deploy Frontend
./frontend_deploy.sh

------------------------------------------------------------------------------------------

## Notes

- Ensure all required values are updated in values.yaml before deployment.
- Ensure scripts are executed from the correct directory.
- Namespace is internally handled within scripts where applicable.
- For both backend and frontend, when updating the same configuration file, just reapply the updated ConfigMap.

------------------------------------------------------------------------------------------

# Useful Kubernetes & Helm Commands

## Namespace

Create namespace:
kubectl create namespace <NAMESPACE>

List namespaces:
kubectl get namespaces

---

## Secrets

Create TLS secret:

kubectl create secret tls <SECRET_NAME> \
  --cert=<PATH_TO_CERT (fullchain.pem) > \
  --key=<PATH_TO_KEY (privkey.pem) > \
  -n <NAMESPACE> \
  --dry-run=client -o yaml | kubectl apply -f -

---

## Workloads

List pods:
kubectl get pods -n <NAMESPACE>

List pods (wide):
kubectl get pods -n <NAMESPACE> -o wide

Describe resources:
kubectl describe pod <POD_NAME> -n <NAMESPACE>
kubectl describe svc <SERVICE_NAME> -n <NAMESPACE>
kubectl describe ingress <INGRESS_NAME> -n <NAMESPACE>

Check pod logs:
kubectl logs <POD_NAME> -n <NAMESPACE>

Exec into pod:
kubectl exec -it <POD_NAME> -n <NAMESPACE> -- bash

---

## Services & Networking

List services:
kubectl get svc -n <NAMESPACE>

List ingress:
kubectl get ingress -n <NAMESPACE>

List endpoints:
kubectl get endpoints -n <NAMESPACE>

---

## ConfigMaps

List configmaps:
kubectl get configmaps -n <NAMESPACE>

Create configmap from file:
kubectl create configmap <CONFIGMAP_NAME> \
  -n <NAMESPACE> \
  --from-file=<FILE_PATH>

---

## Helm

List releases:
helm list -n <NAMESPACE>

Deploy / Upgrade release:
helm upgrade --install <RELEASE_NAME> <CHART_PATH> -n <NAMESPACE> -f values.yaml

Delete release:
helm delete <RELEASE_NAME> -n <NAMESPACE>

---

## Cluster

List nodes (wide):
kubectl get nodes -o wide
