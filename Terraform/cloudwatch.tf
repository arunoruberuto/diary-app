resource "aws_cloudwatch_dashboard" "main_dashboard" {
  dashboard_name = "${var.project_name}-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", "${aws_autoscaling_group.app_asg.name}"]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Average CPU Utilization (EC2)"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${aws_lb.main_alb.arn_suffix}"]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Request Count (ALB)"
        }
      }
    ]
  })
}