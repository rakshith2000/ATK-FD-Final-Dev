##########################
# CloudWatch Log Group
##########################
resource "aws_cloudwatch_log_group" "speech" {
  name              = "/aws/speech/${var.project_name}-${var.environment}"
  retention_in_days = 14
}

##########################
# CloudWatch Alarms — Polly errors
##########################
resource "aws_sns_topic" "speech_alerts" {
  name = "${var.project_name}-speech-alerts-${var.environment}"
}

resource "aws_cloudwatch_metric_alarm" "polly_errors" {
  alarm_name          = "${var.project_name}-polly-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXCount"
  namespace           = "AWS/Polly"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Polly 5XX errors exceeded threshold"
  alarm_actions       = [aws_sns_topic.speech_alerts.arn]
}
