# Default packages
import os
import sys
import logging
import asyncio

# Third party packages
import yaml

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

# Global variable and paths
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = os.path.join(SCRIPT_PATH.split("modules")[0])
AUTH_PATH = os.path.join(ROOT_PATH, "modules", "auth", "utils")

sys.path.append(ROOT_PATH)
sys.path.append(AUTH_PATH)



# Custom packages
from llm import LLM
import system_config_ka as scf
from usage_tracker import track_llm_tokens
from auth_handler import get_user_info_supplementary
from pro_logger import log_event, application_logger, agentic_logger

import litellm 
#litellm logs
litellm._turn_on_debug()

from pydantic import BaseModel, Field

def article_refiner_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("article_refinement_agent", None)
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
                  module_name = "knowledge_assist",
                  component_type = "app_agent_execution",
                  component_name = "article_refiner_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name = "ArticleRefiner",
        instructions = instruction,
        description = description,
        require_per_service_call_history_persistence = True
    ), client

def article_merger_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("article_merger_agent", None)
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
                  module_name = "knowledge_assist",
                  component_type = "app_agent_execution",
                  component_name = "article_drafter_agent - Merge")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name = "ArticleMerger",
        instructions = instruction,
        description = description,
        require_per_service_call_history_persistence = True
    ), client

def article_generation_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("article_generation_agent", None)
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
                  module_name = "knowledge_assist",
                  component_type = "app_agent_execution",
                  component_name = "knowledge_assist_agent - article_generation_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name = "ArticleGenerator",
        instructions = instruction,
        description = description,
        require_per_service_call_history_persistence = True
    ), client

def article_scorer_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("article_scorer_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)

    client = llm_obj.client

    if not client:
        # Application logging
        log_str = "ERROR: Model not configured for ArticleScorerAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "knowledge_assist",
                  component_type = "app_agent_execution",
                  component_name = "knowledge_assist_agent - article_scorer_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name = "ArticleScorer",
        instructions = instruction,
        description = description,
        require_per_service_call_history_persistence = True
    ), client

async def run_article_refiner_agent(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "knowledge_assist", component_type = "app_agent_execution",
                  component_name = "knowledge_assist_agent - run_article_refiner_agent")
        return log_str

    llm_guards = configs["llm_guards"]

    ArticleRefinerAgent, article_refiner_client = article_refiner_agent(sys_prompts_config = sys_prompts_config)

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

    article_refiner_client.usage = {}

    outcome = await ArticleRefinerAgent.run(sanitized_prompt)

    # Track LLM token usage
    track_llm_tokens(
        usage = article_refiner_client.usage,
        agent = "ArticleRefinerAgent",
        llm_tag = sys_prompts_config.get("article_refinement_agent", {}).get("llm_tag", configs["llm_tag"]),
        module = "knowledge_assist",
        user_id = user_id,
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome


async def run_article_merger_agent(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "knowledge_assist", component_type = "app_agent_execution",
                  component_name = "knowledge_assist_agent - run_article_merger_agent")
        return log_str

    llm_guards = configs["llm_guards"]

    ArticleMergerAgent, article_merger_client = article_merger_agent(sys_prompts_config = sys_prompts_config)

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

    article_merger_client.usage = {}

    outcome = await ArticleMergerAgent.run(sanitized_prompt)

    # Track LLM token usage
    track_llm_tokens(
        usage = article_merger_client.usage,
        agent = "ArticleMergerAgent",
        llm_tag = sys_prompts_config.get("article_merger_agent", {}).get("llm_tag", configs["llm_tag"]),
        module = "knowledge_assist",
        user_id = user_id,
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome


async def run_article_generation_agent(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "knowledge_assist", component_type = "app_agent_execution",
                  component_name = "knowledge_assist_agent - run_article_generation_agent")
        return log_str

    llm_guards = configs["llm_guards"]

    ArticleGenerationAgent, article_generation_client = article_generation_agent(sys_prompts_config = sys_prompts_config)

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

    article_generation_client.usage = {}

    outcome = await ArticleGenerationAgent.run(sanitized_prompt)

    # Track LLM token usage
    track_llm_tokens(
        usage = article_generation_client.usage,
        agent = "ArticleGenerationAgent",
        llm_tag = sys_prompts_config.get("article_generation_agent", {}).get("llm_tag", configs["llm_tag"]),
        module = "knowledge_assist",
        user_id = user_id,
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome

async def run_article_scorer_agent(query, token = None):
    if token:
        user_id = get_user_info_supplementary(token)["user_id"]
    else:
        user_id = "system"
    try:
        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]

        if sys_prompts_config is None:
            log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
            log_event(application_logger, logging.ERROR, log_str,
                    module_name = "knowledge_assist", component_type = "app_agent_execution",
                    component_name = "knowledge_assist_agent - run_article_scorer_agent")
            return log_str

        llm_guards = configs["llm_guards"]

        ArticleScorerAgent, article_scorer_client = article_scorer_agent(sys_prompts_config = sys_prompts_config)

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

        article_scorer_client.usage = {}

        outcome = await ArticleScorerAgent.run(sanitized_prompt)

        # Track LLM token usage
        track_llm_tokens(
            usage = article_scorer_client.usage,
            agent = "ArticleScorerAgent",
            llm_tag = sys_prompts_config.get("article_scorer_agent", {}).get("llm_tag", configs["llm_tag"]),
            module = "knowledge_assist",
            user_id = user_id,
        )

        outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

        return outcome
    except Exception as e:
        log_event(
            agentic_logger,
            logging.ERROR,
            str(e),
            mcp_server = "-",
            tool_name = "-",
            exec_error = "Agent Execution Exception",
            user_id = user_id
        )


if __name__ == "__main__":
    kb_article_a = '''KB article number: KB0002234. Short Description - Databricks Setup for Parallel Workloads\n\nContent - \nDatabricks Setup for Parallel Workloads\n\nSummary\n\nThis article provides guidance on setting up Databricks to efficiently run multiple tasks in parallel, enhancing speed and resource utilization. It is designed for data teams, developers, and infrastructure administrators handling Spark jobs.\n\nSteps\n\n1. Create a Cluster\n\nEnsure the cluster has enough nodes to handle the workload.\n\nAvoid using single-node clusters in production environments, as they are suited for testing only.\n\n2. Configure Spark Settings\n\nSet the number of shuffle partitions: spark.conf.set(\"spark.sql.shuffle.partitions\", \"80\")\n\nAdjust the default parallelism: spark.conf.set(\"spark.default.parallelism\", \"80\")\n\n3. Use DataFrame Operations\n\nPrioritize DataFrame operations over pandas when dealing with large datasets.\n\n4. Monitor Spark UI\n\nContinuously monitor tasks. If they are running slow, consider repartitioning the data.\n\nValidation Steps\n\nCheck if the cluster is performing as expected by analyzing the job execution time and resource utilization stats from the Spark UI.\n\nTroubleshooting\n\nJob failures? Inspect the cluster logs for errors and warnings.\n\nMemory issues? Consider reducing the partition count or increasing the node size.\n\nFacing skewed data? Implement salting or bucketing strategies to address the imbalance.\n\nRelated Links\n\nDatabricks Documentation\n\nApache Spark Tuning Guide\n\nBest Practices for Spark Jobs'''
    
    kb_article_b = '''KB article number: KB0002235. Short Description - Databricks Parallel Processing Setup\n\nContent - \nDatabricks Parallel Processing Setup Purpose Guide to enable parallel processing in Databricks for faster data workloads. Scope For data engineers and infra teams using Spark on Databricks. Steps 1. Create a cluster with multiple workers. Avoid single-node clusters. 2. Set configs: spark.conf.set(\"spark.default.parallelism\", \"150\") spark.conf.set(\"spark.sql.shuffle.partitions\", \"150\") 3. Use DataFrame APIs instead of loops. Avoid collect() on big data. 4. Monitor jobs in Spark UI. Repartition if tasks are uneven. Tips - Auto-scaling helps but sometimes not reliable. - Caching is good but can cause memory issues. - Too many partitions slow down small jobs. Troubleshooting - Job slow? Check cluster size. - Memory errors? Reduce partitions. - Skewed data? Try salting. Note Hexagonal architecture is useful, but many teams find it too complex. Strangler fig pattern helps migration, but it can delay releases.'''

    token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIzdm1lREhiVTY1OWhHOGdHdzZRalF1bW1RQ3NIdTdpVHdyUE9taUVvalE4In0.eyJleHAiOjE3ODA2NDcxNTEsImlhdCI6MTc4MDY0NTM1MSwiYXV0aF90aW1lIjoxNzgwNjQzODMzLCJqdGkiOiJvbnJ0YWM6MDEzN2I4MGYtOTRhZS05MWU3LWVjZjYtYWU5MDIzNWI0YjMzIiwiaXNzIjoiaHR0cHM6Ly9zc28uYXV0b25vbW91c2l0b3BzdG9vbGtpdC5jb20vcmVhbG1zL0FJT1QiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiZjViMDkyNDMtOTE0OS00NTA3LThkMjEtYTdiMGJkNjk3Y2JhIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYWNjb3VudC1jb25zb2xlIiwic2lkIjoiLWRjRS01VGpIMmhWaHFMaENQcDVZNEJjIiwiYWNyIjoiMCIsInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJBYmhpbGFzaCBSIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiMjEwMTU4MCIsImdpdmVuX25hbWUiOiJBYmhpbGFzaCIsImZhbWlseV9uYW1lIjoiUiIsImVtYWlsIjoici5hYmhpbGFzaEBjb2duaXphbnQuY29tIn0.mgx7T1hI5vU8fiqrdgFSQ8YlbwkXBLUQcy16pcOU1ntAyDEHJSWFUbj8YLJ3szm7mLaGCTi_JEQZRrsFp5EiAFwNJxNwWeg6LE5ZxxImzQ90KhRywPwrn84iQSF3RCf3DS5o7bIvybFcbk2TOEINusJyzHv-gdCoYbJPqS4CTOuIvh5saacmodUlBVPM9cIQPUSt7xrbr8uY48lwUCLJvK1shzcpd_Lcl-N4yHV69qg1xUVWv5gsUI2sG4h_QWhzrfAQE2aot2bjAmxERIySAzT04iNqLXFw9C8wvDBpmLz7dr91InPQPSX5fQl3Zv2HTfgrqOgHd6hphK2ISI9t-g"

    query = f"merge the given kb articles: {kb_article_a } and { kb_article_b}"

    # query = f"refine the following kb article for clarity and conciseness: {kb_article_a}"
    #response = asyncio.run(run_article_refiner_agent(query, token))
    response = asyncio.run(run_article_merger_agent(query, token))
    print(response)





    
