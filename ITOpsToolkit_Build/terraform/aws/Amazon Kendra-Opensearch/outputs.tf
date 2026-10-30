##########################
# S3 Data Source
##########################
output "data_source_bucket" {
  value = aws_s3_bucket.data_source.bucket
}

##########################
# Kendra Outputs
##########################
output "kendra_index_id" {
  value = var.enable_kendra ? aws_kendra_index.main[0].id : "not deployed"
}

output "kendra_index_arn" {
  value = var.enable_kendra ? aws_kendra_index.main[0].arn : "not deployed"
}

output "kendra_datasource_id" {
  value = var.enable_kendra ? aws_kendra_data_source.s3[0].id : "not deployed"
}

output "kendra_role_arn" {
  value = var.enable_kendra ? aws_iam_role.kendra[0].arn : "not deployed"
}

##########################
# OpenSearch Outputs
##########################
output "opensearch_endpoint" {
  value = var.enable_opensearch ? aws_opensearch_domain.main[0].endpoint : "not deployed"
}

output "opensearch_dashboard_endpoint" {
  value = var.enable_opensearch ? "${aws_opensearch_domain.main[0].endpoint}/_dashboards" : "not deployed"
}

output "opensearch_domain_arn" {
  value = var.enable_opensearch ? aws_opensearch_domain.main[0].arn : "not deployed"
}

output "opensearch_domain_name" {
  value = var.enable_opensearch ? aws_opensearch_domain.main[0].domain_name : "not deployed"
}
