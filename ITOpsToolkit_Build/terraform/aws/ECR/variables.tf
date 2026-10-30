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
# ECR
##########################
variable "ecr_repositories" {
  type        = list(string)
  default     = ["frontend", "backend", "keycloak", "nginx"]
  description = "List of ECR repositories to create"
}

variable "image_tag_mutability" {
  type    = string
  default = "IMMUTABLE"
  description = "MUTABLE or IMMUTABLE — IMMUTABLE prevents tag overwriting"
}

variable "scan_on_push" {
  type    = bool
  default = true
}

variable "max_image_count" {
  type    = number
  default = 20
  description = "Number of images to retain per repository"
}

variable "untagged_image_expiry_days" {
  type    = number
  default = 7
  description = "Days before untagged images are expired"
}
