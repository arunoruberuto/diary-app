resource "random_password" "cf_secret" {
  length  = 32
  special = false
}
resource "random_id" "suffix" {
  byte_length = 4
}