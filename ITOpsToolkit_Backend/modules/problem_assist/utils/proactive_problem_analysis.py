# Author - Hemanth Tubachi
# Created On - June 8, 2026

# Default packages
import os
import sys
import json
import asyncio
import logging
from typing import List
from dotenv import load_dotenv
from collections import defaultdict
from datetime import datetime, timedelta

# Third party packages
from pydantic import BaseModel, Field

from llm_guard import scan_prompt, scan_output
from llm_guard.vault import Vault
from llm_guard.input_scanners import Toxicity as InpToxicity, Gibberish as InpGibberish, BanCode as InpBanCode, PromptInjection, Anonymize, Secrets
from llm_guard.input_scanners.toxicity import MatchType as InpToxMatchType
from llm_guard.input_scanners.gibberish import MatchType as InpGibMatchType
from llm_guard.input_scanners.prompt_injection import MatchType as InpPIMatchType
from llm_guard.output_scanners import Toxicity as OutToxicity, Gibberish as OutGibberish, BanCode as OutBanCode, Deanonymize, Bias #MaliciousURLs
from llm_guard.output_scanners.toxicity import MatchType as OutToxMatchType
from llm_guard.output_scanners.gibberish import MatchType as OutGibMatchType
from llm_guard.output_scanners.bias import MatchType as OutBiasMatchType

load_dotenv()

# Global variable and paths
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = os.path.join(SCRIPT_PATH.split("modules")[0])
MCP_PATH = os.path.join(ROOT_PATH, "mcp_servers")

sys.path.append(ROOT_PATH)
sys.path.append(MCP_PATH)

# Custom packages
from llm import LLM
import core_crud
from database import db_session
import system_config_pa as scf
from servicenow_mcp import ServiceNow
from usage_tracker import track_llm_tokens
from pro_logger import log_event, application_logger


# ── Response schemas ──────────────────────────────────────────────────────────

class AssociatedIncident(BaseModel):
    number: str = Field(..., description="Incident number")
    short_description: str = Field(..., description="Short description of the incident")
    sys_created_on: str = Field(..., description="Creation timestamp of the incident")
    impact: str = Field(default="", description="Impact level of the incident (1 - High, 2 - Medium, 3 - Low)")
    urgency: str = Field(default="", description="Urgency level of the incident (1 - High, 2 - Medium, 3 - Low)")
    state: str = Field(default="", description="State of the incident")
    assignment_group: str = Field(default="", description="Assignment group of the incident")
    assigned_to: str = Field(default="", description="User assigned to the incident")
    opened_by: str = Field(default="", description="User who opened the incident")


class ProblemTicket(BaseModel):
    short_description: str = Field(..., description="Short description of the problem ticket")
    description: str = Field(..., description="Detailed description of the problem ticket")
    associated_incidents: List[AssociatedIncident] = Field(..., description="List of incidents linked to this problem")


class ProblemTicketList(BaseModel):
    problems: List[ProblemTicket] = Field(..., description="List of generated problem tickets")


class FilterDecision(BaseModel):
    include: bool = Field(..., description="True if the problem ticket should be included, False if it matches a rejected pattern")
    reason: str = Field(..., description="Reason for the include/exclude decision")


# ── Agent factory functions ───────────────────────────────────────────────────

def incident_cluster_agent(sys_prompts_config):
    configs = scf.get_system_config()
    ica_sys_prompt = sys_prompts_config.get("incident_cluster_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(ica_sys_prompt)
    llm_tag = ica_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for IncidentClusterAgent."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="problem_assist",
                  component_type="proactive_problem_analysis",
                  component_name="incident_cluster_agent")
        return log_str

    client._default_options["temperature"] = 0.0
    client._litellm_params["response_format"] = ProblemTicketList

    return client.create_agent(
        name="IncidentClusterAgent",
        instructions=instruction,
        description=description,
    ), client


def problem_filter_agent(sys_prompts_config):
    configs = scf.get_system_config()
    pfa_sys_prompt = sys_prompts_config.get("problem_filter_agent", None)
    (description, instruction) = scf.apply_system_prompt_guardrail(pfa_sys_prompt)
    llm_tag = pfa_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)
    client = llm_obj.client

    if not client:
        log_str = "ERROR: Model not configured for ProblemFilterAgent."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="problem_assist",
                  component_type="proactive_problem_analysis",
                  component_name="problem_filter_agent")
        return log_str

    client._default_options["temperature"] = 0.0
    client._litellm_params["response_format"] = FilterDecision

    return client.create_agent(
        name="ProblemFilterAgent",
        instructions=instruction,
        description=description,
    ), client


# ── Self-contained run helpers ────────────────────────────────────────────────

async def run_cluster_analysis(incidents_json, assignment_group, criteria_value, sys_prompts_config, configs, input_scanners_list, output_scanners_list):
    IncidentClusterAgent, cluster_client = incident_cluster_agent(sys_prompts_config=sys_prompts_config)

    query = (
        f"Analyze the following incidents for assignment group '{assignment_group}' "
        f"under the criteria '{criteria_value}' and generate consolidated problem tickets.\n\n"
        f"Incidents:\n{incidents_json}"
    )

    sanitized_prompt, _, _ = scan_prompt(input_scanners_list, query)

    cluster_client.usage = {}

    outcome = await IncidentClusterAgent.run(sanitized_prompt)

    track_llm_tokens(
        usage=cluster_client.usage,
        agent="IncidentClusterAgent",
        llm_tag=sys_prompts_config.get("incident_cluster_agent", {}).get("llm_tag", configs["llm_tag"]),
        module="problem_assist",
        user_id="system",
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    validated = ProblemTicketList.model_validate_json(outcome)
    return validated.problems


async def run_filter_check(problem, rejected_problems_json, sys_prompts_config, configs, input_scanners_list, output_scanners_list):
    ProblemFilterAgent, filter_client = problem_filter_agent(sys_prompts_config=sys_prompts_config)

    query = (
        f"Evaluate whether the following new problem ticket is similar to any previously rejected problem.\n\n"
        f"New Problem Ticket:\n{json.dumps({'short_description': problem.short_description, 'description': problem.description})}\n\n"
        f"Previously Rejected Problems:\n{rejected_problems_json}"
    )

    sanitized_prompt, _, _ = scan_prompt(input_scanners_list, query)

    filter_client.usage = {}

    outcome = await ProblemFilterAgent.run(sanitized_prompt)

    track_llm_tokens(
        usage=filter_client.usage,
        agent="ProblemFilterAgent",
        llm_tag=sys_prompts_config.get("problem_filter_agent", {}).get("llm_tag", configs["llm_tag"]),
        module="problem_assist",
        user_id="system",
    )

    outcome, _, _ = scan_output(output_scanners_list, sanitized_prompt, str(outcome))

    decision = FilterDecision.model_validate_json(outcome)
    return decision.include


# ── Main entry point ──────────────────────────────────────────────────────────

async def run(days_back=30, criterias=None):
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config is None:
        log_str = "Guardrail note - System prompts not defined for any agent. Cannot proceed."
        log_event(application_logger,
                  logging.ERROR,
                  log_str,
                  module_name="problem_assist",
                  component_type="proactive_problem_analysis",
                  component_name="run")
        return

    itsm_obj = ServiceNow()
    itsm_tags = ",".join(configs["itsm_tags"])

    end_dt = datetime.now()
    start_dt = end_dt - timedelta(days=days_back)
    end_ts = end_dt.strftime("%Y-%m-%d %H:%M:%S")
    start_ts = start_dt.strftime("%Y-%m-%d %H:%M:%S")

    conditions = [
        {"param": "sys_created_on", "op": ">=", "val": start_ts},
        {"param": "sys_created_on", "op": "<=", "val": end_ts},
    ]

    (status, incidents) = itsm_obj.list_ticket_details(
        itsm_tags=itsm_tags,
        table="incident",
        conditions=conditions,
        module_name="problem_assist",
    )

    if not status or not incidents:
        log_event(application_logger,
                  logging.WARNING,
                  f"No incidents fetched from ITSM for the last {days_back} day(s).",
                  module_name="problem_assist",
                  component_type="proactive_problem_analysis",
                  component_name="run")
        return

    db_local_session = db_session.get_db()
    (db_status, rejected_data) = core_crud.get_problem_tickets(db_local_session, status="rejected")
    db_local_session.close()

    rejected_problems = []
    if db_status and rejected_data:
        rejected_problems = [
            {"short_description": r.short_description, "description": r.description, "rejection_reason": r.rejection_reason}
            for r in rejected_data
        ]
    rejected_problems_json = json.dumps(rejected_problems)

    group_map = defaultdict(list)
    for inc in incidents:
        grp = inc.get("assignment_group", "Unknown")
        group_map[grp].append(inc)

    top_groups = sorted(group_map.items(), key=lambda x: len(x[1]), reverse=True)[:3]

    if not criterias:
        criterias = ["recurrence", "impact", "common root cause"]

    llm_guards = configs["llm_guards"]

    vault = Vault()
    input_llm_guard_dict = {
        "toxicity": InpToxicity(threshold=0.5, match_type=InpToxMatchType.SENTENCE),
        "gibberish": InpGibberish(match_type=InpGibMatchType.FULL),
        "bancode": InpBanCode(),
        "prompt_injection": PromptInjection(threshold=0.5, match_type=InpPIMatchType.FULL),
        "anonymization": Anonymize(vault),
    }

    output_llm_guard_dict = {
        "toxicity": OutToxicity(threshold=0.5, match_type=OutToxMatchType.SENTENCE),
        # "malicious_urls": MaliciousURLs(threshold=0.7),
        "gibberish": OutGibberish(match_type=OutGibMatchType.FULL),
        "bancode": OutBanCode(),
        "anonymization": Deanonymize(vault),
        "bias": Bias(threshold=0.5, match_type=OutBiasMatchType.FULL),
    }

    input_scanners_list = []
    output_scanners_list = []

    for item in llm_guards:
        if item in input_llm_guard_dict:
            input_scanners_list.append(input_llm_guard_dict[item])
        if item in output_llm_guard_dict:
            output_scanners_list.append(output_llm_guard_dict[item])

    insert_data = []

    for assignment_grp, grp_incidents in top_groups:
        for criteria_value in criterias[:3]:
            chunk = grp_incidents[:100]
            incidents_json = json.dumps([
                {
                    "number": inc.get("number", ""),
                    "short_description": inc.get("short_description", ""),
                    "description": inc.get("description", ""),
                    "sys_created_on": inc.get("sys_created_on", ""),
                    "impact": inc.get("impact", ""),
                    "urgency": inc.get("urgency", ""),
                    "state": inc.get("state", ""),
                    "assignment_group": inc.get("assignment_group", ""),
                    "assigned_to": inc.get("assigned_to", ""),
                    "opened_by": inc.get("opened_by", ""),
                }
                for inc in chunk
            ])

            try:
                problems = await run_cluster_analysis(
                    incidents_json=incidents_json,
                    assignment_group=assignment_grp,
                    criteria_value=criteria_value,
                    sys_prompts_config=sys_prompts_config,
                    configs=configs,
                    input_scanners_list=input_scanners_list,
                    output_scanners_list=output_scanners_list,
                )
            except Exception as e:
                log_event(application_logger,
                          logging.ERROR,
                          f"IncidentClusterAgent failed for group '{assignment_grp}', criteria '{criteria_value}': {str(e)}",
                          is_exception=True,
                          module_name="problem_assist",
                          component_type="proactive_problem_analysis",
                          component_name="run_cluster_analysis")
                continue

            for problem in problems:
                try:
                    include = await run_filter_check(
                        problem=problem,
                        rejected_problems_json=rejected_problems_json,
                        sys_prompts_config=sys_prompts_config,
                        configs=configs,
                        input_scanners_list=input_scanners_list,
                        output_scanners_list=output_scanners_list,
                    )
                except Exception as e:
                    log_event(application_logger,
                              logging.ERROR,
                              f"ProblemFilterAgent failed: {str(e)}",
                              is_exception=True,
                              module_name="problem_assist",
                              component_type="proactive_problem_analysis",
                              component_name="run_filter_check")
                    include = True

                if not include:
                    continue

                insert_data.append({
                    "short_description": problem.short_description,
                    "description": problem.description,
                    "associated_incidents": [inc.model_dump() for inc in problem.associated_incidents],
                })


    if insert_data:
        db_local_session = db_session.get_db()
        (db_status, db_result) = core_crud.insert_problem_tickets(db_local_session, insert_data)
        db_local_session.close()

        if db_status:
            log_event(application_logger,
                      logging.INFO,
                      f"Proactive problem analysis complete. {db_result} problem ticket(s) inserted.",
                      module_name="problem_assist",
                      component_type="proactive_problem_analysis",
                      component_name="run")
        else:
            log_event(application_logger,
                      logging.ERROR,
                      f"Proactive problem analysis complete. DB insert failed: {db_result}",
                      module_name="problem_assist",
                      component_type="proactive_problem_analysis",
                      component_name="run")
    else:
        log_event(application_logger,
                  logging.INFO,
                  "Proactive problem analysis complete. No new problem tickets to insert.",
                  module_name="problem_assist",
                  component_type="proactive_problem_analysis",
                  component_name="run")


if __name__ == "__main__":
    PROACTIVE_PROBLEM_ANALYSIS_WINDOW = int(os.getenv("PROACTIVE_PROBLEM_ANALYSIS_DAYS", 7))
    asyncio.run(run(days_back = PROACTIVE_PROBLEM_ANALYSIS_WINDOW))
 
