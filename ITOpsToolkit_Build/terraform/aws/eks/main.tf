provider "aws" {
  region = var.region
}

# VPC with IGW and NAT gateway
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs             = var.azs
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets

  enable_nat_gateway = true
  single_nat_gateway = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  map_public_ip_on_launch = true

  tags = {
    Project = var.cluster_name
  }
}

# EKS cluster and node groups
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  # Cluster endpoint private+public access for simplicity
  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  enable_irsa = true

  # Managed node groups
  eks_managed_node_groups = {
    # Frontend node group in PUBLIC subnets (per your request)
    # Note: running nodes in public subnets gives them public IPs; consider private for production.
    frontend = {
      ami_type       = "AL2_x86_64"
      instance_types = [var.node_instance_type_frontend]
      subnet_ids     = module.vpc.public_subnets

      min_size     = var.min_size_frontend
      max_size     = var.max_size_frontend
      desired_size = var.desired_size_frontend

      labels = {
        role = "frontend"
      }

      tags = {
        Name    = "${var.cluster_name}-frontend-ng"
        Project = var.cluster_name
      }
    }

    # Backend node group in PRIVATE subnets
    backend = {
      ami_type       = "AL2_x86_64"
      instance_types = [var.node_instance_type_backend]
      subnet_ids     = module.vpc.private_subnets

      min_size     = var.min_size_backend
      max_size     = var.max_size_backend
      desired_size = var.desired_size_backend

      labels = {
        role = "backend"
      }

      tags = {
        Name    = "${var.cluster_name}-backend-ng"
        Project = var.cluster_name
      }
    }
  }

  # Useful cluster add-ons
  cluster_addons = {
    coredns = {
      preserve = true
    }
    kube-proxy = {
      preserve = true
    }
    vpc-cni = {
      preserve = true
    }
  }

  tags = {
    Project = var.cluster_name
  }
}

# Data sources to configure Kubernetes provider after cluster is ready
data "aws_eks_cluster" "this" {
  name = module.eks.cluster_name
  depends_on = [module.eks]
}

data "aws_eks_cluster_auth" "this" {
  name = module.eks.cluster_name
}

# Kubernetes provider uses EKS exec auth via AWS CLI
provider "kubernetes" {
  host                   = data.aws_eks_cluster.this.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.this.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.this.token
}

# Namespace: itops
resource "kubernetes_namespace" "itops" {
  metadata {
    name = "itops"
  }
}

# Security group rule: Allow port 8000 from public subnet to private subnet
resource "aws_security_group_rule" "backend_from_frontend" {
  type                     = "ingress"
  from_port                = 8000
  to_port                  = 8000
  protocol                 = "tcp"
  source_security_group_id = module.eks.node_security_group_id
  security_group_id        = module.eks.node_security_group_id
  description              = "Allow backend port 8000 from frontend nodes"
}
