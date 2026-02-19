terraform {
  required_version = ">= 1.5.0"

  backend "remote" {
    workspaces {
      prefix = "nginx-plus-ec2-"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
