# Author - Viraj Purandare
# Created On - June 10, 2026

# Default packages
import os
import sys

from dotenv import load_dotenv

# Global variables and Custom packages
SCRIPT_PATH = os.path.dirname(__file__)
DB_PATH = os.path.join(SCRIPT_PATH, "database")
sys.path.append(DB_PATH)

load_dotenv()

import db_models
import db_session
import core_crud

class PreSetup:
    def __init__(self):
        pass

    # Create database schema
    def create_database_schema(self):
        db_models.create_tables()

    # Set SSO client in the database
    def set_sso_client(self):
        db_local_session = db_session.get_db()

        keycloak_env_file = os.path.join(SCRIPT_PATH, "config", ".keycloak_env")
        load_dotenv(keycloak_env_file)

        sso_client_data = {}
        sso_client_data["sso_url"] = os.getenv("KEYCLOAK_URL")
        sso_client_data["redirection_url"] = os.getenv("KEYCLOAK_REDIRECTION_URL")
        sso_client_data["logged_in_user"] = "system"
        sso_client_data["realm_name"] = os.getenv("REALM_NAME")
        sso_client_data["client_id"] = os.getenv("CLIENT_ID")
        sso_client_data["client_secret"] = os.getenv("CLIENT_SECRET")

        (status, output) = core_crud.insert_sso_client_details(db_local_session, sso_client_data)
        db_local_session.close()

        
        db_local_session = db_session.get_db()

        sso_client_data = {}
        sso_client_data["sso_url"] = os.getenv("KEYCLOAK_URL")
        sso_client_data["redirection_url"] = os.getenv("KEYCLOAK_REDIRECTION_URL")
        sso_client_data["logged_in_user"] = "system"
        sso_client_data["realm_name"] = os.getenv("REALM_NAME")
        sso_client_data["client_id"] = os.getenv("SA_CLIENT_ID")
        sso_client_data["client_secret"] = os.getenv("SA_CLIENT_SECRET")

        (status, output) = core_crud.insert_sso_client_details(db_local_session, sso_client_data)

        db_local_session.close()

    def set_itsm_connector(self):
        db_local_session = db_session.get_db()

        itsm_env_file = os.path.join(SCRIPT_PATH, "config", ".itsm_env")
        load_dotenv(itsm_env_file)

        itsm_connector_details = {
            "itsm_tag": os.getenv("ITSM_TAG"),
            "itsm_type": os.getenv("ITSM_TYPE", "ServiceNow"),
            "itsm_auth_type": os.getenv("ITSM_AUTH_TYPE","Service Account"),
            "itsm_url": os.getenv("ITSM_URL"),
            "itsm_user": os.getenv("ITSM_USER"),
            "itsm_password": os.getenv("ITSM_PASSWORD"),
            "bearer_token": os.getenv("BEARER_TOKEN"),
            "logged_in_user": "system",
            "itsm_additional_config": {}
        }

        (status, output) = core_crud.insert_itsm_connector_details(db_local_session, itsm_connector_details)
        db_local_session.close()

if __name__ == "__main__":
    pre_setup_obj = PreSetup()
    pre_setup_obj.create_database_schema()
    pre_setup_obj.set_sso_client()
    pre_setup_obj.set_itsm_connector()
