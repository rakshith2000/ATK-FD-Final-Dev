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
# App Runner
##########################
variable "service_name" {
  type    = string
  default = "sdp-ta-app"
}

variable "app_port" {
  type    = number
  default = 80
}

variable "cpu" {
  type        = string
  default     = "1024"
  description = "CPU units: 256, 512, 1024, 2048, 4096"
}

variable "memory" {
  type        = string
  default     = "2048"
  description = "Memory in MB: 512, 1024, 2048, 3072, 4096, 6144, 8192, 10240, 12288"
}

variable "max_concurrency" {
  type    = number
  default = 100
}

variable "max_size" {
  type    = number
  default = 5
}

variable "min_size" {
  type    = number
  default = 1
}

##########################
# ECR Image
##########################
variable "ecr_image_uri" {
  type        = string
  default     = ""
  description = "ECR image URI (e.g. 123456789.dkr.ecr.eu-west-1.amazonaws.com/app:latest). Leave empty to create ECR repo."
}
