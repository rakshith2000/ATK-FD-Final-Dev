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

from llm_guard import scan_prompt, scan_output
from llm_guard.output_scanners import Deanonymize, Toxicity, MaliciousURLs
from llm_guard.output_scanners.toxicity import MatchType as OutToxMatchType
from llm_guard.input_scanners.prompt_injection import MatchType as InpPIMatchType
from llm_guard.input_scanners import Anonymize, InvisibleText, Secrets, PromptInjection

from agent_framework import (
    handler,
    Executor,
    Message,
    WorkflowContext,
    WorkflowBuilder,
    AgentExecutorResponse
)

from deepeval.tracing import observe

# Global variable and paths
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = os.path.join(SCRIPT_PATH.split("modules")[0])

sys.path.append(ROOT_PATH)

# Custom packages
from llm import LLM
import system_config as scf
from pro_logger import log_event, application_logger

class ResponseToAssistantMessage(Executor):
    def __init__(self, id: str):
        super().__init__(id=id)

    @handler
    async def handle(self, resp: AgentExecutorResponse, ctx: WorkflowContext[Message]) -> None:
        msgs = resp.full_conversation or resp.agent_response.messages
        last_assistant = next((m for m in reversed(msgs) if m.role == "assistant"), None)

        text = last_assistant.text if last_assistant else ""
        await ctx.send_message(Message("assistant", [text] if text else []))


def article_refiner_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("article_refiner_agent", None)
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
                  module_name = "knowledge_ai",
                  component_type = "app_agent_execution",
                  component_name = "article_refiner_agent")
        return log_str

    return client.create_agent(
        name = "ArticleRefiner",
        instructions = instruction,
        description = description
    )

def article_drafter_agent(sys_prompts_config):
    configs = scf.get_system_config()
    articles_merger_sys_prompt = sys_prompts_config.get("articles_merger_agent", None)
    pra_sys_prompt = articles_merger_sys_prompt.get("article_drafter_agent", None)
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
                  module_name = "knowledge_ai",
                  component_type = "app_agent_execution",
                  component_name = "article_drafter_agent - Merge")
        return log_str

    return client.create_agent(
        name = "ArticleDrafter",
        instructions = instruction,
        description = description
    )

def article_analyzer_agent(sys_prompts_config):
    configs = scf.get_system_config()
    articles_merger_sys_prompt = sys_prompts_config.get("articles_merger_agent", None)
    pra_sys_prompt = articles_merger_sys_prompt.get("article_analyzer_agent", None)
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
                  module_name = "knowledge_ai",
                  component_type = "app_agent_execution",
                  component_name = "article_analyzer_agent - Merge")
        return log_str

    return client.create_agent(
        name = "ArticleAnalyzer",
        instructions = instruction,
        description = description
    )

def data_merger_agent():
    configs = scf.get_system_config()
    llm_tag = configs.get("llm_tag")

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)

    client = llm_obj.client

    if not llm_obj.client:
        # Application logging
        log_str = "ERROR: Model not configured for InputRouter Agent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "knowledge_ai",
                  component_type = "app_agent_execution",
                  component_name = "data_merger_agent")
        return log_str

    return client.create_agent(
        name="InputRouter",
        description="Routes input to parallel agents",
        instructions="Forward the input as-is without any modification."
    )

def input_router_agent():
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
                  module_name = "knowledge_ai",
                  component_type = "app_agent_execution",
                  component_name = "data_merger_agent")
        return log_str

    return client.create_agent(
        name = "DataMergerAgent",
        description = "Combines findings obtained",
        instructions = '''
            With the gathered data, create a proper JSON Object for merge articles with keys\n 
            output_dict = {"merged_article": raw response as is from agent in html with css and without '\n'.,
                "details": {
                  "grammar": grammar_correct_list,
                  "overlapping": overlapping_list,
                  "conflicting": conflicting_list,
                  "complementary": complementary_info_list
                }
        '''
    )

async def refine_kb_article(kb_article: str):
    # Obtain configurations
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config == None:
        # Application logging
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed with the action. Contact developer."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "knowledge_ai",
                  component_type = "app_agent_execution",
                  component_name = "knowledge_ai - refine_kb_article")
        yield log_str


    ArticleRefinerAgent =  article_refiner_agent(sys_prompts_config = sys_prompts_config)

    input_scanners_list = [# Anonymize(vault),
                           InvisibleText(),
                           Secrets(redact_mode = "partial"),
                           PromptInjection(threshold = 0.5, match_type = InpPIMatchType.FULL)]
    sanitized_prompt, results_valid, results_score = scan_prompt(input_scanners_list, kb_article)


    async for update in ArticleRefinerAgent.run(sanitized_prompt, stream=True):
        if update.text:
            yield update.text
    
    # output_scanners_list = [# Deanonymize(vault),
    #                         Toxicity(threshold = 0.5, match_type = OutToxMatchType.SENTENCE),
    #                         MaliciousURLs(threshold = 0.7)]

    # outcome, is_valid, risk_score = scan_output(output_scanners_list, sanitized_prompt, str(outcome))
    # cleaned_response = re.sub(r"^```[a-zA-Z]*\n?|```$", "", outcome.strip())
    # return cleaned_response

async def merge_kb_article(kb_article_a: str, kb_article_b: str):

    kb_articles = {"article_a": kb_article_a, "article_b": kb_article_b}
    # Obtain configurations
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config == None:
        # Application logging
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed with the action. Contact developer."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "knowledge_ai",
                  component_type = "app_agent_execution",
                  component_name = "knowledge_ai - merge_kb_article")
        yield log_str

    InputRouterAgent = input_router_agent()
    ArticleDrafterAgent =  article_drafter_agent(sys_prompts_config = sys_prompts_config)
    ArticleAnalyzerAgent =  article_analyzer_agent(sys_prompts_config = sys_prompts_config)
    DataMergerAgent =  data_merger_agent()

    builder = WorkflowBuilder()

    builder.add_agent(InputRouterAgent)
    builder.add_agent(ArticleDrafterAgent)
    builder.add_agent(ArticleAnalyzerAgent)
    builder.add_agent(DataMergerAgent)

    drafter2msg = ResponseToAssistantMessage(id="Drafter2Msg")
    analyzer2msg = ResponseToAssistantMessage(id="Analyzer2Msg")

    builder.set_start_executor(InputRouterAgent)

    # InputRouter fans out to both agents (parallel)
    builder.add_fan_out_edges(InputRouterAgent, [ArticleDrafterAgent, ArticleAnalyzerAgent])

    builder.add_edge(ArticleDrafterAgent, drafter2msg)
    builder.add_edge(ArticleAnalyzerAgent, analyzer2msg)

    # Both agents fan in to DataMerger
    builder.add_fan_in_edges([drafter2msg, analyzer2msg], DataMergerAgent)

    workflow = builder.build()

    input_scanners_list = [# Anonymize(vault),
                           InvisibleText(),
                           Secrets(redact_mode = "partial"),
                           PromptInjection(threshold = 0.5, match_type = InpPIMatchType.FULL)]
    sanitized_prompt, results_valid, results_score = scan_prompt(input_scanners_list, str(kb_articles))

    async for event in workflow.run(sanitized_prompt, stream=True):
        if event.type in ("data", "output") and event.executor_id == "DataMergerAgent":
            yield str(event.data)
  

async def refine_article_stream(kb_article):
    chunks = []
    async for part in refine_kb_article(kb_article):   
        if part:
            yield str(part)

async def merge_article_stream(kb_article_a, kb_article_b):
    chunks = []
    async for part in merge_kb_article(kb_article_a, kb_article_b):   
        if part:
            await asyncio.sleep(0.01)
            yield str(part)

if __name__ == "__main__":
    kb_article_a = '''Short Description - Databricks Setup for Parallel Workloads\n\nContent - \nDatabricks Setup for Parallel Workloads\n\nSummary\n\nThis article provides guidance on setting up Databricks to efficiently run multiple tasks in parallel, enhancing speed and resource utilization. It is designed for data teams, developers, and infrastructure administrators handling Spark jobs.\n\nSteps\n\n1. Create a Cluster\n\nEnsure the cluster has enough nodes to handle the workload.\n\nAvoid using single-node clusters in production environments, as they are suited for testing only.\n\n2. Configure Spark Settings\n\nSet the number of shuffle partitions: spark.conf.set(\"spark.sql.shuffle.partitions\", \"80\")\n\nAdjust the default parallelism: spark.conf.set(\"spark.default.parallelism\", \"80\")\n\n3. Use DataFrame Operations\n\nPrioritize DataFrame operations over pandas when dealing with large datasets.\n\n4. Monitor Spark UI\n\nContinuously monitor tasks. If they are running slow, consider repartitioning the data.\n\nValidation Steps\n\nCheck if the cluster is performing as expected by analyzing the job execution time and resource utilization stats from the Spark UI.\n\nTroubleshooting\n\nJob failures? Inspect the cluster logs for errors and warnings.\n\nMemory issues? Consider reducing the partition count or increasing the node size.\n\nFacing skewed data? Implement salting or bucketing strategies to address the imbalance.\n\nRelated Links\n\nDatabricks Documentation\n\nApache Spark Tuning Guide\n\nBest Practices for Spark Jobs'''
    kb_article_b = '''Short Description - Databricks Parallel Processing Setup\n\nContent - \nDatabricks Parallel Processing Setup Purpose Guide to enable parallel processing in Databricks for faster data workloads. Scope For data engineers and infra teams using Spark on Databricks. Steps 1. Create a cluster with multiple workers. Avoid single-node clusters. 2. Set configs: spark.conf.set(\"spark.default.parallelism\", \"150\") spark.conf.set(\"spark.sql.shuffle.partitions\", \"150\") 3. Use DataFrame APIs instead of loops. Avoid collect() on big data. 4. Monitor jobs in Spark UI. Repartition if tasks are uneven. Tips - Auto-scaling helps but sometimes not reliable. - Caching is good but can cause memory issues. - Too many partitions slow down small jobs. Troubleshooting - Job slow? Check cluster size. - Memory errors? Reduce partitions. - Skewed data? Try salting. Note Hexagonal architecture is useful, but many teams find it too complex. Strangler fig pattern helps migration, but it can delay releases.'''

    # async def test():
    #     async for chunk in refine_article_stream(kb_article_a):
    #         print(chunk, end="", flush=True)

    async def test():
        async for chunk in merge_article_stream(kb_article_a, kb_article_b):
            print(chunk, end="", flush=True)

    asyncio.run(test())


    
