# Author - Viraj Purandare
# Created On - September 29, 2025

# Default packages
import os
import sys
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import partial

# Third party packages
import yaml

from llm_guard import scan_prompt, scan_output
from llm_guard.input_scanners import Anonymize, InvisibleText, Secrets, PromptInjection, Toxicity
from llm_guard.input_scanners.prompt_injection import MatchType as InpPIMatchType
from llm_guard.input_scanners.toxicity import MatchType as InpToxMatchType
from llm_guard.output_scanners import Deanonymize, Toxicity, MaliciousURLs
from llm_guard.output_scanners.toxicity import MatchType as OutToxMatchType
from llm_guard.vault import Vault
from agent_framework import WorkflowBuilder, MCPStreamableHTTPTool
from contextlib import asynccontextmanager

# Global variable and paths
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = os.path.join(SCRIPT_PATH.split("modules")[0])

sys.path.append(ROOT_PATH)

# Custom packages
import system_config_ca as scf

from llm import LLM
from llm_guard_addons import LLMAnonymityAddon
from change_assist_tools import analyze_image, get_servicenow_architecture_topology_insight

from pro_logger import log_event, application_logger

import litellm 
# litellm._turn_on_debug()

from agent_framework import Executor, WorkflowContext, handler, Message
from agent_framework import AgentExecutorResponse

class ResponseToAssistantMessage(Executor):
    def __init__(self, id: str):
        super().__init__(id=id)

    @handler
    async def handle(self, resp: AgentExecutorResponse, ctx: WorkflowContext[Message]) -> None:
        # Prefer full_conversation for chaining; fallback to raw response messages.
        msgs = resp.full_conversation or resp.agent_response.messages
        last_assistant = next((m for m in reversed(msgs) if m.role == "assistant"), None)

        text = last_assistant.text if last_assistant else ""
        await ctx.send_message(Message("assistant", [text] if text else []))


# Prompt refactorer agent
def prompt_refactorer_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("prompt_refactorer_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)

    client = llm_obj.client

    if not client:
        # Application logging
        log_str = "ERROR: Model not configured for PromptRefactorerAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "change_assist",
                  component_type = "app_agent_execution",
                  component_name = "change_assist_agent - run")
        return log_str

    return client.create_agent(
        name = "PromptRefactor",
        instructions = instruction,
        description = description
    )

# Architecture topology insight agent
async def architecture_topology_insight_agent(sys_prompts_config, mcp_tool):
    configs = scf.get_system_config()
    atia_sys_prompt = sys_prompts_config.get("architecture_topology_insight_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(atia_sys_prompt)

    llm_tag = atia_sys_prompt.get("llm_tag", configs["llm_tag"])
    itsm_tags = atia_sys_prompt.get("itsm_tags", configs["itsm_tags"])
    instruction += "\n\nITSM tags for Architecture topology extraction from CMDB - " + ", ".join(itsm_tags)

    if itsm_tags == None:
        # Application logging
        log_str = "ERROR: ITSM tags not configured for ArchitectureTopologyInsightAgent. Configure valid one or more itsm_tags."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "change_assist",
                  component_type = "app_agent_execution",
                  component_name = "change_assist_agent - run")
        return log_str

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)

    client = llm_obj.client

    if not client:
        # Application logging
        log_str = "ERROR: Model not configured for ArchitectureTopologyInsightAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "change_assist",
                  component_type = "app_agent_execution",
                  component_name = "change_assist_agent - run")
        return log_str

    return client.create_agent(
        name = "ArchitectureTopologyInsightAgent",
        instructions = instruction,
        description = description,
        tools = [mcp_tool]
    )

# Architecture image analyzer agent
def architecture_image_analyzer_agent(sys_prompts_config):
    configs = scf.get_system_config()
    aiaa_sys_prompt = sys_prompts_config.get("architecture_image_analyzer_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(aiaa_sys_prompt)
    llm_tag = aiaa_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)

    client = llm_obj.client

    if not llm_obj.client:
        # Application logging
        log_str = "ERROR: Model not configured for ArchitectureImageAnalyzerAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "change_assist",
                  component_type = "app_agent_execution",
                  component_name = "change_assist_agent - run")
        return log_str

    return client.create_agent(
        name = "ArchitectureImageAnalyzerAgent",
        instructions = "what is this image about",#instruction,
        description = "Helpful agent",#description,
        tools = [analyze_image]
    )

# Architecture image analyzer agent
def data_merger_agent():
    configs = scf.get_system_config()
    llm_tag = configs.get("llm_tag")

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)

    client = llm_obj.client

    if not llm_obj.client:
        # Application logging
        log_str = "ERROR: Model not configured for DataMergerAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "change_assist",
                  component_type = "app_agent_execution",
                  component_name = "change_assist_agent - run")
        return log_str

    return client.create_agent(
        name = "DataMergerAgent",
        description = "Combines findings obtained",
        # instructions = """ You present the output as follows -
        #     Change request -
        #     `refactored_prompt`

        #     Architecture details -
        #     `architecture_details`

        #     Architecture topology insights -
        #     `architecture_topology_insight`
        #     """
        instructions = '''With the gathered data, create a proper JSON Object for change request with keys\n
            short_description\ndescription\nimplementation_plan\nbackout_plan\ntest_plan\nchg_model: normal or emergency and impact_analysis
            Use image analysis data and topology data to provide impact analysis'''
    )

async def run(query, token):
    # Obtain configurations
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config == None:
        # Application logging
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed with the action. Contact developer."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "change_assist",
                  component_type = "app_agent_execution",
                  component_name = "change_assist_agent - run")
        yield log_str

    mcp_tool = MCPStreamableHTTPTool(
        name = "Servicenow MCP",
        url = "http://127.0.0.1:8000/mcp",#"https://demoadk.intelligentservicedeliveryplatform.com:9876/mcp",
        header_provider = lambda kwargs: {"Authorization": f"Bearer {token}"}
    )

    PromptRefactorerAgent =  prompt_refactorer_agent(sys_prompts_config = sys_prompts_config)
    ArchitectureTopologyInsightAgent = await architecture_topology_insight_agent(
        sys_prompts_config = sys_prompts_config,
        mcp_tool = mcp_tool
    )
    ArchitectureImageAnalyzerAgent = architecture_image_analyzer_agent(sys_prompts_config = sys_prompts_config)
    DataMergerAgent = data_merger_agent()

    # drafted_prompt = await PromptRefactorerAgent.run(query)
    # image_analysis = await ArchitectureImageAnalyzerAgent.run(str(drafted_prompt))
    # merged_data = await DataMergerAgent.run(str(image_analysis) + str(drafted_prompt))
    # async with mcp_tool:
    #     topology_insights = await ArchitectureTopologyInsightAgent.run(query)
    #------------------------------------------------------------------------------
    builder = WorkflowBuilder()

    builder.add_agent(PromptRefactorerAgent)
    builder.add_agent(ArchitectureImageAnalyzerAgent)
    builder.add_agent(ArchitectureTopologyInsightAgent)
    builder.add_agent(DataMergerAgent)

    img_resp2msg = ResponseToAssistantMessage(id="ImgResp2Msg")
    topo_resp2msg = ResponseToAssistantMessage(id="TopoResp2Msg")

    builder.set_start_executor(PromptRefactorerAgent)

    builder.add_fan_out_edges(PromptRefactorerAgent, [ArchitectureImageAnalyzerAgent, ArchitectureTopologyInsightAgent])

    builder.add_edge(ArchitectureImageAnalyzerAgent, img_resp2msg)
    builder.add_edge(ArchitectureTopologyInsightAgent, topo_resp2msg)
    
    builder.add_fan_in_edges([img_resp2msg, topo_resp2msg], DataMergerAgent)

    workflow = builder.build()

    # events = await workflow.run(query)
    # print(f"Final result: {events.get_outputs()}")
    #---------------------------------------------------------------------------------

    # print(f"\n\n[Drafted Prompt]\n {merged_data}")
    # print(f"\n\n[Image Analysis]\n {image_analysis}")
    # print(type(image_analysis))
    # print(f"\n\n[Topology Insights]\n {topology_insights}")

    # builder = SequentialBuilder()

    # builder.participants([PromptRefactorerAgent, ArchitectureImageAnalyzerAgent,  DataMergerAgent])
    # workflow = builder.build()

    # output_evt: WorkflowOutputEvent | None = None
        # result = await workflow.run(query)

    input_scanners_list = [# Anonymize(vault),
                           InvisibleText(),
                           Secrets(redact_mode = "partial"),
                           PromptInjection(threshold = 0.5, match_type = InpPIMatchType.FULL)]
    sanitized_prompt, results_valid, results_score = scan_prompt(input_scanners_list, query)


    async with mcp_tool:
        async for event in workflow.run(sanitized_prompt, stream=True):
            if event.type in ("data", "output") and event.executor_id == "DataMergerAgent":
                yield str(event.data)
    
    # output_scanners_list = [# Deanonymize(vault),
    #                         Toxicity(threshold = 0.5, match_type = OutToxMatchType.SENTENCE),
    #                         MaliciousURLs(threshold = 0.7)]
    # outcome, is_valid, risk_score = scan_output(output_scanners_list, sanitized_prompt, str(outcome))
    # return outcome


   
async def run_collect(change_details, token):
    chunks = []
    async for part in run(change_details, token):   # run() is async generator
        chunks.append(str(part))
    return "".join(chunks)


if __name__ == "__main__":
    token = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJmZnp4R0dmVTl4ZUY3WGNpdWRCQ0djTEFmVEVlalBDV0pMSVNjLXh5d2gwIn0.eyJleHAiOjE3NzAyOTMwNDQsImlhdCI6MTc3MDI5MTI0NCwianRpIjoib25sdGFjOmY0MGZhNGQyLWY5OWYtNjMyYi01Y2RmLTdlZjRjYzQwZmNlOCIsImlzcyI6Imh0dHBzOi8va2V5Y2xvYWsuaW50ZWxsaWdlbnRzZXJ2aWNlZGVsaXZlcnlwbGF0Zm9ybS5jb206MzIxMjMvcmVhbG1zL0FJT1QiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzZWN1cml0eS1hZG1pbi1jb25zb2xlIiwic2lkIjoiYTBjNTQ3NzAtZWZhZi1hMmRjLWRiMjYtYzYwMmE3MDg2MWM0Iiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCJ9.mjx-Il96-tWM_P6pn8DYDYuJamcgtRhw9TtsBXHP_Dn9-mI7ZQg-wd8dt9XYwwVUFaD2vTLnC4FwOkCEAbujZGp6pLrwkF9zn44C9OfpXzSn3Z2nmda1PPLbTIKHa3gawjAYYusiF2kI6M7hg5Iwj-N2glyoxKJi5hNmHKmYYztv4darefIeoovbo18XCxAX5HMmUyZGNLwokhEbHyExZdW00w4R1W--qtWD4UAz0hurdpm0IjdQB7jLrPEwh1aHh0Ur4k8N9q4fKGd6uacIhNcl8Y85fGHtvPmlZqFEfWZiOh3211s-eYHTvKHKph8tlTOZoRtOgSoZgv4NaUo7Eg'
    change_details = {
        "change_title": "upgrade production server",
        "change_purpose": "Monthly patching activity",
        "os_info": "Ubuntu",
        "uploaded_files": "architecture-diagram.jpg",
        "config_items": "bond_trade_ny"
        }



    response = asyncio.run(run_collect(str(change_details), token))
    print(response)



    