locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  cluster_iam_role_name = substr("${var.cluster_name}-cluster-role", 0, 64)
  node_iam_role_name    = substr("${var.cluster_name}-ng-role", 0, 64)
}

# ── VPC ──────────────────────────────────────────────────────────────────────
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.name_prefix}-vpc"
  cidr = "10.0.0.0/16"

  azs             = local.azs
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags required by the AWS Load Balancer Controller / NGINX Ingress
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}

# ── EKS cluster ──────────────────────────────────────────────────────────────
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Public access so kubectl works from GitHub Actions
  cluster_endpoint_public_access = true

  # Grant the identity that runs Terraform full admin permissions
  enable_cluster_creator_admin_permissions = true

  iam_role_use_name_prefix = false
  iam_role_name            = local.cluster_iam_role_name

  eks_managed_node_groups = {
    default = {
      name           = "${var.name_prefix}-ng"
      instance_types = [var.node_instance_type]

      # Use the standard EKS-optimised AMI launch template
      use_custom_launch_template = false
      create_launch_template     = false

      min_size     = var.node_min
      max_size     = var.node_max
      desired_size = var.node_desired

      iam_role_use_name_prefix = false
      iam_role_name            = local.node_iam_role_name
    }
  }
}
