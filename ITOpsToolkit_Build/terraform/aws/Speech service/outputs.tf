##########################
# IAM Outputs
##########################
output "speech_service_role_arn" {
  value       = aws_iam_role.speech_service.arn
  description = "Attach this role to Lambda/App Runner for speech services"
}

output "polly_policy_arn" {
  value       = aws_iam_policy.polly.arn
  description = "Standalone Polly policy — attach to any role needing TTS"
}

output "nova_sonic_policy_arn" {
  value       = aws_iam_policy.nova_sonic.arn
  description = "Standalone Nova Sonic policy — attach to any role needing STT"
}

output "speech_combined_policy_arn" {
  value       = aws_iam_policy.speech_combined.arn
  description = "Combined Polly + Nova Sonic policy"
}

##########################
# S3 Outputs
##########################
output "speech_bucket_name" {
  value = aws_s3_bucket.speech.bucket
}

output "speech_bucket_arn" {
  value = aws_s3_bucket.speech.arn
}

##########################
# Monitoring Outputs
##########################
output "sns_alerts_topic_arn" {
  value = aws_sns_topic.speech_alerts.arn
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.speech.name
}
