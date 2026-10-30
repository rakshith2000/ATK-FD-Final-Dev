aws_region   = "eu-west-1"
project_name = "sdp-ta"
environment  = "sandbox"

# AWS Credentials
aws_access_key = ""
aws_secret_key = ""

# Toggle — deploy Kendra, OpenSearch, or both
enable_kendra     = true
enable_opensearch = true

# Kendra
kendra_edition = "DEVELOPER_EDITION"

# OpenSearch
opensearch_engine_version  = "OpenSearch_2.11"
opensearch_instance_type   = "t3.small.search"
opensearch_instance_count  = 2
opensearch_volume_size     = 20
opensearch_master_user     = "<master-username>"
opensearch_master_password = "<Master-P@ssw0rd1>"  # Min 8 chars, upper+lower+number+special
