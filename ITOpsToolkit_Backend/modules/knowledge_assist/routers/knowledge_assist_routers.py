# Author - Viraj Purandare
# Created On - October 1, 2025

# Default packages
import os
import sys
import logging
import datetime

# Third party packages
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi import Request, APIRouter, Depends
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
from auth_data_models import *
from auth_handler import get_user_info

from knowledge_assist_data_models import * 
from knowledge_assist_utils import KnowledgeAssistUtils

from pro_logger import log_event, audit_logger

router = APIRouter()
bearer_scheme = HTTPBearer()

# Merge knowledge articles
@router.post("/api/v1/merge_kb_articles/", status_code = 200)
async def merge_kb_articles(payload: ArticleMergerRequestModel,
                            request: Request, 
                            credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                            user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}
    try:
        ka_agent = KnowledgeAssistUtils()
         
        (status, output_dict) = await ka_agent.merge_kb_articles(payload.kb_article_1, payload.kb_article_2, token)
        # (status, output_dict) = await ka_agent.merge_kb_articles(kb_article_1, kb_article_2, token)
        if not status:
            response["error"] = {"data": {}, "message": f"Article merger failed - {output_dict}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger, 
                      logging.ERROR, 
                      f"Accessed - Execution Error - Article merger failed - {output_dict}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output_dict, "message": "Article merger completed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger, 
                  logging.INFO,
                  "Accessed - Success - Article merger completed",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Article merger failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Error - Article merger failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# Refine knowledge article
@router.post("/api/v1/refine_kb_article/", status_code = 200)
async def refine_kb_article(payload: ArticleRefinementRequestModel,
                            request: Request, 
                            credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                            user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}
    try:
        ka_agent = KnowledgeAssistUtils()

        (status, output) = await ka_agent.refine_kb_article(payload.kb_article, token)
        if not status:
            response["error"] = {"data": {}, "message": f"Article refinement failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger, 
                      logging.ERROR,
                      f"Accessed - Execution Error - Article refinement failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Article refinement completed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger, 
                  logging.INFO, 
                  "Accessed - Success - Article refinement completed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Article refinement failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Error - Article refinement failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# Generate new knowledge article
@router.post("/api/v1/generate_kb_article/", status_code = 200)
async def generate_kb_article(payload: ArticleGenerationRequestModel,
                              request: Request, 
                              credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                              user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    json_payload = payload.model_dump()
    token = credentials.credentials

    response = {}
    try:
        ka_agent = KnowledgeAssistUtils()

        (status, output) = await ka_agent.generate_kb_article(json_payload, token)
        if not status:
            response["error"] = {"data": {}, "message": f"Article generation failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger, 
                      logging.ERROR,
                      f"Accessed - Execution Error - Article generation failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Article generation completed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger, 
                  logging.INFO,
                  "Article generation completed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Article generation failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Article generation failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# List published knowledge articles from ITSM
@router.get("/api/v1/list_knowledge_articles_from_itsm/", status_code = 200)
async def list_knowledge_articles_from_itsm(request: Request,
                                            user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ka_obj = KnowledgeAssistUtils()
        (status, rows) = ka_obj.list_knowledge_articles_from_itsm(user_info)

        if not status:
            response["error"] = {"data": [], "message": f"Knowledge articles listing failed - {rows}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - Knowledge articles listing failed - {rows}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        response["output"] = {"data": rows, "message": "Knowledge articles listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, 
                  "Accessed - Success - Knowledge articles listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": [], "message": f"Knowledge articles listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Knowledge articles listing failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# Find duplicate articles
@router.get("/api/v1/find_duplicate_knowledge_articles/", status_code = 200)
async def find_duplicate_articles(request: Request,
                                  user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ka_obj = KnowledgeAssistUtils()
        (status, rows) = ka_obj.find_duplicate_articles(user_info)

        if not status:
            response["error"] = {"data": [], "message": f"Duplicate knowledge articles retrieval failed - {rows}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - Duplicate knowledge articles retrieval failed - {rows}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        response["output"] = {"data": rows, "message": "Duplicate knowledge articles retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, 
                  "Accessed - Success - Duplicate knowledge articles retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": [], "message": f"Duplicate knowledge articles retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Duplicate knowledge articles retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# Filter incidents from ITSM and compare with Vector DB to find incidents without knowledge
@router.get("/api/v1/list_incs_without_kbs/", status_code = 200)
async def list_incs_without_kbs(request: Request,
                                user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ka_obj = KnowledgeAssistUtils()
        (status, rows) = ka_obj.filter_incs_without_kbs(user_info)

        if not status:
            response["error"] = {"data": [], "message": f"Incidents without knowledge articles retrieval failed - {rows}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR,
                      f"Accessed - Execution Error - Incidents without knowledge articles retrieval failed - {rows}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": rows, "message": "Incidents without knowledge articles retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, 
                  "Accessed - Success - Incidents without knowledge articles retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": [], "message": f"Incidents without knowledge articles retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Incidents without knowledge articles retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# Knowledge article draft creation in ITSM
@router.post(f"/api/v1/push_knowledge_article_to_itsm/", status_code = 200)
async def push_knowledge_article_to_itsm(payload: UploadKnowledgeArticlesRequestModel, 
                                         request: Request, 
                                         user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    ka_obj = KnowledgeAssistUtils()
    (status, data) = ka_obj.push_knowledge_article_to_itsm(payload, user_info)

    if not status:
        response["error"] = {"data": {}, "message": f"Knowledge article push to ITSM failed - {data}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Error - Knowledge article push to ITSM failed - {data}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    response["output"] = {"data": data, "message": "Knowledge Article pushed to ITSM successfully."}
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

# Knowledge base category retrieval
@router.get(f"/api/v1/list_knowledge_base_categories_from_itsm/", status_code = 200)
async def list_knowledge_base_categories_from_itsm(request: Request, 
                                                   user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    ka_obj = KnowledgeAssistUtils()
    (status, data) = ka_obj.list_knowledge_base_categories_from_itsm(user_info)

    if not status:
        response["error"] = {"data": {}, "message": f"Knowledge base categories listing failed - {data}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Error - Knowledge base categories listing failed - {data}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    response["output"] = {"data": data, "message": "Knowledge base categories listed successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO, 
              "Accessed - Success - Knowledge base categories listed successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = response)

# Last x knowledge articles pushed to ITSM
@router.get(f"/api/v1/list_recent_knowledge_articles_from_itsm/", status_code = 200)
async def list_recent_knowledge_articles_from_itsm(request: Request, user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    ka_obj = KnowledgeAssistUtils()
    (status, data) = ka_obj.list_recent_knowledge_articles_from_itsm(user_info)

    if not status:
        response["error"] = {"data": {}, "message": f"Recent knowledge articles listing from ITSM failed - {data}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Error - Recent knowledge articles listing from ITSM failed - {data}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    response["output"] = {"data": data, "message": "Recent knowledge articles listed successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO, "Accessed - Success - Recent knowledge articles listed successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())

    return JSONResponse(status_code = response["code"], content = response)

# Knowledge article draft update in ITSM
@router.post(f"/api/v1/update_knowledge_article_in_itsm/", status_code = 200)
async def update_knowledge_article_in_itsm(payload: UpdateKnowledgeArticleRequestModel, 
                                           request: Request, 
                                           user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    ka_obj = KnowledgeAssistUtils()
    (status, data) = ka_obj.update_knowledge_article_in_itsm(payload, user_info)

    if not status:
        response["error"] = {"data": {}, "message": f"Knowledge article update in ITSM failed - {data}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Error - Knowledge article update in ITSM failed - {data}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    response["output"] = {"data": data, "message": "Knowledge article updated to ITSM successfully."}
    response["code"] = 200

    en_ts = datetime.datetime.now(datetime.UTC)

    # Audit logging
    log_event(audit_logger,
              logging.INFO, 
              "Accessed - Success - Knowledge article updated to ITSM successfully.",
              user_id = user_info.user_id,
              api = request.url.path,
              api_method = request.method,
              response_code = response["code"],
              exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

    return JSONResponse(status_code = response["code"], content = response)

# Score knowledge article
@router.post("/api/v1/score_kb_article/", status_code = 200)
async def score_kb_article(payload: ScoreArticleRequestModel,
                              request: Request, 
                              credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                              user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    token = credentials.credentials
    response = {}
    try:
        ka_agent = KnowledgeAssistUtils()

        (status, output) = await ka_agent.score_knowledge_article(payload.kb_article_content, token)
        if not status:
            response["error"] = {"data": {}, "message": f"Article scoring failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger, 
                      logging.ERROR,
                      f"Accessed - Execution Error - Article scoring failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Article scoring completed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger, 
                  logging.INFO,
                  "Article scoring completed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Article scoring failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Article scoring failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/fetch_kb_article_scores/", status_code = 200)
async def fetch_knowledge_article_scores(payload: GetArticleScoreRequestModel,
                               request: Request, 
                               credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
                               user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ka_agent = KnowledgeAssistUtils()

        (status, output) = ka_agent.fetch_knowledge_article_scores(payload.kb_article_number)
        if not status:
            response["error"] = {"data": {}, "message": f"Article score retrieval failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger, 
                      logging.ERROR,
                      f"Accessed - Execution Error - Article score retrieval failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Article score retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger, 
                  logging.INFO,
                  "Article score retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = jsonable_encoder(response))

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Article score retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - Article score retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
