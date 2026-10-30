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
# S3
##########################
variable "transcribe_bucket_name" {
  type        = string
  description = "S3 bucket for Transcribe input/output audio files"
}

##########################
# Transcribe
##########################
variable "language_code" {
  type    = string
  default = "en-US"
}

variable "custom_vocabulary_name" {
  type    = string
  default = ""
  description = "Optional custom vocabulary name for improved accuracy"
}
