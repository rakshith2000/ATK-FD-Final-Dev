##########################
# App Runner Outputs
##########################
output "service_url" {
  value = "https://${aws_apprunner_service.main.service_url}"
}

output "service_arn" {
  value = aws_apprunner_service.main.arn
}

output "service_id" {
  value = aws_apprunner_service.main.service_id
}

output "service_status" {
  value = aws_apprunner_service.main.status
}

##########################
# ECR Outputs
##########################
output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecr_repository_name" {
  value = aws_ecr_repository.app.name
}

##########################
# IAM Outputs
##########################
output "ecr_access_role_arn" {
  value = aws_iam_role.apprunner_ecr.arn
}

output "instance_role_arn" {
  value = aws_iam_role.apprunner_instance.arn
}

##########################
# Networking Outputs
##########################
output "vpc_connector_arn" {
  value = aws_apprunner_vpc_connector.main.arn
}
