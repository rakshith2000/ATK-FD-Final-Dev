##########################
# ALB Outputs
##########################
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_arn" {
  value = aws_lb.main.arn
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

##########################
# Target Group Outputs
##########################
output "frontend_target_group_arn" {
  value = aws_lb_target_group.frontend.arn
}

output "backend_target_group_arn" {
  value = aws_lb_target_group.backend.arn
}

output "keycloak_target_group_arn" {
  value = aws_lb_target_group.keycloak.arn
}

##########################
# API Gateway Outputs
##########################
output "api_gateway_id" {
  value = aws_api_gateway_rest_api.main.id
}

output "api_gateway_invoke_url" {
  value = aws_api_gateway_stage.main.invoke_url
}
