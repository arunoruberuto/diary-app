resource "aws_sns_topic" "asg_updates" {
  name = "${var.project_name}-asg-updates"
}

resource "aws_sns_topic_subscription" "email_sub" {
  topic_arn = aws_sns_topic.asg_updates.arn
  protocol  = "email"
  endpoint  = var.email
}

resource "aws_autoscaling_notification" "asg_notifications" {
  group_names = [aws_autoscaling_group.app_asg.name]

  notifications = [
    "autoscaling:EC2_INSTANCE_LAUNCH",
    "autoscaling:EC2_INSTANCE_TERMINATE",
    "autoscaling:EC2_INSTANCE_LAUNCH_ERROR",
    "autoscaling:EC2_INSTANCE_TERMINATE_ERROR",
  ]

  topic_arn = aws_sns_topic.asg_updates.arn
}