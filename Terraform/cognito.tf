resource "aws_cognito_user_pool" "diary_app" {
  name = "diary_app_users"

  alias_attributes         = ["email"]
  auto_verified_attributes = ["email"]

  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }

  password_policy {
    minimum_length    = 6
    require_uppercase = false
    require_lowercase = false
    require_numbers   = false
    require_symbols   = false
  }
}

resource "aws_cognito_user_pool_client" "diary_app_client" {
  name                          = "diary_app_client"
  user_pool_id                  = aws_cognito_user_pool.diary_app.id
  generate_secret               = false
  explicit_auth_flows           = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors = "ENABLED"
  supported_identity_providers  = ["COGNITO"]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls = ["https://${aws_cloudfront_distribution.app_distribution.domain_name}"]
  logout_urls   = ["https://${aws_cloudfront_distribution.app_distribution.domain_name}"]
}

resource "aws_cognito_user_pool_domain" "diary_app_domain" {
  domain       = "diary-app-${random_id.suffix.hex}"
  user_pool_id = aws_cognito_user_pool.diary_app.id
}
