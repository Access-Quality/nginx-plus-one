terraform {
  required_version = ">= 1.6.0"

  # Terraform Cloud backend – organisation is injected via
  # the TF_CLOUD_ORGANIZATION environment variable in CI.
  cloud {
    workspaces {
      name = "nginx-aks"
    }
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }
}
