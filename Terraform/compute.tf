resource "aws_launch_template" "app_lt" {
  name_prefix   = "${var.project_name}-template-"
  image_id      = "ami-0249e9b9816d90e03" # AMI Amazon Linux 2023 - southeast-1 default 2026
  instance_type = "t3.micro"

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.app_sg.id]
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-server"
    }
  }

  # --- BAGIAN USER DATA OTOMATIS ---
  user_data = base64encode(<<-EOF
    #!/bin/bash
    # well, just in case
    sleep 10

    # 1. install docker yea
    dnf update -y
    dnf install -y docker
    systemctl start docker
    systemctl enable docker

    # 2. Login to ecr
    export AWS_DEFAULT_REGION=${var.aws_region}
    aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.app_repo.repository_url}

    # 3. get new img from ECR
    docker pull ${aws_ecr_repository.app_repo.repository_url}:latest

    # 4. Clean old container
    docker rm -f diary-app || true

    # 5. run container
    docker run -d --name diary-app \
      -p 3000:3000 \
      --restart always \
      -e DATABASE_URL='postgresql://${aws_db_instance.postgres.username}:${aws_db_instance.postgres.password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}' \
      -e AWS_REGION="${var.aws_region}" \
      -e NODE_ENV="production" \
      -e COGNITO_USER_POOL_ID="${aws_cognito_user_pool.diary_app.id}" \
      -e COGNITO_APP_CLIENT_ID="${aws_cognito_user_pool_client.diary_app_client.id}" \
      -e RANDOM_SUFFIX="${random_id.suffix.hex}" \
      ${aws_ecr_repository.app_repo.repository_url}:latest
  EOF
  )
}

resource "aws_autoscaling_group" "app_asg" {
  name                = "${var.project_name}-asg-instance"
  desired_capacity    = 1
  max_size            = 2
  min_size            = 1
  target_group_arns   = [aws_lb_target_group.main_tg.arn]
  vpc_zone_identifier = [aws_subnet.private_app_1.id, aws_subnet.private_app_2.id]

  # -------------------------------
  health_check_type         = "ELB"
  health_check_grace_period = 900
  # -------------------------------

  launch_template {
    id      = aws_launch_template.app_lt.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-web-server"
    propagate_at_launch = true
  }
}

# Policy: Scale Out
resource "aws_autoscaling_policy" "cpu_scaling_out" {
  name                   = "cpu-scaling-out"
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 300
  policy_type            = "SimpleScaling"
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "cpu-high-alarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "30"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app_asg.name
  }

  alarm_actions = [aws_autoscaling_policy.cpu_scaling_out.arn]
}

# Policy: Scale In
resource "aws_autoscaling_policy" "cpu_scaling_in" {
  name                   = "cpu-scaling-in"
  autoscaling_group_name = aws_autoscaling_group.app_asg.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
  policy_type            = "SimpleScaling"
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "cpu-low-alarm"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "60"
  statistic           = "Average"
  threshold           = "15"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.app_asg.name
  }

  alarm_actions = [aws_autoscaling_policy.cpu_scaling_in.arn]
}
