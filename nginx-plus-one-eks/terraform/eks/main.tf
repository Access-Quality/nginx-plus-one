locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
  tags = merge(var.tags, {
    Project = var.name_prefix
  })

  cluster_iam_role_name = substr("${var.cluster_name}-cluster-role", 0, 64)
  node_iam_role_name    = substr("${var.cluster_name}-ng-role", 0, 64)
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.name_prefix}-vpc"
  cidr = "10.0.0.0/16"

  azs             = local.azs
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = local.tags
}

resource "aws_key_pair" "eks" {
  key_name   = "${var.name_prefix}-eks"
  public_key = var.ssh_public_key

  tags = local.tags
}

resource "aws_security_group" "node_ssh" {
  name        = "${var.name_prefix}-node-ssh"
  description = "SSH access to EKS managed node group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  enable_cluster_creator_admin_permissions = true

  iam_role_use_name_prefix = false
  iam_role_name            = local.cluster_iam_role_name

  eks_managed_node_groups = {
    default = {
      name           = "${var.name_prefix}-ng"
      instance_types = ["t3.medium"]

      use_custom_launch_template = false
      create_launch_template     = false

      min_size     = 1
      max_size     = 3
      desired_size = 2

      remote_access = {
        ec2_ssh_key               = aws_key_pair.eks.key_name
        source_security_group_ids = [aws_security_group.node_ssh.id]
      }

      iam_role_use_name_prefix = false
      iam_role_name            = local.node_iam_role_name
    }
  }

  tags = local.tags
}
