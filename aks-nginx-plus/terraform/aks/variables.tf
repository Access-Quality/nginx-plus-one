variable "location" {
  description = "Azure region where all resources will be created."
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Name of the Azure resource group."
  type        = string
  default     = "nginx-aks-rg"
}

variable "cluster_name" {
  description = "Name of the AKS cluster."
  type        = string
  default     = "nginx-aks"
}

variable "kubernetes_version" {
  description = "Kubernetes version for the AKS control plane."
  type        = string
  default     = "1.32"
}

variable "name_prefix" {
  description = "Prefix applied to every resource name."
  type        = string
  default     = "nginx-aks"
}

variable "node_vm_size" {
  description = "Azure VM size for the default node pool."
  type        = string
  default     = "Standard_D2s_v3"
}

variable "node_desired" {
  description = "Desired number of worker nodes."
  type        = number
  default     = 2
}

variable "node_min" {
  description = "Minimum number of worker nodes (auto-scaler)."
  type        = number
  default     = 1
}

variable "node_max" {
  description = "Maximum number of worker nodes (auto-scaler)."
  type        = number
  default     = 4
}
