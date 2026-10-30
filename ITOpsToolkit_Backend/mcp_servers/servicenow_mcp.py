# Author - Viraj Purandare
# Created On - November 11, 2025

# Default packages
import os
import sys
import json
import logging
import datetime
from collections import defaultdict

# Third party packages
import yaml
from dotenv import load_dotenv

import requests
from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_request
from mcp.server.transport_security import TransportSecuritySettings
from fastmcp.server.auth.providers.introspection import IntrospectionTokenVerifier

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("mcp_servers")[0]
DB_PATH = os.path.join(ROOT_PATH, "database")
AUTH_PATH = os.path.join(ROOT_PATH, "modules", "auth", "utils")
RBAC_PATH = os.path.join(SCRIPT_PATH, "config", "mcp_rbac.yaml")

sys.path.append(DB_PATH)
sys.path.append(ROOT_PATH)
sys.path.append(AUTH_PATH)

# Custom packages
import core_crud
import db_session

from auth_handler import get_user_info_supplementary

from pro_logger import log_event, application_logger, agentic_logger

# if os.path.exists(RBAC_PATH):
#     try:
#         with open(RBAC_PATH, "r") as f:
#             TOOL_PERMISSION_DATA = yaml.safe_load(f)
#     except Exception as e:
#         TOOL_PERMISSION_DATA = None

#         # Application logging
#         log_event(application_logger,
#                   logging.ERROR,
#                   f"MCP RBAC configuration file incorrect formatting - {str(e)}.",
#                   module_name = "mcp_servers",
#                   component_type = "mcp_server_init",
#                   component_name = "servicenow_mcp")
# else:
#     TOOL_PERMISSION_DATA = []

# def get_tool_permit_levels(tool_name):
#     initial_permit_levels = []
#     final_permit_levels = []
    
#     # Nominal group parsing
#     for group in TOOL_PERMISSION_DATA.get("groups", []):
#         group_data = TOOL_PERMISSION_DATA["groups"][group]

#         if tool_name in group_data:
#             initial_permit_levels.append(group)
#     final_permit_levels = initial_permit_levels

#     # Append groups based on group hierarchy data
#     for hierarchy in TOOL_PERMISSION_DATA.get("group_hierarchy", []):
#         for pl in initial_permit_levels:
#             if pl in hierarchy:
#                 pl_index = hierarchy.index(pl)
#                 final_permit_levels += hierarchy[pl_index:]
    
#     final_permit_levels = list(set(final_permit_levels))
#     return final_permit_levels
    
# Verify token
def get_auth_reference():
    load_dotenv(os.path.join(ROOT_PATH, "config", ".keycloak_env"))

    realm_name = os.getenv("REALM_NAME")
    client_id = os.getenv("CLIENT_ID")

    db_local_session = db_session.get_db()
    response = core_crud.get_sso_client_details_with_creds(db_local_session, client_id, realm_name)
    db_local_session.close()

    verifier = None
    if response:
        verifier = IntrospectionTokenVerifier(
                introspection_url = f"{response.sso_url}/realms/{realm_name}/protocol/openid-connect/token/introspect",
                client_id = client_id,
                client_secret = response.client_secret,
                client_auth_method = "client_secret_post"
                )
    return verifier
    
# Verify MCP tool permissions
def verify_mcp_tool_permissions(user_info, permit_levels):
    if "groups" not in user_info:
        return True

    for level in permit_levels:
        if level in user_info["groups"]:
            return True

    return False

auth = get_auth_reference()
mcp = FastMCP("ServiceNow MCP Server")

@mcp.tool
def get_cmdb_ci(itsm_tags: str, ci: str) -> list:
    """
        Given ITSM tag/s and configuration item (CI), fetch all the details of that CI from CMDB.
    """
    # print(f"[MCP] get_cmdb_ci called: itsm_tags={itsm_tags!r}, ci={ci!r}", flush=True)
    itsm_obj = ServiceNow()
    tool_req = get_http_request()
    token = tool_req.headers.get("Authorization").split("Bearer ")[-1].strip()
    user_info = get_user_info_supplementary(token)
    # if TOOL_PERMISSION_DATA == None:
    #     allowed = False
    # elif TOOL_PERMISSION_DATA != []:
    #     permit_levels = get_tool_permit_levels("get_cmdb_ci")
        
    #     allowed = verify_mcp_tool_permissions(user_info, permit_levels)
    # else:
    #     allowed = True
    
    # if allowed:
    try:
        (status, data) = itsm_obj.get_cmdb_ci(itsm_tags, ci)       
        # Agentic logging
        log_event(agentic_logger,
                  logging.INFO,
                  f"get_cmdb_ci - Accessed successfully.",
                  mcp_server = "servicenow_mcp",
                  tool_name = "get_cmdb_ci",
                  exec_error = "",
                  user_id = user_info["user_id"])
        return data
    
    except Exception as e:
        # Agentic logging
        log_event(agentic_logger,
                    logging.ERROR,
                    str(e),
                    mcp_server = "servicenow_mcp",
                    tool_name = "get_cmdb_ci",
                    exec_error = "Execution Exception",
                    user_id = user_info["user_id"])
        return f"MCP tool execution failed - {str(e)}"
# else:
#     # Agentic logging
#     log_event(agentic_logger,
#                 logging.ERROR,
#                 f"User is not permitted to access configuration item details.",
#                 mcp_server = "servicenow_mcp",
#                 tool_name = "get_cmdb_ci",
#                 exec_error = "Access Failure",
#                 user_id = user_info["user_id"])

#     return f"User {user_info["user_id"]} is not permitted to access configuration item details."


@mcp.tool
def get_service_map(itsm_tags: str, config_items: str) -> str:
    """
        Given ITSM tag/s and configuration item (CI), fetch the service map details.
        This service map is also called as dependency map or topology map.
    """
    # print(f"[MCP] get_service_map called: itsm_tags={itsm_tags!r}, config_items={config_items!r}", flush=True)
    itsm_obj = ServiceNow()
    tool_req = get_http_request()
    token = tool_req.headers.get("Authorization").split("Bearer ")[-1].strip()
    user_info = get_user_info_supplementary(token)

    # if TOOL_PERMISSION_DATA == None:
    #     allowed = False
    # elif TOOL_PERMISSION_DATA != []:
    #     permit_levels = get_tool_permit_levels("get_service_map")
    #     allowed = verify_mcp_tool_permissions(user_info, permit_levels)
    # else:
    #     allowed = True
    
    # if allowed:
    try:
        (status, data) = itsm_obj.get_service_map_details(itsm_tags, config_items, user_info)
        log_event(agentic_logger,
                  logging.INFO,
                  f"get_service_map - Accessed successfully.",
                  mcp_server = "servicenow_mcp",
                  tool_name = "get_service_map",
                  exec_error = "",
                  user_id = user_info["user_id"]) 
        return data
    
    except Exception as e:
        # Agentic logging
        log_event(agentic_logger,
                    logging.ERROR,
                    str(e),
                    mcp_server = "servicenow_mcp",
                    tool_name = "get_service_map",
                    exec_error = "Execution Exception",
                    user_id = user_info["user_id"])
        return f"MCP tool execution failed - {str(e)}"
    # else:
    #     # Agentic logging
    #     log_event(agentic_logger,
    #               logging.ERROR,
    #               f"User is not permitted to access configuration item details.",
    #               mcp_server = "servicenow_mcp",
    #               tool_name = "get_service_map",
    #               exec_error = "Access Failure",
    #               user_id = user_info["user_id"])

    #     return f"User {user_info["user_id"]} is not permitted to fetch CMDB service map details."
@mcp.tool
def get_incident_details(itsm_tags: str, incident_number: str) -> list:
    """
        Given ITSM tag/s and an incident number, fetch the details of that incident.
    """
    itsm_obj = ServiceNow()
    tool_req = get_http_request()
    token = tool_req.headers.get("Authorization").split("Bearer ")[-1].strip()
    user_info = get_user_info_supplementary(token)

    # if TOOL_PERMISSION_DATA == None:
    #     allowed = False
    # elif TOOL_PERMISSION_DATA != []:
    #     permit_levels = get_tool_permit_levels("get_incident_details")
    #     allowed = verify_mcp_tool_permissions(user_info, permit_levels)
    # else:
    #     allowed = True

    # if allowed:
    try:
        # Construct the query condition to filter the incident by its number.
        conditions = [{"param": "number", "op": "=", "val": incident_number}]
        (status, data) = itsm_obj.list_ticket_details(itsm_tags, table = "incident", conditions = conditions)
        log_event(agentic_logger,
                  logging.INFO,
                  f"get_incident_details - Accessed successfully.",
                  mcp_server = "servicenow_mcp",
                  tool_name = "get_incident_details",
                  exec_error = "",
                  user_id = user_info["user_id"]) 
        return data
    except Exception as e:
        # Agentic logging
        log_event(agentic_logger,
                    logging.ERROR,
                    str(e),
                    mcp_server = "servicenow_mcp",
                    tool_name = "get_incident_details",
                    exec_error = "Execution Exception",
                    user_id = user_info["user_id"])
        return f"MCP tool execution failed - {str(e)}"
    # else:
    #     # Agentic logging
    #     log_event(agentic_logger,
    #               logging.ERROR,
    #               f"User is not permitted to access incident details.",
    #               mcp_server = "servicenow_mcp",
    #               tool_name = "get_incident_details",
    #               exec_error = "Access Failure",
    #               user_id = user_info["user_id"])

    #     return f"User {user_info["user_id"]} is not permitted to access incident details."

@mcp.tool
def update_incident(itsm_tags: str, incident_number: str, resolve: bool = False,
                    assignment_group: str = "", assigned_to: str = "",
                    urgency: str = "", impact: str = "", state: str = "",
                    priority: str = "", short_description: str = "",
                    description: str = "", close_code: str = "",
                    comments_and_work_notes: str = "", close_notes: str = "") -> list:
    """
        Given ITSM tag/s and an incident number, update the details of that incident.
        Only the fields with a non-empty value are updated; untouched fields are left as-is.
        Set resolve to True to resolve/close the incident (close_notes is mandatory in that case).
    """
    itsm_obj = ServiceNow()
    tool_req = get_http_request()
    token = tool_req.headers.get("Authorization").split("Bearer ")[-1].strip()
    user_info = get_user_info_supplementary(token)

    try:
        (status, data) = itsm_obj.update_ticket_details(itsm_tags,
                                                         number = incident_number,
                                                         user_id = user_info["user_id"],
                                                         table = "incident",
                                                         resolve = resolve,
                                                         assignment_group = assignment_group,
                                                         assigned_to = assigned_to,
                                                         urgency = urgency,
                                                         impact = impact,
                                                         state = state,
                                                         priority = priority,
                                                         short_description = short_description,
                                                         description = description,
                                                         close_code = close_code,
                                                         comments_and_work_notes = comments_and_work_notes,
                                                         close_notes = close_notes)
        log_event(agentic_logger,
                    logging.INFO,
                    f"update_incident- Accessed successfully.",
                    mcp_server = "servicenow_mcp",
                    tool_name = "update_incident",
                    exec_error = "",
                    user_id = user_info["user_id"])
        return data
    except Exception as e:
        # Agentic logging
        log_event(agentic_logger,
                    logging.ERROR,
                    str(e),
                    mcp_server = "servicenow_mcp",
                    tool_name = "update_incident",
                    exec_error = "Execution Exception",
                    user_id = user_info["user_id"])
        return f"MCP tool execution failed - {str(e)}"


@mcp.tool
def list_change_requests(itsm_tags: str, conditions: list = [], limit: int = None) -> list:
    """
        Given ITSM tag/s, fetch change requests, optionally filtered and limited.

        conditions: A list of filter conditions, each a dictionary with the keys:
            - "param": the ServiceNow field to filter on (e.g. "number", "state",
                       "priority", "assigned_to", "cmdb_ci", "sys_created_by").
            - "op"   : the query operator, e.g. "=" (equals), "!=" (not equals),
                       "IN" (matches any comma-separated value), "LIKE" (contains),
                       ">" / "<" (greater/less than).
            - "val"  : the value to compare against.
          All conditions are combined with a logical AND.
          Example: [{"param": "state", "op": "=", "val": "New"},
                    {"param": "priority", "op": "IN", "val": "1,2"}]
          Pass an empty list to fetch change requests without any filter.

        limit: Maximum number of change requests to return. Leave as None for no limit.
    """
    print(locals())
    itsm_obj = ServiceNow()
    tool_req = get_http_request()
    token = tool_req.headers.get("Authorization").split("Bearer ")[-1].strip()
    user_info = get_user_info_supplementary(token)

    try:
        (status, data) = itsm_obj.list_change_requests(itsm_tags, conditions = conditions, limit = limit)
        log_event(agentic_logger,
                    logging.INFO,
                    f"list_change_requests - Accessed successfully.",
                    mcp_server = "servicenow_mcp",
                    tool_name = "list_change_requests",
                    exec_error = "",
                    user_id = user_info["user_id"])         
        return data
    except Exception as e:
        # Agentic logging
        log_event(agentic_logger,
                    logging.ERROR,
                    str(e),
                    mcp_server = "servicenow_mcp",
                    tool_name = "list_change_requests",
                    exec_error = "Execution Exception",
                    user_id = user_info["user_id"])
        return f"MCP tool execution failed - {str(e)}"

@mcp.tool
def get_current_datetime() -> str:
    """
        Return the current date and time in UTC as an ISO 8601 formatted string
        (e.g. "2026-08-18 14:30:05 UTC"). Use this whenever the current date or
        time is needed, such as for relative date filters or timestamping.
    """
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        log_event(agentic_logger,
                    logging.INFO,
                    f"get_current_datetime - Accessed successfully.",
                    mcp_server = "servicenow_mcp",
                    tool_name = "get_current_datetime",
                    exec_error = "",
                    #user_id = user_info["user_id"]
                    )    
        
        return now.strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception as e:
        # Agentic logging
        log_event(agentic_logger,
                    logging.ERROR,
                    str(e),
                    mcp_server = "servicenow_mcp",
                    tool_name = "get_current_datetime",
                    exec_error = "Execution Exception",
                    user_id = "system")
        return f"MCP tool execution failed - {str(e)}"
        

class ServiceNow():
    def __init__(self):
        self.headers = {"content-type": "application/json"}

    def _request(self, method, url, itsm_details, **kwargs):
        """Make an authenticated HTTP request using Service Account or Bearer token."""

        if itsm_details.itsm_auth_type.value == "Service Account":
            kwargs["auth"] = (itsm_details.itsm_user, itsm_details.itsm_password)
            # kwargs["auth"] = ("ServicenowAPI", "Qwerty@123")
    
        else:
            headers = kwargs.get("headers", {}).copy()
            headers["Authorization"] = "Bearer " + itsm_details.bearer_token
            kwargs["headers"] = headers

        return getattr(requests, method)(url, **kwargs)

#-------------------------------------------User--------------------------------------------------
    # Obtain user information
    def get_user_details(self, itsm_tags, user, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []
        
        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)

            if itsm_connector_details == None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/sys_user"
           
            filters = {}
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("SYSUSER_FIELDS", "sys_id, name, email, user_name")
            filters["sysparm_query"] = f"user_name={user}^ORemail={user}"
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)
                
                user_details = response.json().get("result")
                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"User details listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - get_user_details")

                    continue

                if user_details:
                    output += user_details

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"User details listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - get_user_details")

                continue

        db_local_session.close()

        if output == [] and flag == 1:
            return (False, f"User details listing failed in ITSM. Please check application logs.")
        elif len(output) == 1:
            return (True, output[0])
        else:
            return (True, output)

    # List user roles
    def list_user_roles(self, itsm_tags, user, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)

            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/sys_user_has_role"

            filters = {}
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("USER_ROLE_FIELDS", "role")
            filters["sysparm_query"] = f"user.user_name={user}"
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"User roles listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_user_roles")

                    continue

                user_roles = response.json()["result"]

                for role in user_roles:
                    output.append(role.get("role"))

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"User roles listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_user_roles")

                continue

        db_local_session.close()

        output.append("")
        if flag == 1 and output == []:
            return (False, "User roles listing failed in ITSM. Please check application logs.")
        elif output == []:
            return (False, "User roles not defined in ITSM.")

        return (True, output)

    def list_user_assignment_groups(self, itsm_tags, user, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = [t.strip() for t in itsm_tags.split(",") if t.strip()]
        groups = []
        flag = 0
   
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            status, user_details = self.get_user_details(itsm_tags = itsm_tag, user = user)

            if not status or not user_details:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/sys_user_grmember"
            filters = {}
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("USER_GMEMBER_FIELDS", "group,user,sys_id, group.sys_id")
            filters["sysparm_query"] = f"user={user_details.get("sys_id")}"
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)
                assignment_groups = []

                for data in response.json().get("result", []):
                    assignment_groups.append({
                        "name": data.get("group"),
                        "group_sys_id": data.get("group.sys_id")
                    })
                groups += assignment_groups
                
            except Exception as e:
                flag = 1
                # Application logging
                log_event(
                    application_logger,
                    logging.ERROR,
                    str(e),
                    module_name = module_name,
                    component_type = "itsm_connector_operations",
                    component_name = "servicenow_mcp - list_user_assignment_groups"
                )
                continue

        db_local_session.close()
        if groups == []:
            return (False, "User not assigned to any groups.")
        elif groups == [] and flag == 1:
            return (False, "User assignment groups listing failed - " + str(e))
        
        return (True, groups)

    # List all assignment groups
    def list_all_assignment_groups(self, itsm_tags, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/sys_user_group"

            filters = {}
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("USER_GROUP_FIELDS", "name,user,sys_id")
            filters["sysparm_query"] = "active=true"
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)
                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Assignment groups listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_all_assignment_groups")

                    continue

                output += [r.get("name") for r in response.json()["result"]]
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Assignment groups listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_all_assignment_groups")

                continue
                
        db_local_session.close()       
        if output == [] and flag == 1:
            return (False, f"Assignment groups listing failed in ITSM. Please check application logs.")

        return (True, output)

    # List assignment group members
    def list_group_members(self, itsm_tags, assignment_group, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/sys_user_grmember"

            filters = {}
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("USER_GMEMBER_FIELDS", "group,user,sys_id")
            filters["sysparm_query"] = f"group.name={assignment_group}^user.active=true"
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)
                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Group members listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_group_members")

                    continue

                for data in response.json()["result"]:
                    output.append(data.get("user"))
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Group members listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_group_members")

                continue

        db_local_session.close()
        if flag == 1 and output == []:
            return (False, "Group members listing failed in ITSM. Please check application logs.")

        return (True, output)

#------------------------------------Knowledge Articles--------------------------------------------
    # List latest knowledge articles
    def list_recent_knowledge_articles(self, itsm_tags, user, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            status, user_details = self.get_user_details(itsm_tags = itsm_tag, user = user)
            if not status or not user_details:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/kb_knowledge"

            filters = {}
            filters["sysparm_query"] = f"ORDERBYDESCsys_created_on^author={user_details.get("sys_id")}"
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("RECENT_KBS_FIELDS", "number, short_description, kb_category, kb_knowledge_base, sys_created_on")
            filters["sysparm_limit"] = itsm_connector_details.itsm_additional_config.get("RECENT_KBS_LIMIT", "10")
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Recent knowledge articles listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_recent_knowledge_articles")

                    continue

                result = response.json().get("result", [])

                if result:
                    output += result
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Recent knowledge articles listing failed - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_recent_knowledge_articles")

                continue

        db_local_session.close()
        if output == [] and flag == 1:
            return (False, "Recent knowledge articles listing failed in ITSM. Please check application logs.")
        
        return (True, output)

    # List all knowledge articles accessible to user
    def list_knowledge_articles(self, itsm_tags, user, module_name = "itsm", date_filter = None):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            status, user_details = self.get_user_details(itsm_tags = itsm_tag, user = user)

            if not status or not user_details:
                continue

            user_sys_id = user_details.get("sys_id")
            target_url = itsm_connector_details.itsm_url + "/api/now/table/user_criteria"

            filters = {}
            filters["sysparm_query"] = f"user.sys_id={user_sys_id}"
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("USER_CRITERIA_FIELDS", "sys_id,name")
            filters["sysparm_display_value"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"User criteria retrieval failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_knowledge_articles")

                    continue

                criteria_list = response.json().get("result", [])
                criteria_ids = [item.get("sys_id") for item in criteria_list if item.get("sys_id")]

                if not criteria_ids:
                    continue
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger, 
                          logging.ERROR, 
                          f"User criteria retrieval failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "itsm_utils - list_knowledge_articles")

                continue
            allowed_kb_bases = [x.strip() for x in itsm_connector_details.itsm_additional_config.get("KB_BASES", "ITOpsToolkit, Knowledge, IT, Knowledge Assist").split(",")]

            target_url = itsm_connector_details.itsm_url + "/api/now/table/kb_uc_can_read_mtom"

            filters = {}
            filters["sysparm_query"] = f"user_criteriaIN{",".join(criteria_ids)}^kb_knowledge_base.titleIN{",".join(allowed_kb_bases)}"
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("KB_UC_CAN_READ_FIELDS", "kb_knowledge_base,user_criteria")
            filters["sysparm_display_value"] = "all"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)
                kb_bases_data = response.json().get("result", [])
                kb_base_ids = list({item["kb_knowledge_base"]["value"] for item in kb_bases_data if item.get("kb_knowledge_base")})

                
                
                
                if not kb_base_ids:
                    continue
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger, 
                          logging.ERROR,
                          f"Knowledge bases retrieval failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "itsm_utils - list_knowledge_articles")
                
                continue

            
            # Get published KB articles for those knowledge bases
            target_url = itsm_connector_details.itsm_url + "/api/now/table/kb_knowledge"
            filters = {}
            filters["sysparm_query"] = f"workflow_state=published^kb_knowledge_baseIN{",".join(kb_base_ids)}"
            if date_filter:
                # filters["sysparm_query"] += f"^sys_created_on>{date_filter}"
                filters["sysparm_query"] += f"^sys_updated_on>{date_filter}"
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("LIST_KB_ARTICLES_FIELDS", "sys_id,rating,number,sys_created_on,text,short_description,kb_knowledge_base,workflow_state,kb_category,author")
            filters["sysparm_display_value"] = "all"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)
                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Knowledge articles listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_knowledge_articles")

                    continue                  

                result = response.json().get("result", [])
                if result:
                    output += result
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Knowledge articles listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "itsm_utils - list_knowledge_articles")

                continue

        db_local_session.close()
        if output == [] and flag == 1:
            return (False, "Knowledge articles listing failed in ITSM. Please check application logs.")

        return (True, output)

    # List knowledge base categories
    def list_knowledge_base_categories(self, itsm_tags, user, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())
        
        output = {}

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/kb_knowledge"

            filters = {}
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("KB_BASES_CATEGORIES_FIELDS", "kb_knowledge_base,kb_category, kb_knowledge_base.sys_id")
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            grouped = defaultdict(list)
            kb_bases = [x.strip() for x in itsm_connector_details.itsm_additional_config.get("KB_BASES", "ITOpsToolkit, Knowledge, IT, Knowledge Assist").split(",")]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Knowledge bases categories listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_knowledge_base_categories")

                    continue  

                for item in response.json()["result"]:
                    if item["kb_knowledge_base"] in kb_bases:
                        kb = item["kb_knowledge_base"] + " | " + item["kb_knowledge_base.sys_id"]
                        cat = item["kb_category"]
                        if cat and cat not in grouped[kb]:
                            grouped[kb].append(cat)

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Knowledge bases categories listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_knowledge_base_categories")

                continue

            ids = [id.split("|")[-1].strip() for id in grouped.keys()]

            target_url = itsm_connector_details.itsm_url + "/api/now/table/kb_uc_can_contribute_mtom"

            filters = {}
            query = ",".join(ids)

            filters["sysparm_query"] = "kb_knowledge_baseIN" + query
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("KB_CAN_CONTRIBUTE_FIELDS", "user_criteria.role, kb_knowledge_base.sys_id")
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)
               
                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Knowledge bases categories listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_knowledge_base_categories")

                    continue
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Knowledge base contribution permissions retrieval failed {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_knowledge_base_categories")

                continue

            try:
                kbs_permissions = defaultdict(list)
                for item in response.json()["result"]:
                    kb = item["kb_knowledge_base.sys_id"]
                    role = item["user_criteria.role"]

                    if role not in kbs_permissions[kb]:
                        kbs_permissions[kb].append(role)
                
                (status, user_roles) = self.list_user_roles(itsm_tags = itsm_tag, user = user)
                if not status:
                    continue

                updated_categories = {}
                for key, value in grouped.items():
                    name, id_part = key.split("|")
                    name = name.strip()
                    id_part = id_part.strip()

                    if id_part in kbs_permissions and any(role in kbs_permissions[id_part] for role in user_roles):
                        updated_categories[name] = value

                output.update(updated_categories)
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Knowledge base categories processing failed - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_knowledge_base_categories")

        db_local_session.close()
        if output == {} and flag == 1:
            return (False, f"Knowledge base categories processing failed in ITSM - {str(e)}")

        return (True, output)

    # Push knowledge articles to knowledge base
    def create_knowledge_article(self, itsm_tags, user_id, short_description, text, kb_knowledge_base, kb_category, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())
        
        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            (status, user_details) = self.get_user_details(itsm_tags, user_id)
            if not status:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/kb_knowledge"

            payload = {}
            payload["short_description"] = short_description
            payload["text"] = text
            payload["kb_knowledge_base"] = kb_knowledge_base
            payload["kb_category"] = kb_category
            payload["author"] = user_details.get("sys_id", user_id)
            payload["workflow_state"] = "draft"

            try:
                response = self._request("post", target_url, itsm_connector_details, data = json.dumps(payload), headers = self.headers, verify = False)

                result = {"number": response.json()["result"]["number"]}
                result["target_link"] = itsm_connector_details.itsm_url + "/now/nav/ui/classic/params/target/kb_knowledge.do%3Fsys_id%3D" + response.json()["result"]["sys_id"]
                output.append(result)

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Knowledge article creation failed for ITSM {itsm_tag} - {str(e)}  {response.json()}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - create_knowledge_article")

                continue

        db_local_session.close()
        if output == [] and flag == 1:
            return (False, "Knowledge article creation failed in ITSM. Please check application logs.")
        elif len(output) == 1:
            return (True, output[0])
        else:
            return (True, output)

    # Update knowledge article in ITSM
    def update_knowledge_article(self, itsm_tags, user_id, number, text, short_description = "", kb_knowledge_base = "", kb_category = "", module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())
        
        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/kb_knowledge"

            filters = {}
            filters["sysparm_fields"] = "sys_id"
            filters["sysparm_query"] = f"number={number}"
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Knowledge article retrieval failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - update_knowledge_article")

                    continue

                sys_id = response.json()["result"][0]["sys_id"]
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Knowledge article retrieval failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - update_knowledge_article")

                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/kb_knowledge" + "/" + sys_id

            payload = {}
            payload["text"] = text
        
            if short_description:
                payload["short_description"] = short_description

            if kb_category:
                payload["kb_category"] = kb_category

            if kb_knowledge_base:
                payload["kb_knowledge_base"] = kb_knowledge_base

            try:
                response = self._request("patch", target_url, itsm_connector_details, data = json.dumps(payload), headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Knowledge article retrieval failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - update_knowledge_article")

                    continue
                
                result = {"number": response.json()["result"]["number"]}
                result["target_link"] = itsm_connector_details.itsm_url + "/now/nav/ui/classic/params/target/kb_knowledge.do%3Fsys_id%3D" + response.json()["result"]["sys_id"]

                output.append(result)
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Knowledge article update failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - update_knowledge_article")

                continue

        db_local_session.close()
        if output == []:
            return (False, "Knowledge article update failed in ITSM. Please check application logs.")
        elif len(output) == 1:
            return (True, output[0])
        else:
            return (True, output)

#-------------------------------------Change Requests-------------------------------------------------
    # List all change requests
    def list_change_requests(self, itsm_tags, conditions = [], limit = None, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/change_request"

            filters = {}

            query = ""
            for condition in conditions:
                query += "^" + condition["param"] + condition["op"] + condition["val"]

            if conditions != []:
                filters["sysparm_query"] = query

            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("GET_CHANGE_REQUESTS_FIELDS", "reason,type,test_plan,number,state,sys_created_by,impact,delivery_plan,priority,change_plan,implementation_plan,short_description,end_date,closed_by,assigned_to,comments_and_work_notes,assignment_group,description,sys_id,close_notes,opened_at,opened_by,sys_updated_by,cmdb_ci.sys_id,cmdb_ci")
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if limit:
                filters["sysparm_limit"] = str(limit)

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Change request listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_change_requests")
                        
                    continue

                result = response.json().get("result") or []
                output += result
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Change request listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - get_change_requests")

                continue

        db_local_session.close()
        if output == [] and flag == 1:
            return (False, "Change request listing failed for ITSM. Please check application logs.")
            
        return (True, output)

    # Obtain configuration item details from ITSM
    def get_cmdb_ci(self, itsm_tags, ci, module_name = "itsm"):
        # print(f"[MCP] get_cmdb_ci called: itsm_tags={itsm_tags!r}, ci={ci!r}", flush=True)
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/cmdb_ci"

            params = {}
            params["sysparm_query"] = "name=" + ci + "^ORip_address=" + ci + "^ORsys_id=" + ci
            params["sysparm_display_value"] = "true"

            try:
                response = self._request("get", target_url, itsm_connector_details, params=params, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"CMDB CI retrieval failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_change_requests")

                    continue
                
                result = response.json()["result"]

                if isinstance(result, dict):
                    result = [result]

                output += result

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"CMDB CI retrieval failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - get_cmdb_ci")
                
                continue

        db_local_session.close()
        if flag == 1 and output == []:
            return (False, "CMDB CI retrieval from ITSM failed. Please check application logs.")
        
        # print("[get_cmdb_ci]", output)

        return (True, output)

    # Get parent/child CMDB CI relationships
    def get_parents_children(self, itsm_tags, sys_id, target, service_map = [], module_name = "itsm"):
        # print(f"[MCP] get_parents_children called: itsm_tags={itsm_tags!r}, sys_id={sys_id!r}, target={target!r}", flush=True)
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            data = ""

            target_url = itsm_connector_details.itsm_url + "/api/now/table/cmdb_rel_ci"
            params = {
                    "sysparm_query": "parent=" + sys_id + "^ORchild=" + sys_id,
                    "sysparm_fields": itsm_connector_details.itsm_additional_config.get("GET_CMDB_REL_CI_FIELDS", "parent,child,type,parent.name,parent.sys_class_name,parent.ip_address,child.name,child.sys_class_name,child.ip_address,type.name")
                    }

            if target == "parent":
                relation = "child"
            elif target == "child":
                relation = "parent"

            try:
                direct_targets = []

                result = self._request("get", target_url, itsm_connector_details, params=params, headers=self.headers)

                if "error" in result.json():
                    error = result.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"CMDB CI relationship retrieval failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - get_parents_children")

                    continue

                result = result.json()["result"]

                for entry in result:
                    if (entry["parent.name"] == "" and entry["parent.sys_class_name"] == "") or (entry["child.name"] == "" and entry["child.sys_class_name"] == ""):
                        continue

                    if entry[relation]["value"] == sys_id:
                        direct_targets.append(entry[target])
                        if "parent.sys_class_name" in entry and entry["parent.sys_class_name"] != "":
                            data += entry["parent.sys_class_name"] + " "
                        data += entry["parent.name"] + " "

                        if "parent.ip_address" in entry and entry["parent.ip_address"] != "":
                            data += "with IP address " + entry["parent.ip_address"] + " "
                            data += entry["type.name"].split(":")[0] + " "

                        if "child.sys_class_name" in entry and entry["child.sys_class_name"] != "":
                            data += entry["child.sys_class_name"] + " "
                        data += entry["child.name"] + " "

                        if "child.ip_address" in entry and entry["child.ip_address"] != "":
                            data += "with IP address " + entry["child.ip_address"]

                        if data.strip() != "":
                            data += "\n"

                if data.strip() != "":
                    service_map.append(data)
                for tg in direct_targets:
                    self.get_parents_children(itsm_tag, tg["value"], target, service_map)

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"CMDB CI relationship retrieval failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - get_parents_children")

                continue

        db_local_session.close()
        if flag == 1 and service_map == []:
            return (False, "CMDB CI relationship retrieval from ITSM failed. Please check application logs.")

        if len(service_map) == 1:
            # print("[get_parents_children]", service_map[0])
            return (True, service_map[0])
        else:
            # print("[get_parents_children]", service_map)
            return (True, service_map)
        
    # Get service map or dependency map details
    def get_service_map_details(self, itsm_tags, config_items, user_info = {"user_id": "system"}, module_name = "itsm") -> str:
        # print(f"[MCP] get_service_map_details called: itsm_tags={itsm_tags!r}, config_items={config_items!r}", flush=True)
        service_map_explanations = []

        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        ci_list = []
        for ci in config_items.split(","):
            if ci.strip() != "":
                ci_list.append(ci.strip())

        flag = 0
        for itsm_tag in itsm_tag_list:
            for ci in ci_list:
                try:
                    (status, ci_obj) = self.get_cmdb_ci(itsm_tag, ci)
                    if not status or ci_obj == []:
                        continue

                    ci_obj = ci_obj[0]

                    (status, service_map) = self.get_parents_children(itsm_tag, ci_obj["sys_id"], "parent", [])
                    if not status:
                        continue

                    service_map = service_map[::-1] if isinstance(service_map, list) else [service_map]
                    (status, service_map) = self.get_parents_children(itsm_tag, ci_obj["sys_id"], "child", service_map)
                    if not status:
                        continue

                    if isinstance(service_map, str):
                        service_map = [service_map]

                    # service_map_explanation = "Service Map For CI " + ci.strip() + "-\n"
                    service_map_explanation = "Service Map For CI " + ci.strip() + "(name - " + str(ci_obj["name"]) + ")-\n"
                    for line in service_map:
                        service_map_explanation += line.strip() + "\n"

                    service_map_explanations.append(service_map_explanation)

                except Exception as e:
                    flag = 1

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Service map retrieval failed for CI {ci} on ITSM {itsm_tag} - {str(e)}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - get_service_map_details")

                    continue

        if flag == 1 and service_map_explanations == []:
            return (False, "Service map retrieval from ITSM failed. Please check application logs.")

        outcome = ""
        if service_map_explanations != []:
            outcome = "Below are the explanations of service maps associated to various configuration items -\n\n"
            outcome += "\n\n".join(service_map_explanations)
            
        # print("[get_service_map_details]", outcome)

        return (True, outcome)

    # Create a change request in ITSM
    def create_change_request(self, itsm_tags, short_description, description = "", ci = "", chg_model = "normal", implementation_plan = "", backout_plan = "", test_plan = "", risk_impact_analysis = "", attachments = [], module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/change_request"

            payload = {}
            payload["short_description"] = short_description
            payload["description"] = description
            payload["cmdb_ci"] = ci
            payload["chg_model"] = chg_model
            payload["implementation_plan"] = implementation_plan
            payload["backout_plan"] = backout_plan
            payload["test_plan"] = test_plan
            payload["risk_impact_analysis"] = risk_impact_analysis

            payload["start_date"] = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes = 30)
            payload["end_date"] = payload["start_date"] + datetime.timedelta(hours = 1)
            payload["start_date"] = payload["start_date"].strftime("%Y-%m-%d %H:%M:%S")
            payload["end_date"] = payload["end_date"].strftime("%Y-%m-%d %H:%M:%S")

            try:
                response = self._request("post", target_url, itsm_connector_details, data=json.dumps(payload), headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]
                    flag = 1
                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Change request creation failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - create_change_request")

                    continue

                result = {"number": response.json()["result"]["number"]}
                result["target_link"] = itsm_connector_details.itsm_url + "/now/nav/ui/classic/params/target/change_request.do%3Fsys_id%3D" + response.json()["result"]["sys_id"]

                file_types = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "bmp": "image/bmp"}
                for attachment in attachments:
                    file_extension = attachment.split(".")[-1].lower().strip()
                    self.attach_file(itsm_connector_details, response.json()["result"]["sys_id"], attachment, file_types[file_extension.strip()])

                output.append(result)

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Change request creation failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - create_change_request")

                continue

        db_local_session.close()
        if flag == 1 and output == []:
            return (False, "Change request creation in ITSM failed. Please check application logs.")

        if len(output) == 1:
            return (True, output[0])
        else:
            return (True, output)

    # Attach file to a change request in ITSM
    def attach_file(self, itsm_connector_details, sys_id, file_name, file_type, module_name = "itsm"):
        target_url = itsm_connector_details.itsm_url + "/api/now/attachment"
        payload = {"table_name": "change_request", "table_sys_id": sys_id}

        file_path = os.path.join(ROOT_PATH, "temp", file_name)

        files = {"file": (file_name, open(file_path, "rb"), file_type, {"Expires": "0"})}

        try:
            self._request("post", target_url, itsm_connector_details, data=payload, files=files)
            return (True, None)

        except Exception as e:
            # Application logging
            log_event(application_logger,
                      logging.ERROR,
                      f"File attachment failed for sys_id {sys_id} - {str(e)}",
                      module_name = module_name,
                      component_type = "itsm_connector_operations",
                      component_name = "servicenow_mcp - attach_file")

            return (False, "File attachment to ITSM failed. Please check application logs.")

        finally:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)

            except OSError as e:
                log_event(application_logger,
                      logging.ERROR,
                      str(e),
                      module_name = module_name,
                      component_type = "itsm_connector_operations",
                      component_name = "servicenow_mcp - attach_file - remove attached file from local dir")

#---------------------------------------------Incident--------------------------------------------------
    # Update ticket details in ITSM
    def update_ticket_details(self, itsm_tags, number, user_id, table="incident",
                            resolve=False, assignment_group="", assigned_to="",
                            urgency="", impact="", state="", priority="",
                            short_description="", description="", close_code="",
                            comments_and_work_notes="", close_notes = "",
                            module_name="itsm"):
        if not number:
            return (False, "Ticket update failed - ticket number is required.")
        if resolve and close_notes.strip() == "":
            return (False, "Ticket update failed - resolution notes cannot be empty when resolve is set to True.")

        db_local_session = db_session.get_db()

        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []
        flag = 0

        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            conditions = [{"param": "number", "op": "=", "val": number}]
            (status, incident_details) = self.list_ticket_details(itsm_tags=itsm_tag, table=table, conditions=conditions)
            if not status or not incident_details:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/" + table + "/" + incident_details[0].get("sys_id")
            (status, user_details) = self.get_user_details(itsm_tags, user_id)

            payload = {}

            # Only fields with a non-empty value are added to the payload, so
            # untouched fields are never overwritten.
            field_map = {
                "comments_and_work_notes": comments_and_work_notes,
                "assignment_group": assignment_group,
                "assigned_to": assigned_to,
                "urgency": urgency,                
                "impact": impact,                   
                "state": state,                     
                "priority": priority,               
                "short_description": short_description,  
                "description": description,         
                "close_code": close_code,
                "close_notes": close_notes           
            }

            for sn_field, value in field_map.items():
                # str() guards against ints (e.g. urgency=1) being passed in
                if str(value).strip() != "":
                    payload[sn_field] = value

            if str(comments_and_work_notes).strip() != "":
                payload.setdefault("comments", comments_and_work_notes)
                payload.setdefault("work_notes", comments_and_work_notes)

            # Resolve flow takes precedence over a plain state update so closure
            # stays consistent with resolution notes.
            if resolve and close_notes.strip() != "":
                payload["close_notes"] = close_notes
                if table == "incident":
                    payload["state"] = "6"
                    # Only default the close_code if the caller didn't supply one
                    payload.setdefault("close_code", "Solved (Permanently)")

            # Nothing to update for this connector - skip the call entirely.
            if not payload:
                continue

            try:
                response = self._request("patch", target_url, itsm_connector_details,
                                        data=json.dumps(payload), headers=self.headers, verify=False)
                
                if "error" in response.json():
                    error = response.json()["error"]
                    # Application logging
                    log_event(application_logger,
                            logging.ERROR,
                            f"Ticket update failed for {number} on ITSM {itsm_tag} - {error.get('message', '')}",
                            module_name=module_name,
                            component_type="itsm_connector_operations",
                            component_name="servicenow_mcp - update_ticket_details")
                    continue
                output.append((number, "Ticket updated successfully."))
            except Exception as e:
                flag = 1
                # Application logging
                log_event(application_logger,
                        logging.ERROR,
                        f"Ticket update failed for {number} on ITSM {itsm_tag} - {str(e)}",
                        module_name=module_name,
                        component_type="itsm_connector_operations",
                        component_name="servicenow_mcp - update_ticket_details")
                continue

        db_local_session.close()

        if flag == 1 and output == []:
            return (False, "Ticket update in ITSM failed. Please check application logs.")
        if len(output) == 1:
            return (True, output[0])
        else:
            return (True, output)

    # List ticket details from ITSM
    def list_ticket_details(self, itsm_tags, table = "incident", conditions = [], module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        tickets = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/" + table

            filters = {}

            query = ""
            for condition in conditions:
                query += "^" + condition["param"] + condition["op"] + condition["val"]

            if conditions != []:
                filters["sysparm_query"] = query

            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("INC_FIELDS", "sys_id, number, short_description, description, close_notes, priority, category, assigned_to, state, sys_created_on, cmdb_ci, cmdb_ci.sys_id, location, sub_category, assignment_group, caller_id, sys_created_by, comments, work_notes")
            filters["sysparm_limit"] = str(itsm_connector_details.itsm_additional_config.get("INC_LIMIT", "50"))

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]
            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Ticket details listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_ticket_details")

                    continue

                for ticket in response.json().get("result", []):
                    ticket["ticket_link"] = itsm_connector_details.itsm_url + "/now/nav/ui/classic/params/target/" + table + ".do%3Fsys_id%3D" + ticket["sys_id"]
                    tickets.append(ticket)

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Ticket details listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_ticket_details")

                continue

        db_local_session.close()
        if flag == 1 and tickets == []:
            return (False, "Ticket details listing from ITSM failed. Please check application logs.")

        return (True, tickets)
    
    # Update ticket details in ITSM
    def update_service_request_details(self, itsm_tags, number, user_id, table="sc_request",
                            resolve = False, assignment_group = "", assigned_to = "",
                            urgency = "", impact = "", state = "", priority = "",
                            short_description = "", description = "", close_code = "",
                            work_notes = "", close_notes = "",
                            module_name = "itsm"):
        if not number:
            return (False, "Service request update failed - ticket number is required.")
        if resolve and close_notes.strip() == "":
            return (False, "Service request failed - resolution notes cannot be empty when resolve is set to True.")

        db_local_session = db_session.get_db()

        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []
        flag = 0

        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            conditions = [{"param": "number", "op": "=", "val": number}]
            (status, sc_details) = self.list_ticket_details(itsm_tags=itsm_tag, table = table, conditions = conditions)
            if not status or not sc_details:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/" + table + "/" + sc_details[0].get("sys_id")
            (status, user_details) = self.get_user_details(itsm_tags, user_id)

            payload = {}

            # Only fields with a non-empty value are added to the payload, so
            # untouched fields are never overwritten.
            field_map = {
                "work_notes": work_notes,
                "assignment_group": assignment_group,
                "assigned_to": assigned_to,
                "urgency": urgency,                
                "impact": impact,                   
                "state": state,                     
                "priority": priority,               
                "short_description": short_description,  
                "description": description,         
                "close_code": close_code,
                "close_notes": close_notes           
            }

            for sn_field, value in field_map.items():
                # str() guards against ints (e.g. urgency=1) being passed in
                if str(value).strip() != "":
                    payload[sn_field] = value

            # Resolve flow takes precedence over a plain state update so closure
            # stays consistent with resolution notes.
            if resolve and close_notes.strip() != "":
                payload["close_notes"] = close_notes
                if table == "incident":
                    payload["state"] = "6"
                    # Only default the close_code if the caller didn't supply one
                    payload.setdefault("close_code", "Solved (Permanently)")

            # Nothing to update for this connector - skip the call entirely.
            if not payload:
                continue
            
            try:
                response = self._request("patch", target_url, itsm_connector_details,
                                        data=json.dumps(payload), headers=self.headers, verify=False)
             
                if "error" in response.json():
                    error = response.json()["error"]
                    # Application logging
                    log_event(application_logger,
                            logging.ERROR,
                            f"Ticket update failed for {number} on ITSM {itsm_tag} - {error.get('message', '')}",
                            module_name=module_name,
                            component_type="itsm_connector_operations",
                            component_name="servicenow_mcp - update_service_request_details")
                    continue
                output.append((number, "Service request updated successfully."))
            except Exception as e:
                flag = 1
                # Application logging
                log_event(application_logger,
                        logging.ERROR,
                        f"Service request update failed for {number} on ITSM {itsm_tag} - {str(e)}",
                        module_name=module_name,
                        component_type="itsm_connector_operations",
                        component_name="servicenow_mcp - update_service_request_details")
                continue

        db_local_session.close()

        if flag == 1 and output == []:
            return (False, "Service request update in ITSM failed. Please check application logs.")
        if len(output) == 1:
            return (True, output[0])
        else:
            return (True, output)

#--------------------------------------------Problem----------------------------------------------------
    # List problem ticket details from ITSM
    def list_problem_ticket_details(self, itsm_tags, conditions = [], module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        tickets = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/problem"

            filters = {}

            query = ""
            for condition in conditions:
                query += "^" + condition["param"] + condition["op"] + condition["val"]

            if conditions != []:
                filters["sysparm_query"] = query

            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]
            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Problem ticket details listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_problem_ticket_details")

                    continue

                for ticket in response.json().get("result", []):
                    ticket["ticket_link"] = itsm_connector_details.itsm_url + "/now/nav/ui/classic/params/target/problem.do%3Fsys_id%3D" + ticket["sys_id"]
                    tickets.append(ticket)

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Problem ticket details listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_problem_ticket_details")

                continue

        db_local_session.close()
        if flag == 1 and tickets == []:
            return (False, "Problem ticket details listing from ITSM failed. Please check application logs.")

        return (True, tickets)

    # Create a problem ticket in ITSM
    def create_problem_ticket(self, itsm_tags, short_description, description, impact = "", urgency = "", assignment_group = "", assigned_to = "", related_incidents = "", cmdb_ci = "", opened_by = "", module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            problem_url = itsm_connector_details.itsm_url + "/api/now/table/problem"

            payload = {}
            payload["short_description"] = short_description
            payload["description"] = description
            if impact:
                payload["impact"] = impact
            if urgency:
                payload["urgency"] = urgency
            if assignment_group:
                payload["assignment_group"] = assignment_group
            if assigned_to:
                payload["assigned_to"] = assigned_to
            if cmdb_ci:
                payload["cmdb_ci"] = cmdb_ci
            if opened_by:
                payload["opened_by"] = opened_by

            try:
                response = self._request("post", problem_url, itsm_connector_details, data=json.dumps(payload), headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Problem ticket creation failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - create_problem_ticket")

                    continue
                data = response.json().get("result")
                result = {}
                result["number"] = data.get("number")
                result["sys_id"] = data.get("sys_id")
                result["impact"] = data.get("impact")
                result["urgency"] = data.get("urgency")
                result["assigned_to"] = data.get("assigned_to")
                result["priority"] = data.get("priority")
                result["state"] = data.get("state")
                result["assignment_group"] = data.get("assignment_group")

                result["target_link"] = itsm_connector_details.itsm_url + "/now/nav/ui/classic/params/target/problem.do%3Fsys_id%3D" + data.get("sys_id")
            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Problem ticket creation failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - create_problem_ticket")

                continue

            # Attach related incidents to the problem ticket
            try:
                incidents = [item.strip().strip("'\'") for item in related_incidents.split(",") if item.strip()]

                inc_conditions = [{"param": "number", "op": "IN", "val": ",".join(incidents)}]
                status, incidents_details = self.list_ticket_details(itsm_tags=itsm_tag, conditions=inc_conditions)

                if status:
                    inc_sys_ids = [inc.get("sys_id") for inc in incidents_details]
                    incident_base_url = itsm_connector_details.itsm_url + "/api/now/table/incident"

                    for inc_sys_id in inc_sys_ids:
                        incident_url = incident_base_url + "/" + inc_sys_id
                        inc_payload = {"problem_id": result["sys_id"]}
                        self._request("patch", incident_url, itsm_connector_details, data=json.dumps(inc_payload), headers = self.headers, verify = False)

            except Exception as e:
                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Related incidents attachment failed for problem {result.get('number', '')} on ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - create_problem_ticket")

            output.append(result)

        db_local_session.close()
        if flag == 1 and output == []:
            return (False, "Problem ticket creation in ITSM failed. Please check application logs.")

        if len(output) == 1:
            return (True, output[0])
        else:
            return (True, output)

    # Update a problem ticket in ITSM
    def update_problem_ticket(self, itsm_tags, number, table = "problem", short_description="", description="", impact="", urgency="", assignment_group="", assigned_to="", related_incidents="", cmdb_ci="", module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue
            
            conditions = [{"param": "number", "op": "=", "val": number}]
            (status, problem_details) = self.list_ticket_details(itsm_tags = itsm_tag, table = table, conditions = conditions)
            if not status or not problem_details:
                continue
            sys_id = problem_details[0].get("sys_id")
            
            target_url = itsm_connector_details.itsm_url + "/api/now/table/" + table + "/" + sys_id

            payload = {}
            if short_description:
                payload["short_description"] = short_description
            if description:
                payload["description"] = description
            if impact:
                payload["impact"] = impact
            if urgency:
                payload["urgency"] = urgency
            if assignment_group:
                payload["assignment_group"] = assignment_group
            if assigned_to:
                payload["assigned_to"] = assigned_to
            if cmdb_ci:
                payload["cmdb_ci"] = cmdb_ci

            try:
                response = self._request("put", target_url, itsm_connector_details, data=json.dumps(payload), headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Problem ticket update failed for sys_id {sys_id} on ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - update_problem_ticket")

                    continue

                result = {
                    "number": response.json()["result"]["number"],
                    "sys_id": response.json()["result"]["sys_id"],
                    "target_link": itsm_connector_details.itsm_url + "/now/nav/ui/classic/params/target/problem.do%3Fsys_id%3D" + sys_id
                }

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Problem ticket update failed for sys_id {sys_id} on ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - update_problem_ticket")

                continue

            # Link related incidents to the problem ticket
            if related_incidents:
                try:
                    incidents = [item.strip().strip("'\'") for item in related_incidents.split(",") if item.strip()]
                    inc_conditions = [{"param": "number", "op": "IN", "val": ",".join(incidents)}]
                    status, incidents_details = self.list_ticket_details(itsm_tags=itsm_tag, conditions=inc_conditions)

                    if status:
                        incident_base_url = itsm_connector_details.itsm_url + "/api/now/table/incident"
                        for inc in incidents_details:
                            incident_url = incident_base_url + "/" + inc.get("sys_id")
                            inc_payload = {"problem_id": sys_id}
                            self._request("patch", incident_url, itsm_connector_details, data=json.dumps(inc_payload), headers = self.headers, verify = False)

                except Exception as e:
                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Related incidents linking failed for problem sys_id {sys_id} on ITSM {itsm_tag} - {str(e)}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - update_problem_ticket")

            output.append(result)

        db_local_session.close()
        if flag == 1 and output == []:
            return (False, "Problem ticket update in ITSM failed. Please check application logs.")

        if len(output) == 1:
            return (True, output[0])
        else:
            return (True, output)

#----------------------------------------------Choice-----------------------------------------------------
    # List task state choices from ITSM
    def list_task_state_choices(self, itsm_tags, table_name, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/sys_choice"

            filters = {}
            filters["sysparm_query"] = f"name={table_name}^element=state"
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("SYS_CHOICE_FIELDS", "label,value, sys_id")
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Task state choices listing failed for {table_name} on ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_task_state_choices")

                    continue

                result = response.json().get("result") or []
                output += result

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Task state choices listing failed for {table_name} on ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_task_state_choices")

                continue

        db_local_session.close()
        if flag == 1 and output == []:
            return (False, "Task state choices listing from ITSM failed. Please check application logs.")

        return (True, output)

    # List choices from ITSM
    def list_choices(self, itsm_tags, conditions, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/sys_choice"

            filters = {}

            query = ""
            for condition in conditions:
                query += "^" + condition["param"] + condition["op"] + condition["val"]

            if conditions != []:
                filters["sysparm_query"] = query

            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("SYS_CHOICE_FIELDS", "label,value, sys_id")
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Choices listing failed for ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_choices")

                    continue

                result = response.json().get("result") or []
                output += result

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Choices listing failed for ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_choices")

                continue

        db_local_session.close()
        if flag == 1 and output == []:
            return (False, "Choices listing from ITSM failed. Please check application logs.")

        return (True, output)

#----------------------------------------------Journal---------------------------------------------------
    # List ticket journal entries from ITSM
    def list_ticket_journal(self, itsm_tags, sys_id, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/sys_journal_field"

            filters = {}
            filters["sysparm_query"] = f"element_id={sys_id}^elementINwork_notes,comments^ORDERBYDESCsys_created_on"
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("JOURNAL_FIELD_FIELDS", "element,value,sys_created_by,sys_created_on")
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Ticket journal listing failed for sys_id {sys_id} on ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_ticket_journal")

                    continue

                result = response.json().get("result") or []
                output += result

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Ticket journal listing failed for sys_id {sys_id} on ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_ticket_journal")

                continue

        db_local_session.close()
        if flag == 1 and output == []:
            return (False, "Ticket journal listing from ITSM failed. Please check application logs.")

        return (True, output)

#-----------------------------------------------Alerts---------------------------------------------------
    # List related alerts for an incident from ITSM
    def list_related_alerts(self, itsm_tags, inc_sys_id, module_name = "itsm"):
        db_local_session = db_session.get_db()
        itsm_tag_list = []
        for itsm_tag in itsm_tags.split(","):
            if itsm_tag.strip() != "":
                itsm_tag_list.append(itsm_tag.strip())

        output = []

        flag = 0
        for itsm_tag in itsm_tag_list:
            itsm_connector_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tag)
            if itsm_connector_details is None:
                continue

            target_url = itsm_connector_details.itsm_url + "/api/now/table/em_alert"

            filters = {}
            filters["sysparm_query"] = f"incident={inc_sys_id}^ORDERBYDESCsys_created_on"
            filters["sysparm_fields"] = itsm_connector_details.itsm_additional_config.get("ALERTS_FIELDS", "number,short_description,state,severity,opened_at,source")
            filters["sysparm_display_value"] = "true"
            filters["sysparm_exclude_reference_link"] = "true"
            filters["sysparm_limit"] = itsm_connector_details.itsm_additional_config.get("ALERTS_LIMIT", "5")

            if filters != {}:
                target_url += "?"

            for fl_nm, fl_val in filters.items():
                target_url += fl_nm + "=" + fl_val + "&"

            target_url = target_url[:-1]

            try:
                response = self._request("get", target_url, itsm_connector_details, headers = self.headers, verify = False)

                if "error" in response.json():
                    error = response.json()["error"]

                    # Application logging
                    log_event(application_logger,
                              logging.ERROR,
                              f"Related alerts listing failed on ITSM {itsm_tag} - {error.get('message', '')}",
                              module_name = module_name,
                              component_type = "itsm_connector_operations",
                              component_name = "servicenow_mcp - list_related_alerts")

                    continue

                result = response.json().get("result") or []
                output += result

            except Exception as e:
                flag = 1

                # Application logging
                log_event(application_logger,
                          logging.ERROR,
                          f"Related alerts listing failed on ITSM {itsm_tag} - {str(e)}",
                          module_name = module_name,
                          component_type = "itsm_connector_operations",
                          component_name = "servicenow_mcp - list_related_alerts")

                continue

        db_local_session.close()
        if flag == 1 and output == []:
            return (False, "Related alerts listing from ITSM failed. Please check application logs.")

        return (True, output)

if __name__ == "__main__":
    # obj = ServiceNow()
   
    # print(obj.get_cmdb_ci("Lab_instance", "bond_trade_ny"))
    # print(obj.get_parents_children("Lab_instance", "55c3578bc0a8010e0117f727897d0011", "parent"))
    # print(obj.get_service_map_details("Lab_instance", "bond_trade_ny"))
    mcp.run(transport = "http", host = "0.0.0.0", port = 6000)



