##########################
# Transcribe Service Role
##########################
resource "aws_iam_role" "transcribe" {
  name = "${var.project_name}-transcribe-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "transcribe.amazonaws.com" }
    }]
  })
}

##########################
# Transcribe Tier 1 Policy
# - Batch transcription jobs
# - Streaming transcription
# - Custom vocabulary management
# - S3 read/write for audio input/output
##########################
resource "aws_iam_policy" "transcribe" {
  name = "${var.project_name}-transcribe-policy-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TranscribeBatchOperations"
        Effect = "Allow"
        Action = [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob",
          "transcribe:ListTranscriptionJobs",
          "transcribe:DeleteTranscriptionJob"
        ]
        Resource = "arn:aws:transcribe:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:transcription-job/*"
      },
      {
        Sid    = "TranscribeStreamingOperations"
        Effect = "Allow"
        Action = [
          "transcribe:StartStreamTranscription",
          "transcribe:StartStreamTranscriptionWebSocket"
        ]
        Resource = "*"
      },
      {
        Sid    = "TranscribeVocabularyManagement"
        Effect = "Allow"
        Action = [
          "transcribe:CreateVocabulary",
          "transcribe:UpdateVocabulary",
          "transcribe:GetVocabulary",
          "transcribe:ListVocabularies",
          "transcribe:DeleteVocabulary"
        ]
        Resource = "arn:aws:transcribe:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:vocabulary/*"
      },
      {
        Sid    = "S3AudioAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.transcribe.arn,
          "${aws_s3_bucket.transcribe.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "transcribe" {
  role       = aws_iam_role.transcribe.name
  policy_arn = aws_iam_policy.transcribe.arn
}

##########################
# IAM Policy for other services (Lambda/EKS) to invoke Transcribe
##########################
resource "aws_iam_policy" "transcribe_invoke" {
  name = "${var.project_name}-transcribe-invoke-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowTranscribeInvoke"
        Effect = "Allow"
        Action = [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob",
          "transcribe:ListTranscriptionJobs",
          "transcribe:DeleteTranscriptionJob",
          "transcribe:StartStreamTranscription",
          "transcribe:StartStreamTranscriptionWebSocket"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowS3ForTranscribe"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.transcribe.arn}/*"
      }
    ]
  })
}
