# Author - Viraj Purandare
# Created On - Dec 22, 2025

# Default packages
import os
import sys
import logging

# Third party packages
import yaml

# Global variable and paths
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = SCRIPT_PATH.split("modules")[0]

sys.path.append(ROOT_PATH)

# Custom packages
from pro_logger import log_event, application_logger 

# Obtain necessary configuations such as system prompts, models etc.
def get_system_config():
    configs = {
            "sys_prompts_config": None,
            "model": None,
            "llm_tag": None,
            "itsm_tags": None
            }

    sys_prompts_fp = os.path.join(CONFIG_PATH, "system_prompts.yaml")

    try:
        with open(sys_prompts_fp, "r") as f:
            config_file_data = yaml.safe_load(f)
            try:
                configs["sys_prompts_config"] = config_file_data["prompts"]
            except Exception:
                pass

            try:
                configs["llm_tag"] = config_file_data["package_configs"]["llm_tag"]
            except Exception:
                pass

            try:
                configs["itsm_tags"] = config_file_data["package_configs"]["itsm_tags"]
            except Exception:
                pass

            try:
                with open(sys_prompts_fp, "r") as f:
                    configs["llm_guards"] = yaml.safe_load(f)["package_configs"]["llm_guards"]
            except Exception:
                pass
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Prompt library parsing error - {str(e)}",
                  module_name = "problem_assist",
                  component_type = "configuration",
                  component_name = "system_config - get_system_config")

    return configs

# Guardrail to avoid unwanted actions by agents in absence of system prompts
def apply_system_prompt_guardrail(sys_prompt):
    '''
        Below default system prompts are intentionally embedded into the code.
        The prompts run in the scenario where configuration file itself is corrupted.
        Hence, these prompts can't be the part of any configuration files.
    '''

    default_agent_description = "No action agent"
    default_agent_instruction = """
    Your goal is to **NOT** act on any user's request and discard it due to absence of clarity on your role.
    Mention the reason that system prompts are missing.
    Due to this guardrail, you are not able to perform action.
    Ask to contact developer.
    """

    if sys_prompt and (
            sys_prompt.get("description", None) == None and sys_prompt.get("instruction", None) == None or
            sys_prompt.get("description").strip() == "" and sys_prompt.get("instruction") == ""
            ):
        description = default_agent_description
        instruction = default_agent_instruction
    else:
        description = sys_prompt.get("description", "")
        instruction = sys_prompt.get("instruction", "")

    return (description, instruction)