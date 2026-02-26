provider "azurerm" {
  features {}
  # ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_TENANT_ID, ARM_SUBSCRIPTION_ID
  # are supplied via environment variables in CI.
}

data "azurerm_client_config" "current" {}
