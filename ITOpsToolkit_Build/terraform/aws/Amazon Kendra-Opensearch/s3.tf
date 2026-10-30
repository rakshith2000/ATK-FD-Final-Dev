##########################
# S3 Bucket — Data Source for Kendra / OpenSearch
##########################
resource "aws_s3_bucket" "data_source" {
  bucket = "${var.project_name}-search-data-${var.environment}-${data.aws_region.current.name}"
  tags   = { Name = "${var.project_name}-search-data-${var.environment}" }
}

resource "aws_s3_bucket_versioning" "data_source" {
  bucket = aws_s3_bucket.data_source.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data_source" {
  bucket = aws_s3_bucket.data_source.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "data_source" {
  bucket                  = aws_s3_bucket.data_source.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
