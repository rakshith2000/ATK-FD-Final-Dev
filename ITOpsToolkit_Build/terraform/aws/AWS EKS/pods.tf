##########################
# Namespace
##########################
resource "kubernetes_namespace" "app" {
  metadata {
    name = "${var.project_name}-${var.environment}"
    labels = {
      project     = var.project_name
      environment = var.environment
    }
  }

  depends_on = [aws_eks_node_group.main]
}

###############################################################################
# FRONTEND POD — Public Subnet (internet-facing LoadBalancer)
###############################################################################
resource "kubernetes_deployment" "frontend" {
  metadata {
    name      = "frontend"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels    = { app = "frontend", tier = "public" }
  }

  spec {
    replicas = 1
    selector { match_labels = { app = "frontend" } }

    template {
      metadata { labels = { app = "frontend", tier = "public" } }
      spec {
        container {
          name  = "frontend"
          image = var.frontend_image
          port { container_port = 80 }

          resources {
            requests = { cpu = "250m", memory = "256Mi" }
            limits   = { cpu = "500m", memory = "512Mi" }
          }

          liveness_probe {
            http_get {
              path = "/"
              port = 80
            }
            initial_delay_seconds = 15
            period_seconds        = 10
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "frontend" {
  metadata {
    name      = "frontend"
    namespace = kubernetes_namespace.app.metadata[0].name
    annotations = {
      "service.beta.kubernetes.io/aws-load-balancer-scheme"          = "internet-facing"
      "service.beta.kubernetes.io/aws-load-balancer-type"            = "external"
      "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type" = "ip"
      "service.beta.kubernetes.io/aws-load-balancer-subnets"         = join(",", aws_subnet.public[*].id)
    }
  }
  spec {
    selector = { app = "frontend" }
    type     = "LoadBalancer"
    port {
      port        = 80
      target_port = 80
      protocol    = "TCP"
    }
  }
}

###############################################################################
# BACKEND POD — Private Subnet (ClusterIP, internal only)
###############################################################################
resource "kubernetes_deployment" "backend" {
  metadata {
    name      = "backend"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels    = { app = "backend", tier = "private" }
  }

  spec {
    replicas = 1
    selector { match_labels = { app = "backend" } }

    template {
      metadata { labels = { app = "backend", tier = "private" } }
      spec {
        container {
          name  = "backend"
          image = var.backend_image
          port { container_port = 8080 }

          resources {
            requests = { cpu = "500m", memory = "512Mi" }
            limits   = { cpu = "1000m", memory = "1Gi" }
          }

          liveness_probe {
            tcp_socket { port = 8080 }
            initial_delay_seconds = 15
            period_seconds        = 10
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "backend" {
  metadata {
    name      = "backend"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  spec {
    selector = { app = "backend" }
    type     = "ClusterIP"
    port {
      port        = 8080
      target_port = 8080
    }
  }
}

###############################################################################
# KEYCLOAK POD — Public Subnet (internet-facing LoadBalancer)
###############################################################################
resource "kubernetes_deployment" "keycloak" {
  metadata {
    name      = "keycloak"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels    = { app = "keycloak", tier = "public" }
  }

  spec {
    replicas = 1
    selector { match_labels = { app = "keycloak" } }

    template {
      metadata { labels = { app = "keycloak", tier = "public" } }
      spec {
        container {
          name  = "keycloak"
          image = var.keycloak_image
          args  = ["start-dev"]
          port { container_port = 8080 }

          env {
            name  = "KEYCLOAK_ADMIN"
            value = "admin"
          }
          env {
            name  = "KEYCLOAK_ADMIN_PASSWORD"
            value = "admin"
          }

          resources {
            requests = { cpu = "500m", memory = "512Mi" }
            limits   = { cpu = "1000m", memory = "1Gi" }
          }

          liveness_probe {
            http_get {
              path = "/health/live"
              port = 8080
            }
            initial_delay_seconds = 60
            period_seconds        = 15
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "keycloak" {
  metadata {
    name      = "keycloak"
    namespace = kubernetes_namespace.app.metadata[0].name
    annotations = {
      "service.beta.kubernetes.io/aws-load-balancer-scheme"          = "internet-facing"
      "service.beta.kubernetes.io/aws-load-balancer-type"            = "external"
      "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type" = "ip"
      "service.beta.kubernetes.io/aws-load-balancer-subnets"         = join(",", aws_subnet.public[*].id)
    }
  }
  spec {
    selector = { app = "keycloak" }
    type     = "LoadBalancer"
    port {
      port        = 8080
      target_port = 8080
      protocol    = "TCP"
    }
  }
}

###############################################################################
# NGINX POD — Private Subnet (ClusterIP, internal only)
###############################################################################
resource "kubernetes_deployment" "nginx" {
  metadata {
    name      = "nginx"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels    = { app = "nginx", tier = "private" }
  }

  spec {
    replicas = 1
    selector { match_labels = { app = "nginx" } }

    template {
      metadata { labels = { app = "nginx", tier = "private" } }
      spec {
        container {
          name  = "nginx"
          image = var.nginx_image
          port { container_port = 80 }

          resources {
            requests = { cpu = "250m", memory = "256Mi" }
            limits   = { cpu = "500m", memory = "512Mi" }
          }

          liveness_probe {
            http_get {
              path = "/"
              port = 80
            }
            initial_delay_seconds = 10
            period_seconds        = 10
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "nginx" {
  metadata {
    name      = "nginx"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
  spec {
    selector = { app = "nginx" }
    type     = "ClusterIP"
    port {
      port        = 80
      target_port = 80
    }
  }
}
