provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "nginx-eks"
      ManagedBy = "Terraform"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}
