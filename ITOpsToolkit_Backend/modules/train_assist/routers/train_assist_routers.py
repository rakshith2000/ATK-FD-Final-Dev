# Author - Vishwas K S and Viraj Purandare
# Created On - May 11, 2026

# Default packages
import os
import sys
import logging
import datetime

# Third party packages
from fastapi import Request, APIRouter, Depends
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

from train_assist_data_models import *
from train_assist_utils import TrainAssistUtils

router = APIRouter()
bearer_scheme = HTTPBearer()

@router.post("/api/v1/generate_mcqs/", status_code = 200)
async def generate_mcqs(payload: MCQGenerationRequestModel,
                        request: Request,
                        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                        user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}
    try:
        ta_agent = TrainAssistUtils()
        (status, output) = await ta_agent.generate_mcqs(payload.articles_number, token)
        
        if not status:
            response["error"] = {"data": [], "message": f"Quiz generation failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Quiz generation failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {
            "data": {
                "quiz_id": output[0],
                "passing_threshold": output[1]
                }, 
            "message": "Quiz generated successfully."
            }
        response["code"] = 200
                
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - Quiz generated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": [], "message": f"Quiz generation failed - {str(e)}"}
        response["code"] = 500
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Quiz generation failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response) 

@router.post("/api/v2/generate_mcqs/", status_code = 200)
async def generate_mcqs_v1(payload: MCQGenerationRequestModel_v1,
                        request: Request,
                        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                        user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}
    try:
        ta_agent = TrainAssistUtils()
        (status, output) = await ta_agent.generate_mcqs_v1(payload.articles_number, 
                                                           token,  
                                                           payload.difficulty_level)
        
        if not status:
            response["error"] = {"data": [], "message": f"Quiz generation failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Quiz generation failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {
            "data": {
                "quiz_id": output[0],
                "passing_threshold": output[1]
                }, 
            "message": "Quiz generated successfully."
            }
        response["code"] = 200
                
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - Quiz generated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": [], "message": f"Quiz generation failed - {str(e)}"}
        response["code"] = 500
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Quiz generation failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)  

@router.post("/api/v1/generate_scenarios/", status_code = 200)
async def generate_scenarios(payload: ScenarioGenerationRequestModel,
                             request: Request,
                             credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                             user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}
    try:
        ta_agent = TrainAssistUtils()
        (status, output) = await ta_agent.generate_scenarios(payload.articles_number, payload.prompt, 
                                                             token, conv_history = payload.conv_history)

        if not status:
            response["error"] = {"data": {}, "message": f"Scenario generation failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Scenario generation failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Scenario generated successfully."}
        response["code"] = 200
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Scenario generated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Scenario generation failed - {str(e)}"}
        response["code"] = 500
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Scenario generation failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/get_mcqs/", status_code = 200)
async def get_mcqs(payload: QuizRetrievalRequestModel,
                   request: Request, 
                   user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ta_obj = TrainAssistUtils()
        (status, output) = ta_obj.get_mcqs(quiz_code = payload.quiz_code, user_id = user_info.user_id, type_of_submit = payload.type_of_submit)

        if not status:
            response["error"] = {"data": [], "message": f"Quiz details retrieval failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Quiz details retrieval failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)
        
        response["output"] = {"data": output, "message": "Quiz details fetched successfully."}
        response["code"] = 200
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Quiz details fetched successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
       
    except Exception as e:
        response["error"] = {"data": [], "message": f"Quiz details retrieval failed - {str(e)}"}
        response["code"] = 500
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Quiz details retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/submit_quiz/", status_code = 200)
async def submit_quiz(payload: QuizSubmissionRequestModel, 
                      request: Request,
                      credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                      user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}
    try:
        ta_obj = TrainAssistUtils()
        (status, output) = await ta_obj.submit_quiz(quiz_code = payload.quiz_code, 
                                                    user_id = user_info.user_id, 
                                                    type_of_submit = payload.type_of_submit,
                                                    token = token,
                                                    questions = payload.questions)

        if not status:
            response["error"] = {"data": {}, "message": f"Quiz submission failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Quiz submission failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {
            "data": {
                "score": output[0], 
                "remarks": output[1]
                }, 
            "message": "Quiz submitted successfully."
            }
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Quiz submitted successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())
        
        return JSONResponse(status_code = response["code"], content = response)
       
    except Exception as e:
        response["error"] = {"data": {}, "message": f"Quiz submission failed - {str(e)}"}
        response["code"] = 500
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Quiz submission failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v2/submit_quiz/", status_code = 200)
async def submit_quiz_v2(payload: QuizSubmissionRequestModel, 
                      request: Request,
                      credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
                      user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    token = credentials.credentials

    response = {}
    try:
        ta_obj = TrainAssistUtils()
        (status, output) = await ta_obj.submit_quiz_v2(quiz_code = payload.quiz_code, 
                                                    user_id = user_info.user_id, 
                                                    type_of_submit = payload.type_of_submit,
                                                    token = token,
                                                    questions = payload.questions)

        if not status:
            response["error"] = {"data": {}, "message": f"Quiz submission failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Quiz submission failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {
            "data": {
                "score": output[0], 
                "remarks": output[1]
                }, 
            "message": "Quiz submitted successfully."
            }
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Quiz submitted successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())
        
        return JSONResponse(status_code = response["code"], content = response)
       
    except Exception as e:
        response["error"] = {"data": {}, "message": f"Quiz submission failed - {str(e)}"}
        response["code"] = 500
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Quiz submission failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get("/api/v1/list_pending_quizzes/", status_code = 200)
async def list_pending_quizzes(request: Request, 
                              user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ta_obj = TrainAssistUtils()
        (status, output) = ta_obj.list_pending_quizzes(user_id = user_info.user_id)

        if not status:
            response["error"] = {"data": [], "message": f"Pending quizzes listing failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Pending quizzes listing failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Pending quizzes listed successfully."}
        response["code"] = 200
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - Pending quizzes listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
       
    except Exception as e:
        response["error"] = {"data": [], "message": f"Pending quizzes listing failed - {str(e)}"}
        response["code"] = 500
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Pending quizzes listing failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
        
@router.get("/api/v1/list_completed_quizzes/", status_code = 200)
async def list_completed_quizzes(request: Request, 
                                 user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ta_obj = TrainAssistUtils()
        (status, output) = ta_obj.list_completed_quizzes(user_id = user_info.user_id)

        if not status:
            response["error"] = {"data": [], "message": f"Completed quizzes listing failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Completed quizzes listing failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Completed quizzes listed successfully."}
        response["code"] = 200
        
        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - Completed quizzes listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
       
    except Exception as e:
        response["error"] = {"data": [], "message": str(e)}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)
        
        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Completed quizzes listing failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
                
@router.get("/api/v1/list_all_quizzes_for_user/", status_code = 200)
async def list_all_quizzes_for_user(request: Request, 
                                    user_info: User = Depends(get_user_info)) -> dict:

    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ta_obj = TrainAssistUtils()
        (status, output) = ta_obj.list_all_quizzes(user_id = user_info.user_id)

        if not status:
            response["error"] = {"data": [], "message": f"Quizzes listing for user failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Quizzes listing for user {user_info.user_id} failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "All quizzes for user listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, f"Accessed - Success - All quizzes listed for user {user_info.user_id} successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": [], "message": f"Accessed - Execution Error - Quizzes listing for user failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Quizzes listing for user {user_info.user_id} failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get("/api/v1/list_all_quizzes/", status_code = 200)
async def list_all_quizzes(request: Request, 
                           user_info: User = Depends(get_user_info)) -> dict:

    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ta_obj = TrainAssistUtils()
        (status, output) = ta_obj.list_all_quizzes()

        if not status:
            response["error"] = {"data": [], "message": f"Quizzes listing failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Quizzes listing failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "All quizzes listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - All quizzes listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": [], "message": f"Accessed - Execution Error - Quizzes listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Quizzes listing failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
    
@router.post("/api/v1/list_questions_with_incorrect_responses/", status_code = 200)
async def list_questions_with_incorrect_responses(payload: IncorrectQuizResponseRequestModel,
                                                  request: Request,
                                                  user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    try:
        ta_obj = TrainAssistUtils()
        (status, output) = ta_obj.list_questions_with_incorrect_responses(quiz_code = payload.quiz_code, user_id = user_info.user_id)

        if not status:
            response["error"] = {"data": [], "message": f"Questions with incorrect responses listing failed - {output}"}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, f"Accessed - Execution Error - Questions with incorrect responses listing failed - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())

            return JSONResponse(status_code = response["code"], content = response)

        response["output"] = {"data": output, "message": "Questions with incorrect responses listed successfully."}
        response["code"] = 200
        
        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - Questions with incorrect responses listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
    
    except Exception as e:
        response["error"] = {"data": [], "message": f"Questions with incorrect responses listing failed - {str(e)}"}
        response["code"] = 500
        
        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Questions with incorrect responses listing failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)
