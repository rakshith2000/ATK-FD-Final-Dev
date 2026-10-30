# Author - Viraj Purandare and Hemanth Tubachi
# Created on - May 19, 2026

# Default packages
import os
import sys
import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta

# Global variables and custom packages
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
LOG_PATH = os.path.join(ROOT_PATH, "logs")
MCP_PATH = os.path.join(ROOT_PATH, "mcp_servers")

sys.path.append(ROOT_PATH)
sys.path.append(MCP_PATH)

import core_crud
from database import db_session

import system_config_pa as scf
from servicenow_mcp import ServiceNow

class ProblemAssistUtils():  
    def __init__(self):
        pass

    def fetch_problem_ticket_details(self, status = "all"):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.get_problem_tickets(db_local_session, status)
        db_local_session.close()

        if not status:
            return (status, data)
    
        return (True, data)

    def update_problem_ticket_details(self, payload):
        db_local_session = db_session.get_db()
        
        update_data_dict = {}
        for field in [
            "short_description", "description", "associated_incidents",
            "problem_ticket_number", "rejection_reason", "approval_status",
            "problem_ticket_link", "approver", "impact", "urgency", "priority",
            "state", "assigned_to", "assignment_group",
        ]:
            if payload.update_dict.get(field):
                update_data_dict[field] = payload.update_dict[field]

        (status, data) = core_crud.update_problem_ticket(db_local_session, payload.id, update_data_dict)

        db_local_session.close()

        if not status:
            return (status, data)

        return (True, data)

    def push_problem_ticket_in_itsm(self, payload):
        itsm_obj = ServiceNow()

        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        related_incidents = [item.get("number") for item in payload.related_incidents]

        (status, data) = itsm_obj.create_problem_ticket(itsm_tags = itsm_tags,
                                                        short_description = payload.short_description,
                                                        description = payload.description,
                                                        impact = payload.impact,
                                                        urgency = payload.urgency,
                                                        assignment_group = payload.assignment_group,
                                                        assigned_to = payload.assigned_to,
                                                        related_incidents = ",".join(related_incidents),
                                                        cmdb_ci = payload.cmdb_ci,
                                                        opened_by = payload.opened_by,
                                                        module_name = "problem_assist"
        )

        return (status, data)

    def update_problem_ticket_in_itsm(self, payload):
        itsm_obj = ServiceNow()
        related_incidents = [item.get("number") for item in payload.related_incidents]

        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])

        (status, data) = itsm_obj.update_problem_ticket(itsm_tags = itsm_tags,
                                                        number = payload.number,
                                                        short_description = payload.short_description,
                                                        description = payload.description,
                                                        impact = payload.impact,
                                                        urgency = payload.urgency,
                                                        assignment_group = payload.assignment_group,
                                                        assigned_to = payload.assigned_to,
                                                        related_incidents = ",".join(related_incidents),
                                                        cmdb_ci = payload.cmdb_ci,
                                                        module_name = "problem_assist"
                                                    )

        if not status:
            return (status, data)

        update_dict = {}
        for field in [
            "short_description", "description", "impact", "urgency",
            "assignment_group", "assigned_to",
        ]:
            if getattr(payload, field, None):
                update_dict[field] = getattr(payload, field)
               
        db_local_session = db_session.get_db()
        (db_status, db_data) = core_crud.update_problem_ticket(db_local_session, payload.id, update_dict)
        db_local_session.close()

        if not db_status:
            return (db_status, db_data)

        return (True, data)

    def list_problem_ticket_details_from_itsm(self, payload):
        itsm_obj = ServiceNow()

        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])

        conditions = []
        
        conditions = [{"param": "number", "op": "IN", "val": payload.numbers}]

        (status, data) = itsm_obj.list_problem_ticket_details(itsm_tags = itsm_tags,
                                                              conditions = conditions,
                                                              module_name = "problem_assist"
                                                        )

        return (status, data)
