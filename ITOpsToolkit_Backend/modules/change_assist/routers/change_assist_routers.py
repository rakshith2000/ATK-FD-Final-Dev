# Author - Viraj Purandare
# Created On - October 1, 2025

# Default packages
import os
import sys
import logging
import datetime
from typing import Optional

# Third party packages
from fastapi import Request, APIRouter, File, UploadFile, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
MODEL_PATH = os.path.join(SCRIPT_PATH.split("routers")[0], "models")
AGENT_PATH = os.path.join(SCRIPT_PATH.split("routers")[0], "utils")
AUTH_MODEL_PATH = os.path.join(SCRIPT_PATH.split("modules")[0], "modules", "auth", "models")
AUTH_UTIL_PATH = os.path.join(SCRIPT_PATH.split("modules")[0], "modules", "auth", "utils")

sys.path.append(ROOT_PATH)
sys.path.append(MODEL_PATH)
sys.path.append(AGENT_PATH)
sys.path.append(AUTH_MODEL_PATH)
sys.path.append(AUTH_UTIL_PATH)

# Custom package and Pydantic models
from pro_logger import log_event, audit_logger

from auth_data_models import *
from auth_handler import get_user_info

from change_assist_data_models import *
from change_assist_utils import ChangeAssistUtils

router = APIRouter()
bearer_scheme = HTTPBearer()

@router.post("/api/v1/draft_change/", status_code = 200)
async def draft_change(payload: ChangePromptRequestModel,
                       request: Request, 
                       credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                       user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    json_payload = payload.model_dump()
    token = credentials.credentials

    response = {}

    try:
        # Structured data received from user over API through JSON payload.
        # Converting the expecations from user to standard user prompt.
        # This ensures triggering of definite set of agents.
        ca_agent = ChangeAssistUtils()

        (status, output) = await ca_agent.draft_change(json_payload, token)

        if not status:
            response["error"] = {"data": {}, "message": f"Change content generation failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger, 
                      logging.ERROR, f"Accessed - Execution Error - Change content generation failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Change content generation completed."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger, 
                  logging.INFO,
                  "Accessed - Success - Change content generation completed",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Change content generation failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Change content generation failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/upload_image/", status_code = 200)
async def upload_image(request: Request,
                       file: Optional[UploadFile] = File(default = None), 
                       user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    ca_agent = ChangeAssistUtils()

    (status, data) = ca_agent.upload_image(file)

    if not status:
        log_severity = logging.ERROR
        log_str = f"Accessed - Execution Error - {data.get('message')}"
        response = {"error": data, "code": data.get("code")}
    else:
        log_severity = logging.INFO
        log_str = f"Accessed - Success - {data.get('message')}"
        response = {"output": data, "code": data.get("code")}

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              log_severity,
              log_str,
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = data.get("code"),
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/push_change_request_to_itsm/", status_code = 200)
async def push_change_request_to_itsm(itsm_payload: ChangeRequestCreationITSMModel,
                                      request: Request, 
                                      user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    ca_agent = ChangeAssistUtils()

    (status, output) = ca_agent.push_change_request_to_itsm(itsm_payload)
    if not status:
        response["error"] = {"data": {}, "message": f"Change request push to ITSM failed - {output}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Error - Change request push to ITSM failed - {output}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())
        
        return JSONResponse(status_code = response["code"], content = response)

    response["output"] = {"data": output, "message": f"Change request pushed to ITSM successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO, "Accessed - Success - Change request created successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = response)