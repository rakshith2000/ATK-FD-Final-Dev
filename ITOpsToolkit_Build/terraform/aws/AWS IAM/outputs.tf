##########################
# User Outputs
##########################
output "iam_user_names" {
  value = { for k, v in aws_iam_user.users : k => v.name }
}

output "iam_user_arns" {
  value = { for k, v in aws_iam_user.users : k => v.arn }
}

##########################
# Group Outputs
##########################
output "developers_group" {
  value = aws_iam_group.developers.name
}

output "deployers_group" {
  value = aws_iam_group.deployers.name
}

output "readonly_group" {
  value = aws_iam_group.readonly.name
}

##########################
# Service Role ARN Outputs
##########################
output "eks_cluster_role_arn" {
  value = aws_iam_role.eks_cluster.arn
}

output "eks_node_role_arn" {
  value = aws_iam_role.eks_nodes.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda.arn
}

output "transcribe_role_arn" {
  value = aws_iam_role.transcribe.arn
}

output "apprunner_ecr_role_arn" {
  value = aws_iam_role.apprunner_ecr.arn
}

output "apprunner_instance_role_arn" {
  value = aws_iam_role.apprunner_instance.arn
}

output "apigw_cloudwatch_role_arn" {
  value = aws_iam_role.apigw_cloudwatch.arn
}

output "kendra_role_arn" {
  value = aws_iam_role.kendra.arn
}
