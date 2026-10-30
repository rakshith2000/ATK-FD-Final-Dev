##########################
# Bedrock Model Invoke Policy (for Lambda/EKS/App Runner)
##########################
resource "aws_iam_policy" "bedrock_invoke" {
  name = "${var.project_name}-bedrock-invoke-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "InvokeModels"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:bedrock:${data.aws_region.current.name}::foundation-model/*"
      },
      {
        Sid    = "InvokeCustomModels"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:provisioned-model/*"
      }
    ]
  })
}

##########################
# Bedrock Read-Only Policy (list/describe models)
##########################
resource "aws_iam_policy" "bedrock_readonly" {
  name = "${var.project_name}-bedrock-readonly-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "BedrockReadOnly"
      Effect = "Allow"
      Action = [
        "bedrock:ListFoundationModels",
        "bedrock:GetFoundationModel",
        "bedrock:ListCustomModels",
        "bedrock:GetCustomModel",
        "bedrock:ListProvisionedModelThroughputs",
        "bedrock:GetProvisionedModelThroughput",
        "bedrock:ListGuardrails",
        "bedrock:GetGuardrail"
      ]
      Resource = "*"
    }]
  })
}

##########################
# Bedrock Full Policy (invoke + read + guardrails + logging)
##########################
resource "aws_iam_policy" "bedrock_full" {
  name = "${var.project_name}-bedrock-full-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockInvoke"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:bedrock:${data.aws_region.current.name}::foundation-model/*",
          "arn:${data.aws_partition.current.partition}:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:provisioned-model/*"
        ]
      },
      {
        Sid    = "BedrockReadAndList"
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel",
          "bedrock:ListCustomModels",
          "bedrock:GetCustomModel",
          "bedrock:ListGuardrails",
          "bedrock:GetGuardrail"
        ]
        Resource = "*"
      },
      {
        Sid    = "BedrockGuardrails"
        Effect = "Allow"
        Action = [
          "bedrock:ApplyGuardrail"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:bedrock:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:guardrail/*"
      },
      {
        Sid    = "S3LogAccess"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.bedrock_logs.arn}/*"
      }
    ]
  })
}

##########################
# Service Role (attach to Lambda/EKS/App Runner)
##########################
resource "aws_iam_role" "bedrock_service" {
  name = "${var.project_name}-bedrock-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      },
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "tasks.apprunner.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "bedrock_full" {
  role       = aws_iam_role.bedrock_service.name
  policy_arn = aws_iam_policy.bedrock_full.arn
}

resource "aws_iam_role_policy_attachment" "bedrock_basic_execution" {
  role       = aws_iam_role.bedrock_service.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

##########################
# Bedrock Logging Role
##########################
resource "aws_iam_role" "bedrock_logging" {
  name = "${var.project_name}-bedrock-logging-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "bedrock.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_logging" {
  name = "${var.project_name}-bedrock-logging-policy-${var.environment}"
  role = aws_iam_role.bedrock_logging.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.bedrock_logs.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}
