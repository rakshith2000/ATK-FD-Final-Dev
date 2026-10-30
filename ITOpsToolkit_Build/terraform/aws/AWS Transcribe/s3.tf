##########################
# S3 Bucket for Transcribe Audio Files
##########################
resource "aws_s3_bucket" "transcribe" {
  bucket = var.transcribe_bucket_name
  tags   = { Name = var.transcribe_bucket_name }
}

resource "aws_s3_bucket_versioning" "transcribe" {
  bucket = aws_s3_bucket.transcribe.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "transcribe" {
  bucket = aws_s3_bucket.transcribe.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "transcribe" {
  bucket                  = aws_s3_bucket.transcribe.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

##########################
# Folder structure for input/output
##########################
resource "aws_s3_object" "input_folder" {
  bucket  = aws_s3_bucket.transcribe.id
  key     = "input/"
  content = ""
}

resource "aws_s3_object" "output_folder" {
  bucket  = aws_s3_bucket.transcribe.id
  key     = "output/"
  content = ""
}
