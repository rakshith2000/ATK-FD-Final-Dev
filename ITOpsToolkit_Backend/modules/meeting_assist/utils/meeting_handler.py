# Author - Viraj Purandare and Vishwas K S
# Created On - May 5, 2026

# Default packages
import os
import sys
import json
import logging
from dotenv import load_dotenv

# Third party packages
import msal
import requests

# Global variables and custom packages
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0].strip()

sys.path.append(ROOT_PATH)

from vault import Vault
from pro_logger import log_event, application_logger

vault_type_file = os.path.join(ROOT_PATH, "config", ".vault_type")
load_dotenv(vault_type_file)
VAULT_TYPE = os.getenv("VAULT_TYPE")

# Teams azure app configuration
def get_azure_app_secret_details():
    vault_obj = Vault(VAULT_TYPE)
    (status, value) = vault_obj.read_secret("teams_azure_app_secret")

    if not status:
        TENANT_ID = CLIENT_ID = None
    else:
        TENANT_ID = value[0]
        CLIENT_ID = value[1]

    return (TENANT_ID, CLIENT_ID)

def get_user_verification_code_public_flow():
    (TENANT_ID, CLIENT_ID) = get_azure_app_secret_details()
    authority = f"https://login.microsoftonline.com/{TENANT_ID}"

    scopes = [
            "OnlineMeetings.ReadWrite",
            "OnlineMeetingTranscript.Read.All"
            ]

    try:
        app = msal.PublicClientApplication(CLIENT_ID, authority = authority)
        flow = app.initiate_device_flow(scopes = scopes)

        if "error" in flow:
            log_event(application_logger,
                      logging.ERROR,
                      f"Public device flow initiation failed - {flow.get('error_description', flow['error'])}",
                      is_exception = True,
                      module_name = "meeting_assist",
                      component_type = "app_connector_execution",
                      component_name = "meeting_handler - get_user_verification_code_public_flow")

            return (False, f"Public device flow initiation failed - {flow.get('error_description', flow['error'])}")
        
        if not os.path.exists(os.path.join(SCRIPT_PATH, "temp")):
            os.makedirs(os.path.join(SCRIPT_PATH, "temp"))

        flow_file_path = os.path.join(SCRIPT_PATH, "temp", flow["user_code"] + ".json")

        with open(flow_file_path, "w") as f:
            json.dump(flow, f)

        return (True, flow["user_code"])
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"public device flow initiation failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "app_connector_execution",
                  component_name = "meeting_handler - get_user_verification_code_public_flow")

        return (False, f"public device flow initiation failed - {str(e)}")
    
# Get the access and refresh token
def get_ms_tokens_public_flow(auth_code):
    (TENANT_ID, CLIENT_ID) = get_azure_app_secret_details()

    flow_file_path = os.path.join(SCRIPT_PATH, "temp", auth_code + ".json")

    if not os.path.isfile(flow_file_path):
        log_event(application_logger,
                  logging.ERROR,
                  f"Flow file not found for auth_code: {auth_code}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "app_connector_execution",
                  component_name = "meeting_handler - get_ms_tokens_public_flow")
        return (False, f"Flow file not found for auth_code: {auth_code}")

    try:
        with open(flow_file_path, "r") as f:
            flow = json.load(f)

        authority = f"https://login.microsoftonline.com/{TENANT_ID}"

        app = msal.PublicClientApplication(CLIENT_ID, authority = authority)
        token_response = app.acquire_token_by_device_flow(flow = flow)

        if "error" in token_response:
            log_event(application_logger,
                      logging.ERROR,
                      f"Public user verification token acquisition failed - {token_response.get('error_description', token_response['error'])}",
                      is_exception = True,
                      module_name = "meeting_assist",
                      component_type = "app_connector_execution",
                      component_name = "meeting_handler - get_ms_tokens_public_flow")
            return (False, f"Public user verification token acquisition failed - {token_response.get('error_description', token_response['error'])}")
        
        try:
            os.remove(flow_file_path)
        except FileNotFoundError:
            pass

        return (True, token_response)
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Public user verification token acquisition failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "app_connector_execution",
                  component_name = "meeting_handler - get_ms_tokens_public_flow")
        return (False, f"Public user verification token acquisition failed - {str(e)}")

# Refresh access_token
def refresh_ms_token_public_flow(refresh_token):
    (TENANT_ID, CLIENT_ID) = get_azure_app_secret_details()

    url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    data = f"client_id = {CLIENT_ID}&refresh_token = {refresh_token}&grant_type = refresh_token"

    try:
        response = requests.post(url, headers = headers, data = data)
        token_response = response.json()

        if "error" in token_response:
            log_event(application_logger,
                      logging.ERROR,
                      f"Public flow token refresh failed - {token_response.get('error_description', token_response['error'])}",
                      is_exception = True,
                      module_name = "meeting_assist",
                      component_type = "app_connector_execution",
                      component_name = "meeting_handler - refresh_ms_token_public_flow")
            return (False, f"Public flow token refresh failed - {token_response.get('error_description', token_response['error'])}")

        return (True, token_response)
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Public flow token refresh failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "app_connector_execution",
                  component_name = "meeting_handler - refresh_ms_token_public_flow")
        return (False, f"Public flow token refresh failed - {str(e)}")
    
# Get meeting information
def get_meeting_info(meeting_url, access_token):
    url = f"https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter = joinWebUrl eq '{meeting_url}'"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(url, headers = headers)
        return (True, response.json())

    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting information retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "app_connector_execution",
                  component_name = "meeting_handler - get_meeting_info")
        return (False, f"Meeting information retrieval failed - {str(e)}")

# Get metadata for all transcripts
def list_transcripts(meeting_id, access_token):
    url = f"https://graph.microsoft.com/v1.0/me/onlineMeetings/{meeting_id}/transcripts"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(url, headers = headers)
        return (True, response.json())

    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting transcripts listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "app_connector_execution",
                  component_name = "meeting_handler - list_transcripts")
        
        return (False, f"Meeting transcripts listing failed - {str(e)}")

# Get content of meeting transcript
def get_transcript_content(meeting_id, transcript_id, access_token):
    url = f"https://graph.microsoft.com/v1.0/me/onlineMeetings/{meeting_id}/transcripts/{transcript_id}/content"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "text/vtt"
    }

    try:
        response = requests.get(url, headers = headers)

        fmt_transcript = response.content.decode("utf-8").split("\n")

        final_transcript = []
        for line in fmt_transcript:
            if "</v>" in line:
                line = line.strip().replace("<v ", "").replace("</v>", "").replace(">", ": ")
                final_transcript.append(line)

        return (True, final_transcript)
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting transcript content retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "app_connector_execution",
                  component_name = "meeting_handler - get_transcript_content")
        return (False, f"Meeting transcript content retrieval failed - {str(e)}")
