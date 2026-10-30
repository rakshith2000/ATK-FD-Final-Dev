##########################
# IAM Outputs
##########################
output "bedrock_service_role_arn" {
  value       = aws_iam_role.bedrock_service.arn
  description = "Attach to Lambda/App Runner for Bedrock model access"
}

output "bedrock_invoke_policy_arn" {
  value       = aws_iam_policy.bedrock_invoke.arn
  description = "Standalone invoke policy — attach to any role"
}

output "bedrock_readonly_policy_arn" {
  value       = aws_iam_policy.bedrock_readonly.arn
  description = "Read-only policy for listing/describing models"
}

output "bedrock_full_policy_arn" {
  value       = aws_iam_policy.bedrock_full.arn
  description = "Full policy — invoke + read + guardrails + logging"
}

##########################
# Guardrail Outputs
##########################
output "guardrail_id" {
  value = aws_bedrock_guardrail.main.guardrail_id
}

output "guardrail_arn" {
  value = aws_bedrock_guardrail.main.guardrail_arn
}

##########################
# S3 Outputs
##########################
output "bedrock_log_bucket" {
  value = aws_s3_bucket.bedrock_logs.bucket
}

##########################
# CloudWatch Outputs
##########################
output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.bedrock.name
}
