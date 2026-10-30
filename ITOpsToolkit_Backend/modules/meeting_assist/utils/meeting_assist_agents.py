# Author - Vishwas
# Created On - April 30, 2026
# Refactored - May 25, 2026: HandoffBuilder routing + strict json_schema enforcement.

# Default packages
import os
import re
import sys
import json
import logging
import asyncio

# Third party packages
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
import system_config_ma as scf
from usage_tracker import track_llm_tokens
from auth_handler import get_user_info_supplementary
from pro_logger import log_event, application_logger


def meeting_transcript_summary_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("meeting_transcript_summary_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for TranscriptSummaryAgent. Configure valid model."
        log_event(application_logger, logging.ERROR, log_str,
                  is_exception = True,
                  module_name="meeting_assist",
                  component_type="agent_definition",
                  component_name="meeting_assist - meeting_transcript_summary_agent")
        return log_str

    # Deterministic + strict schema. API guarantees {title, content:[...]}.
    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="TranscriptSummaryAgent",
        instructions=instruction,
        description=description,
        require_per_service_call_history_persistence=True,
    ), client


def meeting_articles_generator_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("meeting_articles_generator_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ArticlesGeneratorAgent. Configure valid model."
        log_event(application_logger, logging.ERROR, log_str,
                  is_exception = True,
                  module_name="meeting_assist",
                  component_type="agent_definition",
                  component_name="meeting_assist - meeting_articles_generator_agent")
        return log_str

    # Deterministic + strict schema. API guarantees {articles:[{title, content, tags}]}.
    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="ArticlesGeneratorAgent",
        instructions=instruction,
        description=description,
        require_per_service_call_history_persistence=True,
    ), client

def article_conversion_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("article_conversion_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)

    client = llm_obj.client

    if not client:
        # Application logging
        log_str = "ERROR: Model not configured for ArticleConversionAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name = "knowledge_assist",
                  component_type = "app_agent_execution",
                  component_name = "knowledge_assist_agent - article_conversion_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name = "ArticleConversionAgent",
        instructions = instruction,
        description = description,
        require_per_service_call_history_persistence = True
    ), client

def meeting_chat_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pra_sys_prompt = sys_prompts_config.get("meeting_chat_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

    llm_tag = pra_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ChatAgent. Configure valid model."
        log_event(application_logger, logging.ERROR, log_str,
                  is_exception = True,
                  module_name="meeting_assist",
                  component_type="agent_definition",
                  component_name="meeting_assist - meeting_chat_agent")
        return log_str

    # Deterministic chat. No JSON mode — output is conversational text.
    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="ChatAgent",
        instructions=instruction,
        description=description,
    ), client

async def run_transcript_summary_agent(query, token):
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    user_id = get_user_info_supplementary(token)["user_id"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed. Contact developer."
        log_event(application_logger, logging.ERROR, log_str,
                  is_exception = True,
                  module_name="meeting_assist",
                  component_type="app_agent_execution",
                  component_name="meeting_assist - run_transcript_summary_agent")
        return None

    llm_guards = configs["llm_guards"]

    TranscriptSummaryAgent, tsa_client = meeting_transcript_summary_agent(sys_prompts_config)

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

    tsa_client.usage = {}

    outcome = await TranscriptSummaryAgent.run(sanitized_prompt)

    track_llm_tokens(usage=tsa_client.usage, agent="TranscriptSummaryAgent",
                     llm_tag=sys_prompts_config.get("meeting_transcript_summary_agent").get("llm_tag", configs["llm_tag"]),
                     module="meeting_assist", user_id=user_id)

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome


async def run_articles_generator_agent(query, token):
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    user_id = get_user_info_supplementary(token)["user_id"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed. Contact developer."
        log_event(application_logger, logging.ERROR, log_str,
                  is_exception = True,
                  module_name="meeting_assist",
                  component_type="app_agent_execution",
                  component_name="meeting_assist - run_articles_generator_agent")
        return None

    llm_guards = configs["llm_guards"]

    ArticlesGeneratorAgent, aga_client = meeting_articles_generator_agent(sys_prompts_config)

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

    aga_client.usage = {}

    outcome = await ArticlesGeneratorAgent.run(sanitized_prompt)

    track_llm_tokens(usage=aga_client.usage, agent="ArticlesGeneratorAgent",
                     llm_tag=sys_prompts_config.get("meeting_articles_generator_agent").get("llm_tag", configs["llm_tag"]),
                     module="meeting_assist", user_id=user_id)

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome


async def run_inferrer(query: str, token):
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    user_id = get_user_info_supplementary(token)["user_id"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed. Contact developer."
        log_event(application_logger, logging.ERROR, log_str,
                  is_exception = True,
                  module_name="meeting_assist",
                  component_type="app_agent_execution",
                  component_name="meeting_assist - meeting_chat_bot")
        return log_str
    
    llm_guards = configs["llm_guards"]

    ChatAgent, chat_client = meeting_chat_agent(sys_prompts_config)

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

    chat_client.usage = {}

    outcome = await ChatAgent.run(sanitized_prompt)

    track_llm_tokens(usage=chat_client.usage, agent="ChatAgent",
                     llm_tag=sys_prompts_config.get("meeting_chat_agent").get("llm_tag", configs["llm_tag"]),
                     module="meeting_assist", user_id=user_id)

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))
    cleaned_response = re.sub(r"^```[a-zA-Z]*\n?|```$", "", outcome.strip())

    return cleaned_response

async def run_converter(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger, logging.ERROR, log_str,
                  module_name = "knowledge_assist", component_type = "app_agent_execution",
                  component_name = "knowledge_assist_agent - run_converter")
        return log_str

    llm_guards = configs["llm_guards"]

    ArticleGenerationAgent, article_generation_client = article_conversion_agent(sys_prompts_config = sys_prompts_config)

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
        agent = "ArticleConversionAgent",
        llm_tag = sys_prompts_config.get("article_conversion_agent", {}).get("llm_tag", configs["llm_tag"]),
        module = "knowledge_assist",
        user_id = user_id,
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome

if __name__ == "__main__":
    transcript = """Meeting Transcript
    Date: 2026-05-06
    Meeting ID: MTG-1042
    Participants: Alice Johnson, Bob Smith, Charlie Nguyen, Diana Patel

    Alice Johnson [00:00:05]:
    Good morning everyone, let's get started. Today's agenda is to review the Q2 product roadmap and assign action items.

    Bob Smith [00:00:18]:
    Morning Alice. Before we start, I wanted to flag that the backend deployment from last Friday is still causing some latency issues in production.

    Charlie Nguyen [00:00:31]:
    Yeah I noticed that too. The API response time jumped from 120ms to around 400ms after the deployment.

    Diana Patel [00:00:45]:
    I ran a quick profiling session yesterday. It looks like the issue is coming from the new database indexing strategy we rolled out.

    Alice Johnson [00:03:14]:
    Sounds good. Let's wrap up. Action items - Bob and Diana to fix the production latency issue by EOD tomorrow. Bob and Charlie to evaluate charting libraries tomorrow at ten AM.

    Alice Johnson [00:03:46]:
    Great, thanks all. Talk soon.
    """

    token = ""  # Drop a valid bearer token here to smoke-test locally.
    query = f"Summarize the following meeting transcript - \n\n{transcript}"
    response = asyncio.run(run_transcript_summary_agent(query, token))
    print(json.dumps(response, indent=2))
