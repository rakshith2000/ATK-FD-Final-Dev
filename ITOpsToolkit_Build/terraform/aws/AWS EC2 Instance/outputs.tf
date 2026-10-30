output "rhel_ami_used" {
  value = data.aws_ami.rhel.id
}

output "windows_ami_used" {
  value = data.aws_ami.windows.id
}

##########################
# RHEL Instance Outputs
##########################
output "rhel_instance_id" {
  value = aws_instance.rhel_test.id
}

output "rhel_private_ip" {
  value = aws_instance.rhel_test.private_ip
}

##########################
# Windows Instance Outputs
##########################
output "windows_instance_ids" {
  value = aws_instance.windows_test[*].id
}

output "windows_private_ips" {
  value = aws_instance.windows_test[*].private_ip
}

##########################
# Private Key (save this to SSH into RHEL)
##########################
output "private_key_pem" {
  value     = tls_private_key.ec2.private_key_pem
  sensitive = true
}
