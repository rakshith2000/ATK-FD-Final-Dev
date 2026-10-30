aws_region   = "eu-west-1"
project_name = "sdp-ta"
environment  = "sandbox"

# AWS Credentials


# App Runner Config
service_name    = "sdp-ta-app"
app_port        = 80     # nginx default; change to 8080 for your app
cpu             = "1024"   # 1 vCPU
memory          = "2048"   # 2 GB
max_concurrency = 100
max_size        = 5
min_size        = 1

# ECR Image (leave empty to use auto-created ECR repo)
ecr_image_uri = ""
