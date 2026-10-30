##########################
# Security Group for VPC Connector
##########################
resource "aws_security_group" "apprunner" {
  name        = "${var.project_name}-apprunner-sg-${var.environment}"
  description = "Security group for App Runner VPC connector"
  vpc_id      = data.aws_vpcs.available.ids[0]

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-apprunner-sg-${var.environment}" }
}

##########################
# VPC Connector (App Runner → VPC resources)
##########################
resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${var.project_name}-vpc-conn-${var.environment}"
  subnets            = slice(data.aws_subnets.available.ids, 0, min(2, length(data.aws_subnets.available.ids)))
  security_groups    = [aws_security_group.apprunner.id]
}

##########################
# Auto Scaling Configuration
##########################
resource "aws_apprunner_auto_scaling_configuration_version" "main" {
  auto_scaling_configuration_name = "${var.project_name}-autoscale-${var.environment}"
  max_concurrency                 = var.max_concurrency
  max_size                        = var.max_size
  min_size                        = var.min_size
}

##########################
# Observability Configuration (X-Ray tracing)
##########################
resource "aws_apprunner_observability_configuration" "main" {
  observability_configuration_name = "${var.project_name}-observability-${var.environment}"

  trace_configuration {
    vendor = "AWSXRAY"
  }
}

##########################
# App Runner Service
##########################
resource "aws_apprunner_service" "main" {
  service_name = "${var.service_name}-${var.environment}"

  source_configuration {
    # When using ECR, uncomment authentication_configuration
    dynamic "authentication_configuration" {
      for_each = var.ecr_image_uri != "" ? [1] : []
      content {
        access_role_arn = aws_iam_role.apprunner_ecr.arn
      }
    }

    image_repository {
      image_identifier      = var.ecr_image_uri != "" ? var.ecr_image_uri : "public.ecr.aws/nginx/nginx:latest"
      image_repository_type = var.ecr_image_uri != "" ? "ECR" : "ECR_PUBLIC"

      image_configuration {
        port = tostring(var.app_port)
        runtime_environment_variables = {
          ENVIRONMENT = var.environment
          REGION      = var.aws_region
          PORT        = tostring(var.app_port)
        }
      }
    }

    auto_deployments_enabled = var.ecr_image_uri != "" ? true : false
  }

  instance_configuration {
    cpu               = var.cpu
    memory            = var.memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type = "DEFAULT"
    }
  }

  health_check_configuration {
    protocol            = "TCP"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.main.arn

  observability_configuration {
    observability_enabled           = true
    observability_configuration_arn = aws_apprunner_observability_configuration.main.arn
  }

  tags = { Name = "${var.service_name}-${var.environment}" }
}
