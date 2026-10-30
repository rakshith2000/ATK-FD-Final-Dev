# Author - Viraj Purandare and Vishwas K S
# Created On - May 15, 2026

# Default packages
import os
import sys
import logging
import datetime

# Third party packages
from fastapi.responses import JSONResponse
from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
MODEL_PATH = os.path.join(SCRIPT_PATH.split("routers")[0], "models")
UTIL_PATH = os.path.join(SCRIPT_PATH.split("routers")[0], "utils")
AUTH_MODEL_PATH = os.path.join(SCRIPT_PATH.split("modules")[0], "modules", "auth", "models")
AUTH_UTIL_PATH = os.path.join(SCRIPT_PATH.split("modules")[0], "modules", "auth", "utils")
ITSM_MODEL_PATH = os.path.join(SCRIPT_PATH.split("modules")[0], "modules", "itsm", "models")

sys.path.append(ROOT_PATH)
sys.path.append(MODEL_PATH)
sys.path.append(UTIL_PATH)
sys.path.append(AUTH_MODEL_PATH)
sys.path.append(AUTH_UTIL_PATH)
sys.path.append(ITSM_MODEL_PATH)

# Custom packages and Pydantic models
from pro_logger import log_event, audit_logger

from auth_data_models import User
from auth_handler import get_user_info

from itsm_assist_data_models import *
from servicenow_proxy import ServiceNow
from incident_assist_utils import IncidentAssistUtils

router = APIRouter()
bearer_scheme = HTTPBearer()

@router.get(f"/api/v1/get_user_details/", status_code = 200)
async def get_user_details(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, data) = ia_obj.get_user_details(user = user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "User details retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - User details retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"User details retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_user_assigned_incidents/", status_code = 200)
async def list_user_assigned_incidents(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, inc_details) = ia_obj.list_user_assigned_incidents(user_info.user_id)
        if not status:
            response["error"] = {"data": {}, "message": inc_details}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {inc_details}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": inc_details, "message": "User assigned incidents listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - User queue incident fetched successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"User assigned incidents listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_group_assigned_incidents/", status_code = 200)
async def list_group_assigned_incidents(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, inc_details) = ia_obj.list_group_assigned_incidents(user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": inc_details}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {inc_details}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": inc_details, "message": "Group assigned incidents listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Group assigned incidents listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Group assigned incidents listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_unassigned_group_incidents/", status_code = 200)
async def list_unassigned_group_incidents(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, inc_details) = ia_obj.list_unassigned_group_incidents(user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": inc_details}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {inc_details}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": inc_details, "message": "Unassigned group incidents listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Unassigned group incidents listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Unassigned group incidents listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_user_assigned_ptasks/", status_code = 200)
async def list_user_assigned_ptasks(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, ptask_details) = ia_obj.list_user_assigned_ptasks(user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": ptask_details}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {ptask_details}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": ptask_details, "message": "User assigned problem tasks listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - User assigned problem tasks listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"User assigned problem tasks listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_group_assigned_ptasks/", status_code = 200)
async def list_group_assigned_ptasks(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, ptask_details) = ia_obj.list_group_assigned_ptasks(user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": ptask_details}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {ptask_details}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": ptask_details, "message": "Group assigned problem tasks listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Group assigned problem tasks listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Group assigned problem tasks listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_unassigned_ptasks/", status_code = 200)
async def list_unassigned_ptasks(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, ptask_details) = ia_obj.list_unassigned_ptasks(user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": ptask_details}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {ptask_details}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": ptask_details, "message": "Unassigned problem tasks listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Unassigned problem tasks listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Unassigned problem tasks listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
    
@router.get(f"/api/v1/list_user_assigned_service_requests/", status_code = 200)
async def list_user_assigned_service_requests(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, sc_details) = ia_obj.list_user_assigned_service_requests(user_info.user_id)
        if not status:
            response["error"] = {"data": {}, "message": sc_details}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {sc_details}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": sc_details, "message": "User assigned service requests listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - User assigned service requests fetched successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"User assigned service requests listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_group_assigned_service_requests/", status_code = 200)
async def list_group_assigned_service_requests(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, sc_details) = ia_obj.list_group_assigned_service_requests(user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": sc_details}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {sc_details}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": sc_details, "message": "Group assigned service_requests listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Group assigned service_requests listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Group assigned service_requests listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_unassigned_group_service_requests/", status_code = 200)
async def list_unassigned_group_service_requests(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, sc_details) = ia_obj.list_unassigned_group_service_requests(user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": sc_details}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {sc_details}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": sc_details, "message": "Unassigned group service_requests listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Unassigned group service_requests listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Unassigned group service_requests listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)


@router.post(f"/api/v1/update_incident_details/", status_code = 200)
async def update_incident_details(payload: UpdateIncidentRequestModel, request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()

        (status, data) = ia_obj.update_ticket_details(payload, user_info.user_id)

        if data == []:
            response["error"] = {"data": {}, "message": "Incident not found"}
            response["code"] = 404

            return JSONResponse(status_code = response["code"], content = response)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Ticket updated successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Ticket updated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Ticket update failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
    
@router.post(f"/api/v1/update_service_request_details/", status_code = 200)
async def update_service_request_details(payload: UpdateSRRequestModel, request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()

        (status, data) = ia_obj.update_service_request_details(payload, user_info.user_id)

        if data == []:
            response["error"] = {"data": {}, "message": "Service request not found"}
            response["code"] = 404

            return JSONResponse(status_code = response["code"], content = response)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Service request updated successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Service request updated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Service request update failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_incident_state_choice/", status_code = 200)
async def list_incident_state_choice(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, data) = ia_obj.list_incident_state_choice()

        if not status:
            response["error"] = {"data": {}, "message": f"Incident state choices listing failed - {data}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Incident state choices listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Incident state choice fetched successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Incident state choices listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/list_related_alerts/", status_code = 200)
async def list_related_alerts(payload: ListRelatedAlertsRequestModel, request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()

        (status, data) = ia_obj.list_related_alerts(inc_sys_id = payload.inc_sys_id)

        if not status:
            response["error"] = {"data": {}, "message": f"Related alerts listing failed - {data}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Related alerts listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Related alerts fetched successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Related alerts listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_assignment_groups/", status_code = 200)
async def list_assignment_groups(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, data) = ia_obj.list_user_assignment_groups(user = user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": f"Assignment groups listing failed - {data}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Assignment groups listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Assignment groups fetched successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Assignment groups listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_all_assignment_groups/", status_code = 200)
async def list_all_assignment_groups(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, data) = ia_obj.list_all_assignment_group()

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "All assignment groups listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - All assignment groups listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"All assignment groups listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/list_group_members/", status_code = 200)
async def list_group_members(payload: ListGroupMembersRequestModel, request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, data) = ia_obj.list_group_members(assignment_group = payload.assignment_group)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Group members listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Group members listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Group members listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get(f"/api/v1/list_ptask_state_choice/", status_code = 200)
async def list_ptask_state_choice(request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, data) = ia_obj.list_ptask_state_choice()

        if not status:
            response["error"] = {"data": {}, "message": f"Problem task state choices listing failed - {data}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Problem task state choices listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Problem task state choices fetched successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Problem task state choices listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/list_incident_journal/", status_code = 200)
async def list_incident_journal(payload: ListIncidentJournalRequestModel, request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, data) = ia_obj.list_incident_journal(sys_id = payload.sys_id)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Incident journal listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Incident journal listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Incident journal listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/list_ci_related_incidents/", status_code = 200)
async def list_ci_related_incidents(payload: ListCiIncidentsRequestModel, request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, data) = ia_obj.list_ci_related_incidents(cmdb_ci_sys_id = payload.cmdb_ci_sys_id)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "CI related incidents listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - CI related incidents listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"CI related incidents listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/list_ci_related_change_requests/", status_code = 200)
async def list_ci_related_change_requests(payload: ListCiChangeRequestsRequestModel, request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (status, data) = ia_obj.list_ci_related_change_requests(cmdb_ci_sys_id = payload.cmdb_ci_sys_id)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "CI related change requests listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - CI related change requests listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"CI related change requests listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/list_relevant_articles/", status_code = 200)
async def list_relevant_articles(payload: ListRelevantArticlesRequestModel, 
                                 request: Request,
                                 credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                                 user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    token = credentials.credentials
    
    try:
        ia_obj = IncidentAssistUtils()
        data = await ia_obj.list_relevant_articles(payload, token)

        if not data:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Relevant articles listed successfully.."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - Relevant articles listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": "", "message": f"Relevant articles listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/chat", status_code = 200)
async def interactive_chat_bot(payload: ChatBotRequestModel, 
                               request: Request, 
                               credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                               user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    token = credentials.credentials

    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (answer, work_notes_and_comments, conversation_history) = await ia_obj.chatbot(payload.query, payload.conversation_history, token)

        if not answer:
            response["error"] = {"data": {}, "message": "User query response generation failed"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {answer}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": {"response": answer, "conversation_history": conversation_history, "work_notes_and_comments": work_notes_and_comments}, "message": "User query response generated successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - User query response generated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"User query response generation failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - User query response generation failed -{str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/demo_chat", status_code = 200)
async def interactive_chat_bot_demo(payload: ChatBotRequestModel, 
                               request: Request, 
                               credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                               user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    token = credentials.credentials

    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        (answer, work_notes_and_comments, conversation_history) = await ia_obj.demo_chatbot(payload.query, payload.conversation_history, token)

        if not answer:
            response["error"] = {"data": {}, "message": "User query response generation failed"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {answer}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": {"response": answer, "conversation_history": conversation_history, "work_notes_and_comments": work_notes_and_comments}, "message": "User query response generated successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - User query response generated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"User query response generation failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - User query response generation failed -{str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
    
@router.post(f"/api/v1/generate_resolution_notes", status_code = 200)
async def generate_resolution_notes(payload: ResolutionSummaryRequestModel, 
                               request: Request, 
                               credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                               user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)
    token = credentials.credentials

    response = {}
    try:
        ia_obj = IncidentAssistUtils()
        resolution_summary = await ia_obj.generate_resolution_summary(payload.conversation_history, token)

        if not resolution_summary:
            response["error"] = {"data": {}, "message": "User query response generation failed"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - {resolution_summary}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": {"response": resolution_summary, "message": "User query response generated successfully."}}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - User query response generated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"User query response generation failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - User query response generation failed -{str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
    
# Servicenow Proxy Routes
@router.get("/api/v1/get/")
async def get_record(
    request: Request,
    table_name: str,
    query_string: str = "",
    user_info: User = Depends(get_user_info)
):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        ia_obj = ServiceNow()

        code, data = ia_obj.get_query(
            table_name=table_name,
            query_string=query_string
        )

        en_ts = datetime.datetime.now(datetime.UTC)

        if code >= 400:

            log_event(
                audit_logger,
                logging.ERROR,
                f"Accessed - Execution Error - {data}",
                user_id=user_info.user_id,
                api=request.url.path,
                api_method=request.method,
                exec_duration_in_sec=(en_ts - st_ts).total_seconds()
            )

            return JSONResponse(status_code=code, content=data)

        log_event(
            audit_logger,
            logging.INFO,
            "Accessed - Success",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=code, content=data)

    except Exception as e:

        en_ts = datetime.datetime.now(datetime.UTC)

        log_event(
            audit_logger,
            logging.ERROR,
            f"Accessed - Execution Error - {str(e)}",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/api/v1/post/")
async def create_record(
    request: Request,
    table_name: str,
    payload: dict,
    user_info: User = Depends(get_user_info)
):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        ia_obj = ServiceNow()

        code, data = ia_obj.post_query(
            table_name=table_name,
            payload=payload
        )

        en_ts = datetime.datetime.now(datetime.UTC)

        if code >= 400:

            log_event(
                audit_logger,
                logging.ERROR,
                f"Accessed - Execution Error - {data}",
                user_id=user_info.user_id,
                api=request.url.path,
                api_method=request.method,
                exec_duration_in_sec=(en_ts - st_ts).total_seconds()
            )

            return JSONResponse(status_code=code, content=data)

        log_event(
            audit_logger,
            logging.INFO,
            "Accessed - Success",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=code, content=data)

    except Exception as e:

        en_ts = datetime.datetime.now(datetime.UTC)

        log_event(
            audit_logger,
            logging.ERROR,
            f"Accessed - Execution Error - {str(e)}",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=500, content={"error": str(e)})

@router.patch("/api/v1/patch/")
async def update_record(
    request: Request,
    table_name: str,
    sys_id: str,
    payload: dict,
    user_info: User = Depends(get_user_info)
):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        ia_obj = ServiceNow()

        code, data = ia_obj.patch_query(
            table_name=table_name,
            sys_id=sys_id,
            payload=payload
        )

        en_ts = datetime.datetime.now(datetime.UTC)

        if code >= 400:

            log_event(
                audit_logger,
                logging.ERROR,
                f"Accessed - Execution Error - {data}",
                user_id=user_info.user_id,
                api=request.url.path,
                api_method=request.method,
                exec_duration_in_sec=(en_ts - st_ts).total_seconds()
            )

            return JSONResponse(status_code=code, content=data)

        log_event(
            audit_logger,
            logging.INFO,
            "Accessed - Success",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=code, content=data)

    except Exception as e:

        en_ts = datetime.datetime.now(datetime.UTC)

        log_event(
            audit_logger,
            logging.ERROR,
            f"Accessed - Execution Error - {str(e)}",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=500, content={"error": str(e)})

@router.put("/api/v1/put/")
async def replace_record(
    request: Request,
    table_name: str,
    sys_id: str,
    payload: dict,
    user_info: User = Depends(get_user_info)
):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        ia_obj = ServiceNow()

        code, data = ia_obj.put_query(
            table_name=table_name,
            sys_id=sys_id,
            payload=payload
        )

        en_ts = datetime.datetime.now(datetime.UTC)

        if code >= 400:

            log_event(
                audit_logger,
                logging.ERROR,
                f"Accessed - Execution Error - {data}",
                user_id=user_info.user_id,
                api=request.url.path,
                api_method=request.method,
                exec_duration_in_sec=(en_ts - st_ts).total_seconds()
            )

            return JSONResponse(status_code=code, content=data)

        log_event(
            audit_logger,
            logging.INFO,
            "Accessed - Success",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=code, content=data)

    except Exception as e:

        en_ts = datetime.datetime.now(datetime.UTC)

        log_event(
            audit_logger,
            logging.ERROR,
            f"Accessed - Execution Error - {str(e)}",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=500, content={"error": str(e)})