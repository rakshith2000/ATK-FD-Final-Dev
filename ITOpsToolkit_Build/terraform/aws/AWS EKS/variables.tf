##########################
# General
##########################
variable "aws_region" {
  type = string
}

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_access_key" {
  type      = string
  sensitive = true
}

variable "aws_secret_key" {
  type      = string
  sensitive = true
}

##########################
# VPC
##########################
variable "vpc_cidr" {
  type    = string
  default = "10.1.0.0/16"
  description = "Not used for VPC creation — existing VPC is used. Kept for reference."
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.1.1.0/24", "10.1.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.1.3.0/24", "10.1.4.0/24"]
}

##########################
# EKS
##########################
variable "eks_cluster_name" {
  type    = string
  default = "sdp-ta-eks"
}

variable "eks_version" {
  type    = string
  default = "1.32"
}

variable "eks_node_instance_type" {
  type    = string
  default = "m5.4xlarge"
  description = "Intel Xeon, 16 vCPU, 64 GB RAM"
}

variable "eks_node_count" {
  type    = number
  default = 4
}

variable "eks_node_disk_size" {
  type    = number
  default = 100
  description = "SSD storage in GB per node"
}

##########################
# Container Images
##########################
variable "frontend_image" {
  type    = string
  default = "nginx:latest"
}

variable "backend_image" {
  type    = string
  default = "nginx:latest"
}

variable "keycloak_image" {
  type    = string
  default = "quay.io/keycloak/keycloak:latest"
}

variable "nginx_image" {
  type    = string
  default = "nginx:latest"
}
