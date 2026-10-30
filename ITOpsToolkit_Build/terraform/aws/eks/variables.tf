variable "region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability Zones to use"
  type        = list(string)
  default     = ["eu-central-1a","eu-central-1b"]
}

variable "public_subnets" {
  description = "Public subnets CIDRs"
  type        = list(string)
  default     = ["10.0.0.0/24","10.0.1.0/24"]
}

variable "private_subnets" {
  description = "Private subnets CIDRs"
  type        = list(string)
  default     = ["10.0.10.0/24","10.0.11.0/24"]
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "eu-central-eks"
}

variable "cluster_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "node_instance_type_frontend" {
  description = "Instance type for frontend node group"
  type        = string
  default     = "t3.medium"
}

variable "node_instance_type_backend" {
  description = "Instance type for backend node group"
  type        = string
  default     = "t3.medium"
}

variable "desired_size_frontend" {
  description = "Desired node count for frontend node group"
  type        = number
  default     = 1
}

variable "desired_size_backend" {
  description = "Desired node count for backend node group"
  type        = number
  default     = 1
}

variable "min_size_frontend" {
  description = "Min nodes for frontend node group"
  type        = number
  default     = 1
}

variable "max_size_frontend" {
  description = "Max nodes for frontend node group"
  type        = number
  default     = 2
}

variable "min_size_backend" {
  description = "Min nodes for backend node group"
  type        = number
  default     = 1
}

variable "max_size_backend" {
  description = "Max nodes for backend node group"
  type        = number
  default     = 2
}
