##########################
# Amazon Polly IAM Policy (Text-to-Speech)
##########################
resource "aws_iam_policy" "polly" {
  name = "${var.project_name}-polly-policy-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PollySynthesizeSpeech"
        Effect = "Allow"
        Action = [
          "polly:SynthesizeSpeech",
          "polly:DescribeVoices",
          "polly:GetLexicon",
          "polly:ListLexicons"
        ]
        Resource = "*"
      },
      {
        Sid    = "PollyAsyncTasks"
        Effect = "Allow"
        Action = [
          "polly:StartSpeechSynthesisTask",
          "polly:GetSpeechSynthesisTask",
          "polly:ListSpeechSynthesisTasks"
        ]
        Resource = "*"
      },
      {
        Sid    = "PollyS3Output"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.speech.arn}/polly-output/*"
      }
    ]
  })
}

##########################
# Nova 2 Sonic IAM Policy (Speech-to-Text via Bedrock)
# Amazon Nova Sonic is accessed via Bedrock APIs
##########################
resource "aws_iam_policy" "nova_sonic" {
  name = "${var.project_name}-nova-sonic-policy-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockNovaSonicInvoke"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:bedrock:${data.aws_region.current.name}::foundation-model/amazon.nova-sonic-v1*",
          "arn:${data.aws_partition.current.partition}:bedrock:${data.aws_region.current.name}::foundation-model/amazon.nova*"
        ]
      },
      {
        Sid    = "BedrockListModels"
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = "*"
      },
      {
        Sid    = "NovaSonicS3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "${aws_s3_bucket.speech.arn}/nova-sonic-input/*",
          "${aws_s3_bucket.speech.arn}/nova-sonic-output/*"
        ]
      }
    ]
  })
}

##########################
# Combined Speech Service Policy (Polly + Nova Sonic)
##########################
resource "aws_iam_policy" "speech_combined" {
  name = "${var.project_name}-speech-combined-policy-${var.environment}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PollyAccess"
        Effect = "Allow"
        Action = [
          "polly:SynthesizeSpeech",
          "polly:DescribeVoices",
          "polly:StartSpeechSynthesisTask",
          "polly:GetSpeechSynthesisTask",
          "polly:ListSpeechSynthesisTasks"
        ]
        Resource = "*"
      },
      {
        Sid    = "NovaSonicAccess"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = "*"
      },
      {
        Sid    = "S3SpeechAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.speech.arn,
          "${aws_s3_bucket.speech.arn}/*"
        ]
      }
    ]
  })
}

##########################
# Service Role (attach to Lambda/EKS/App Runner)
##########################
resource "aws_iam_role" "speech_service" {
  name = "${var.project_name}-speech-role-${var.environment}"

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

resource "aws_iam_role_policy_attachment" "speech_combined" {
  role       = aws_iam_role.speech_service.name
  policy_arn = aws_iam_policy.speech_combined.arn
}

resource "aws_iam_role_policy_attachment" "speech_basic_execution" {
  role       = aws_iam_role.speech_service.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
