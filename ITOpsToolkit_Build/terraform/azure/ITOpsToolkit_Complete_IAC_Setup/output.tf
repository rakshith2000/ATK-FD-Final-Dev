output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}
 
output "aks_identity_principal_id" {
  value = azurerm_kubernetes_cluster.aks.identity[0].principal_id
}
 
output "node_resource_group" {
  value = azurerm_kubernetes_cluster.aks.node_resource_group
}
 
output "aks_fqdn" {
  value = azurerm_kubernetes_cluster.aks.fqdn
}
 
output "kube_config" {
  value     = azurerm_kubernetes_cluster.aks.kube_config_raw
  sensitive = true
}
 
output "vnet_id" {
  value = azurerm_virtual_network.vnet.id
}
 
output "aks_subnet_id" {
  value = azurerm_subnet.aks_subnet.id
}
 
output "appgw_subnet_id" {
  value = azurerm_subnet.appgw_subnet.id
}
 
output "appgw_id" {
  value = azurerm_application_gateway.appgw.id
}
 
output "appgw_name" {
  value = azurerm_application_gateway.appgw.name
}
 
output "appgw_public_ip" {
  value = azurerm_public_ip.appgw_pip.ip_address
}
