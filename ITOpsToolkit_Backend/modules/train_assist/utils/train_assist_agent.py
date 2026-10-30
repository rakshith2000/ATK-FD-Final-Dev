# Author - Vishwas K S, Viraj Purandare, Ragavan Veerarajan
# Created On - May 6, 2026
# updated Om - Sep 10, 2026

# Default packages
import os
import sys
import logging

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
import system_config_ta as scf
from usage_tracker import track_llm_tokens
from auth_handler import get_user_info_supplementary
from pro_logger import log_event, application_logger

def quiz_generation_agent(sys_prompts_config):
    configs = scf.get_system_config()
    mcq_sys_prompt = sys_prompts_config.get("quiz_generation_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(mcq_sys_prompt)

    llm_tag = mcq_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for QuizGenerationAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="train_assist",
                  component_type="app_agent_execution",
                  component_name="quiz_generation_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="QuizGenerationAgent",
        instructions=instruction,
        description=description,
        require_per_service_call_history_persistence=True
    ), client

def scenario_generation_agent(sys_prompts_config):
    configs = scf.get_system_config()
    scenario_sys_prompt = sys_prompts_config.get("scenario_generation_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(scenario_sys_prompt)

    llm_tag = scenario_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ScenarioGenerationAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="train_assist",
                  component_type="app_agent_execution",
                  component_name="scenario_generation_agent")
        return log_str

    return client.create_agent(
        name="ScenarioGenerationAgent",
        instructions=instruction,
        description=description,
        require_per_service_call_history_persistence=True
    ), client

def quiz_summary_agent(sys_prompts_config):
    configs = scf.get_system_config()
    quiz_summary_sys_prompt = sys_prompts_config.get("quiz_summary_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(quiz_summary_sys_prompt)

    llm_tag = quiz_summary_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for QuizSummaryAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="train_assist",
                  component_type="app_agent_execution",
                  component_name="quiz_summary_agent")
        return log_str

    # No schema — this agent returns free-form mentoring and feedback text.

    return client.create_agent(
        name="QuizSummaryAgent",
        instructions=instruction,
        description=description,
        require_per_service_call_history_persistence=True
    ), client

def quiz_generation_beginner_agent(sys_prompts_config):
    """
    Description: Create and configure the Beginner quiz generation agent.

    Retrieves the Beginner quiz generation prompt configuration,
    applies prompt guardrails, initializes the configured LLM client,
    and creates a quiz generation agent with deterministic settings.

    Args:
        sys_prompts_config (dict):
            System prompt configuration containing the
            quiz_generation_beginner_agent definition.

    Returns:
        tuple:
            A tuple containing:

            - Agent: Configured QuizGenerationBeginnerAgent instance.
            - Client: Initialized LLM client instance.

        str:
            Error message if the LLM client could not be configured.
    """

    configs = scf.get_system_config()
    mcq_sys_prompt = sys_prompts_config.get("quiz_generation_beginner_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(mcq_sys_prompt)

    llm_tag = mcq_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for QuizGenerationBeginnerAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="train_assist",
                  component_type="app_agent_execution",
                  component_name="quiz_generation_beginner_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="QuizGenerationBeginnerAgent",
        instructions=instruction,
        description=description,
        require_per_service_call_history_persistence=True
    ), client

def quiz_generation_specialist_agent(sys_prompts_config):
    """
    Description: Create and configure the Specialist quiz generation agent.

    Retrieves the Specialist quiz generation prompt configuration,
    applies prompt guardrails, initializes the configured LLM client,
    and creates a quiz generation agent with deterministic settings.

    Args:
        sys_prompts_config (dict):
            System prompt configuration containing the
            quiz_generation_specialist_agent definition.

    Returns:
        tuple:
            A tuple containing:

            - Agent: Configured QuizGenerationSpecialistAgent instance.
            - Client: Initialized LLM client instance.

        str:
            Error message if the LLM client could not be configured.
    """    
    configs = scf.get_system_config()
    mcq_sys_prompt = sys_prompts_config.get("quiz_generation_specialist_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(mcq_sys_prompt)

    llm_tag = mcq_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for QuizGenerationSpecialistAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="train_assist",
                  component_type="app_agent_execution",
                  component_name="quiz_generation_specialist_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="QuizGenerationSpecialistAgent",
        instructions=instruction,
        description=description,
        require_per_service_call_history_persistence=True
    ), client

def quiz_generation_expert_agent(sys_prompts_config):
    """
    Description: Create and configure the Expert quiz generation agent.

    Retrieves the Expert quiz generation prompt configuration,
    applies prompt guardrails, initializes the configured LLM client,
    and creates a quiz generation agent with deterministic settings.

    Args:
        sys_prompts_config (dict):
            System prompt configuration containing the
            quiz_generation_expert_agent definition.

    Returns:
        tuple:
            A tuple containing:

            - Agent: Configured QuizGenerationExpertAgent instance.
            - Client: Initialized LLM client instance.

        str:
            Error message if the LLM client could not be configured.
    """
    configs = scf.get_system_config()
    mcq_sys_prompt = sys_prompts_config.get("quiz_generation_expert_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(mcq_sys_prompt)
    llm_tag = mcq_sys_prompt.get("llm_tag", configs["llm_tag"])
    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for QuizGenerationExpertAgent. Configure valid model."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="train_assist",
                  component_type="app_agent_execution",
                  component_name="quiz_generation_expert_agent")
        return log_str

    client._default_options["temperature"] = 0.0

    return client.create_agent(
        name="QuizGenerationExpertAgent",
        instructions=instruction,
        description=description,
        require_per_service_call_history_persistence=True
    ), client

async def quiz_generation(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed with the action. Contact developer."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="train_assist",
                  component_type="app_agent_execution",
                  component_name="train_assist_agent - run_quiz_generation")
        return log_str
    
    llm_guards = configs["llm_guards"]

    result = quiz_generation_agent(sys_prompts_config=sys_prompts_config)
    if isinstance(result, str):
        return result
    QuizGenerationAgent, quiz_client = result

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

    sanitized_prompt, results_valid, results_score = scan_prompt(input_scanners_list, query)

    quiz_client.usage = {}
    outcome = await QuizGenerationAgent.run(sanitized_prompt)

    track_llm_tokens(
        usage=quiz_client.usage,
        agent="QuizGenerationAgent",
        llm_tag=sys_prompts_config.get("quiz_generation_agent").get("llm_tag", configs["llm_tag"]),
        module="train_assist",
        user_id=user_id
    )

    outcome, is_valid, risk_score = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome

async def quiz_generation_beginner(query, token):
    """
    Description: Generate Beginner-level quiz content using the configured LLM agent.

    Retrieves the Beginner quiz generation agent, applies configured
    LLM guardrails to the input prompt, generates quiz content using
    the LLM, tracks token consumption, and validates the generated
    output before returning the final response.

    Args:
        query (str):
            Prompt containing the article content and quiz-generation
            instructions.

        token (str):
            Authentication token of the logged-in user.

    Returns:
        str:
            Generated Beginner-level quiz content returned by the LLM.

        str:
            Error message if the system prompt configuration or
            LLM agent initialization fails.
    """
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed with the action. Contact developer."
        log_event(
            application_logger,
            logging.ERROR,
            log_str,
            module_name="train_assist",
            component_type="app_agent_execution",
            component_name="train_assist_agent - run_quiz_generation_beginner"
        )
        return log_str

    llm_guards = configs["llm_guards"]

    result = quiz_generation_beginner_agent(
        sys_prompts_config=sys_prompts_config
    )

    if isinstance(result, str):
        return result

    QuizGenerationBeginnerAgent, quiz_client = result

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

    sanitized_prompt, results_valid, results_score = scan_prompt(input_scanners_list, query)

    quiz_client.usage = {}
    outcome = await QuizGenerationBeginnerAgent.run(sanitized_prompt)

    track_llm_tokens(
        usage=quiz_client.usage,
        agent="QuizGenerationBeginnerAgent",
        llm_tag=sys_prompts_config.get("quiz_generation_beginner_agent").get("llm_tag", configs["llm_tag"]),
        module="train_assist",
        user_id=user_id
    )

    outcome, is_valid, risk_score = scan_output(
        output_scanners_list,
        sanitized_prompt,
        str(outcome)
    )
    return outcome

async def quiz_generation_specialist(query, token):
    """
    Description: Generate Specialist-level quiz content using the configured LLM agent.

    Retrieves the Specialist quiz generation agent, applies configured
    LLM guardrails to the input prompt, generates quiz content using
    the LLM, tracks token consumption, and validates the generated
    output before returning the final response.

    Args:
        query (str):
            Prompt containing the article content and quiz-generation
            instructions.

        token (str):
            Authentication token of the logged-in user.

    Returns:
        str:
            Generated Specialist-level quiz content returned by the LLM.

        str:
            Error message if the system prompt configuration or
            LLM agent initialization fails.
    """
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed with the action. Contact developer."
        log_event(
            application_logger,
            logging.ERROR,
            log_str,
            module_name="train_assist",
            component_type="app_agent_execution",
            component_name="train_assist_agent - run_quiz_generation_specialist"
        )
        return log_str

    llm_guards = configs["llm_guards"]

    result = quiz_generation_specialist_agent(
        sys_prompts_config=sys_prompts_config
    )

    if isinstance(result, str):
        return result

    QuizGenerationSpecialistAgent, quiz_client = result

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

    sanitized_prompt, results_valid, results_score = scan_prompt(input_scanners_list, query)

    quiz_client.usage = {}
    outcome = await QuizGenerationSpecialistAgent.run(sanitized_prompt)

    track_llm_tokens(
        usage=quiz_client.usage,
        agent="QuizGenerationSpecialistAgent",
        llm_tag=sys_prompts_config.get("quiz_generation_specialist_agent").get("llm_tag", configs["llm_tag"]),
        module="train_assist",
        user_id=user_id
    )

    outcome, is_valid, risk_score = scan_output(
        output_scanners_list,
        sanitized_prompt,
        str(outcome)
    )
    return outcome

async def quiz_generation_expert(query, token):
    """
    Description: Generate Expert-level quiz content using the configured LLM agent.

    Retrieves the Expert quiz generation agent, applies configured
    LLM guardrails to the input prompt, generates quiz content using
    the LLM, tracks token consumption, and validates the generated
    output before returning the final response.

    Args:
        query (str):
            Prompt containing the article content and quiz-generation
            instructions.

        token (str):
            Authentication token of the logged-in user.

    Returns:
        str:
            Generated Expert-level quiz content returned by the LLM.

        str:
            Error message if the system prompt configuration or
            LLM agent initialization fails.
    """    
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed with the action. Contact developer."
        log_event(
            application_logger,
            logging.ERROR,
            log_str,
            module_name="train_assist",
            component_type="app_agent_execution",
            component_name="train_assist_agent - run_quiz_generation_expert"
        )
        return log_str

    llm_guards = configs["llm_guards"]

    result = quiz_generation_expert_agent(
        sys_prompts_config=sys_prompts_config
    )

    if isinstance(result, str):
        return result

    QuizGenerationExpertAgent, quiz_client = result

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

    sanitized_prompt, results_valid, results_score = scan_prompt(input_scanners_list, query)

    quiz_client.usage = {}
    outcome = await QuizGenerationExpertAgent.run(sanitized_prompt)

    track_llm_tokens(
        usage=quiz_client.usage,
        agent="QuizGenerationExpertAgent",
        llm_tag=sys_prompts_config.get("quiz_generation_expert_agent").get("llm_tag", configs["llm_tag"]),
        module="train_assist",
        user_id=user_id
    )

    outcome, is_valid, risk_score = scan_output(
        output_scanners_list,
        sanitized_prompt,
        str(outcome)
    )
    return outcome

async def scenario_generation(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed with the action. Contact developer."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="train_assist",
                  component_type="app_agent_execution",
                  component_name="train_assist_agent - scenario_generation")
        return log_str

    llm_guards = configs["llm_guards"]

    result = scenario_generation_agent(sys_prompts_config=sys_prompts_config)
    if isinstance(result, str):
        return result
    ScenarioGenerationAgent, scenario_client = result

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

    sanitized_prompt, results_valid, results_score = scan_prompt(input_scanners_list, query)

    scenario_client.usage = {}
    outcome = await ScenarioGenerationAgent.run(sanitized_prompt)

    track_llm_tokens(
        usage=scenario_client.usage,
        agent="ScenarioGenerationAgent",
        llm_tag=sys_prompts_config.get("scenario_generation_agent").get("llm_tag", configs["llm_tag"]),
        module="train_assist",
        user_id=user_id
    )

    outcome, is_valid, risk_score = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome

async def quiz_summary(query, token):
    user_id = get_user_info_supplementary(token)["user_id"]

    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed with the action. Contact developer."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="train_assist",
                  component_type="app_agent_execution",
                  component_name="train_assist_agent - quiz_summary")
        return log_str

    llm_guards = configs["llm_guards"]

    result = quiz_summary_agent(sys_prompts_config=sys_prompts_config)
    if isinstance(result, str):
        return result
    QuizSummaryAgent, summary_client = result

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

    sanitized_prompt, results_valid, results_score = scan_prompt(input_scanners_list, query)

    summary_client.usage = {}
    outcome = await QuizSummaryAgent.run(sanitized_prompt)

    track_llm_tokens(
        usage=summary_client.usage,
        agent="QuizSummaryAgent",
        llm_tag=sys_prompts_config.get("quiz_summary_agent").get("llm_tag", configs["llm_tag"]),
        module="train_assist",
        user_id=user_id
    )

    outcome, is_valid, risk_score = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    return outcome
