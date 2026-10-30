# Author: Vishwas K S, Ragavan Veerarajan
# Created on: July 13, 2026
import os
import sys

import requests
from dotenv import load_dotenv
import msal

# Timeout (in seconds) applied to every outbound SSO request.
REQUEST_TIMEOUT = 30
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
DB_SESSION_PATH = os.path.join(ROOT_PATH, "database")
MODEL_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "models")
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")

sys.path.append(ROOT_PATH)
sys.path.append(MODEL_PATH)
sys.path.append(CONFIG_PATH)
sys.path.append(DB_SESSION_PATH)

import db_session
import core_crud
from mim_config import DefaultConfig as CONFIG


class SSOTokenGenerator:
    """Generate SSO tokens for the service account and individual users.

    Connection details (sso_url, realm_name, client_id, client_secret) are
    fetched once in the constructor and reused across every method, so no
    realm- or environment-specific value is hard-coded.
    """

    def __init__(self):
        self.details = self.get_connection_details()


    def get_connection_details(self):
        """Retrieve the SSO client connection details and credentials."""
        load_dotenv(os.path.join(ROOT_PATH, "config", ".keycloak_env"))

        realm_name = os.getenv("REALM_NAME")
        client_id = os.getenv("SA_CLIENT_ID")
    
        db_local_session = db_session.get_db()
        details = core_crud.get_sso_client_details_with_creds(
            db_local_session, client_id, realm_name
        )
        db_local_session.close()

        return details
    
    def get_access_token(self):
    
        authority = f"https://login.microsoftonline.com/{CONFIG.APP_TENANTID}"  # <-- tenant-specific
        app = msal.ConfidentialClientApplication(CONFIG.APP_ID, authority = authority, client_credential = CONFIG.APP_PASSWORD)
        result = app.acquire_token_for_client(scopes = ["https://graph.microsoft.com/.default"])
        access_token = result["access_token"]
        
        return access_token
    
    def get_user_email(self, oid: str) -> str | None:
        """
        Get user's email from Microsoft Graph using Entra ID Object ID (OID).

        Returns:
            Email address if found, otherwise None.
        """
        access_token = self.get_access_token()
        url = f"https://graph.microsoft.com/v1.0/users/{oid}?$select=mail,userPrincipalName"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        user = response.json()

        # mail can be null for guest users
        return user.get("mail") or user.get("userPrincipalName")

    def generate_service_account_token(self):
        """Request a token for the service account (client_credentials grant)."""
        token_url = (
            f"{self.details.sso_url}/realms/{self.details.realm_name}"
            "/protocol/openid-connect/token"
        )
        headers = {"content-type": "application/x-www-form-urlencoded"}
        data = {
            "client_id": self.details.client_id,
            "client_secret": self.details.client_secret,
            "grant_type": "client_credentials",
        }

        response = requests.post(
            token_url, headers=headers, data=data, timeout=REQUEST_TIMEOUT
        )
   
        return response.json()["access_token"]

    def generate_token(self, email):
        realm_name = self.details.realm_name
        client_id = self.details.client_id
        service_account_token = self.generate_service_account_token()

        sso_url = f"{self.details.sso_url}/admin/realms/{self.details.realm_name}/users?email={email}"

        headers = {"Authorization": f"Bearer {service_account_token}"}

        response = requests.get(sso_url, headers = headers)
 
        user_id = response.json()[0]["id"]

        sso_url = f"{self.details.sso_url}/realms/{realm_name}/protocol/openid-connect/token"
        data = {
                "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
                "client_id": self.details.client_id,
                "client_secret": self.details.client_secret,
                "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",
                "subject_token": service_account_token,
                "requested_subject": user_id
                }

        response = requests.post(sso_url, headers = headers, data = data)
        
        return response.json()["access_token"]
    

