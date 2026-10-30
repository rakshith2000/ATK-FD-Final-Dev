##########################
# OpenSearch Security Group
##########################
resource "aws_security_group" "opensearch" {
  count       = var.enable_opensearch ? 1 : 0
  name        = "${var.project_name}-opensearch-sg-${var.environment}"
  description = "Security group for OpenSearch domain"
  vpc_id      = data.aws_vpcs.available.ids[0]

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-opensearch-sg-${var.environment}" }
}

##########################
# Amazon OpenSearch Domain
##########################
resource "aws_opensearch_domain" "main" {
  count       = var.enable_opensearch ? 1 : 0
  domain_name = "${var.project_name}-search-${var.environment}"

  engine_version = var.opensearch_engine_version

  cluster_config {
    instance_type  = var.opensearch_instance_type
    instance_count = var.opensearch_instance_count

    zone_awareness_enabled = var.opensearch_instance_count > 1 ? true : false

    dynamic "zone_awareness_config" {
      for_each = var.opensearch_instance_count > 1 ? [1] : []
      content {
        availability_zone_count = 2
      }
    }
  }

  ebs_options {
    ebs_enabled = true
    volume_size = var.opensearch_volume_size
    volume_type = "gp3"
  }

  vpc_options {
    subnet_ids         = slice(data.aws_subnets.available.ids, 0, min(var.opensearch_instance_count, length(data.aws_subnets.available.ids)))
    security_group_ids = [aws_security_group.opensearch[0].id]
  }

  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = true

    master_user_options {
      master_user_name     = var.opensearch_master_user
      master_user_password = var.opensearch_master_password
    }
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = "es:*"
      Resource  = "arn:${data.aws_partition.current.partition}:es:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:domain/${var.project_name}-search-${var.environment}/*"
    }]
  })

  tags = { Name = "${var.project_name}-opensearch-${var.environment}" }
}

##########################
# CloudWatch Log Group for OpenSearch
##########################
resource "aws_cloudwatch_log_group" "opensearch" {
  count             = var.enable_opensearch ? 1 : 0
  name              = "/aws/opensearch/${var.project_name}-${var.environment}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_resource_policy" "opensearch" {
  count       = var.enable_opensearch ? 1 : 0
  policy_name = "${var.project_name}-opensearch-log-policy-${var.environment}"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "es.amazonaws.com" }
      Action = [
        "logs:PutLogEvents",
        "logs:CreateLogStream"
      ]
      Resource = "${aws_cloudwatch_log_group.opensearch[0].arn}:*"
    }]
  })
}
