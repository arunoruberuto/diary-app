# 1. Create Load Balancer
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

# 2. Create Target Group (Daftar tunggu server)
resource "aws_lb_target_group" "main_tg" {
  name     = "${var.project_name}-tg-v2"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/health" 
    port                = "3000"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 4
    unhealthy_threshold = 2
    matcher             = "200"
  }
}

# 3. Create Listener (Si tukang dengerin request)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main_tg.arn
  }
}