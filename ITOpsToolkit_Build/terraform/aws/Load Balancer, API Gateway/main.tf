terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

##########################
# Auto-discover existing VPC and Subnets
##########################
data "aws_vpcs" "available" {}

data "aws_subnets" "available" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpcs.available.ids[0]]
  }
}
