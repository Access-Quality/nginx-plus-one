variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "tfc_org" {
  description = "Terraform Cloud organization"
  type        = string
  default     = "${env.TFC_ORG}"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "eks-demo"
}

variable "node_instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "desired_capacity" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}
