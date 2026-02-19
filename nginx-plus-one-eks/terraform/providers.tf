terraform {
  required_version = ">= 1.3.0"
  backend "remote" {
    organization = "${TFC_ORG}"
    workspaces {
      name = "eks-cluster"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
