output "transcribe_role_arn" {
  value = aws_iam_role.transcribe.arn
}

output "transcribe_invoke_policy_arn" {
  value       = aws_iam_policy.transcribe_invoke.arn
  description = "Attach this policy to Lambda/EKS roles that need to invoke Transcribe"
}

output "transcribe_s3_bucket" {
  value = aws_s3_bucket.transcribe.bucket
}

output "transcribe_s3_bucket_arn" {
  value = aws_s3_bucket.transcribe.arn
}

output "sns_topic_arn" {
  value = aws_sns_topic.transcribe_notifications.arn
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.transcribe.name
}
