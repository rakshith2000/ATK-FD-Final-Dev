# Author - Viraj Purandare
# Created On - September 30, 2025

# Default packages
import os
import sys
import yaml
import datetime

# Third party packages
# import litellm
# litellm._turn_on_debug()


# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
DB_SESSION_PATH = os.path.join(SCRIPT_PATH, "database")
MODULES_PATH = os.path.join(SCRIPT_PATH, "modules")
sys.path.append(DB_SESSION_PATH)

TS_FMT = "%Y-%m-%d %H:%M:%S"

# Custom packages
import core_crud
import db_session
from llm_proxy import LLMProxy
from litellm_chat_client import LiteLLMChatClient

# Disable LiteLLM logging to avoid initiation of separate event loop in FastAPI loop
os.environ["LITELLM_LOGGING"] = "false"

class LLM:
    def __init__(self):
       self.client = None

    # Onboard LLM to database
    def insert_llm_details(self, llm_details):
        db_local_session = db_session.get_db()

        cred_envs = {
                "nova": "AWS_SECRET_ACCESS_KEY",
                "azure": "AZURE_API_KEY",
                "gemini": "GEMINI_API_KEY"
                }
        
        flag = 0
        cred_env_final = None

        for llm_type, cred_env in cred_envs.items():
            if llm_details["llm_type"] == llm_type:
                flag = 1
                llm_config = llm_details["llm_config"]

                if cred_env in llm_config:
                    cred_env_final = cred_env
                break

        if cred_env_final:
            response = core_crud.insert_llm_details(db_local_session, llm_details, cred_env_final)
            db_local_session.close()
            return response
        elif flag == 1:
            return (False, f"Incorrect LLM configurations - {cred_env} missing in configuratios.")
        else:
            return (False, "Incorrect LLM configurations - One or more keys missing.")

    # Get LLM list
    def list_llms(self):
        db_local_session = db_session.get_db()
        response = core_crud.list_llms(db_local_session)
        db_local_session.close()
        return response

    # Fetch LLM details
    def get_llm_details(self, llm_tag):
        db_local_session = db_session.get_db()
        response = core_crud.get_llm_details(db_local_session, llm_tag)
        db_local_session.close()
        return response

    # Fetch details for all LLMs
    def get_all_llm_details(self):
        llm_tag_wise_data = {}
        for entry in os.scandir(MODULES_PATH):
            if entry.is_dir():
                # Module selection
                module_name = entry.name
                pconf_path = os.path.join(entry.path, "config", "system_prompts.yaml")

                if not os.path.isfile(pconf_path):
                    continue

                # Module prompt library access
                with open(pconf_path, "r") as pconf:
                    package_config = yaml.safe_load(pconf.read())

                llm_tag = None
                global_configs = package_config.get("package_configs", None)
                if global_configs:
                    llm_tag = global_configs.get("llm_tag", None)

                # LLM tag dependency calculation
                prompts = package_config.get("prompts", None)
                if prompts:
                    for agent_or_tool in prompts:
                        llm_tag = prompts[agent_or_tool].get("llm_tag", llm_tag)

                        if llm_tag and llm_tag not in llm_tag_wise_data:
                            llm_tag_wise_data[llm_tag] = []
                        if llm_tag:
                            llm_tag_wise_data[llm_tag].append(f"{module_name} - {agent_or_tool}")

        # LLM details retrieval
        db_local_session = db_session.get_db()
        (status, all_llms) = core_crud.get_all_llm_details(db_local_session)
        db_local_session.close()

        if not status:
            return (status, all_llms)

        llm_details_temp_list = []
        llm_details_list = []

        if not all_llms:
            return (True, None)

        llm_details_temp_list = [{k: v for k, v in llm.__dict__.items() if not k.startswith("_")} for llm in all_llms]

        for llm in llm_details_temp_list:
            llm["llm_type"] = llm["llm_type"].value
            llm["updated_at"] = llm["updated_at"].strftime(TS_FMT)
            llm["associated_agents_or_tools"] = llm_tag_wise_data.get(llm["llm_tag"], None)
            llm_details_list.append(llm)
            
        return (status, llm_details_list)

    # Delete LLM details
    def delete_llm(self, llm_details):
        db_local_session = db_session.get_db()
        response = core_crud.delete_llm(db_local_session, llm_details)
        db_local_session.close()
        return response

    # Set Litellm Environment
    def set_litellm_environment(self, llm_tag):
        
        llm_proxy_obj = LLMProxy()
        llm_proxy_obj.set_litellm_environment(llm_tag)
        
        if llm_proxy_obj.client:
            self.client = llm_proxy_obj.client
            return
        
        db_local_session = db_session.get_db()
        llm_details = core_crud.get_llm_details_with_creds(db_local_session, llm_tag)
        db_local_session.close()
        
    
        if llm_details:
            llm_config = llm_details.llm_config
            llm_type = llm_details.llm_type.value
        else:
            return
        
        for env_var, val in llm_config.items():
            os.environ[env_var] = val

        if llm_type == "AWS Nova":
            deployment_name = os.getenv("LITELLM_MODEL", "amazon.nova-1")
            if not deployment_name.startswith('azure/'):
                deployment_name = 'bedrock/' + str(deployment_name)

            self.model = deployment_name
            self.client = LiteLLMChatClient(model = deployment_name)

        elif llm_type == "Azure OpenAI":
            deployment_name = os.getenv("AZURE_DEPLOYMENT_NAME", "gpt-4o")

            if not deployment_name.startswith('azure/'):
                deployment_name = 'azure/' + str(deployment_name)

            self.model = deployment_name
            self.client = LiteLLMChatClient(model = deployment_name)

        elif llm_type == "Google Gemini":
            deployment_name = os.getenv("MODEL", "gemini-2.5-flash")
            if not deployment_name.startswith('gemini/'):
                deployment_name = 'gemini/' + str(deployment_name)

            self.model = deployment_name
            self.client = LiteLLMChatClient(model = deployment_name)


    # Record LLM usage details
    def insert_llm_usage_details(self, llm_usage_details):
        db_local_session = db_session.get_db()
        response = core_crud.insert_llm_usage_details(db_local_session, llm_usage_details)
        db_local_session.close()
        return response

'''
# Sample usage -

llm = LLM()
llm_details = {
        "llm_tag": "azure_tp",
        "llm_type": "azure",
        "llm_config":{
            "AZURE_API_KEY": "123",
            "AZURE_API_BASE": "https://name.cognitiveservices.azure.com/",
            "AZURE_API_VERSION": "2025-01-01-preview",
            "AZURE_DEPLOYMENT_NAME": "gpt-4o"
            },
        "logged_in_user": "viraj.purandare"
        }

print(llm.insert_llm_details(llm_details))
print(llm.get_llm_details('azure_gpt4o').llm_config)
'''
