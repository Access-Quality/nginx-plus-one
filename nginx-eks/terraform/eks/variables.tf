variable "aws_region" {
  description = "AWS region where all resources will be created."
  type        = string
}

variable "cluster_name" {
  description = "Name of the EKS cluster."
  type        = string
  default     = "nginx-eks"
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS control plane."
  type        = string
  default     = "1.32"
}

variable "name_prefix" {
  description = "Prefix applied to every resource name."
  type        = string
  default     = "nginx-eks"
}

variable "node_instance_type" {
  description = "EC2 instance type for the managed node group."
  type        = string
  default     = "t3.medium"
}

variable "node_desired" {
  description = "Desired number of worker nodes."
  type        = number
  default     = 2
}

variable "node_min" {
  description = "Minimum number of worker nodes."
  type        = number
  default     = 1
}

variable "node_max" {
  description = "Maximum number of worker nodes."
  type        = number
  default     = 4
}
