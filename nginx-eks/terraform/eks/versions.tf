terraform {
  required_version = ">= 1.6.0"

  # Terraform Cloud backend – organisation is injected via
  # the TF_CLOUD_ORGANIZATION environment variable in CI.
  cloud {
    workspaces {
      name = "nginx-eks"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }
}
