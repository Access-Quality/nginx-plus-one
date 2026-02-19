variable "aws_region" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "cluster_version" {
  type    = string
  default = "1.29"
}

variable "name_prefix" {
  type    = string
  default = "nginx-plus-one-eks"
}

variable "ssh_public_key" {
  type = string
}

variable "ssh_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

variable "tags" {
  type    = map(string)
  default = {}
}
