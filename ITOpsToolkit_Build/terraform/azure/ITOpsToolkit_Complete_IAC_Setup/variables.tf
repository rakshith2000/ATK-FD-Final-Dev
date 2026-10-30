variable "resource_group_name" { type = string }
variable "location" { type = string }

variable "vnet_name" { type = string }
variable "vnet_cidr" { type = string }

variable "aks_subnet_name" { type = string }
variable "aks_subnet_cidr" { type = string }

variable "appgw_subnet_name" { type = string }
variable "appgw_subnet_cidr" { type = string }

variable "appgw_name" { type = string }
variable "appgw_pip_name" { type = string }
variable "appgw_sku_name" { type = string }
variable "appgw_sku_tier" { type = string }
variable "appgw_capacity" { type = number }

variable "aks_cluster_name" { type = string }
variable "kubernetes_version" { type = string }

variable "service_cidr" { type = string }
variable "dns_service_ip" { type = string }

variable "vm_size" { type = string }
variable "system_node_count" { type = number }

variable "frontend_min_nodes" { type = number }
variable "frontend_max_nodes" { type = number }

variable "backend_min_nodes" { type = number }
variable "backend_max_nodes" { type = number }

variable "tags" {
  type = map(string)
}
