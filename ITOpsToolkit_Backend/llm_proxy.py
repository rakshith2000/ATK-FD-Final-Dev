# Author - Viraj Purandare
# Created On - April 20, 2026

# Default packages
import os
import sys

# Third party packages
import requests
from litellm_chat_client import LiteLLMChatClient

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
DB_SESSION_PATH = os.path.join(SCRIPT_PATH, "database")
sys.path.append(DB_SESSION_PATH)

# Custom packages
import core_crud
import db_session

# Disable LiteLLM logging to avoid initiation of separate event loop in FastAPI loop
os.environ["LITELLM_LOGGING"] = "false"

class LLMProxy:
    def __init__(self):
       self.client = None

    # Onboard LLM proxy to database
    def insert_litellm_proxy_details(self, llm_proxy_details):
        db_local_session = db_session.get_db()
        response = core_crud.insert_litellm_proxy_details(db_local_session, llm_proxy_details)
        db_local_session.close()
        return response

    # Fetch LLM proxy details
    def get_litellm_proxy_details(self):
        db_local_session = db_session.get_db()
        response = core_crud.get_litellm_proxy_details(db_local_session)
        db_local_session.close()
        return response

    # Delete LLM proxy details
    def delete_litellm_proxy(self, llm_proxy_details):
        db_local_session = db_session.get_db()
        response = core_crud.delete_litellm_proxy(db_local_session, llm_proxy_details)
        db_local_session.close()
        return response

    # Set Litellm Environment
    def set_litellm_environment(self, llm_tag):
        db_local_session = db_session.get_db()
        response = core_crud.get_litellm_proxy_details_with_creds(db_local_session)
        db_local_session.close()

        self.model = llm_tag

        try:
            output = requests.get(
                f"{response.proxy_base_url}/v1/models",
                headers = {"Authorization": f"Bearer {response.proxy_key}"},
                timeout = 10,
            )

            output.raise_for_status()
            data = output.json()

            tags = [m["id"] for m in data["data"]]

            if llm_tag in tags:
                self.model = llm_tag
                self.client = LiteLLMChatClient(
                        model  = f"litellm_proxy/{llm_tag}",
                        api_base = response.proxy_base_url,
                        api_key = response.proxy_key
                        )
        except Exception as e:
            pass
