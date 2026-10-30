##########################
# IAM Users
##########################
resource "aws_iam_user" "users" {
  for_each = toset(var.iam_users)
  name     = "${var.project_name}-${each.value}-${var.environment}"
  tags     = { Name = "${var.project_name}-${each.value}-${var.environment}" }
}

##########################
# IAM Groups
##########################
resource "aws_iam_group" "developers" {
  name = "${var.project_name}-developers-${var.environment}"
}

resource "aws_iam_group" "deployers" {
  name = "${var.project_name}-deployers-${var.environment}"
}

resource "aws_iam_group" "readonly" {
  name = "${var.project_name}-readonly-${var.environment}"
}

##########################
# Group Memberships
##########################
resource "aws_iam_group_membership" "developers" {
  name  = "${var.project_name}-developers-membership"
  group = aws_iam_group.developers.name
  users = [aws_iam_user.users["developer"].name]
}

resource "aws_iam_group_membership" "deployers" {
  name  = "${var.project_name}-deployers-membership"
  group = aws_iam_group.deployers.name
  users = [aws_iam_user.users["deployer"].name]
}

resource "aws_iam_group_membership" "readonly" {
  name  = "${var.project_name}-readonly-membership"
  group = aws_iam_group.readonly.name
  users = [aws_iam_user.users["readonly"].name]
}

##########################
# Developer Policy (limited write access)
##########################
resource "aws_iam_group_policy" "developers" {
  name  = "${var.project_name}-developer-policy-${var.environment}"
  group = aws_iam_group.developers.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EC2Limited"
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "ec2:StartInstances",
          "ec2:StopInstances"
        ]
        Resource = "*"
      },
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = "*"
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:GetLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:FilterLogEvents"
        ]
        Resource = "*"
      },
      {
        Sid    = "EKSAccess"
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:AccessKubernetesApi"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRPull"
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      }
    ]
  })
}

##########################
# Deployer Policy (CI/CD - deploy access)
##########################
resource "aws_iam_group_policy" "deployers" {
  name  = "${var.project_name}-deployer-policy-${var.environment}"
  group = aws_iam_group.deployers.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRFullAccess"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Sid    = "EKSDeploy"
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:AccessKubernetesApi",
          "eks:UpdateNodegroupConfig"
        ]
        Resource = "*"
      },
      {
        Sid    = "LambdaDeploy"
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction",
          "lambda:ListFunctions"
        ]
        Resource = "*"
      },
      {
        Sid    = "S3Deploy"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = "*"
      },
      {
        Sid    = "AppRunnerDeploy"
        Effect = "Allow"
        Action = [
          "apprunner:StartDeployment",
          "apprunner:DescribeService",
          "apprunner:ListServices"
        ]
        Resource = "*"
      }
    ]
  })
}

##########################
# ReadOnly Policy
##########################
resource "aws_iam_group_policy_attachment" "readonly" {
  group      = aws_iam_group.readonly.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/ReadOnlyAccess"
}

##########################
# Password Policy (account-level)
##########################
resource "aws_iam_account_password_policy" "strict" {
  minimum_password_length        = 14
  require_lowercase_characters   = true
  require_uppercase_characters   = true
  require_numbers                = true
  require_symbols                = true
  allow_users_to_change_password = true
  max_password_age               = 90
  password_reuse_prevention      = 5
}
