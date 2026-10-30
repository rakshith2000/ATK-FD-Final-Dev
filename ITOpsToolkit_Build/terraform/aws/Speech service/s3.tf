##########################
# S3 Bucket for Speech Audio Files
##########################
resource "aws_s3_bucket" "speech" {
  bucket = var.speech_bucket_name
  tags   = { Name = var.speech_bucket_name }
}

resource "aws_s3_bucket_versioning" "speech" {
  bucket = aws_s3_bucket.speech.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "speech" {
  bucket = aws_s3_bucket.speech.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "speech" {
  bucket                  = aws_s3_bucket.speech.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "tts_output" {
  bucket  = aws_s3_bucket.speech.id
  key     = "polly-output/"
  content = ""
}

resource "aws_s3_object" "stt_input" {
  bucket  = aws_s3_bucket.speech.id
  key     = "nova-sonic-input/"
  content = ""
}

resource "aws_s3_object" "stt_output" {
  bucket  = aws_s3_bucket.speech.id
  key     = "nova-sonic-output/"
  content = ""
}
