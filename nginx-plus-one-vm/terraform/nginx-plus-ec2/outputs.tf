output "public_ip" {
  value = aws_instance.nginx_plus.public_ip
}

output "public_dns" {
  value = aws_instance.nginx_plus.public_dns
}

output "instance_id" {
  value = aws_instance.nginx_plus.id
}

output "cine_public_ip" {
  value = aws_instance.cine.public_ip
}

output "cine_private_ip" {
  value = aws_instance.cine.private_ip
}

output "cine_instance_id" {
  value = aws_instance.cine.id
}
