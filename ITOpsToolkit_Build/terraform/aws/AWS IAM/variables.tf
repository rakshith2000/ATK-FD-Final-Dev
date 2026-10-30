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
# IAM Users
##########################
variable "iam_users" {
  type        = list(string)
  default     = ["developer", "deployer", "readonly"]
  description = "List of IAM users to create"
}
