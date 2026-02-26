output "cluster_name" {
  description = "AKS cluster name."
  value       = azurerm_kubernetes_cluster.main.name
}

output "resource_group_name" {
  description = "Resource group that contains the AKS cluster."
  value       = azurerm_resource_group.main.name
}

output "location" {
  description = "Azure region where the cluster was created."
  value       = azurerm_resource_group.main.location
}

output "kube_config" {
  description = "Raw kubeconfig for the AKS cluster."
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}
