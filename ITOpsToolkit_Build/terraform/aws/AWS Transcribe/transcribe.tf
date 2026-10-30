##########################
# CloudWatch Log Group for Transcribe
##########################
resource "aws_cloudwatch_log_group" "transcribe" {
  name              = "/aws/transcribe/${var.project_name}-${var.environment}"
  retention_in_days = 14
}

##########################
# EventBridge Rule — notify on Transcribe job completion
##########################
resource "aws_cloudwatch_event_rule" "transcribe_complete" {
  name        = "${var.project_name}-transcribe-complete-${var.environment}"
  description = "Triggers when a Transcribe job completes"

  event_pattern = jsonencode({
    source      = ["aws.transcribe"]
    detail-type = ["Transcribe Job State Change"]
    detail = {
      TranscriptionJobStatus = ["COMPLETED", "FAILED"]
    }
  })
}

##########################
# SNS Topic for Transcribe job notifications
##########################
resource "aws_sns_topic" "transcribe_notifications" {
  name = "${var.project_name}-transcribe-notify-${var.environment}"
}

resource "aws_cloudwatch_event_target" "transcribe_sns" {
  rule      = aws_cloudwatch_event_rule.transcribe_complete.name
  target_id = "transcribe-sns"
  arn       = aws_sns_topic.transcribe_notifications.arn
}

resource "aws_sns_topic_policy" "transcribe_notifications" {
  arn = aws_sns_topic.transcribe_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.transcribe_notifications.arn
    }]
  })
}
