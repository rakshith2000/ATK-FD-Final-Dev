# Author - Viraj Purandare
# Created On - April 30, 2025

# Default packages
import os
import sys
import datetime
import logging

# Third party packages
from fastapi import Request, APIRouter, Depends
from fastapi.responses import JSONResponse
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

from meeting_assist_data_models import *
from meeting_assist_utils import MeetingAssistUtils

router = APIRouter()
bearer_scheme = HTTPBearer()

@router.post("/api/v1/list_meetings_by_participant_and_group/")
def list_meetings_by_participant_or_group(meeting: MeetingByPersonGroupRequestModel, request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    
    meeting_obj = MeetingAssistUtils()
    (status, meeting_data) = meeting_obj.list_meetings_by_participant_or_group(participant = meeting.email.lower(), group = meeting.groups)

    if not status:
        response["error"] = {"data": [], "message": meeting_data}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {meeting_data}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))
    
    response["output"] = {"data": meeting_data, "message": "Meetings listed successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Meetings listed successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.post("/api/v1/meetings/{meeting_id}/update_groups_by_meeting_id/")
def update_groups_by_meeting_id(meeting_id: str, payload: GroupUpdateRequestModel, request: Request, user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    
    meeting_obj = MeetingAssistUtils()
    (status, meeting_data) = meeting_obj.update_groups_by_meeting_id(payload, meeting_id)

    if not status:
        response["error"] = {"data": {}, "message": meeting_data}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {meeting_data}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))
    
    response["output"] = {"data": meeting_data, "message": "Groups updated successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Groups updated successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.post("/api/v1/onboard_meeting_details", status_code = 200)
def onboard_meeting_details(meeting: OnboardMeetingRequestModel, 
                            request: Request,
                            user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    ma_obj = MeetingAssistUtils()

    meeting_details = {}
    meeting_details["meeting"] = meeting
    meeting_details["logged_in_user"] = user_info.user_id

    (status, db_meeting) = ma_obj.insert_meeting_details(meeting_details)

    if not status:
        response["error"] = {"data": {}, "message":  db_meeting}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {db_meeting}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    response["output"] = {"data": db_meeting, "message": "Meeting onboarded successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Meeting with title {meeting.title} onboarded successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.get("/api/v1/meetings/{meeting_id}/get_public_flow_auth_details/{retrieval_type}")
def get_public_flow_auth_details(meeting_id: str,
                                 request: Request,
                                 retrieval_type: str = "reload",
                                 user_info: User = Depends(get_user_info)):
    
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    ma_obj = MeetingAssistUtils()

    (status, auth_session) = ma_obj.get_public_flow_auth_details(meeting_id, retrieval_type)
    if not status:
        response["error"] = {"data": {}, "message": auth_session}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {auth_session}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    response["output"] = {"data": auth_session, "message": f"Public flow auth session retrieved successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Public flow auth session retrieved successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.get("/api/v1/meetings/{meeting_id}/start_or_refresh/{retrieval_type}")
def start_meeting(meeting_id: str, 
                  request: Request,
                  retrieval_type: str = "reload",
                  user_info: User = Depends(get_user_info)):
    
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    ma_obj = MeetingAssistUtils()
    (status, db_meeting) = ma_obj.start_or_refresh_meeting(meeting_id, user_info.user_id, retrieval_type)

    if not status:
        response["error"] = {"data": {}, "message": db_meeting}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Error - {db_meeting}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    response["output"] = {"data": db_meeting, "message": "Meeting started successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Meeting with ID {meeting_id} started successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.get("/api/v1/meetings/{meeting_id}/transcript/{retrieval_type}")
def list_meeting_transcripts(meeting_id:str,
                             request: Request,
                             retrieval_type: str = "reload",
                             user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    ma_obj = MeetingAssistUtils()
    (status, transcripts) = ma_obj.list_meeting_transcripts_by_meeting_id(meeting_id, retrieval_type)

    if not status:
        response["error"] = {"data": [], "message": transcripts}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {transcripts}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    response["output"] = {"data": transcripts, "message": "Meeting transcripts listed successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              "Accessed - Success - Meeting transcripts listed successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.get("/api/v1/meetings/{meeting_id}/details")
async def generate_meeting_details(meeting_id:str,
                       request: Request,
                       credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                       user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}

    ma_obj = MeetingAssistUtils()
    (status, meeting_details) = await ma_obj.generate_meeting_details(meeting_id, token)

    if not status:
        response["error"] = {"data": {}, "message": meeting_details}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {meeting_details}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    response["output"] = {"data": meeting_details, "message": "Meeting details retrieved successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Meeting details retrieved for meeting with ID {meeting_id} successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.delete("/api/v1/meetings/{meeting_id}/delete")
def get_public_flow_auth_details(meeting_id: str,
                                 request: Request,
                                 user_info: User = Depends(get_user_info)):
    
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    ma_obj = MeetingAssistUtils()
    meeting_details = {"logged_in_user": user_info.user_id, "meeting_id": meeting_id}
    (status, db_meeting) = ma_obj.delete_meeting_by_meeting_id(meeting_details)
    if not status:
        response["error"] = {"data": {}, "message": db_meeting}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {db_meeting}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    response["output"] = {"data": None, "message": f"Meeting deleted successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Meeting with ID {meeting_id} deleted successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.post("/api/v1/meetings/ask")
async def chat(request: Request,
               payload: QuestionRequestModel,
               credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
               user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}

    ma_obj = MeetingAssistUtils()
    (answer, conversation_history) = await ma_obj.chat_bot(payload.meeting_ids, payload.question, payload.conversation_history, token)

    if not answer:
        response["error"] = {"data": {}, "message": f"Accessed - Execution Error - {answer}"}
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

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    response["output"] = {"data": {"response": answer, "conversation_history": conversation_history}, "message": "Response for user query generated successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              "Accessed - Success - Response for user query generated successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

# Generate new knowledge article
@router.post("/api/v1/convert_to_html/", status_code = 200)
async def convert_to_html(payload: ArticleConversionRequestModel,
                              request: Request, 
                              credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                              user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}
    try:
        ma_agent = MeetingAssistUtils()

        (status, output) = await ma_agent.convert_to_html(payload, token)
        if not status:
            response["error"] = {"data": {}, "message": f"Article conversion failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger, 
                      logging.ERROR,
                      f"Accessed - Execution Error - Article conversion failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Article conversion completed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger, 
                  logging.INFO,
                  "Article conversion completed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Article conversion failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Article conversion failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)


@router.get("/api/v1/meetings/{meeting_id}/archived_articles")
def list_archived_articles_by_meeting_id(meeting_id: str,
                                         request: Request,
                                         user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    ma_obj = MeetingAssistUtils()
    (status, articles) = ma_obj.list_archived_meeting_articles_by_meeting_id(meeting_id)

    if not status:
        response["error"] = {"data": [], "message": f"Accessed - Execution Error - {articles}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {articles}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))
    
    if articles == []:
        response["output"] = {"data": [], "message": "No archived articles found for the meeting."}
        response["code"] = 200
    else:
        response["output"] = {"data": articles, "message": f"Archived articles listed successfully."}
        response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Archived articles listed successfully for meeting with ID {meeting_id}.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))
    
@router.get("/api/v1/meetings/{meeting_link_id}/group/archived_articles")
def list_archived_articles_by_meeting_link_id(meeting_link_id: str,
                                              request: Request,
                                              user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    ma_obj = MeetingAssistUtils()
    (status, articles) = ma_obj.list_archived_meeting_articles_by_meeting_link_id(meeting_link_id)

    if not status:
        response["error"] = {"data": [], "message": articles}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - {articles}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    response["output"] = {"data": articles, "message": "Archived articles retrieved successfully for group meeting."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Archived articles retrieved successfully for group meeting {meeting_link_id}.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.get("/api/v1/meetings/{meeting_id}/archive")
def archive_meeting_articles(meeting_id: str,
                             request: Request,
                             user_info: User = Depends(get_user_info)):
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    ma_obj = MeetingAssistUtils()
    (status, articles) = ma_obj.archive_meeting_articles(meeting_id)

    if not status:
        response["error"] = {"data": None, "message": f"Accessed - Execution Error - {articles}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Meeting articles archival failed - {articles}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    response["output"] = {"data": None, "message": "Meeting articles archived successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO,
              f"Accessed - Success - Meeting articles archived successfully for meeting with ID {meeting_id}.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

@router.get(f"/api/v1/list_knowledge_base_categories/", status_code = 200)
async def list_knowledge_base_categories( request: Request, user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    
    response = {}

    ma_obj = MeetingAssistUtils()
    (status, data) = ma_obj.list_knowledge_base_categories(user_info.user_id)

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
    
    response["output"] = {"data": data, "message": "Knolwedge base categories listed successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)
    
    # Audit logging
    log_event(audit_logger,
                logging.INFO, "Accessed - Success - Knolwedge base categories listed successfully.",
                user_id = user_info.user_id,
                api = request.url.path,
                api_method = request.method,
                response_code = response["code"],
                exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = response)

@router.post(f"/api/v1/push_knowledge_article_to_itsm/", status_code = 200)
async def push_knowledge_article_to_itsm(payload: UploadKnowledgeArticlesRequestModel, request: Request, user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    
    response = {}

    ma_obj = MeetingAssistUtils()
    status, data = ma_obj.push_knowledge_article_to_itsm(payload, user_info.user_id)

    if not status:
        response["error"] = {"data": {}, "message": f"Knowledge article push to ITSM failed - {data}"}
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
    
    response["output"] = {"data": data, "message": "Knowledge article pushed to ITSM successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)
    
    # Audit logging
    log_event(audit_logger,
                logging.INFO, "Accessed - Success - Knowledge article pushed to ITSM successfully.",
                user_id = user_info.user_id,
                api = request.url.path,
                api_method = request.method,
                response_code = response["code"],
                exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = response)
