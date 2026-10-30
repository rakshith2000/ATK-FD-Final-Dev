provider "azurerm" {
  features {}
}
resource "azurerm_resource_group" "aks_rg" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}
 
resource "azurerm_virtual_network" "vnet" {
  name                = var.vnet_name
  address_space       = [var.vnet_cidr]
  location            = azurerm_resource_group.aks_rg.location
  resource_group_name = azurerm_resource_group.aks_rg.name
  tags                = var.tags
}
 
# AKS Subnet
resource "azurerm_subnet" "aks_subnet" {
  name                 = var.aks_subnet_name
  resource_group_name  = azurerm_resource_group.aks_rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.aks_subnet_cidr]
}
 
# App Gateway Subnet
resource "azurerm_subnet" "appgw_subnet" {
  name                 = var.appgw_subnet_name
  resource_group_name  = azurerm_resource_group.aks_rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.appgw_subnet_cidr]
}
 
# Public IP
resource "azurerm_public_ip" "appgw_pip" {
  name                = var.appgw_pip_name
  location            = azurerm_resource_group.aks_rg.location
  resource_group_name = azurerm_resource_group.aks_rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.tags
}
 
# Application Gateway
resource "azurerm_application_gateway" "appgw" {
  name                = var.appgw_name
  location            = azurerm_resource_group.aks_rg.location
  resource_group_name = azurerm_resource_group.aks_rg.name
  tags                = var.tags
 
  sku {
    name     = var.appgw_sku_name
    tier     = var.appgw_sku_tier
    capacity = var.appgw_capacity
  }
 
  gateway_ip_configuration {
    name      = "appgw-ip-config"
    subnet_id = azurerm_subnet.appgw_subnet.id
  }
 
  frontend_port {
    name = "frontend-port"
    port = 80
  }
 
  frontend_ip_configuration {
    name                 = "frontend-ip"
    public_ip_address_id = azurerm_public_ip.appgw_pip.id
  }
 
  backend_address_pool {
    name = "backend-pool"
  }
 
  backend_http_settings {
    name                  = "backend-http-settings"
    port                  = 8000
    protocol              = "Http"
    cookie_based_affinity = "Disabled"
  }
 
  http_listener {
    name                           = "frontend-listener"
    frontend_ip_configuration_name = "frontend-ip"
    frontend_port_name             = "frontend-port"
    protocol                       = "Http"
  }
ssl_policy {
  policy_type = "Predefined"
  policy_name = "AppGwSslPolicy20220101"
}
 
  request_routing_rule {
    name                       = "frontend-to-backend-rule"
    rule_type                  = "Basic"
    http_listener_name         = "frontend-listener"
    backend_address_pool_name  = "backend-pool"
    backend_http_settings_name = "backend-http-settings"
    priority                   = 100
  }
}
 
# AKS Cluster
resource "azurerm_kubernetes_cluster" "aks" {
  name                = var.aks_cluster_name
  location            = azurerm_resource_group.aks_rg.location
  resource_group_name = azurerm_resource_group.aks_rg.name
  dns_prefix          = var.aks_cluster_name
 
  kubernetes_version = var.kubernetes_version
  oidc_issuer_enabled = true
  identity {
    type = "SystemAssigned"
  }
 
  default_node_pool {
    name            = "systempool"
    vm_size         = var.vm_size
    node_count      = var.system_node_count
    vnet_subnet_id  = azurerm_subnet.aks_subnet.id
    os_disk_size_gb = 50
  }
 
  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
 
    service_cidr   = var.service_cidr
    dns_service_ip = var.dns_service_ip
  }
 
  tags = var.tags
}
 
# Node Pools
resource "azurerm_kubernetes_cluster_node_pool" "frontend" {
  name                  = "frontend"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = var.vm_size
  os_disk_size_gb       = 50
 
  node_count     = var.frontend_min_nodes
  vnet_subnet_id = azurerm_subnet.aks_subnet.id
 
  enable_auto_scaling = true
  min_count           = var.frontend_min_nodes
  max_count           = var.frontend_max_nodes
 
  node_labels = {
    workload = "frontend"
  }
 
  tags = var.tags
}
 
resource "azurerm_kubernetes_cluster_node_pool" "backend" {
  name                  = "backend"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = var.vm_size
  os_disk_size_gb       = 100
 
  node_count     = var.backend_min_nodes
  vnet_subnet_id = azurerm_subnet.aks_subnet.id
 
  enable_auto_scaling = true
  min_count           = var.backend_min_nodes
  max_count           = var.backend_max_nodes
 
  node_labels = {
    workload = "backend"
  }
 
  tags = var.tags
}
 
# Role Assignments- > Needs to be done via Portal
#resource "azurerm_role_assignment" "aks_subnet" {
#  scope                = azurerm_subnet.aks_subnet.id
#  role_definition_name = "Network Contributor"
#  principal_id         = azurerm_kubernetes_cluster.aks.identity[0].principal_id
#}
 
#resource "azurerm_role_assignment" "agic_appgw" {
#  scope                = azurerm_application_gateway.appgw.id
#  role_definition_name = "Contributor"
#  principal_id         = azurerm_kubernetes_cluster.aks.identity[0].principal_id
#}
