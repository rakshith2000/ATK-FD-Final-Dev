resource "azurerm_resource_group" "aks_rg" {
  name     = var.resource_group_name
  location = var.location
 
  tags = merge(var.tags, {
    Name = var.resource_group_name
  })
}
 
resource "azurerm_virtual_network" "aks_vnet" {
  name                = var.vnet_name
  address_space       = [var.vnet_cidr]
  location            = azurerm_resource_group.aks_rg.location
  resource_group_name = azurerm_resource_group.aks_rg.name
 
  tags = merge(var.tags, {
    Name = var.vnet_name
  })
}
 
resource "azurerm_subnet" "aks_subnet" {
  name                 = var.subnet_name
  resource_group_name  = azurerm_resource_group.aks_rg.name
  virtual_network_name = azurerm_virtual_network.aks_vnet.name
  address_prefixes     = [var.subnet_cidr]
}
 
resource "azurerm_kubernetes_cluster" "aks_cluster" {
 
  name                = var.aks_cluster_name
  location            = azurerm_resource_group.aks_rg.location
  resource_group_name = azurerm_resource_group.aks_rg.name
  dns_prefix          = var.aks_cluster_name
 
  kubernetes_version = var.kubernetes_version
 
  identity {
    type = "SystemAssigned"
  }
 
  default_node_pool {
    name                = "systempool"
    vm_size             = var.vm_size
    node_count          = var.system_node_count
    vnet_subnet_id      = azurerm_subnet.aks_subnet.id
    os_disk_size_gb     = 200
    type                = "VirtualMachineScaleSets"
  }
 
  network_profile {
    network_plugin      = "azure"
    network_policy      = "azure"
    load_balancer_sku   = "standard"
    outbound_type       = "loadBalancer"
 
    service_cidr        = var.service_cidr
    dns_service_ip      = var.dns_service_ip
  }
 
  tags = merge(var.tags, {
    Name = var.aks_cluster_name
  })
}
 
resource "azurerm_role_assignment" "aks_subnet_network_contributor" {
  scope                = azurerm_subnet.aks_subnet.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.aks_cluster.identity[0].principal_id
 
  depends_on = [
    azurerm_kubernetes_cluster.aks_cluster
  ]
}
 
# Frontend Node Pool
resource "azurerm_kubernetes_cluster_node_pool" "frontend_pool" {
 
  name                  = "frontend"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks_cluster.id
  vm_size               = var.vm_size
 
  node_count = var.frontend_min_nodes
 
  vnet_subnet_id = azurerm_subnet.aks_subnet.id
 
  enable_auto_scaling = true
  min_count           = var.frontend_min_nodes
  max_count           = var.frontend_max_nodes
 
  node_labels = {
    workload = "frontend"
  }
 
  os_disk_size_gb = 200
}
 
# Backend Node Pool
resource "azurerm_kubernetes_cluster_node_pool" "backend_pool" {
 
  name                  = "backend"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks_cluster.id
  vm_size               = var.vm_size
 
  node_count = var.backend_min_nodes
 
  vnet_subnet_id = azurerm_subnet.aks_subnet.id
 
  enable_auto_scaling = true
  min_count           = var.backend_min_nodes
  max_count           = var.backend_max_nodes
 
  node_labels = {
    workload = "backend"
  }
 
  os_disk_size_gb = 200
}
