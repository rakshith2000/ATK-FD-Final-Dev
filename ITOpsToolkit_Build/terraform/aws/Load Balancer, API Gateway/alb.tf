##########################
# ALB Security Group
##########################
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg-${var.environment}"
  description = "Security group for Application Load Balancer"
  vpc_id      = data.aws_vpcs.available.ids[0]

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-alb-sg-${var.environment}" }
}

##########################
# Application Load Balancer
##########################
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb-${var.environment}"
  internal           = var.alb_internal
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = slice(data.aws_subnets.available.ids, 0, min(2, length(data.aws_subnets.available.ids)))

  enable_deletion_protection = false

  tags = { Name = "${var.project_name}-alb-${var.environment}" }
}

##########################
# Target Group — Frontend (port 80)
##########################
resource "aws_lb_target_group" "frontend" {
  name        = "${var.project_name}-frontend-tg"
  port        = var.frontend_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpcs.available.ids[0]
  target_type = "ip"

  health_check {
    path                = var.health_check_path
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }

  tags = { Name = "${var.project_name}-frontend-tg-${var.environment}" }
}

##########################
# Target Group — Backend (port 8080)
##########################
resource "aws_lb_target_group" "backend" {
  name        = "${var.project_name}-backend-tg"
  port        = var.backend_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpcs.available.ids[0]
  target_type = "ip"

  health_check {
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }

  tags = { Name = "${var.project_name}-backend-tg-${var.environment}" }
}

##########################
# Target Group — KeyCloak (port 8443)
##########################
resource "aws_lb_target_group" "keycloak" {
  name        = "${var.project_name}-keycloak-tg"
  port        = var.keycloak_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpcs.available.ids[0]
  target_type = "ip"

  health_check {
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }

  tags = { Name = "${var.project_name}-keycloak-tg-${var.environment}" }
}

##########################
# HTTP Listener (port 80) — default to Frontend
##########################
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

##########################
# Routing Rule — /api/* → Backend
##########################
resource "aws_lb_listener_rule" "backend" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern { values = ["/api/*"] }
  }
}

##########################
# Routing Rule — /auth/* → KeyCloak
##########################
resource "aws_lb_listener_rule" "keycloak" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  condition {
    path_pattern { values = ["/auth/*"] }
  }
}
