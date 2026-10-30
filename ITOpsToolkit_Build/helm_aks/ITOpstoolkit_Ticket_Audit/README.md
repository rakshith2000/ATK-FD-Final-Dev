# Ticket Audit Helm Chart

## Prerequisites

- AKS cluster with `kubectl` configured
- Azure ACR (`ticketaudit.azurecr.io`) with images pushed
- External PostgreSQL accessible from AKS
- External HashiCorp Vault accessible from AKS

## Setup

### 1. Create ACR pull secret

```bash
kubectl create namespace ticket-audit

kubectl create secret docker-registry acr-secret \
  --namespace ticket-audit \
  --docker-server=ticketaudit.azurecr.io \
  --docker-username=<acr-username> \
  --docker-password=<acr-password>
```

### 2. Create values override file

```bash
cp values.yaml values-prod.yaml
```

Edit `values-prod.yaml` with your environment values:

```yaml
postgresql:
  host: "<your-postgres-host>"

vault:
  url: "<your-vault-url>"
  token: "<your-vault-token>"

servicenow:
  url: "<your-servicenow-url>"

llm:
  baseUrl: "<your-azure-openai-endpoint>"

general:
  customerName: "<your-customer-name>"
```

### 3. Deploy

```bash
helm install ticket-audit ./ticket-audit -f values-prod.yaml
```

### 4. Verify

```bash
kubectl get pods -n ticket-audit
kubectl get svc -n ticket-audit
```

## Useful Commands

```bash
# Upgrade after changes
helm upgrade ticket-audit ./ticket-audit -f values-prod.yaml

# Uninstall
helm uninstall ticket-audit

# Check logs
kubectl logs -n ticket-audit -l app=ticket-audit-frontend
kubectl logs -n ticket-audit -l app=ticket-audit-backend
kubectl logs -n ticket-audit -l app=ticket-audit-grafana
```

## Port Forward (for testing)

```bash
kubectl port-forward -n ticket-audit svc/ticket-audit-frontend 8080:8080
kubectl port-forward -n ticket-audit svc/ticket-audit-grafana 3001:3000
```
