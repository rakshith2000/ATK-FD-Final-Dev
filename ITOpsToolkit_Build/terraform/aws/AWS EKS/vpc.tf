##########################
# Use Existing VPC
##########################
data "aws_vpcs" "available" {}

data "aws_vpc" "selected" {
  id = data.aws_vpcs.available.ids[0]
}

##########################
# Public Subnets
##########################
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = data.aws_vpc.selected.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                           = "${var.project_name}-eks-public-${count.index}-${var.environment}"
    "kubernetes.io/role/elb"                        = "1"
    "kubernetes.io/cluster/${var.eks_cluster_name}" = "shared"
  }
}

##########################
# Private Subnets
##########################
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = data.aws_vpc.selected.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                                           = "${var.project_name}-eks-private-${count.index}-${var.environment}"
    "kubernetes.io/role/internal-elb"               = "1"
    "kubernetes.io/cluster/${var.eks_cluster_name}" = "shared"
  }
}

##########################
# Internet Gateway (use existing or create)
##########################
data "aws_internet_gateway" "existing" {
  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.selected.id]
  }
}

##########################
# NAT Gateway
##########################
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "${var.project_name}-eks-nat-eip-${var.environment}" }
}

resource "aws_nat_gateway" "eks" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "${var.project_name}-eks-nat-${var.environment}" }
}

##########################
# Public Route Table
##########################
resource "aws_route_table" "public" {
  vpc_id = data.aws_vpc.selected.id
  tags   = { Name = "${var.project_name}-eks-public-rt-${var.environment}" }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = data.aws_internet_gateway.existing.id
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

##########################
# Private Route Table
##########################
resource "aws_route_table" "private" {
  vpc_id = data.aws_vpc.selected.id
  tags   = { Name = "${var.project_name}-eks-private-rt-${var.environment}" }
}

resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.eks.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
