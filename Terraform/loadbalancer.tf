resource "aws_lb" "main_alb" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "main_tg" {
  name     = "${var.project_name}-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/health"
    port                = "3000"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 20
    healthy_threshold   = 4
    unhealthy_threshold = 10
    matcher             = "200"
  }

  deregistration_delay = 30
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "アクセスが拒否されました。CloudFront 経由でアクセスしてください。"
      status_code  = "403"
    }
  }
}

resource "aws_lb_listener_rule" "allow_cloudfront" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main_tg.arn
  }

  condition {
    http_header {
      http_header_name = "X-Custom-Header"
      values           = [random_password.cf_secret.result]
    }
  }
}