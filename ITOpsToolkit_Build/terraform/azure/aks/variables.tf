variable "toolkitrelease" {
  type = string
}
 
variable "location" {
  type = string
}
 
variable "aks_cluster_name" {
  type = string
}
 
variable "vnet_name" {
  type = string
}
 
variable "subnet_name" {
  type = string
}
 
variable "vnet_cidr" {
  type = string
}
 
variable "subnet_cidr" {
  type = string
}
 
variable "kubernetes_version" {
  type = string
}
 
variable "vm_size" {
  type = string
}
 
variable "system_node_count" {
  type = number
}
 
variable "frontend_min_nodes" {
  type = number
}
 
variable "frontend_max_nodes" {
  type = number
}
 
variable "backend_min_nodes" {
  type = number
}
 
variable "backend_max_nodes" {
  type = number
}
 
variable "tags" {
  type = map(string)
}
 
variable "service_cidr" {
  type = string
}
 
variable "dns_service_ip" {
  type = string
}
