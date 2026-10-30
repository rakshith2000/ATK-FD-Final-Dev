# Author - Vishwas K S.
# Created On - September 29, 2025

# Default packages
import os
import sys
import json
import logging
import asyncio
from functools import partial

# Third party packages
import yaml
from enum import Enum
from httpx import AsyncClient, Timeout

from typing import Literal
from pydantic import BaseModel, Field

from llm_guard import scan_prompt, scan_output
from llm_guard.input_scanners import Toxicity as InpToxicity, Gibberish as InpGibberish, BanCode as InpBanCode, PromptInjection, Anonymize, Secrets
from llm_guard.input_scanners.prompt_injection import MatchType as InpPIMatchType
from llm_guard.input_scanners.toxicity import MatchType as InpToxMatchType
from llm_guard.input_scanners.gibberish import MatchType as InpGibMatchType
from llm_guard.output_scanners import Toxicity as OutToxicity, Gibberish as OutGibberish, BanCode as OutBanCode, Deanonymize, Bias#, MaliciousURLs
from llm_guard.output_scanners.toxicity import MatchType as OutToxMatchType
from llm_guard.output_scanners.gibberish import MatchType as OutGibMatchType
from llm_guard.output_scanners.bias import MatchType as OutBiasMatchType
from llm_guard.vault import Vault

from agent_framework import (
    handler,
    Executor,
    Message,
    WorkflowContext,
    WorkflowBuilder,
    MCPStreamableHTTPTool,
    AgentExecutorResponse,
    resolve_agent_id,
)

from pydantic import BaseModel

class ChangeDetails(BaseModel):
    short_description: str
    description: str
    implementation_plan: str
    test_plan: str
    backout_plan: str
    chg_model: str

class ChangeRequest(BaseModel):
    change_details: ChangeDetails
    impact_analysis: str

# Global variable and paths
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = os.path.join(SCRIPT_PATH.split("modules")[0])
AUTH_PATH = os.path.join(ROOT_PATH, "modules", "auth", "utils")

sys.path.append(ROOT_PATH)
sys.path.append(AUTH_PATH)

# Custom packages
from llm import LLM
import system_config_ca as scf
from usage_tracker import track_llm_tokens
from change_assist_tools import analyze_image

from pro_logger import log_event, application_logger
from auth_handler import get_user_info_supplementary

# class ResponseToAssistantMessage(Executor):
#     def __init__(self, id: str, label: str = "Agent Output"):
#         super().__init__(id=id)
#         self.label = label

#     @handler
#     async def handle(self, resp: AgentExecutorResponse, ctx: WorkflowContext[Message]) -> None:
#         import json as _json
#         import re as _re

#         msgs = resp.full_conversation or resp.agent_response.messages

#         tool_blocks: list[str] = []
#         last_assistant_text = ""

#         for m in msgs:
#             role = getattr(m, "role", None)

#             # (a) function_result Content items (most common in MAF)
#             for c in getattr(m, "contents", None) or []:
#                 if getattr(c, "type", None) == "function_result":
#                     res = getattr(c, "result", None)
#                     if res is None:
#                         continue
#                     if isinstance(res, tuple) and len(res) == 2 and isinstance(res[0], bool):
#                         # Defensive: tool returned (success, data) — keep only data
#                         res = res[1] if res[0] else f"tool error: {res[1]}"
#                     if isinstance(res, (dict, list)):
#                         tool_blocks.append(_json.dumps(res))
#                     else:
#                         text = str(res)
#                         # Defensive: stringified tuples like "(True, '...')"
#                         m_tuple = _re.match(r"^\(True,\s*'(.*)'\)$", text, _re.DOTALL)
#                         if m_tuple:
#                             text = m_tuple.group(1).encode().decode("unicode_escape")
#                         tool_blocks.append(text)

#             if role == "tool":
#                 text = getattr(m, "text", "") or ""
#                 if text:
#                     tool_blocks.append(text)

#             if role == "assistant":
#                 text = getattr(m, "text", "") or ""
#                 if text:
#                     last_assistant_text = text

#         parts: list[str] = [f"=== {self.label} ==="]
#         if tool_blocks:
#             parts.append("Raw tool output:")
#             parts.extend(tool_blocks)
#         elif last_assistant_text:
#             parts.append(last_assistant_text)

#         combined = "\n\n".join(parts) if (tool_blocks or last_assistant_text) else ""

#         # print(f"[{self.label}] tool_blocks={len(tool_blocks)} forwarded={len(combined)} chars", flush=True)
#         await ctx.send_message(Message("assistant", [combined] if combined else []))

class ResponseToAssistantMessage(Executor):
    def __init__(self, id: str, label: str = "Agent Output"):
        super().__init__(id=id)
        self.label = label

    @handler
    async def handle(
        self,
        resp: AgentExecutorResponse,
        ctx: WorkflowContext[Message],
    ) -> None:

        import json as _json
        import re as _re

        msgs = resp.full_conversation or resp.agent_response.messages

        tool_blocks: list[str] = []
        assistant_messages: list[str] = []

        # print(f"[{self.label}] msgs count={len(msgs)}", flush=True)
        for m in msgs:
            role = getattr(m, "role", None)
            contents = getattr(m, "contents", None) or []
            # print(f"  msg role={role!r}  .text={str(getattr(m,'text',''))[:80]!r}  contents_count={len(contents)}", flush=True)
            for c in contents:

                if getattr(c, "type", None) == "function_result":
                    res = getattr(c, "result", None)

                    if res is None:
                        continue

                    if (
                        isinstance(res, tuple)
                        and len(res) == 2
                        and isinstance(res[0], bool)
                    ):
                        res = (
                            res[1]
                            if res[0]
                            else f"Tool Error: {res[1]}"
                        )

                    if isinstance(res, (dict, list)):
                        tool_blocks.append(
                            _json.dumps(res, indent=2)
                        )
                    else:
                        text = str(res)

                        m_tuple = _re.match(
                            r"^\(True,\s*'(.*)'\)$",
                            text,
                            _re.DOTALL,
                        )

                        if m_tuple:
                            text = (
                                m_tuple.group(1)
                                .encode()
                                .decode("unicode_escape")
                            )

                        tool_blocks.append(text)

            if role == "assistant":
                text = getattr(m, "text", "") or ""

                if text:
                    assistant_messages.append(text)

        #
        # IMPORTANT:
        # Prefer the agent analysis instead of raw MCP output.
        #

        if assistant_messages:

            combined = (
                f"=== {self.label} ===\n\n"
                + assistant_messages[-1]
            )

        elif tool_blocks:

            combined = (
                f"=== {self.label} ===\n\n"
                "Tool Data:\n\n"
                + "\n\n".join(tool_blocks)
            )

        else:
            combined = ""

        await ctx.send_message(
            Message(
                "assistant",
                [combined] if combined else [],
            )
        )


def prompt_refactorer_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("prompt_refactorer_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for PromptRefactorerAgent."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name="change_assist", component_type="app_agent_execution",
                  component_name="change_assist_agent - prompt_refactorer_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="PromptRefactor",
        instructions=instruction,
        description=description,
    ), client


async def architecture_topology_insight_agent(sys_prompts_config, mcp_tool):
    configs = scf.get_system_config()
    atia_sys_prompt = sys_prompts_config.get("architecture_topology_insight_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(atia_sys_prompt)

    llm_tag = atia_sys_prompt.get("llm_tag", configs["llm_tag"])
    itsm_tags = atia_sys_prompt.get("itsm_tags", configs["itsm_tags"])

    if itsm_tags is None:
        log_str = "ERROR: ITSM tags not configured for ArchitectureTopologyInsightAgent."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name="change_assist", component_type="app_agent_execution",
                  component_name="change_assist_agent - architecture_topology_insight_agent")
        return log_str

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ArchitectureTopologyInsightAgent."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name="change_assist", component_type="app_agent_execution",
                  component_name="change_assist_agent - architecture_topology_insight_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="ArchitectureTopologyInsightAgent",
        instructions=instruction,
        description=description,
        tools=[mcp_tool],
    ), client


def architecture_image_analyzer_agent(sys_prompts_config):
    configs = scf.get_system_config()
    aiaa_sys_prompt = sys_prompts_config.get("architecture_image_analyzer_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(aiaa_sys_prompt)
    llm_tag = aiaa_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ArchitectureImageAnalyzerAgent."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name="change_assist", component_type="app_agent_execution",
                  component_name="change_assist_agent - architecture_image_analyzer_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="ArchitectureImageAnalyzerAgent",
        instructions = instruction,
        description = description,
        tools=[analyze_image],
    ), client


def change_creation_agent(sys_prompts_config):
    configs = scf.get_system_config()
    dm_sys_prompt = sys_prompts_config.get("change_creation_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(dm_sys_prompt)
    llm_tag = dm_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for DataMergerAgent."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name="change_assist", component_type="app_agent_execution",
                  component_name="change_assist_agent - data_merger_agent")
        return log_str

    client._default_options["temperature"] = 0.0
    client._litellm_params["response_format"] = ChangeRequest

    return client.create_agent(
        name = "DataMergerAgent",
        description = description,
        instructions = instruction
    ), client

async def run(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name="change_assist", component_type="app_agent_execution",
                  component_name="change_assist_agent - run")
        return log_str

    llm_guards = configs["llm_guards"]

    async with AsyncClient(
        headers={"Authorization": f"Bearer {token}"},
        follow_redirects=True,
        timeout=Timeout(60.0, read=300.0),
    ) as http_client:

        mcp_tool = MCPStreamableHTTPTool(
            name = "servicenowmcp",
            url = os.getenv("AGENT_GATEWAY_URL", "http://itops-platform-agent-gateway.integration.svc.cluster.local:3000/agent-gateway"),
            http_client = http_client,
        )

        PromptRefactorerAgent, pra_client = prompt_refactorer_agent(sys_prompts_config=sys_prompts_config)
        ArchitectureTopologyInsightAgent, atia_client = await architecture_topology_insight_agent(
            sys_prompts_config=sys_prompts_config,
            mcp_tool=mcp_tool,
        )
        ArchitectureImageAnalyzerAgent, aiaa_client = architecture_image_analyzer_agent(sys_prompts_config=sys_prompts_config)
        ChangeCreationAgent, cca_client = change_creation_agent(sys_prompts_config=sys_prompts_config)

        img_resp2msg = ResponseToAssistantMessage(id="ImgResp2Msg", label="Architecture Image Analysis")
        topo_resp2msg = ResponseToAssistantMessage(id="TopoResp2Msg", label="Architecture Topology Insights (from CMDB via MCP)")

        workflow = (
            WorkflowBuilder(start_executor=PromptRefactorerAgent)
            .add_fan_out_edges(
                PromptRefactorerAgent,
                [ArchitectureImageAnalyzerAgent, ArchitectureTopologyInsightAgent],
            )
            .add_edge(ArchitectureImageAnalyzerAgent, img_resp2msg)
            .add_edge(ArchitectureTopologyInsightAgent, topo_resp2msg)
            .add_fan_in_edges([img_resp2msg, topo_resp2msg], ChangeCreationAgent)
            .build()
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

        pra_client.usage = {}
        atia_client.usage = {}
        aiaa_client.usage = {}
        cca_client.usage = {}

        async with mcp_tool:
            workflow_result = await workflow.run(sanitized_prompt)

        track_llm_tokens(usage=pra_client.usage,  agent="PromptRefactorerAgent",
                         llm_tag=sys_prompts_config.get("prompt_refactorer_agent").get("llm_tag", configs["llm_tag"]),
                         module="change_assist", user_id=user_id)
        track_llm_tokens(usage=atia_client.usage, agent="ArchitectureTopologyInsightAgent",
                         llm_tag=sys_prompts_config.get("architecture_topology_insight_agent").get("llm_tag", configs["llm_tag"]),
                         module="change_assist", user_id=user_id)
        track_llm_tokens(usage=aiaa_client.usage, agent="ArchitectureImageAnalyzerAgent",
                         llm_tag=sys_prompts_config.get("architecture_image_analyzer_agent").get("llm_tag", configs["llm_tag"]),
                         module="change_assist", user_id=user_id)
        track_llm_tokens(usage=cca_client.usage,  agent="ChangeCreationAgent",
                         llm_tag=configs["llm_tag"],
                         module="change_assist", user_id=user_id)

        # Extract DataMergerAgent's terminal JSON output.
        merger_executor_id = resolve_agent_id(ChangeCreationAgent)
        outcome = ""
        for event in workflow_result:
            if getattr(event, "type", None) != "output":
                continue
            if getattr(event, "executor_id", None) != merger_executor_id:
                continue
            data = getattr(event, "data", None)
            text = getattr(data, "text", None) if data is not None else None
            if text:
                outcome = text

        if not outcome:
            log_event(application_logger, logging.WARNING,
                      "change_assist run() produced no DataMergerAgent output.",
                      module_name="change_assist", component_type="app_agent_execution",
                      component_name="change_assist_agent - run")

        outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, outcome)
      
        try:
            return outcome

        except (json.JSONDecodeError, ValueError) as e:
            log_event(application_logger, logging.WARNING,
                    f"change_assist run() failed to parse/validate output: {e}; raw={outcome[:200]!r}",
                    module_name="change_assist", component_type="app_agent_execution",
                    component_name="change_assist_agent - run")
            return outcome


# if __name__ == "__main__":
#     token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIzdm1lREhiVTY1OWhHOGdHdzZRalF1bW1RQ3NIdTdpVHdyUE9taUVvalE4In0.eyJleHAiOjE3ODYzNDg5NzMsImlhdCI6MTc4NjM0NzE3MywiYXV0aF90aW1lIjoxNzg2MzQwNDg3LCJqdGkiOiJvbnJ0YWM6NzNhYmJlZjgtOTUxYy1jNTg3LWQ4YjMtNWM4MTExMGI0MmI0IiwiaXNzIjoiaHR0cHM6Ly9pbnRlZ3JhdGlvbi5hdXRvbm9tb3VzaXRvcHN0b29sa2l0LmNvbS9hdXRoL3JlYWxtcy9BSU9UIiwiYXVkIjpbInNlcnZpY2Vub3dBUEkiLCJicm9rZXIiLCJhY2NvdW50Il0sInN1YiI6IjhiMDcwZmU5LWRlZTEtNDA0Mi04YWE1LWU2YjdjZjgxOTM3MSIsInR5cCI6IkJlYXJlciIsImF6cCI6ImludGVncmF0aW9uLWZyb250ZW5kLWVrcyIsInNpZCI6IkFfQmVTMXVKaWRxWmdMS2RBY2hmUXUxVyIsImFjciI6IjAiLCJhbGxvd2VkLW9yaWdpbnMiOlsiIiwiaHR0cHM6Ly9pbnRlZ3JhdGlvbi5hdXRvbm9tb3VzaXRvcHN0b29sa2l0LmNvbSIsImh0dHBzOi8vZGVtb21hZi5hdXRvbm9tb3VzaXRvcHN0b29sa2l0LmNvbSIsImh0dHA6Ly9sb2NhbGhvc3Q6MTkwMDAiLCJodHRwczovL2Zhc3RlYWkuYXV0b25vbW91c2l0b3BzdG9vbGtpdC5jb20vdWkiLCJodHRwOi8vbG9jYWxob3N0OjQwMDAiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbIm9mZmxpbmVfYWNjZXNzIiwiZGVmYXVsdC1yb2xlcy1haW90IiwidW1hX2F1dGhvcml6YXRpb24iLCJEZW1vLVVzZXJzIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYnJva2VyIjp7InJvbGVzIjpbInJlYWQtdG9rZW4iXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkhlbWFudGggVCIsImdyb3VwcyI6WyIvTWVldGluZ19Hcm91cHMvQVRLIiwiL0FkbWluIiwiL0FkbWluL0FnZW50X0dhdGV3YXkiLCIvTWVldGluZ19Hcm91cHMvQ09FIiwiL0FkbWluL0lUU01fQ29ubmVjdG9ycyIsIi9BZG1pbi9MTE1fTW9kZWxzIiwiL0FkbWluL0xpdGVfTExNX1Byb3h5IiwiL01lZXRpbmdfR3JvdXBzIiwiL01lZXRpbmdfR3JvdXBzL05ldHdvcmsiLCIvQWRtaW4vUHJvbXB0X0xpYnJhcnkiLCIvQWRtaW4vU1NPIiwiL0FkbWluL1ZhdWx0IiwiL01lZXRpbmdfR3JvdXBzL1dpbmRvd3MiLCIvaXRvcHMvY2hhbmdlLWFpIiwiL0FkbWluL1Byb21wdF9MaWJyYXJ5L2NoYW5nZV9hc3Npc3QiLCIvaXRvcHMvaW5jaWRlbnQtYWkiLCIvQWRtaW4vUHJvbXB0X0xpYnJhcnkvaW5jaWRlbnRfYXNzaXN0IiwiL2l0b3BzIiwiL3RyYW5zaXRpb24tYWkva25vd2xlZGdlLWFpIiwiL0FkbWluL1Byb21wdF9MaWJyYXJ5L2tub3dsZWRnZV9hc3Npc3QiLCIvdHJhbnNpdGlvbi1haS9tZWV0aW5nLWFpIiwiL0FkbWluL1Byb21wdF9MaWJyYXJ5L21lZXRpbmdfYXNzaXN0IiwiL2l0b3BzL3Byb2JsZW0tYWkiLCIvdHJhbnNpdGlvbi1haS9rbm93bGVkZ2UtYWkvcmVmaW5lQXJ0aWNsZSIsIi90cmFuc2l0aW9uLWFpL3RyYWluLWFpIiwiL0FkbWluL1Byb21wdF9MaWJyYXJ5L3RyYWluX2Fzc2lzdCIsIi90cmFuc2l0aW9uLWFpIl0sInByZWZlcnJlZF91c2VybmFtZSI6IjIxNjU0ODAiLCJnaXZlbl9uYW1lIjoiSGVtYW50aCIsImZhbWlseV9uYW1lIjoiVCIsImVtYWlsIjoiaGVtYW50aC50dWJhY2hpMkBjb2duaXphbnQuY29tIn0.ocpjMxQmFq3OQPFYutK6MlEnCPmsH7LGNZefFLDVBjS_tLnscyneE7wSK24V1a6fKrPn1PrDNmZLXIa-ImINF6sBkwbgj1vYtmB9hw-rhR_LfvGlyZpkoTM5JB348Jw-9QcsMld-2hA8hDDKgGEJhwSmJjX8AGggdwgJ2eGe-22EvrIocQaztl8NqqKrx34QQ-ZA1WlQtOJgVCibEIPGjumZ4Tt9OWY6tVbmt8yEio8aYs4pZ1lAXzkP5W7921mBdJ_nSMsej1t5mAuudDT5xmVD5ANPyGgON20EflDTZl6VCrwuMoaWP67w4wcKsK94Gp5CSUO_dVsJVsYQTCuNoA"


# {
#   "change_title": "Database upgrade from 19c to 21c",
#   "change_purpose": "To maintain database consistency",
#   "os_info": "Linux",
#   "uploaded_files": "string",
#   "config_items": "string"
# }


# change_details = {
#                 "change_title": "Firewall upgrade in pod 01",
#                 "change_purpose": "To update bandwidth ethernet connectivity and optimize network",
#                 "config_items": "172.16.1.100",
#                 "os_info": "ubuntu",
#                 "uploaded_files": "kubernetes_arch_4.png"
#                 }
    
# query = f"""query = Draft a change request with details - 
#     Change details: {str(change_details)}\n\n
#     User the itsm_tags as demo_eks_instance if required to access mcp tools"""
# response = asyncio.run(run(query, token))
# print(response)
