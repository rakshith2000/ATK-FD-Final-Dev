# Author - Viraj Purandare and Vishwas K S
# Created On - May 15, 2026

# Default packages
import os
import sys
import json
import datetime

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
DB_PATH = os.path.join(ROOT_PATH, "database")
MCP_PATH = os.path.join(ROOT_PATH, "mcp_servers")

sys.path.append(SCRIPT_PATH)
sys.path.append(ROOT_PATH)
sys.path.append(MCP_PATH)

# Custom packages
import core_crud
import db_session

import system_config_ia as scf

from incident_assist_agent import run_demo_chatbot, run_chatbot, run_rag,  run_resolution_summary_agent

from servicenow_mcp import ServiceNow

# Incident assist functionalities
class IncidentAssistUtils:
    def __init__(self):
        pass

    # Get user details from ITSM
    def get_user_details(self, user):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()
        (status, data) = itsm_obj.get_user_details(itsm_tags = itsm_tags, user = user, module_name = "incident_assist")

        return (status, data)

    # List user assignment groups
    def list_user_assignment_groups(self, user):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, data) = itsm_obj.list_user_assignment_groups(itsm_tags = itsm_tags, user = user, module_name = "incident_assist")

        return (status, data)

    # List all assignment groups
    def list_all_assignment_group(self):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, data) = itsm_obj.list_all_assignment_groups(itsm_tags = itsm_tags, module_name = "incident_assist")

        return (status, data)

    # List members of an assignment group
    def list_group_members(self, assignment_group):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, data) = itsm_obj.list_group_members(itsm_tags = itsm_tags, assignment_group = assignment_group, module_name = "incident_assist")

        return (status, data)

    # List user assigned incident details from ITSM
    def list_user_assigned_incidents(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, user_details) = self.get_user_details(user_id)
        if not status:
            return (status, user_details)
        
        db_local_session = db_session.get_db()
        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags)
        db_local_session.close()

        conditions = []
        conditions.append({'param': 'state', 'op': 'NOT IN', 'val': itsm_connector_details.itsm_additional_config.get("INC_EXSTATE", "6,7")})
        conditions.append({'param': 'assigned_to', 'op': '=', 'val': user_details.get('sys_id')})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})
        
        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "incident", conditions = conditions, module_name = "incident_assist")

        return (status, data)
    
    # List group assigned incident details from ITSM
    def list_group_assigned_incidents(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, ag_data) = self.list_user_assignment_groups(user = user_id)
        if not status:
            return (status, ag_data)

        ag_sys_ids = [ag.get("group_sys_id") for ag in ag_data]

        db_local_session = db_session.get_db()
        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags)
        db_local_session.close()

        conditions = []
        conditions.append({'param': 'state', 'op': 'NOT IN', 'val': itsm_connector_details.itsm_additional_config.get("INC_EXSTATE", "6,7")})
        conditions.append({'param': 'assigned_to', 'op': 'ISNOT', 'val': 'EMPTY'})
        conditions.append({'param': 'assignment_group', 'op': 'IN', 'val': ','.join(ag_sys_ids)})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})

        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "incident", conditions = conditions, module_name = "incident_assist")

        return (status, data)

    # List unassigned group incident details from ITSM
    def list_unassigned_group_incidents(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, ag_data) = self.list_user_assignment_groups(user = user_id)
        if not status:
            return (status, ag_data)

        ag_sys_ids = [ag.get("group_sys_id") for ag in ag_data]

        db_local_session = db_session.get_db()
        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags)
        db_local_session.close()

        conditions = []
        conditions.append({'param': 'assigned_to', 'op': 'IS', 'val': 'EMPTY'})
        conditions.append({'param': 'state', 'op': 'NOT IN', 'val': itsm_connector_details.itsm_additional_config.get("INC_EXSTATE", "6,7")})
        conditions.append({'param': 'assignment_group', 'op': 'IN', 'val': ','.join(ag_sys_ids)})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})

        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "incident", conditions = conditions, module_name = "incident_assist")

        return (status, data)

    # List user assigned problem tasks from ITSM
    def list_user_assigned_ptasks(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, user_details) = self.get_user_details(user_id)
        if not status:
            return (status, user_details)

        db_local_session = db_session.get_db()
        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags)
        db_local_session.close()

        conditions = []
        conditions.append({'param': 'state', 'op': 'NOT IN', 'val': itsm_connector_details.itsm_additional_config.get("INC_EXSTATE", "6,7")})
        conditions.append({'param': 'assigned_to', 'op': '=', 'val': user_details.get('sys_id')})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})

        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "problem_task", conditions = conditions, module_name = "incident_assist")

        return (status, data)

    # List group assigned problem tasks from ITSM
    def list_group_assigned_ptasks(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, ag_data) = self.list_user_assignment_groups(user = user_id)
        if not status:
            return (status, ag_data)

        ag_sys_ids = [ag.get("group_sys_id") for ag in ag_data]

        db_local_session = db_session.get_db()
        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags)
        db_local_session.close()

        conditions = []
        conditions.append({'param': 'state', 'op': 'NOT IN', 'val': itsm_connector_details.itsm_additional_config.get("INC_EXSTATE", "6,7")})
        conditions.append({'param': 'assigned_to', 'op': 'ISNOT', 'val': 'EMPTY'})
        conditions.append({'param': 'assignment_group', 'op': 'IN', 'val': ','.join(ag_sys_ids)})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})

        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "problem_task", conditions = conditions, module_name = "incident_assist")

        return (status, data)

    # List unassigned problem tasks from ITSM
    def list_unassigned_ptasks(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, ag_data) = self.list_user_assignment_groups(user = user_id)
        if not status:
            return (status, ag_data)

        ag_sys_ids = [ag.get("group_sys_id") for ag in ag_data]

        db_local_session = db_session.get_db()
        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags)
        db_local_session.close()

        conditions = []
        conditions.append({'param': 'assigned_to', 'op': 'IS', 'val': 'EMPTY'})
        conditions.append({'param': 'state', 'op': 'NOT IN', 'val': itsm_connector_details.itsm_additional_config.get("INC_EXSTATE", "6,7")})
        conditions.append({'param': 'assignment_group', 'op': 'IN', 'val': ','.join(ag_sys_ids)})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})

        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "problem_task", conditions = conditions, module_name = "incident_assist")

        return (status, data)

    # List user assigned incident details from ITSM
    def list_user_assigned_service_requests(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, user_details) = self.get_user_details(user_id)
        if not status:
            return (status, user_details)
        
        db_local_session = db_session.get_db()
        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags)
        db_local_session.close()

        conditions = []
        conditions.append({'param': 'state', 'op': 'NOT IN', 'val': itsm_connector_details.itsm_additional_config.get("INC_EXSTATE", "6,7")})
        conditions.append({'param': 'assigned_to', 'op': '=', 'val': user_details.get('sys_id')})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})
        
        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "sc_request", conditions = conditions, module_name = "incident_assist")

        return (status, data)
    
    # List group assigned incident details from ITSM
    def list_group_assigned_service_requests(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, ag_data) = self.list_user_assignment_groups(user = user_id)
        if not status:
            return (status, ag_data)

        ag_sys_ids = [ag.get("group_sys_id") for ag in ag_data]

        db_local_session = db_session.get_db()
        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags)
        db_local_session.close()

        conditions = []
        conditions.append({'param': 'state', 'op': 'NOT IN', 'val': itsm_connector_details.itsm_additional_config.get("INC_EXSTATE", "6,7")})
        conditions.append({'param': 'assigned_to', 'op': 'ISNOT', 'val': 'EMPTY'})
        conditions.append({'param': 'assignment_group', 'op': 'IN', 'val': ','.join(ag_sys_ids)})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})

        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "sc_request", conditions = conditions, module_name = "incident_assist")

        return (status, data)

    # List unassigned group incident details from ITSM
    def list_unassigned_group_service_requests(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, ag_data) = self.list_user_assignment_groups(user = user_id)
        if not status:
            return (status, ag_data)

        ag_sys_ids = [ag.get("group_sys_id") for ag in ag_data]

        db_local_session = db_session.get_db()
        itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags)
        db_local_session.close()

        conditions = []
        conditions.append({'param': 'assigned_to', 'op': 'IS', 'val': 'EMPTY'})
        conditions.append({'param': 'state', 'op': 'NOT IN', 'val': itsm_connector_details.itsm_additional_config.get("INC_EXSTATE", "6,7")})
        conditions.append({'param': 'assignment_group', 'op': 'IN', 'val': ','.join(ag_sys_ids)})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})

        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "sc_request", conditions = conditions, module_name = "incident_assist")

        return (status, data)


    # Update incident details in ITSM
    def update_ticket_details(self, payload, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()
        (status, data) = itsm_obj.update_ticket_details(
            itsm_tags = itsm_tags,
            user_id = user_id,
            number = payload.incident_number,
            table = "incident",
            resolve = payload.resolve,
            assignment_group = payload.assignment_group,
            assigned_to = payload.assigned_to,
            urgency = payload.urgency,
            impact = payload.impact,
            state = payload.state,
            priority = payload.priority,
            short_description = payload.short_description,
            description = payload.description,
            close_code = payload.close_code,
            close_notes = payload.close_notes,
            comments_and_work_notes = payload.comments_and_work_notes,
            module_name = "incident_assist",
        )
        return (status, data)
    
    # Update service request details in ITSM
    def update_service_request_details(self, payload, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()
        (status, data) = itsm_obj.update_service_request_details(
            itsm_tags = itsm_tags,
            user_id = user_id,
            number = payload.service_request_number,
            table = "sc_request",
            resolve = payload.resolve,
            assignment_group = payload.assignment_group,
            assigned_to = payload.assigned_to,
            urgency = payload.urgency,
            impact = payload.impact,
            state = payload.state,
            priority = payload.priority,
            short_description = payload.short_description,
            description = payload.description,
            close_code = payload.close_code,
            close_notes = payload.close_notes,
            work_notes = payload.work_notes,
            module_name = "incident_assist",
        )
        return (status, data)
    
    # List ticket journal entries
    def list_incident_journal(self, sys_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, data) = itsm_obj.list_ticket_journal(itsm_tags = itsm_tags, sys_id = sys_id, module_name = "incident_assist")

        return (status, data)

    # List task state choices for a table
    def list_ptask_state_choice(self):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, data) = itsm_obj.list_task_state_choices(itsm_tags = itsm_tags, table_name = "problem_task", module_name = "incident_assist")

        return (status, data)

    # List incident state choices from ITSM
    def list_incident_state_choice(self):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        conditions = [
            {'param': 'name', 'op': '=', 'val': 'incident'},
            {'param': 'element', 'op': '=', 'val': 'incident_state'}
        ]

        (status, data) = itsm_obj.list_choices(itsm_tags = itsm_tags, conditions = conditions, module_name = "incident_assist")

        return (status, data)

    # List CI related incidents from ITSM
    def list_ci_related_incidents(self, cmdb_ci_sys_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        conditions = []
        conditions.append({'param': 'cmdb_ci', 'op': '=', 'val': cmdb_ci_sys_id})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})

        (status, data) = itsm_obj.list_ticket_details(itsm_tags = itsm_tags, table = "incident", conditions = conditions, module_name = "incident_assist")

        return (status, data)

    # List CI related change requests from ITSM
    def list_ci_related_change_requests(self, cmdb_ci_sys_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        conditions = []
        conditions.append({'param': 'cmdb_ci', 'op': '=', 'val': cmdb_ci_sys_id})
        conditions.append({'param': 'ORDERBYDESCsys_created_on', 'op': '', 'val': ''})

        (status, data) = itsm_obj.list_change_requests(itsm_tags = itsm_tags, conditions = conditions, module_name = "incident_assist")

        return (status, data)

    # List related alerts for an incident
    def list_related_alerts(self, inc_sys_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, data) = itsm_obj.list_related_alerts(itsm_tags = itsm_tags, inc_sys_id = inc_sys_id, module_name = "incident_assist")

        return (status, data)
    
    # List relavent articles for an incident
    async def list_relevant_articles(self, payload, token):
        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        iaira_sys_prompt = sys_prompts_config.get("knowledge_retrieval_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(iaira_sys_prompt)

        query = f"{instruction}\n\nThe relevant areticles needed for the below incident:\n{payload}"

        response = await run_rag(query, token)
        
        return response

    async def chatbot(self, query, conversation_history, token):
        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        chatbot_sys_prompt = sys_prompts_config.get("chatbot_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(chatbot_sys_prompt)
        itsm_tags = chatbot_sys_prompt.get("itsm_tags", configs["itsm_tags"])
        
        conversation_history.append({"role": "user", "content": query})

        query = f"{instruction}\n\nConversation History:\n" + "\n".join([f"{msg.get('role')}: {msg.get('content')}" for msg in conversation_history])
        query += f"\nUse the itsm_tags - {itsm_tags} when needed while accessing the mcp tools"

        response = await run_chatbot(query, token)

        # Extract display response and work notes from structured output
        if isinstance(response, dict):
            display_response = response.get("response", "")
            work_notes_summary = response.get("work_notes_summary", "")
        else:
            display_response = response
            work_notes_summary = ""

        conversation_history.append({"role": "assistant", "content": display_response})

        return (display_response, work_notes_summary, conversation_history)

    async def demo_chatbot(self, query, conversation_history, token):
        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        demo_chatbot_sys_prompt = sys_prompts_config.get("demo_chatbot_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(demo_chatbot_sys_prompt)

        conversation_history.append({"role": "user", "content": query})
        query = f"{instruction}\n\nConversation History:\n" + "\n".join([f"{msg.get('role')}: {msg.get('content')}" for msg in conversation_history])   

        response = await run_demo_chatbot(query, token)

        # Extract display response and work notes from structured output
        if isinstance(response, dict):
            display_response = response.get("response", "")
            work_notes_summary = response.get("work_notes_summary", "")
        else:
            display_response = response
            work_notes_summary = ""

        conversation_history.append({"role": "assistant", "content": display_response})

        return (display_response, work_notes_summary, conversation_history)

    async def generate_resolution_summary(self, conversation_history, token):
        # Convert conversation history to a string format for the agent
        config = scf.get_system_config()
        sys_prompts_config = config["sys_prompts_config"]
        resolution_summary_sys_prompt = sys_prompts_config.get("resolution_summary_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(resolution_summary_sys_prompt)

        conversation_string = "\n".join([f"{msg.get('role')}: {msg.get('content')}" for msg in conversation_history])
        query = f"{instruction}\n\nconversation history: {conversation_string}"
        response = await run_resolution_summary_agent(query, token)
        return response
