output "repository_urls" {
  value = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}

output "repository_arns" {
  value = { for k, v in aws_ecr_repository.repos : k => v.arn }
}

output "registry_id" {
  value = values(aws_ecr_repository.repos)[0].registry_id
}

output "docker_login_command" {
  value = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "push_commands" {
  value = { for k, v in aws_ecr_repository.repos : k => join("\n", [
    "docker tag ${k}:latest ${v.repository_url}:latest",
    "docker push ${v.repository_url}:latest"
  ]) }
}
