##########################
# Kendra IAM Role
##########################
resource "aws_iam_role" "kendra" {
  count = var.enable_kendra ? 1 : 0
  name  = "${var.project_name}-kendra-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "kendra.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "kendra" {
  count = var.enable_kendra ? 1 : 0
  name  = "${var.project_name}-kendra-policy-${var.environment}"
  role  = aws_iam_role.kendra[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.data_source.arn,
          "${aws_s3_bucket.data_source.arn}/*"
        ]
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      }
    ]
  })
}


