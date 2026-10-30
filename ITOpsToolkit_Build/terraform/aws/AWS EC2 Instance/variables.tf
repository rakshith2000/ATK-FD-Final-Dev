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
# EC2
##########################
variable "ec2_key_name" {
  type        = string
  description = "EC2 key pair name for SSH/RDP access"
}
