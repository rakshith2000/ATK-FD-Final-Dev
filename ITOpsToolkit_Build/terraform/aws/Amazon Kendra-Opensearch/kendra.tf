##########################
# Amazon Kendra Index
##########################
resource "aws_kendra_index" "main" {
  count    = var.enable_kendra ? 1 : 0
  name     = "${var.project_name}-kendra-index-${var.environment}"
  role_arn = aws_iam_role.kendra[0].arn
  edition  = var.kendra_edition

  tags = { Name = "${var.project_name}-kendra-index-${var.environment}" }
}

##########################
# Kendra S3 Data Source
##########################
resource "aws_kendra_data_source" "s3" {
  count    = var.enable_kendra ? 1 : 0
  index_id = aws_kendra_index.main[0].id
  name     = "${var.project_name}-kendra-s3-ds-${var.environment}"
  type     = "S3"
  role_arn = aws_iam_role.kendra[0].arn

  configuration {
    s3_configuration {
      bucket_name = aws_s3_bucket.data_source.bucket
    }
  }
}

##########################
# CloudWatch Log Group for Kendra
##########################
resource "aws_cloudwatch_log_group" "kendra" {
  count             = var.enable_kendra ? 1 : 0
  name              = "/aws/kendra/${var.project_name}-${var.environment}"
  retention_in_days = 14
}
