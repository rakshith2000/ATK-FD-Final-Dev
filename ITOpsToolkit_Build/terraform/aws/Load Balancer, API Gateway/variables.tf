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
# ALB
##########################
variable "alb_internal" {
  type        = bool
  default     = false
  description = "Whether the ALB is internal (true) or internet-facing (false)"
}

variable "health_check_path" {
  type    = string
  default = "/"
}

variable "frontend_port" {
  type    = number
  default = 80
}

variable "backend_port" {
  type    = number
  default = 8080
}

variable "keycloak_port" {
  type    = number
  default = 8443
}

##########################
# API Gateway
##########################
variable "api_gateway_stage_name" {
  type    = string
  default = "sandbox"
}
