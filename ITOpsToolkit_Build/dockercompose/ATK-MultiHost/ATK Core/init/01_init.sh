#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL

    -- Keycloak DB + user
    CREATE USER <Keycloak DB Username> WITH PASSWORD '<Keycloak DB Password>';
    CREATE DATABASE <Keycloak Database Name> OWNER <Keycloak DB Username>;
    GRANT ALL PRIVILEGES ON DATABASE <Keycloak Database Name> TO <Keycloak DB Username>;

    -- LiteLLM DB + user
    CREATE USER <LiteLLM DB Username> WITH PASSWORD '<LiteLLM DB Password>';
    CREATE DATABASE <LiteLLM Database Name> OWNER <LiteLLM DB Username>;
    GRANT ALL PRIVILEGES ON DATABASE <LiteLLM Database Name> TO <LiteLLM DB Username>;

EOSQL

# Enable pgvector in the main ATK database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
