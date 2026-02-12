resource "aws_cloudwatch_dashboard" "main_dashboard" {
  dashboard_name = "${var.project_name}-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      # 1. CPU使用率 (CPU Utilization)
      {
        type = "metric", x = 0, y = 0, width = 8, height = 6
        properties = {
          metrics = [["AWS/EC2", "CPUUtilization", "AutoScalingGroupName", "${aws_autoscaling_group.app_asg.name}"]]
          period  = 60, stat = "Average", region = var.aws_region, title = "CPU使用率 (EC2平均)"
        }
      },
      # 2. 正常なホスト数 (Healthy Hosts - Pantau jumlah server yang aktif)
      {
        type = "metric", x = 8, y = 0, width = 8, height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", "${aws_lb_target_group.main_tg.arn_suffix}", "LoadBalancer", "${aws_lb.main_alb.arn_suffix}"]
          ]
          period = 60
          stat   = "Average" 
          region = var.aws_region
          title  = "正常なサーバー数 (Healthy)"
          view    = "timeSeries"
          stacked = false
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      # 3. トラフィック量 (Request Count)
      {
        type = "metric", x = 16, y = 0, width = 8, height = 6
        properties = {
          metrics = [["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "${aws_lb.main_alb.arn_suffix}"]]
          period  = 60, stat = "Sum", region = var.aws_region, title = "合計リクエスト数 (ALB)"
        }
      },
      # 4. Bedrockの呼び出し回数 (AI Invocations)
      {
        type = "metric", x = 0, y = 6, width = 12, height = 6
        properties = {
          metrics = [
            ["AWS/Bedrock", "Invocations", "ModelId", "anthropic.claude-3-haiku-20240307-v1:0"]
          ]
          period = 60, stat = "Sum", region = "ap-southeast-1", title = "AI Bedrock 呼び出し回数"
        }
      },
      # 5. アプリケーションエラー (5XX Errors)
      {
        type = "metric", x = 12, y = 6, width = 12, height = 6
        properties = {
          metrics = [["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", "${aws_lb.main_alb.arn_suffix}"]]
          period  = 60, stat = "Sum", region = var.aws_region, title = "❌ システムエラー発生数 (5XX)"
        }
      }
    ]
  })
}