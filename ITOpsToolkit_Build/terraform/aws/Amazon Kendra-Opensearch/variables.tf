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
# Feature Toggle
# Set to true to deploy Kendra, OpenSearch, or both
##########################
variable "enable_kendra" {
  type    = bool
  default = true
}

variable "enable_opensearch" {
  type    = bool
  default = true
}

##########################
# Kendra
##########################
variable "kendra_edition" {
  type        = string
  default     = "DEVELOPER_EDITION"
  description = "Kendra edition: DEVELOPER_EDITION or ENTERPRISE_EDITION"
}

##########################
# OpenSearch
##########################
variable "opensearch_engine_version" {
  type    = string
  default = "OpenSearch_2.11"
}

variable "opensearch_instance_type" {
  type    = string
  default = "t3.small.search"
}

variable "opensearch_instance_count" {
  type    = number
  default = 2
}

variable "opensearch_volume_size" {
  type    = number
  default = 20
}

variable "opensearch_master_user" {
  type      = string
  default   = "admin"
  sensitive = true
}

variable "opensearch_master_password" {
  type      = string
  sensitive = true
}
