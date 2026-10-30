##########################
# VPC Outputs
##########################
output "vpc_id" {
  value = data.aws_vpc.selected.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

##########################
# EKS Cluster Outputs
##########################
output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_version" {
  value = aws_eks_cluster.main.version
}

output "cluster_security_group_id" {
  value = aws_security_group.eks_cluster.id
}

output "node_group_name" {
  value = aws_eks_node_group.main.node_group_name
}

##########################
# Kubeconfig Command
##########################
output "kubeconfig_command" {
  value = "aws eks update-kubeconfig --name ${aws_eks_cluster.main.name} --region ${var.aws_region}"
}

##########################
# Namespace
##########################
output "namespace" {
  value = kubernetes_namespace.app.metadata[0].name
}

##########################
# Service Endpoints
##########################
output "frontend_lb" {
  value = try(kubernetes_service.frontend.status[0].load_balancer[0].ingress[0].hostname, "pending")
}

output "keycloak_lb" {
  value = try(kubernetes_service.keycloak.status[0].load_balancer[0].ingress[0].hostname, "pending")
}

output "backend_cluster_ip" {
  value = kubernetes_service.backend.spec[0].cluster_ip
}

output "nginx_cluster_ip" {
  value = kubernetes_service.nginx.spec[0].cluster_ip
}
