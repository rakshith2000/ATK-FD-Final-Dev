aws_region   = "eu-west-1"
project_name = "sdp-ta"
environment  = "sandbox"

# AWS Credentials


# ALB Config
alb_internal      = false
health_check_path = "/"
frontend_port     = 80
backend_port      = 8080
keycloak_port     = 8443

# API Gateway
api_gateway_stage_name = "sandbox"
