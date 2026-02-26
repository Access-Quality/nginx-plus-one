variable "aws_region" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.large"
  description = "t3.large minimum recommended: NGINX Plus + NAP v5 waf-enforcer + waf-config-mgr Docker containers"
}

variable "ssh_public_key" {
  type = string
}

variable "ssh_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

variable "name_prefix" {
  type    = string
  default = "ec5-plus"
}

variable "tags" {
  type    = map(string)
  default = {}
}
