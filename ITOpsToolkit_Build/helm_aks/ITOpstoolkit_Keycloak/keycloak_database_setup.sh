#!/bin/bash
# =============================================================================
# Keycloak Database Setup Script — Aurora PostgreSQL
# =============================================================================

KEYCLOAK_DB_NAME="<db_name>"
KEYCLOAK_USER="<user_name>"
KEYCLOAK_PASSWORD="<user_password>"

RDS_HOST="<db_host_URL>"
RDS_PORT="5432"
RDS_MASTER_USER="postgres"
RDS_MASTER_DB="postgres"

echo "============================================================"
echo " Keycloak DB Setup — Aurora PostgreSQL"
echo " Host     : $RDS_HOST"
echo " Database : $KEYCLOAK_DB_NAME"
echo " DB User  : $KEYCLOAK_USER"
echo "============================================================"
echo ""
echo "You will be prompted for the RDS master (postgres) password."
echo ""

# Step 1: Create database and user
psql \
  -h "$RDS_HOST" \
  -U "$RDS_MASTER_USER" \
  -d "$RDS_MASTER_DB" \
  -p "$RDS_PORT" \
  -v ON_ERROR_STOP=1 \
  <<SQL
CREATE DATABASE ${KEYCLOAK_DB_NAME};
CREATE USER ${KEYCLOAK_USER} WITH PASSWORD '${KEYCLOAK_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE ${KEYCLOAK_DB_NAME} TO ${KEYCLOAK_USER};
SQL

if [[ $? -ne 0 ]]; then
  echo "ERROR: Step 1 failed. Aborting."
  exit 1
fi

echo "Step 1 complete — database and user created."
echo ""

# Step 2: Configure schema permissions
psql \
  -h "$RDS_HOST" \
  -U "$RDS_MASTER_USER" \
  -d "$KEYCLOAK_DB_NAME" \
  -p "$RDS_PORT" \
  -v ON_ERROR_STOP=1 \
  <<SQL
ALTER SCHEMA public OWNER TO ${KEYCLOAK_USER};
GRANT ALL ON SCHEMA public TO ${KEYCLOAK_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${KEYCLOAK_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${KEYCLOAK_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${KEYCLOAK_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${KEYCLOAK_USER};
SQL

if [[ $? -ne 0 ]]; then
  echo "ERROR: Step 2 failed. Aborting."
  exit 1
fi

echo "Step 2 complete — schema permissions configured."
echo ""
echo "============================================================"
echo " Keycloak DB setup completed successfully!"
echo " Database : $KEYCLOAK_DB_NAME"
echo " User     : $KEYCLOAK_USER"
