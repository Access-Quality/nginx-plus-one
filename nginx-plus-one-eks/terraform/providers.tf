terraform {
  required_version = ">= 1.3.0"
  backend "remote" {
    organization = var.tfc_org
    workspaces {
      name = "eks-cluster"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
