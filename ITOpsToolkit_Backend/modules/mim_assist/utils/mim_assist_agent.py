# Author - Vishwas K S, Ragavan Veerarajan & Viraj Purandare
# Created On - July 3, 2026

# Default packages
import os
import re
import sys
import json
import logging
import asyncio
from functools import partial
from dataclasses import Field
from httpx import AsyncClient, Timeout
from typing import Optional, List, Dict, Any

# Third party packages
# from langsmith import AsyncClient
import yaml


from llm_guard import scan_prompt, scan_output
from llm_guard.input_scanners import Toxicity as InpToxicity, Gibberish as InpGibberish, BanCode as InpBanCode, PromptInjection, Anonymize, Secrets
from llm_guard.input_scanners.prompt_injection import MatchType as InpPIMatchType
from llm_guard.input_scanners.toxicity import MatchType as InpToxMatchType
from llm_guard.input_scanners.gibberish import MatchType as InpGibMatchType
from llm_guard.output_scanners import Toxicity as OutToxicity, Gibberish as OutGibberish, BanCode as OutBanCode, Deanonymize, Bias #, MaliciousURLs
from llm_guard.output_scanners.toxicity import MatchType as OutToxMatchType
from llm_guard.output_scanners.gibberish import MatchType as OutGibMatchType
from llm_guard.output_scanners.bias import MatchType as OutBiasMatchType
from llm_guard.vault import Vault

from agent_framework import (
    handler,
    Executor,
    Message,
    WorkflowContext,
    AgentExecutorResponse,
    resolve_agent_id,
    MCPStreamableHTTPTool
)
from agent_framework.orchestrations import HandoffBuilder


# Global variable and paths
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = os.path.join(SCRIPT_PATH.split("modules")[0])
AUTH_PATH = os.path.join(ROOT_PATH, "modules", "auth", "utils")

sys.path.append(ROOT_PATH)
sys.path.append(AUTH_PATH)

# Custom packages
from llm import LLM
import system_config_mim as scf
from pydantic import BaseModel, Field
from usage_tracker import track_llm_tokens
from auth_handler import get_user_info_supplementary
from pro_logger import log_event, application_logger

class TechTowerIdentifierResponseModel(BaseModel):
    technology_tower: List[str] = Field(
        ...,
        min_length=1,
        description="One or more of the most relevant technology towers selected "
                    "strictly from the provided list of available technology towers; "
                    "never empty."
    )

class InitialDiagnosisResponseModel(BaseModel):
    initial_diagnosis: str = Field(..., min_length = 1,
                                   description = "Structure the output to include\n"
                                                 "What happened — based on the incident text\n"
                                                 "Possible impacted components\n"
                                                 "Summary of matching KB articles — if any\n"
                                                 "Likely cause — if identifiable\n"
                                                 "Recommended next steps\n"
                                                 "The result must be a clear initial diagnosis ready to be shared on a Sev-1 bridge call. in markdown")


class ChatBotStructuredResponse(BaseModel):
    response: str = Field(
        ...,
        description=(
            "The full response to the user's query. This is what the user sees "
            "as the chatbot's answer."
        )
    )

def tech_tower_identifier_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("tech_tower_identifier_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for TechTowerIdentifierAgent. Configure valid model."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "mim_assist",
                  component_type = "agent_definition",
                  component_name = "mim_assist - tech_tower_identifier_agent")
        return log_str

    # Deterministic + strict schema. API guarantees {title, content:[...]}.
    client._default_options["temperature"] = 0.0



    return client.create_agent(
        name = "TechTowerIdentifierAgent",
        instructions = instruction,
        description = description,
        require_per_service_call_history_persistence = True,
    ), client

async def initial_diagnosis_agent(sys_prompts_config, mcp_tool):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("initial_diagnosis_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for InitialDiagnosisAgent. Configure valid model."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "mim_assist",
                  component_type = "agent_definition",
                  component_name = "mim_assist - initial_diagnosis_agent")
        return log_str

    # Deterministic + strict schema. API guarantees {title, content:[...]}.
    client._default_options["temperature"] = 0.0
    # client._litellm_params["response_format"] = InitialDiagnosisResponseModel


    return client.create_agent(
        name = "InitialDiagnosisAgent",
        instructions = instruction,
        description = description,
        require_per_service_call_history_persistence = True,
        tools = [mcp_tool],
    ), client

async def mim_assist_chatbot(sys_prompts_config, mcp_tool):
    configs = scf.get_system_config()
    macb_sys_prompt = sys_prompts_config.get("chatbot_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(macb_sys_prompt)

    llm_tag = macb_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ChatBotAgent."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "mim_assist",
                  component_type = "app_agent_execution",
                  component_name = "mim_assist_agent - mim_assist_chatbot")
        return log_str

    client._default_options["temperature"] = 0.0
    client._litellm_params["response_format"] = ChatBotStructuredResponse

    return client.create_agent(
        name = "ChatBotAgent",
        instructions = instruction,
        description = description,
        tools = [mcp_tool],
    ), client

def summary_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("summary_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for SummaryAgent. Configure valid model."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "mim_assist",
                  component_type = "agent_definition",
                  component_name = "mim_assist - summary_agent")
        return log_str

    # Deterministic + strict schema. API guarantees {title, content:[...]}.
    client._default_options["temperature"] = 0.0



    return client.create_agent(
        name = "SummaryAgent",
        instructions = instruction,
        description = description,
        require_per_service_call_history_persistence = True,
    ), client

async def run_tech_tower_identifier_agent(query, token):

    user_id = get_user_info_supplementary(token)["user_id"]
    
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "mim_assist", component_type = "app_agent_execution",
                  component_name = "mim_assist_agent - run_tech_tower_identifier_agent")
        return log_str
    
    llm_guards = configs["llm_guards"]

    TechtowerIdentifierAgent, tti_client = tech_tower_identifier_agent(sys_prompts_config = sys_prompts_config)

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

    tti_client.usage = {}

    outcome = await TechtowerIdentifierAgent.run(sanitized_prompt)

    # Track LLM token usage
    track_llm_tokens(
        usage = tti_client.usage,
        agent = "TechtowerIdentifierAgent",
        llm_tag = sys_prompts_config.get("tech_tower_identifier_agent", {}).get("llm_tag", configs["llm_tag"]),
        module = "mim_assist",
        user_id = user_id,
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome

async def run_initial_diagnosis_agent(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]
    
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "mim_assist", component_type = "app_agent_execution",
                  component_name = "mim_assist_agent - run_initial_diagnosis_agent")
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

        InitialDiagnosisAgent, ida_client = await initial_diagnosis_agent(
            sys_prompts_config = sys_prompts_config,
            mcp_tool = mcp_tool
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

        ida_client.usage = {}

        outcome = await InitialDiagnosisAgent.run(sanitized_prompt)

        # Track LLM token usage
        track_llm_tokens(
            usage = ida_client.usage,
            agent = "InitialDiagnosisAgent",
                llm_tag = sys_prompts_config.get("initial_diagnosis_agent", {}).get("llm_tag", configs["llm_tag"]),
                module = "mim_assist",
                user_id = user_id,
            )

        outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

        return outcome

async def run_summary_agent(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]
    
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "mim_assist", component_type = "app_agent_execution",
                  component_name = "mim_assist_agent - run_summary_agent")
        return log_str
    
    llm_guards = configs["llm_guards"]

    SummaryAgent, sa_client = summary_agent(sys_prompts_config = sys_prompts_config)

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

    sa_client.usage = {}

    outcome = await SummaryAgent.run(sanitized_prompt)

    # Track LLM token usage
    track_llm_tokens(
        usage = sa_client.usage,
        agent = "SummaryAgent",
        llm_tag = sys_prompts_config.get("summary_agent", {}).get("llm_tag", configs["llm_tag"]),
        module = "mim_assist",
        user_id = user_id,
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome

async def run_chatbot(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
   
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "mim_assist", component_type = "app_agent_execution",
                  component_name = "mim_assist_agent - run_chatbot")
        return log_str

    llm_guards = configs["llm_guards"]
    
    async with AsyncClient(
        headers = {"Authorization": f"Bearer {token}"},
        follow_redirects = True,
        timeout = Timeout(60.0, read = 300.0),
    ) as http_client:

        mcp_tool = MCPStreamableHTTPTool(
            name = "servicenow_mcp",
            url = os.getenv("AGENT_GATEWAY_URL","http://127.0.0.1:6000/mcp"),
            http_client = http_client,
        )

        ChatBotAgent, cb_client = await mim_assist_chatbot(
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

        outcome = await ChatBotAgent.run(sanitized_prompt)

        # Track LLM token usage
        track_llm_tokens(
            usage = cb_client.usage,
            agent = "ChatBotAgent",
            llm_tag = sys_prompts_config.get("min_assist_chatbot", {}).get("llm_tag", configs["llm_tag"]),
            module = "mim_assist",
            user_id = user_id
        )

        outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

        try:
            parsed_dict = json.loads(outcome)
            structured_response = ChatBotStructuredResponse.model_validate(parsed_dict)
            return structured_response.model_dump()
        except (json.JSONDecodeError, ValueError) as e:
            log_event(application_logger, logging.WARNING,
                    f"mim_assist run_chatbot() failed to parse/validate output: {e}; raw={outcome[:200]!r}",
                    module_name="mim_assist", component_type="app_agent_execution",
                    component_name="mim_assist_agent - run_chatbot")

        return outcome
