# Author - Vishwas K S, Ragavan Veerarajan & Viraj Purandare
# Created On - July 3, 2026

# Default packages
import os
import sys
import logging
import datetime
from typing import Optional

# Third party packages
from fastapi import Request, APIRouter, Depends, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.encoders import jsonable_encoder
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

from mim_assist_data_models import *
from mim_assist_utils import MIMAssistUtils

router = APIRouter()
bearer_scheme = HTTPBearer()

@router.post("/api/v1/schedule_meeting/", status_code = 200)
async def schedule_meeting(payload: ScheduleMeetingRequestModel,
                           request: Request, 
                           credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                           user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}

    try:
        mim_object = MIMAssistUtils()
        (status, output) =  await mim_object.schedule_meeting(payload.incident_number, token)

        if not status:
            response["error"] = {"data": {}, "message": f"Meeting Scheduling failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger, 
                      logging.ERROR, f"Accessed - Execution Error - Meeting Scheduling failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Meeting scheduled successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger, 
                  logging.INFO,
                  "Accessed - Success - Meeting scheduled successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Meeting Scheduling failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Meeting Scheduling failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    
@router.post("/api/v1/get_mim_details/", status_code = 200)
async def get_mim_details(payload: GetMIMDetailsRequestModel,
                           request: Request, 
                           credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                           user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}

    try:
        mim_object = MIMAssistUtils()
        (status, output) =  await mim_object.get_mim_details(payload.incident_number, token)

        if not status:
            response["error"] = {"data": {}, "message": f"Failed to retrieve MIM details - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger, 
                      logging.ERROR, f"Accessed - Execution Error - Failed to retrieve MIM details - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "MIM details retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger, 
                  logging.INFO,
                  "Accessed - Success - MIM details retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Failed to retrieve MIM details - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Failed to retrieve MIM details - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)


@router.post("/api/v1/upload_shift_roaster/", status_code = 200)
async def upload_shift_roaster(request: Request,
                             file: UploadFile = File(...),
                             credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                             user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try:
        file_bytes = await file.read()

        mim_object = MIMAssistUtils()
        (status, output) = mim_object.upload_shift_roaster(file.filename, file_bytes)

        if not status:
            response["error"] = {"data": {}, "message": f"roaster file upload failed - {output}"}
            response["code"] = 400

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - roaster file upload failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": {"file_name": file.filename}, "message": "roaster file uploaded successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "Accessed - Success - roaster file uploaded successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Config file upload failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Config file upload failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)


@router.get("/api/v1/download_roaster_file/", status_code = 200)
async def download_roaster_file(request: Request,
                               file_type: ConfigFileType,
                               credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                               user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try:
        mim_object = MIMAssistUtils()
        (status, output) = mim_object.download_roaster_file(file_type.value)

        if not status:
            response["error"] = {"data": {}, "message": f"roaster file download failed - {output}"}
            response["code"] = 404

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - roaster file download failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        (file_path, file_name) = output

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Accessed - Success - roaster file '{file_type.value}' downloaded successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = 200,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return FileResponse(
            path = file_path,
            filename = file_name,
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Config file download failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - roaster file download failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)