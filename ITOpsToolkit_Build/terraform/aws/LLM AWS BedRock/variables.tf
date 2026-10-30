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
# Bedrock
##########################
variable "bedrock_log_bucket_name" {
  type        = string
  description = "S3 bucket for Bedrock model invocation logs"
}

variable "guardrail_name" {
  type    = string
  default = "sdp-ta-guardrail"
}

variable "blocked_input_text" {
  type    = string
  default = "This request has been blocked by content filters."
}

variable "blocked_output_text" {
  type    = string
  default = "This response has been blocked by content filters."
}
