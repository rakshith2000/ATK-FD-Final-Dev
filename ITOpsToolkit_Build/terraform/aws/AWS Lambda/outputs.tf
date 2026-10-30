output "lambda_function_name" {
  value = aws_lambda_function.main.function_name
}

output "lambda_function_arn" {
  value = aws_lambda_function.main.arn
}

output "lambda_function_url" {
  value = aws_lambda_function_url.main.function_url
}

output "api_gateway_invoke_url" {
  value = "${aws_api_gateway_stage.lambda.invoke_url}/{proxy+}"
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda.arn
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.lambda.name
}
