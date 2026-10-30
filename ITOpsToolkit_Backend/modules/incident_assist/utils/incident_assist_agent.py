# Author - Vishwas K S
# Created On - September 29, 2025

# Default packages
import os
import re
import sys
import json
import logging
import asyncio
from functools import partial

# Third party packages
import yaml
from httpx import AsyncClient, Timeout

from llm_guard.vault import Vault
from llm_guard import scan_prompt, scan_output
from llm_guard.output_scanners.bias import MatchType as OutBiasMatchType
from llm_guard.input_scanners.toxicity import MatchType as InpToxMatchType
from llm_guard.output_scanners.toxicity import MatchType as OutToxMatchType
from llm_guard.input_scanners.gibberish import MatchType as InpGibMatchType
from llm_guard.output_scanners.gibberish import MatchType as OutGibMatchType
from llm_guard.input_scanners.prompt_injection import MatchType as InpPIMatchType
from llm_guard.output_scanners import Toxicity as OutToxicity, Gibberish as OutGibberish, BanCode as OutBanCode, Deanonymize, Bias#, MaliciousURLs
from llm_guard.input_scanners import Toxicity as InpToxicity, Gibberish as InpGibberish, BanCode as InpBanCode, PromptInjection, Anonymize, Secrets

from agent_framework import MCPStreamableHTTPTool


# Global variable and paths
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = os.path.join(SCRIPT_PATH.split("modules")[0])
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
AUTH_PATH = os.path.join(ROOT_PATH, "modules", "auth", "utils")

sys.path.append(ROOT_PATH)
sys.path.append(AUTH_PATH)
sys.path.append(CONFIG_PATH)

# Custom packages
from llm import LLM
import system_config_ia as scf
from incident_assist_tools import *
from usage_tracker import track_llm_tokens

from pro_logger import log_event, application_logger

from auth_handler import get_user_info_supplementary

from typing import Literal
from pydantic import BaseModel, Field

def rag_agent(sys_prompts_config):
    configs = scf.get_system_config()
    iaira_sys_prompt = sys_prompts_config.get("knowledge_retrieval_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(iaira_sys_prompt)
    llm_tag = iaira_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for RagAgent."
        log_event(application_logger, 
                  logging.ERROR, 
                  log_str,
                  module_name = "incident_assist",
                  component_type = "app_agent_execution",
                  component_name = "incident_assist - rag_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name = "RagAgent",
        instructions = instruction,
        description = description,
        tools = [list_similar_articles_tools, get_cmdb_ci_details_tools, get_service_map_tools],
    ), client

async def incident_ai_chatbot(sys_prompts_config, mcp_tool):
    configs = scf.get_system_config()
    iaicb_sys_prompt = sys_prompts_config.get("chatbot_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(iaicb_sys_prompt)

    llm_tag = iaicb_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ChatBotAgent."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "incident_assist",
                  component_type = "app_agent_execution",
                  component_name = "incident_assist_agent - incident_ai_chatbot")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name = "ChatBotAgent",
        instructions = instruction,
        description = description,
        tools = [mcp_tool],
    ), client

async def incident_ai_demo_chatbot(sys_prompts_config):
    configs = scf.get_system_config()
    iaicb_sys_prompt = sys_prompts_config.get("demo_chatbot_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(iaicb_sys_prompt)

    llm_tag = iaicb_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ChatBotAgent."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "incident_assist",
                  component_type = "app_agent_execution",
                  component_name = "incident_assist_agent - incident_ai_demo_chatbot")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name = "DemoChatBotAgent",
        instructions = instruction,
        description = description,
    ), client

def resolution_summary_agent(sys_prompts_config):
    configs = scf.get_system_config()
    iairsa_sys_prompt = sys_prompts_config.get("resolution_summary_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(iairsa_sys_prompt)
    llm_tag = iairsa_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ResolutionSummaryAgent."
        log_event(application_logger, 
                  logging.ERROR, 
                  log_str,
                  module_name = "incident_assist",
                  component_type = "app_agent_execution",
                  component_name = "incident_assist - resolution_summary_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name = "ResolutionSummaryAgent",
        instructions = instruction,
        description = description,
    ), client

async def run_demo_chatbot(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "incident_assist", component_type = "app_agent_execution",
                  component_name = "incident_assist_agent - run_demo_chatbot")
        return log_str

    llm_guards = configs["llm_guards"]

    DemoChatBotAgent, cb_client = await incident_ai_demo_chatbot(
        sys_prompts_config = sys_prompts_config,
    )

    vault = Vault()
    input_llm_guard_dict = {
        "toxicity": InpToxicity(threshold = 0.5, match_type = InpToxMatchType.SENTENCE),
        "gibberish": InpGibberish(match_type = InpGibMatchType.FULL),
        "bancode": InpBanCode(),
        "prompt_injection": PromptInjection(threshold = 0.5, match_type = InpPIMatchType.FULL),
        "anonymization": Anonymize(vault)
    }

    output_llm_guard_dict = {
        "toxicity": OutToxicity(threshold = 0.5, match_type = OutToxMatchType.SENTENCE),
        #"malicious_urls": MaliciousURLs(threshold = 0.7),
        "gibberish": OutGibberish(match_type = OutGibMatchType.FULL),
        "bancode": OutBanCode(),
        "anonymization": Deanonymize(vault),
        "bias": Bias(threshold = 0.5, match_type = OutBiasMatchType.FULL)
    }

    input_scanners_list = []
    output_scanners_list = []

    for item in llm_guards:
        if item in input_llm_guard_dict:
            input_scanners_list.append(input_llm_guard_dict[item])

        if item in output_llm_guard_dict:
            output_scanners_list.append(output_llm_guard_dict[item])
    
    query += "\n\n**DO NOT DISCLOSE THAT YOU ARE SIMULATING**"
    sanitized_prompt, _, _ = scan_prompt(input_scanners_list, query)

    cb_client.usage = {}

    outcome = await DemoChatBotAgent.run(sanitized_prompt)

    # Track LLM token usage
    track_llm_tokens(
        usage = cb_client.usage,
        agent = "DemoChatBotAgent",
        llm_tag = sys_prompts_config.get("incident_ai_demo_chatbot", {}).get("llm_tag", configs["llm_tag"]),
        module = "incident_assist",
        user_id = user_id,
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    try:
        outcome = "{" + "}".join("{".join(outcome.strip().split("{")[1:]).strip().split("}")[:-1]) + "}"
        return json.loads(outcome)
        
    except (json.JSONDecodeError, ValueError) as e:
        log_event(application_logger, logging.WARNING,
                f"incident_assist run_demo_chatbot() failed to parse/validate output: {e}; raw={outcome[:200]!r}",
                module_name="incident_assist", component_type="app_agent_execution",
                component_name="incident_assist_agent - run_demo_chatbot")

    return outcome

async def run_rag(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]
    
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "incident_assist", component_type = "app_agent_execution",
                  component_name = "incident_assist_agent - run_rag")
        return log_str
    
    llm_guards = configs["llm_guards"]

    RagAgent, rag_client = rag_agent(sys_prompts_config = sys_prompts_config)

    vault = Vault()
    input_llm_guard_dict = {
        "toxicity": InpToxicity(threshold = 0.5, match_type = InpToxMatchType.SENTENCE),
        "gibberish": InpGibberish(match_type = InpGibMatchType.FULL),
        "bancode": InpBanCode(),
        "prompt_injection": PromptInjection(threshold = 0.5, match_type = InpPIMatchType.FULL),
        "anonymization": Anonymize(vault)
    }

    output_llm_guard_dict = {
        "toxicity": OutToxicity(threshold = 0.5, match_type = OutToxMatchType.SENTENCE),
        #"malicious_urls": MaliciousURLs(threshold = 0.7),
        "gibberish": OutGibberish(match_type = OutGibMatchType.FULL),
        "bancode": OutBanCode(),
        "anonymization": Deanonymize(vault),
        "bias": Bias(threshold = 0.5, match_type = OutBiasMatchType.FULL)
    }

    input_scanners_list = []
    output_scanners_list = []

    for item in llm_guards:
        if item in input_llm_guard_dict:
            input_scanners_list.append(input_llm_guard_dict[item])

        if item in output_llm_guard_dict:
            output_scanners_list.append(output_llm_guard_dict[item])

    sanitized_prompt, _, _ = scan_prompt(input_scanners_list, query)

    rag_client.usage = {}

    outcome = await RagAgent.run(sanitized_prompt)

    # Track LLM token usage
    track_llm_tokens(
        usage = rag_client.usage,
        agent = "RagAgent",
        llm_tag = sys_prompts_config.get("rag_agent", {}).get("llm_tag", configs["llm_tag"]),
        module = "incident_assist",
        user_id = user_id,
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    # Update conversation history
    try:
        outcome = re.sub(r"^```json\s*|\s*```$", "", outcome.strip())
        return json.loads(outcome)

    except (json.JSONDecodeError, ValueError) as e:
        log_event(application_logger, logging.WARNING,
                f"incident_assist run_rag() failed to parse/validate output: {e}; raw={outcome[:200]!r}",
                module_name="incident_assist", component_type="app_agent_execution",
                component_name="incident_assist_agent - run_rag")
 
    return outcome

async def run_chatbot(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "incident_assist", component_type = "app_agent_execution",
                  component_name = "incident_assist_agent - run_chatbot")
        return log_str

    llm_guards = configs["llm_guards"]
    
    async with AsyncClient(
        headers = {"Authorization": f"Bearer {token}"},
        follow_redirects = True,
        timeout = Timeout(60.0, read = 300.0),
    ) as http_client:

        mcp_tool = MCPStreamableHTTPTool(
            name = "servicenow_mcp",
            url = os.getenv("AGENT_GATEWAY_URL", "http://itops-platform-agent-gateway.integration.svc.cluster.local:3000/agent-gateway"),
            http_client = http_client,
        )

        ChatBotAgent, cb_client = await incident_ai_chatbot(
            sys_prompts_config = sys_prompts_config,
            mcp_tool = mcp_tool,
        )

        vault = Vault()
        input_llm_guard_dict = {
            "toxicity": InpToxicity(threshold = 0.5, match_type = InpToxMatchType.SENTENCE),
            "gibberish": InpGibberish(match_type = InpGibMatchType.FULL),
            "bancode": InpBanCode(),
            "prompt_injection": PromptInjection(threshold = 0.5, match_type = InpPIMatchType.FULL),
            "anonymization": Anonymize(vault)
        }

        output_llm_guard_dict = {
            "toxicity": OutToxicity(threshold = 0.5, match_type = OutToxMatchType.SENTENCE),
            #"malicious_urls": MaliciousURLs(threshold = 0.7),
            "gibberish": OutGibberish(match_type = OutGibMatchType.FULL),
            "bancode": OutBanCode(),
            "anonymization": Deanonymize(vault),
            "bias": Bias(threshold = 0.5, match_type = OutBiasMatchType.FULL)
        }

        input_scanners_list = []
        output_scanners_list = []

        for item in llm_guards:
            if item in input_llm_guard_dict:
                input_scanners_list.append(input_llm_guard_dict[item])

            if item in output_llm_guard_dict:
                output_scanners_list.append(output_llm_guard_dict[item])

        sanitized_prompt, _, _ = scan_prompt(input_scanners_list, query)

        cb_client.usage = {}

        async with mcp_tool:
            outcome = await ChatBotAgent.run(sanitized_prompt)

        # Track LLM token usage
        track_llm_tokens(
            usage = cb_client.usage,
            agent = "ChatBotAgent",
            llm_tag = sys_prompts_config.get("incident_ai_chatbot", {}).get("llm_tag", configs["llm_tag"]),
            module = "incident_assist",
            user_id = user_id,
        )

        outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

        try:
            outcome = "{" + "}".join("{".join(outcome.strip().split("{")[1:]).strip().split("}")[:-1]) + "}"
            return json.loads(outcome)

        except (json.JSONDecodeError, ValueError) as e:
            log_event(application_logger, logging.WARNING,
                    f"incident_assist run_chatbot() failed to parse/validate output: {e}; raw={outcome[:200]!r}",
                    module_name="incident_assist", component_type="app_agent_execution",
                    component_name="incident_assist_agent - run_chatbot")

        return outcome
    
async def run_resolution_summary_agent(conversation, token):
    user_id = get_user_info_supplementary(token)["user_id"]
    
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "incident_assist", component_type = "app_agent_execution",
                  component_name = "incident_assist_agent - run_resolution_summary_agent")
        return log_str
    
    llm_guards = configs["llm_guards"]

    ResolutionSummaryAgent, resolution_summary_client = resolution_summary_agent(sys_prompts_config = sys_prompts_config)

    vault = Vault()
    input_llm_guard_dict = {
        "toxicity": InpToxicity(threshold = 0.5, match_type = InpToxMatchType.SENTENCE),
        "gibberish": InpGibberish(match_type = InpGibMatchType.FULL),
        "bancode": InpBanCode(),
        "prompt_injection": PromptInjection(threshold = 0.5, match_type = InpPIMatchType.FULL),
        "anonymization": Anonymize(vault)
    }

    output_llm_guard_dict = {
        "toxicity": OutToxicity(threshold = 0.5, match_type = OutToxMatchType.SENTENCE),
        #"malicious_urls": MaliciousURLs(threshold = 0.7),
        "gibberish": OutGibberish(match_type = OutGibMatchType.FULL),
        "bancode": OutBanCode(),
        "anonymization": Deanonymize(vault),
        "bias": Bias(threshold = 0.5, match_type = OutBiasMatchType.FULL)
    }

    input_scanners_list = []
    output_scanners_list = []

    for item in llm_guards:
        if item in input_llm_guard_dict:
            input_scanners_list.append(input_llm_guard_dict[item])

        if item in output_llm_guard_dict:
            output_scanners_list.append(output_llm_guard_dict[item])

    sanitized_prompt, _, _ = scan_prompt(input_scanners_list, conversation)

    resolution_summary_client.usage = {}

    outcome = await ResolutionSummaryAgent.run(sanitized_prompt)

    # Track LLM token usage
    track_llm_tokens(
        usage = resolution_summary_client.usage,
        agent = "ResolutionSummaryAgent",
        llm_tag = sys_prompts_config.get("resolution_summary_agent", {}).get("llm_tag", configs["llm_tag"]),
        module = "incident_assist",
        user_id = user_id,
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome
