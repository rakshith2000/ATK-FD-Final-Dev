# Author - Vishwas K S and Viraj Purandare
# Created On - November 25, 2025

# Default packages
import os
import sys
import json

# Third party packages
import requests
from dotenv import load_dotenv

from fastapi import Request, Depends, HTTPException
from fastapi.security import HTTPBearer

# Global variables
security = HTTPBearer()

SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
MODEL_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "models")
DB_SESSION_PATH = os.path.join(ROOT_PATH, "database")

sys.path.append(ROOT_PATH)
sys.path.append(MODEL_PATH)
sys.path.append(DB_SESSION_PATH)

# Custom packages
import core_crud
import db_session
from auth_data_models import *

# Retrieves all connection details for SSO
def get_sso_connection_details():
    load_dotenv(os.path.join(ROOT_PATH, "config", ".keycloak_env"))

    realm_name = os.getenv("REALM_NAME")
    client_id = os.getenv("CLIENT_ID")

    db_local_session = db_session.get_db()
    response = core_crud.get_sso_client_details_with_creds(db_local_session, client_id, realm_name)
    db_local_session.close()

    return response

# Validate activeness of access token
def verify_access_token(token: str):
    response = get_sso_connection_details()

    target_url = f"{response.sso_url}/realms/{response.realm_name}/protocol/openid-connect/token/introspect"
    headers = {"content-type": "application/x-www-form-urlencoded"}

    payload = {
        "grant_type": "client_credentials",
        "token": token,
        "token_type_hint": "access_token",
        "client_id": response.client_id,
        "client_secret": response.client_secret
    }

    try:
        response = requests.post(target_url, data = payload, headers = headers, verify = False)
        status = response.json()["active"]

    except requests.exceptions.ConnectionError as e:
        raise HTTPException(status_code = 503, detail = "Connection refused to Keycloak Service")
    
    except Exception as e:
        pass

    if status:
        return (True, response.json())
    else:
        raise HTTPException(status_code = 401, detail = "Invalid token")

# Get full information of user
def get_user_info(request: Request, credentials = Depends(security)):
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code = 401, detail = "Missing token")

    token = credentials.credentials
    user_info = get_user_info_supplementary(token)

    return User.parse_obj(user_info)

# Supplementary method for user information
def get_user_info_supplementary(token):
    (status, token_info) = verify_access_token(token)

    user_info = {}
    user_info["user_id"] = token_info["username"]
    user_info["name"] = token_info["name"]
    user_info["email"] = token_info["email"]
    user_info["email_verified"] = token_info["email_verified"]

    if "groups" in token_info:
        user_info["groups"] = token_info["groups"]
    else:
        user_info["groups"] = []

    return user_info

# Autheticate and authorize user
def validate_user(request: Request, credentials = Depends(security)):
    auth_header = request.headers.get("authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code = 401, detail = "Missing token")
    
    token = credentials.credentials
    (status, token_info) = verify_access_token(token)
    return status

# print(get_user_info_supplementary("eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIzRllZN0ZLVkNSamFsdURxNXVWbEFqUDVoVDlkQXdNU3NuUzNNWHpJdGQ0In0.eyJleHAiOjE3NzI2MzU2NzAsImlhdCI6MTc3MjYzNTM3MCwiYXV0aF90aW1lIjoxNzcyNjM0OTYyLCJqdGkiOiJvbnJ0YWM6YTBkOGUzN2EtZDU0NC0xYTBiLWU5MDItMDllYTU2MzU3OTQ0IiwiaXNzIjoiaHR0cHM6Ly9rZXljbG9hay5hdXRvbm9tb3VzaXRvcHN0b29sa2l0LmNvbTozMjEyMy9yZWFsbXMvQUlPVCIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiI4NTZhNzVlNC1mMDIyLTRkMGMtODkzOS0yZTdlYzY2YzgyNjIiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJhY2NvdW50LWNvbnNvbGUiLCJzaWQiOiJhMzU0YTBkMS1jM2IzLTQ0NWQtZTllYy1kNzg5ZDBkN2ExYWUiLCJhY3IiOiIwIiwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJ2aWV3LWdyb3VwcyIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIl19fSwic2NvcGUiOiJvcGVuaWQgZW1haWwgcHJvZmlsZSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6IlRlc3QgVXNlciIsInByZWZlcnJlZF91c2VybmFtZSI6IjEyMzQ1IiwiZ2l2ZW5fbmFtZSI6IlRlc3QiLCJmYW1pbHlfbmFtZSI6IlVzZXIiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20ifQ.eXGuMjmwj9rqc3vSxHgfPE8dfsyVX3eIO0IJ9aH68tjMi51W2wjDv3r5uHNc63O7YOUN3hPuM9v14Pinivy5ruRkGIF60xPUHFMJ8XkL0XrPaoTHvNfzXsaKTD3bxiwSUUCu41Uv2cYHyNxhRrnEOBZX2f9ZiCQTx9I4Gd7tJ9RAFA4N9JzbBgu06obm3itO12RvnP35umCXTiewcnlFobHINlx9QRJivxdidsnYcd_TZhOM1zoc-fSNj-xB2ca0Y5tVssorMoodqi9GaKW1mlaf9fMplInYO86KpU_LdnvcdwZvscX1-GpzYiRQGwy6uR8HhldG9klIaueWvJYXpQ"))
