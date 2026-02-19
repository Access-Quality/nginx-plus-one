resource "aws_eks_cluster" "this" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids = aws_subnet.eks[*].id
  }
}

resource "aws_iam_role" "eks_cluster" {
  name = "${var.cluster_name}-eks-cluster-role"

  assume_role_policy = data.aws_iam_policy_document.eks_assume_role.json
}

data "aws_iam_policy_document" "eks_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_AmazonEKSClusterPolicy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_vpc" "eks" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_internet_gateway" "eks" {
  vpc_id = aws_vpc.eks.id
}

resource "aws_route_table" "eks_public" {
  vpc_id = aws_vpc.eks.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.eks.id
  }
}

resource "aws_subnet" "eks" {
  count             = 2
  vpc_id            = aws_vpc.eks.id
  cidr_block        = cidrsubnet(aws_vpc.eks.cidr_block, 8, count.index)
  availability_zone = element(data.aws_availability_zones.available.names, count.index)
  map_public_ip_on_launch = true
}

resource "aws_route_table_association" "eks_public" {
  count          = 2
  subnet_id      = aws_subnet.eks[count.index].id
  route_table_id = aws_route_table.eks_public.id
}

data "aws_availability_zones" "available" {}

resource "aws_eks_node_group" "default" {
  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "default"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.eks[*].id
  instance_types  = [var.node_instance_type]
  scaling_config {
    desired_size = var.desired_capacity
    max_size     = var.desired_capacity + 1
    min_size     = 1
  }
}

resource "aws_iam_role" "eks_nodes" {
  name = "${var.cluster_name}-eks-nodes-role"
  assume_role_policy = data.aws_iam_policy_document.eks_nodes_assume_role.json
}

data "aws_iam_policy_document" "eks_nodes_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "eks_nodes_AmazonEKSWorkerNodePolicy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_nodes_AmazonEC2ContainerRegistryReadOnly" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "eks_nodes_AmazonEKS_CNI_Policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}
