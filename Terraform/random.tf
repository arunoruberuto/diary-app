resource "random_password" "cf_secret" {
  length  = 32
  special = false
}