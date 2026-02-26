# ── Resource Group ────────────────────────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Project   = "nginx-aks"
    ManagedBy = "Terraform"
  }
}

# ── AKS Cluster ───────────────────────────────────────────────────────────────
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  # System-assigned identity — no service principal credentials to rotate
  identity {
    type = "SystemAssigned"
  }

  default_node_pool {
    name                 = "default"
    vm_size              = var.node_vm_size
    auto_scaling_enabled = true
    min_count            = var.node_min
    max_count            = var.node_max
    node_count           = var.node_desired

    # Use the Azure CNI for compatibility with standard LB and kubenet policies
    temporary_name_for_rotation = "tmpdefault"
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
  }

  # Public API server endpoint so kubectl works from GitHub Actions
  api_server_access_profile {
    authorized_ip_ranges = ["0.0.0.0/0"]
  }

  # Send control-plane diagnostic logs to Azure Monitor
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  tags = {
    Project   = "nginx-aks"
    ManagedBy = "Terraform"
  }
}

# ── Log Analytics Workspace (for AKS diagnostics) ────────────────────────────
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.name_prefix}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    Project   = "nginx-aks"
    ManagedBy = "Terraform"
  }
}
