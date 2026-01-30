output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "alb_dns_name" {
  value = aws_lb.main_alb.dns_name
}