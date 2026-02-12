output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "alb_dns_name" {
  value = aws_lb.main_alb.dns_name
}

output "cloudfront_url" {
  value = aws_cloudfront_distribution.app_distribution.domain_name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app_repo.repository_url
}