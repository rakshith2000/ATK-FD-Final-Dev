output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.aks_cluster.name
}
 
output "kube_config" {
  value     = azurerm_kubernetes_cluster.aks_cluster.kube_config_raw
  sensitive = true
}
 
output "vnet_id" {
  value = azurerm_virtual_network.aks_vnet.id
}
 
output "subnet_id" {
  value = azurerm_subnet.aks_subnet.id
}
 
output "node_resource_group" {
  value = azurerm_kubernetes_cluster.aks_cluster.node_resource_group
}
 
output "aks_fqdn" {
  value = azurerm_kubernetes_cluster.aks_cluster.fqdn
}
 
output "aks_identity_principal_id" {
  value = azurerm_kubernetes_cluster.aks_cluster.identity[0].principal_id
}
