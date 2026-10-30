# Author - Viraj Purandare
# Created On - November 24, 2025

# Default packages
import os
import sys

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
DB_SESSION_PATH = os.path.join(SCRIPT_PATH, "database")
sys.path.append(DB_SESSION_PATH)

# Custom packages
import core_crud
import db_session

class SSOClient:
    def __init__(self):
       self.client = None

    # Onboard LLM to database
    def insert_sso_client_details(self, sso_client_details):
        db_local_session = db_session.get_db()
        response = core_crud.insert_sso_client_details(db_local_session, sso_client_details)
        db_local_session.close()
        return response

    # Get LLM list
    def list_sso_clients(self):
        db_local_session = db_session.get_db()
        response = core_crud.list_sso_clients(db_local_session)
        db_local_session.close()
        return response

    # Fetch LLM details
    def get_sso_client_details(self, client_id, realm_name):
        db_local_session = db_session.get_db()
        response = core_crud.get_sso_client_details(db_local_session, client_id, realm_name)
        db_local_session.close()
        return response

    # Delete LLM details
    def delete_sso_client(self, sso_client_details):
        db_local_session = db_session.get_db()
        response = core_crud.delete_sso_client(db_local_session, sso_client_details)
        db_local_session.close()
        return response