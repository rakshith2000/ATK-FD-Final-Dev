##########################
# Latest RHEL 9 AMI
##########################
data "aws_ami" "rhel" {
  most_recent = true
  owners      = ["309956199498"] # Red Hat official

  filter {
    name   = "name"
    values = ["RHEL-9.*_HVM-*-x86_64-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

##########################
# Latest Windows Server 2022 AMI
##########################
data "aws_ami" "windows" {
  most_recent = true
  owners      = ["801119661308"] # Amazon official

  filter {
    name   = "name"
    values = ["Windows_Server-2022-English-Full-Base-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

##########################
# Auto-create Key Pair
##########################
resource "tls_private_key" "ec2" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ec2" {
  key_name   = var.ec2_key_name
  public_key = tls_private_key.ec2.public_key_openssh
}

##########################
# Security Group
##########################
resource "aws_security_group" "ec2_test" {
  name        = "${var.project_name}-ec2-test-sg-${var.environment}"
  description = "Security group for test EC2 instances"
  vpc_id      = data.aws_vpcs.available.ids[0]

  # SSH for RHEL
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Restrict to your IP in production
  }

  # RDP for Windows
  ingress {
    description = "RDP"
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Restrict to your IP in production
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-ec2-test-sg-${var.environment}" }
}

##########################
# 1x RHEL Instance — 2 vCPU, 8 GB RAM, 100 GB disk
##########################
resource "aws_instance" "rhel_test" {
  ami                    = data.aws_ami.rhel.id
  instance_type          = "t3.large" # 2 vCPU, 8 GB RAM
  key_name               = aws_key_pair.ec2.key_name
  subnet_id              = data.aws_subnets.available.ids[0]
  vpc_security_group_ids = [aws_security_group.ec2_test.id]

  root_block_device {
    volume_size           = 100
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_tokens   = "required" # IMDSv2 enforced
    http_endpoint = "enabled"
  }

  tags = { Name = "${var.project_name}-rhel-test-${var.environment}" }
}

##########################
# 2x Windows Instances — 4 vCPU, 8 GB RAM, 100 GB disk
##########################
resource "aws_instance" "windows_test" {
  count                  = 2
  ami                    = data.aws_ami.windows.id
  instance_type          = "t3.xlarge" # 4 vCPU, 16 GB RAM (closest with 4 vCPU)
  key_name               = aws_key_pair.ec2.key_name
  subnet_id              = data.aws_subnets.available.ids[0]
  vpc_security_group_ids = [aws_security_group.ec2_test.id]

  root_block_device {
    volume_size           = 100
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_tokens   = "required" # IMDSv2 enforced
    http_endpoint = "enabled"
  }

  tags = { Name = "${var.project_name}-windows-test-${count.index + 1}-${var.environment}" }
}
