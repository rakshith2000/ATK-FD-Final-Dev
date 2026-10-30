# Author - Viraj Purandare
# Created On - October 1, 2025

# Default packages
import os
import sys
import logging
import datetime

import json
import traceback

# Third party packages
from fastapi import Request, APIRouter, Depends
from fastapi.responses import JSONResponse, StreamingResponse
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
import change_assist_agent_stream

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
        query = "Consider following details for raising a change request - \n\n"
        for title, value in json_payload.items():
            if value.strip() not in ["", None]:
                query += title + " - " + value + "\n"

                if title == "uploaded_files":
                    query += "Analyze images from uploaded_files.\n"
                elif title == "config_items":
                    query += "Use config_items for architecture topology insights.\n"
        query = query.strip()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, f"Accessed - Success",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = 200,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return StreamingResponse(change_assist_agent_stream.run(query, token), media_type = "text/plain")

    except Exception as e:
        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = 500,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return StreamingResponse("Ran into some error - " + str(e),  media_type = "text/plain")
