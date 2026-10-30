# Author - Vishwas K S
# Created On - MAY 27, 2026

# Default packages
import os
import sys
import logging
from typing import Annotated
from pydantic import Field

import core_crud
import db_session

from agent_framework import tool

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = SCRIPT_PATH.split("modules")[0].strip()

sys.path.append(SCRIPT_PATH)
sys.path.append(ROOT_PATH)

import system_config_ia as scf
from mcp_servers.servicenow_mcp import ServiceNow
from pro_logger import log_event, application_logger

def list_similar_articles(query):
    db_local_session = db_session.get_db()
    (status, similar_articles) = core_crud.list_articles_by_similarity(db_local_session, query)
    db_local_session.close()

    if not status:
        return [{"relevant_articles": "Similar articles listing failed"}]
    
    elif similar_articles == []:
        return [{"relevant_articles":"No relative articles found"}]
    
    else:
        return similar_articles
    
@tool(name = "list_similar_articles", description = "Searches the knowledge base and retrieves relevant articles based on the user's query.")
def list_similar_articles_tools(
    query: Annotated[
        str,
        "The user's question or topic to search for in the knowledge base. "
        "Should be a concise, descriptive phrase capturing the core issue or subject. "
    ]
) -> Annotated[list[dict], "A list of relevant knowledge base articles ranked by similarity to the query. " ]:
    return list_similar_articles(query)

def get_cmdb_ci_details(ci_name: str):
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]
    chatbot_sys_prompt = sys_prompts_config.get("knowledge_retrieval_agent", None)
    itsm_tags = chatbot_sys_prompt.get("itsm_tags", configs["itsm_tags"])
    itsm_tags = ",".join(itsm_tags)

    itsm_obj = ServiceNow()
    (status, data) = itsm_obj.get_cmdb_ci(itsm_tags, ci_name)   
    return data

@tool(name = "get_cmdb_ci_details", description = "Retrieves details about a specific CI from the CMDB.")
def get_cmdb_ci_details_tools(
    cmdb_ci: Annotated[
        str,
        "The name of the Configuration Item (CI) to retrieve details for. "
    ]
):
    return get_cmdb_ci_details(cmdb_ci)


def get_service_map(ci_name):
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]
    chatbot_sys_prompt = sys_prompts_config.get("knowledge_retrieval_agent", None)
    itsm_tags = chatbot_sys_prompt.get("itsm_tags", configs["itsm_tags"])
    itsm_tags = ",".join(itsm_tags)
    itsm_obj = ServiceNow()
    (status, data) = itsm_obj.get_service_map_details(itsm_tags, ci_name)  
    return data

@tool(name = "get_service_map", description = "Retrieves the service map for a specific CI from the CMDB.")
def get_service_map_tools(
    cmdb_ci: Annotated[
        str,
        "The name of the Configuration Item (CI) to retrieve the service map for. "
    ]
):
    return get_service_map(cmdb_ci)

