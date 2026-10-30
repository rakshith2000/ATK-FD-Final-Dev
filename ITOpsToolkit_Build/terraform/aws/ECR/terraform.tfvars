aws_region   = "eu-west-1"
project_name = "sdp-ta"
environment  = "sandbox"

# AWS Credentials
aws_access_key = ""
aws_secret_key = ""

# ECR Config
ecr_repositories           = ["frontend", "backend", "keycloak", "nginx"]
image_tag_mutability       = "IMMUTABLE"
scan_on_push               = true
max_image_count            = 20
untagged_image_expiry_days = 7
