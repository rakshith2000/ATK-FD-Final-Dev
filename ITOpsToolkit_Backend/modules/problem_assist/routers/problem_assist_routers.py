# Author - Viraj Purandare
# Created On - October 1, 2025

import os
import sys
import json
import datetime
import logging
import traceback

# Third party packages
from fastapi import Request, APIRouter, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.encoders import jsonable_encoder

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
MODEL_PATH = os.path.join(SCRIPT_PATH.split("routers")[0], "models")
UTILS_PATH = os.path.join(SCRIPT_PATH.split("routers")[0], "utils")
AUTH_MODEL_PATH = os.path.join(SCRIPT_PATH.split("modules")[0], "modules", "auth", "models")
AUTH_UTIL_PATH = os.path.join(SCRIPT_PATH.split("modules")[0], "modules", "auth", "utils")

sys.path.append(ROOT_PATH)
sys.path.append(MODEL_PATH)
sys.path.append(UTILS_PATH)
sys.path.append(AUTH_MODEL_PATH)
sys.path.append(AUTH_UTIL_PATH)

# Custom package and Pydantic models
from pro_logger import log_event, audit_logger

from auth_data_models import *
from auth_handler import get_user_info

from problem_assist_data_models import *
from problem_assist_utils import ProblemAssistUtils
from problem_rca import RCAGenerator

router = APIRouter()
bearer_scheme = HTTPBearer()


@router.post(f"/api/v1/problem_ticket_details/", status_code = 200)
async def fetch_problem_ticket_details(payload: ProblemAssistModel, 
                                       request: Request, 
                                       user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        pa_obj = ProblemAssistUtils()
        status, data = pa_obj.fetch_problem_ticket_details(payload.status)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Execution Error - Failed to fetch Problem Ticket details  - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)
            

        response['output'] = {"data": data, "message": 'Problem Ticket details fetched successfully.'}
        response['code'] = 200

        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Problem Ticket details fetched successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())
      
        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))
    
    except Exception as e:
        response['error'] = {"data": {}, "message": str(e)}
        response['code'] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Failed to fetch Problem Ticket details - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/update_problem_ticket_details/", status_code = 200)
async def update_problem_ticket_details(payload: ProblemDetailsUpdateModel,
                                        request: Request,
                                        user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    
    response = {}
    try:
        pa_obj = ProblemAssistUtils()
        (status, data) = pa_obj.update_problem_ticket_details(payload)
        
        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - Failed to update Problem Ticket details - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Problem ticket details updated successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - Problem ticket updated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
    
    except Exception as e:
        response["error"] = {"data": {}, "message": f"Problem ticket update failure - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Failure - Problem ticket update failure - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
    
@router.post(f"/api/v1/push_problem_ticket_to_itsm/", status_code = 200)
async def push_problem_ticket_to_itsm(payload: UploadProblemTicketRequestModel,
                                      request: Request,
                                      user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        pa_obj = ProblemAssistUtils()
        (status, data) = pa_obj.push_problem_ticket_in_itsm(payload)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - Failed to push Problem Ticket to ITSM - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Problem ticket pushed to ITSM successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, 
                  "Problem ticket pushed to ITSM successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Problem ticket push to ITSM failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Failure - Problem ticket push to ITSM failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/list_problem_ticket_details_from_itsm/", status_code = 200)
async def list_problem_ticket_details_from_itsm(payload: ListProblemTicketRequestModel,
                                                 request: Request,
                                                 user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        pa_obj = ProblemAssistUtils()
        (status, data) = pa_obj.list_problem_ticket_details_from_itsm(payload)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Execution Error - Failed to fetch Problem Ticket details from ITSM - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Problem ticket details fetched from ITSM successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, 
                  "Problem ticket details fetched from ITSM successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Problem ticket details fetch from ITSM failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Failure - Problem ticket details fetch from ITSM failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
    
@router.post(f"/api/v1/update_problem_ticket_in_itsm/", status_code = 200)
async def update_problem_ticket_in_itsm(payload: UpdateProblemTicketRequestModel,
                                        request: Request,
                                        user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}
    try:
        pa_obj = ProblemAssistUtils()
        (status, data) = pa_obj.update_problem_ticket_in_itsm(payload)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - Failed to update Problem Ticket in ITSM - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "Problem ticket updated in ITSM successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Problem ticket updated in ITSM successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Problem ticket update in ITSM failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Failure - Problem ticket update in ITSM failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/create_rca_document/", status_code = 200)
async def create_rca_document(payload: ProblemRCARequestModel,
                              request: Request,
                              user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    
    response = {}
    
    try:
        rca_obj = RCAGenerator()
        (status, data) = await rca_obj.main(payload.problem_number, user_info.user_id)

        if not status:
            response["error"] = {"data": {}, "message": data}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Execution Error - Failed to generate RCA document - {data}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": data, "message": "RCA document generated successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  "RCA document generated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"RCA document generation failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Failure - RCA document generation failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
