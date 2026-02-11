output "public_ip" {
  value = aws_instance.nginx_plus.public_ip
}

output "public_dns" {
  value = aws_instance.nginx_plus.public_dns
}

output "instance_id" {
  value = aws_instance.nginx_plus.id
}
