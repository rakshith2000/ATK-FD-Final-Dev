import os
import sys
import json
import logging

from llm import LLM
from pro_logger import log_event, application_logger

def track_llm_tokens(usage, user_id, module, agent, llm_tag):
    llm_obj = LLM()

    prompt_tokens_details = usage.get("prompt_tokens_details") or {}

    llm_usage_details = {}
    llm_usage_details["logged_in_user"] = user_id
    llm_usage_details["module"] = module
    llm_usage_details["agent"] = agent
    llm_usage_details["llm_tag"] = llm_tag
    llm_usage_details["prompt_tokens"] = usage.get("prompt_tokens", 0)
    llm_usage_details["cache_tokens"] = prompt_tokens_details.get("cached_tokens", 0)
    llm_usage_details["internal_processing_and_output_tokens"] = usage.get("completion_tokens", 0)
    llm_usage_details["total_tokens"] = usage.get("total_tokens", 0)

    try:
        llm_obj.insert_llm_usage_details(llm_usage_details)
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Unable to insert llm_usage_details to the database - {str(e)}",
                  module_name = "application utility",
                  component_type = "Utility",
                  component_name = "usage_tracker"
        )
