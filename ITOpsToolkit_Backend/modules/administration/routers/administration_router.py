# Author - Viraj Purandare
# Created On - October 1, 2025

# Default packages
import os
import re
import sys
import logging
import datetime

# Third party packages
import yaml

from fastapi import Request, APIRouter, Form, Depends, UploadFile, File
from fastapi.responses import JSONResponse

from typing import Annotated

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
MODEL_PATH = os.path.join(SCRIPT_PATH.split("routers")[0], "models")
AUTH_MODEL_PATH = os.path.join(SCRIPT_PATH.split("modules")[0], "modules", "auth", "models")
AUTH_UTIL_PATH = os.path.join(SCRIPT_PATH.split("modules")[0], "modules", "auth", "utils")

sys.path.append(ROOT_PATH)
sys.path.append(MODEL_PATH)
sys.path.append(AUTH_MODEL_PATH)
sys.path.append(AUTH_UTIL_PATH)

# Custom package and Pydantic models
from pro_logger import log_event, audit_logger

from auth_data_models import *
from auth_handler import get_user_info

from administration_data_models import *

from llm import LLM
from llm_proxy import LLMProxy

from vault import Vault
from sso import SSOClient
from snow_forms import Forms
from connectors.itsm_connector import ITSMConnector

from module_config import ModuleConfig

router = APIRouter()

# LLM administration
@router.post("/api/v1/onboard_llm/", status_code = 200)
async def onboard_llm(payload: LLMModel,
                      request: Request,
                      user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    response = {}

    try:
        llm_obj = LLM()
        json_payload["llm_type"] = json_payload["llm_type"].name
        json_payload["logged_in_user"] = user_info.user_id
        (status, output) = llm_obj.insert_llm_details(json_payload)

        if status:
            response["output"] = {"data": output, "message": "LLM onboarded successfully."}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = "Accessed - Success - LLM onboarded successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"LLM onboarding failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - LLM onboarding failed- {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get("/api/v1/list_llms/", status_code = 200)
async def list_llms(request: Request,
                    user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    output = []

    try:
        llm_obj = LLM()
        (status, llm_list) = llm_obj.list_llms()

        if not status:
            response["error"] = {"data": [], "message": llm_list}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - {llm_list}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

            return JSONResponse(status_code = response["code"], content = response)         

        if not llm_list:
            llm_list = []

        for llm in llm_list:
            output.append(
                    {
                        "llm_tag": llm[0],
                        "llm_type": llm[1].value,
                        "updated_by": llm[2]
                        }
                    )

        response["output"] = {"data": output, "message": "LLMs listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, 
                  "Accessed - Success - LLMs listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": [], "message": f"LLM listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, 
                  f"Accessed - Execution Error - LLM listing failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/get_llm_config/", status_code = 200)
async def get_llm_config(payload: LLMDetailsRequestModel,
                         request: Request,
                         user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try:
        llm_obj = LLM()
        (status, output) = llm_obj.get_llm_details(payload.llm_tag)

        if not status:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

            return JSONResponse(status_code = response["code"], content = response) 

        if not output:
            output = {}
        else:
            output = output.llm_config

        response["output"] = {"data": output, "message": "LLM configuration details retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - LLM configuration details retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"LLM configuration details retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - LLM configuration details retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get("/api/v1/get_llm_config/all", status_code = 200)
async def get_all_llm_config(request: Request,
                             user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try:
        llm_obj = LLM()
        (status, output) = llm_obj.get_all_llm_details()

        if not status:
            response["error"] = {"data": [], "message": output}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

            return JSONResponse(status_code = response["code"], content = response) 

        if not output:
            output = []

        response["output"] = {"data": output, "message": "LLM bulk details retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, 
                  "Accessed - Success - LLM bulk details retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"LLM bulk detailed retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR,
                  f"Accessed - Execution Error - LLM bulk detailed retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/delete_llm/", status_code = 200)
async def delete_llm(payload: LLMDeleteRequestModel,
                     request: Request,
                     user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    response = {}

    try:
        llm_obj = LLM()
        json_payload["logged_in_user"] = user_info.user_id

        (status, output) = llm_obj.delete_llm(json_payload)

        if status:
            response["output"] = {"data": output, "message": output}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = "Accessed - Success - LLM deleted successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"LLM deletion failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - LLM deletion failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# LLM proxy administration
@router.post("/api/v1/onboard_litellm_proxy/", status_code = 200)
async def onboard_litellm_proxy(payload: LLMProxyModel,
                                request: Request,
                                user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    response = {}

    try:
        llm_proxy_obj = LLMProxy()
        json_payload["logged_in_user"] = user_info.user_id
        (status, output) = llm_proxy_obj.insert_litellm_proxy_details(json_payload)

        if status:
            response["output"] = {"data": output, "message": "LiteLLM proxy onboarded successfully."}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = "Accessed - Success - LiteLLM proxy onboarded successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"LiteLLM proxy onboarding failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - LiteLLM proxy onboarding failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get("/api/v1/get_litellm_proxy_config/", status_code = 200)
async def get_litellm_proxy_config(request: Request,
                                   user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try:
        llm_proxy_obj = LLMProxy()
        (status, output) = llm_proxy_obj.get_litellm_proxy_details()

        if not status:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

            return JSONResponse(status_code = response["code"], content = response) 

        if not output:
            output = {}
        else:
            output = output.__dict__
            del output["id"]
            del output["_sa_instance_state"]
            del output["updated_by"]
            del output["updated_at"]

        response["output"] = {"data": output, "message": "LLM proxy configurations retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - LLM proxy configurations retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"LLM proxy configurations retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - LLM proxy configurations retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/delete_litellm_proxy/", status_code = 200)
async def delete_litellm_proxy(request: Request,
                               user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    json_payload = {}

    try:
        json_payload["logged_in_user"] = user_info.user_id

        llm_proxy_obj = LLMProxy()
        (status, output) = llm_proxy_obj.delete_litellm_proxy(json_payload)

        if status:
            response["output"] = {"data": output, "message": output}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = "Accessed - Success - LiteLLM proxy deleted successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Accessed - Execution Error - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# Upload environment file for vault
# UploadFile cannot be the part of Pydantic Model. Hence, this functionality doesn't define model in admonistration_models.py
@router.post("/api/v1/upload_vault_config", status_code = 200)
async def upload_vault_config(vault_env_file: Annotated[UploadFile, File(description = "Vault environment file")],
                              vault_type: VaultType,
                              request: Request,
                              user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try: 
        vault_obj = Vault(vault_type.value)
        (status, output) = vault_obj.upload_vault_config(vault_env_file)

        if status:
            response["code"] = 200
            response["output"] = {"data": output, "message": "Vault configuration uploaded successfully."}
        else:
            response["code"] = 500
            response["error"] = {"data": {}, "message": output}

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = "Accessed - Success - Vault configuration uploaded successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": str(e)}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# Prompt library administration
@router.post("/api/v1/get_toolkit_package_config/", status_code = 200)
async def get_toolkit_package_config(payload: ToolkitPackageRequestModel,
                                     request: Request,
                                     user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try:
        pconf_path = os.path.join(ROOT_PATH, "modules", payload.package_name, "config", "system_prompts.yaml")
        with open(pconf_path, "r") as pconf:
            package_config = yaml.safe_load(pconf.read())

            response["output"] = {"data": package_config, "message": ""} 
            response["code"] = 200
            
        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, f"Accessed - Success - Toolkit package retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Toolkit package retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Toolkit package retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/update_toolkit_package_global_config", status_code = 200)
async def update_toolkit_package_global_config(payload: ToolkitPackageGlobalConfigModel,
                                               request: Request,
                                               user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    def str_presenter(dumper, data):
        if "\n" in data:
            return dumper.represent_scalar("tag:yaml.org,2002:str", data, style = "|")
        return dumper.represent_scalar("tag:yaml.org,2002:str", data)

    yaml.add_representer(str, str_presenter)

    response = {}

    try:
        pconf_path = os.path.join(ROOT_PATH, "modules", json_payload["package_name"], "config", "system_prompts.yaml")
        with open(pconf_path, "r", encoding = "utf-8", errors = 'ignore') as pconf:
            unpolished_yaml_data = pconf.read()

        # Removal of invisible ASCII or gibberish characters and trailing spaces per line
        cleaned_content = re.sub(r"[^\x20-\x7E\n\r\t]", "", unpolished_yaml_data)
        cleaned_content = re.sub(r"(?m)\s+$", "", cleaned_content)
        data = yaml.safe_load(cleaned_content)

        if "package_configs" not in data:
            data["package_configs"] = {}
        
        for item, value in json_payload.items():
            if item == "llm_guards":
                llm_guards = [entity.value for entity in value]
                if llm_guards != []:
                    data["package_configs"][item] = llm_guards
            else:
                if value and ((type(value) == str and value.strip() != "") or (type(value) == list and value != [])):
                    data["package_configs"][item] = value
        
        with open(pconf_path, "w+") as pconf:
            yaml.dump(data, pconf, sort_keys = False)

        response["output"] = {"data": data["package_configs"], "message": "Global configurations updated successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - Global configurations updated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Global configurations retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Global configurations retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/update_agent_definition", status_code = 200)
async def update_toolkit_package_global_config(payload: AgentDefinitionModel,
                                               request: Request,
                                               user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    def str_presenter(dumper, data):
        if "\n" in data:
            return dumper.represent_scalar("tag:yaml.org,2002:str", data, style = "|")
        return dumper.represent_scalar("tag:yaml.org,2002:str", data)

    yaml.add_representer(str, str_presenter)

    response = {}

    try:
        pconf_path = os.path.join(ROOT_PATH, "modules", json_payload["package_name"], "config", "system_prompts.yaml")
        with open(pconf_path, "r", encoding = "utf-8", errors = 'ignore') as pconf:
            unpolished_yaml_data = pconf.read()

        # Removal of invisible ASCII or gibberish characters and trailing spaces per line
        cleaned_content = re.sub(r"[^\x20-\x7E\n\r\t]", "", unpolished_yaml_data)
        cleaned_content = re.sub(r"(?m)\s+$", "", cleaned_content)
        data = yaml.safe_load(cleaned_content)

        if "prompts" not in data:
            data["prompts"] = {}

        if json_payload["agent_or_tool_name"] not in data["prompts"]:
            data["prompts"][json_payload["agent_or_tool_name"]] = {}

        for item, value in json_payload.items():
            if item not in ["package_name", "agent_or_tool_name"]:
                if value and ((type(value) == str and value.strip() != "") or (type(value) == list and value != [])):
                    data["prompts"][json_payload["agent_or_tool_name"]][item] = value

        with open(pconf_path, "w+") as pconf:
            yaml.dump(data, pconf, sort_keys = False)

        response["output"] = {"data": data["prompts"][json_payload["agent_or_tool_name"]], "message": "Agent definition updated successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - Agent definition updated successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Agent definition update failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Agent definition update failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# SSO client administration
@router.post("/api/v1/onboard_sso_client/", status_code = 200)
async def onboard_sso_client(payload: SSOClientModel,
                             request: Request,
                             user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    json_payload = payload.model_dump()
    json_payload["logged_in_user"] = user_info.user_id

    response = {}

    try:
        sso_client_obj = SSOClient()
        (status, output) = sso_client_obj.insert_sso_client_details(json_payload)

        if status:
            response["output"] = {"data": output, "message": "SSO client onboarded successfully."}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = "Accessed - Success - SSO client onboarded successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"SSO client onboarding failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - SSO client onboarding failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get("/api/v1/list_sso_clients/", status_code = 200)
async def list_sso_clients(request: Request,
                           user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    
    response = {}
    output = []

    try:
        sso_client_obj = SSOClient()
        (status, sso_client_list) = sso_client_obj.list_sso_clients()

        if not status:
            response["error"] = {"data": [], "message": sso_client_list}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - {sso_client_list}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

            return JSONResponse(status_code = response["code"], content = response)     

        if not sso_client_list:
            sso_client_list = []

        for sso_client in sso_client_list:
            output.append(
                    {
                        "client_id": sso_client[0],
                        "realm_name": sso_client[1],
                        "updated_by": sso_client[2]
                        }
                    )

        response["output"] = {"data": output, "message": "SSO clients listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - SSO clients listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"SSO clients listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - SSO clients listing failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/get_sso_client_config/", status_code = 200)
async def get_sso_client_config(payload: SSOClientDetailsRequestModel,
                                request: Request,
                                user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try:
        sso_client_obj = SSOClient()
        (status, output) = sso_client_obj.get_sso_client_details(payload.client_id, payload.realm_name)

        if not status:
            response["error"] = {"data": [], "message": output}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

            return JSONResponse(status_code = response["code"], content = response)   
        
        if output == None:
            output = {}
        else:
            output = output.__dict__
            del output["id"]
            del output["_sa_instance_state"]
            del output["updated_by"]
            del output["updated_at"]

        response["output"] = {"data": output, "message": "SSO client details retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - SSO client details retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"SSO client details retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - SSO client details retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/delete_sso_client/", status_code = 200)
async def delete_sso_client(payload: SSOClientDeleteRequestModel,
                            request: Request,
                            user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    response = {}

    try:
        sso_client_obj = SSOClient()
        json_payload["logged_in_user"] = user_info.user_id

        (status, output) = sso_client_obj.delete_sso_client(json_payload)

        if status:
            response["output"] = {"data": output, "message": output}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = "Accessed - Success - SSO client deleted successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"SSO client deletion failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - SSO client deletion failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

# ITSM connector administration
@router.post("/api/v1/onboard_itsm_connector/", status_code = 200)
async def onboard_itsm_connector(payload: ITSMConnectorModel,
                                 request: Request,
                                 user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    json_payload = payload.model_dump()
    json_payload["logged_in_user"] = user_info.user_id

    itsm_tag = json_payload["itsm_tag"]

    response = {}

    try:
        itsm_connector_obj = ITSMConnector()
        json_payload["itsm_type"] = json_payload["itsm_type"].name
        json_payload["itsm_auth_type"] = json_payload["itsm_auth_type"].name
        (status, output) = itsm_connector_obj.insert_itsm_connector_details(json_payload)

        if status:
            response["output"] = {"data": output, "message": "ITSM connector onboarded successfully."}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = f"Accessed - Success - ITSM connector {itsm_tag} onboarded successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"ITSM connector onboarding failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - ITSM connector onboarding failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.get("/api/v1/list_itsm_connectors/", status_code = 200)
async def list_itsm_connectors(request: Request,
                               user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}
    output = []

    try:
        itsm_connector_obj = ITSMConnector()
        (status, itsm_connector_list) = itsm_connector_obj.list_itsm_connectors()

        if not status:
            response["error"] = {"data": [], "message": itsm_connector_list}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - {itsm_connector_list}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

            return JSONResponse(status_code = response["code"], content = response)           

        if not itsm_connector_list:
            itsm_connector_list = []

        for itsm_connector in itsm_connector_list:
            output.append(
                    {
                        "itsm_tag": itsm_connector[0],
                        "itsm_type": itsm_connector[1].value,
                        "updated_by": itsm_connector[2]
                        }
                    )

        response["output"] = {"data": output, "message": "ITSM connectors listed successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, f"Accessed - Success - ITSM connectors listed successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": [], "message": f"ITSM connectors listing failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - ITSM connectors listing failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/get_itsm_connector_config/", status_code = 200)
async def get_itsm_connector_config(payload: ITSMConnectorDetailsRequestModel,
                                    request: Request,
                                    user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    response = {}

    try:
        itsm_connector_obj = ITSMConnector()
        (status, output) = itsm_connector_obj.get_itsm_connector_details(payload.itsm_tag)

        if not status:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - {output}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

            return JSONResponse(status_code = response["code"], content = response) 

        if not output:
            output = {}
        else:
            output = output.__dict__
            output["itsm_type"] = output["itsm_type"].value
            output["itsm_auth_type"] = output["itsm_auth_type"].value

            del output["id"]
            del output["_sa_instance_state"]
            del output["updated_by"]
            del output["updated_at"]

        response["output"] = {"data": output, "message": "ITSM connector details retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, f"Accessed - Success - ITSM connector details for {payload.itsm_tag} retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"ITSM connector details retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"ITSM connector details retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/delete_itsm_connector/", status_code = 200)
async def delete_itsm_connector(payload: ITSMConnectorDeleteRequestModel,
                                request: Request,
                                user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    itsm_tag = json_payload["itsm_tag"]

    response = {}

    try:
        itsm_connnector_obj = ITSMConnector()
        json_payload["logged_in_user"] = user_info.user_id

        (status, output) = itsm_connnector_obj.delete_itsm_connector(json_payload)

        if status:
            response["output"] = {"data": output, "message": output}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = f"Accessed - Success - ITSM connector {itsm_tag} deleted successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"ITSM connector deletion failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - ITSM connector deletion failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)


# Module wise configuration of parameters
@router.post("/api/v1/onboard_module_configuration/", status_code = 200)
async def insert_module_configuration(payload: ModuleConfigurationModel,
                                      request: Request,
                                      user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    response = {}
    try:
        module_config_obj = ModuleConfig()
        json_payload["logged_in_user"] = user_info.user_id

        module = json_payload["module"]
        parameter = json_payload["parameter"]

        (status, output) = module_config_obj.insert_module_configuration(json_payload)

        if status:
            response["output"] = {"data": output, "message": output}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = f"Accessed - Success - {parameter} configured for {module} successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Module parameter configuration failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Module parameter configuration failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/get_module_configs/", status_code = 200)
async def get_module_configs(payload: ModuleConfigurationsRequestModel,
                             request: Request,
                             user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    response = {}

    try:
        module_config_obj = ModuleConfig()

        module = json_payload.get("module")
        parameter = json_payload.get("parameter", None)

        (status, module_configs) = module_config_obj.get_module_configurations(module, parameter)

        if not status:
            response["error"] = {"data": [], "message": module_configs}
            response["code"] = 500

            en_ts = datetime.datetime.now(datetime.UTC)

            # Audit logging
            log_event(audit_logger,
                      logging.ERROR, 
                      f"Accessed - Execution Error - {module_configst}",
                      user_id = user_info.user_id,
                      api = request.url.path,
                      api_method = request.method,
                      response_code = response["code"],
                      exec_duration_in_sec = (en_ts - st_ts).total_seconds())   

            return JSONResponse(status_code = response["code"], content = response) 

        output = []
        if module_configs:
            for config in module_configs:
                output.append(
                    {
                        "module": config.module,
                        "parameter": config.parameter,
                        "value": config.value
                        }
                    )

        response["output"] = {"data": output, "message": "Module configuration details retrieved successfully."}
        response["code"] = 200

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO, "Accessed - Success - Module configuration details retrieved successfully.",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Module configuration details retrieval failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Module configuration details retrieval failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/update_module_configuration/", status_code = 200)
async def update_module_configuration(payload: ModuleConfigurationUpdateRequestModel,
                                      request: Request,
                                      user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    response = {}
    try:
        module_config_obj = ModuleConfig()
        json_payload["logged_in_user"] = user_info.user_id

        module = json_payload["module"]
        parameter = json_payload["parameter"]

        (status, output) = module_config_obj.update_module_configuration(json_payload)

        if status:
            response["output"] = {"data": output, "message": output}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = f"Accessed - Success - {parameter} configuration updated for {module} successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Module parameter update failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Module parameter update failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

@router.post("/api/v1/delete_module_configuration/", status_code = 200)
async def delete_module_configuration(payload: ModuleConfigurationDeleteRequestModel,
                                      request: Request,
                                      user_info: User = Depends(get_user_info)) -> dict:
    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    response = {}
    try:
        module_config_obj = ModuleConfig()
        json_payload["logged_in_user"] = user_info.user_id

        module = json_payload["module"]
        parameter = json_payload["parameter"]

        (status, output) = module_config_obj.delete_module_configuration(json_payload)

        if status:
            response["output"] = {"data": output, "message": output}
            response["code"] = 200
        else:
            response["error"] = {"data": {}, "message": output}
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = f"Accessed - Success - {parameter} configuration deleted for {module} successfully."

        # Audit logging
        log_event(audit_logger,
                  level, message,
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

    except Exception as e:
        response["error"] = {"data": {}, "message": f"Module parameter deletion failed - {str(e)}"}
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.ERROR, f"Accessed - Execution Error - Module parameter deletion failed - {str(e)}",
                  user_id = user_info.user_id,
                  api = request.url.path,
                  api_method = request.method,
                  response_code = response["code"],
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return JSONResponse(status_code = response["code"], content = response)

#Form data
@router.post("/api/v1/form/", status_code=200)
async def onboard_form(payload: FormOnboardRequestModel,
                       request: Request,
                       user_info: User = Depends(get_user_info)) -> dict:

    st_ts = datetime.datetime.now(datetime.UTC)
    json_payload = payload.model_dump()

    response = {}

    try:
        form_obj = Forms()

        json_payload["name"] = json_payload["name"].value
        json_payload["logged_in_user"] = user_info.user_id

        (status, output) = form_obj.onboard_form(json_payload)

        if status:
            response["output"] = {
                "data": output,
                "message": "Form onboarded successfully."
            }
            response["code"] = 200
        else:
            response["error"] = {
                "data": {},
                "message": output
            }
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = "Accessed - Success - Form onboarded successfully."

        log_event(
            audit_logger,
            level,
            message,
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            response_code=response["code"],
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=response["code"], content=response)

    except Exception as e:
        response["error"] = {
            "data": {},
            "message": f"Form onboarding failed - {str(e)}"
        }
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        log_event(
            audit_logger,
            logging.ERROR,
            f"Accessed - Execution Error - Form onboarding failed - {str(e)}",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            response_code=response["code"],
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=response["code"], content=response)

@router.get("/api/v1/form/{name}", status_code=200)
async def get_form(name: FormType,
                   request: Request,
                   user_info: User = Depends(get_user_info)) -> dict:

    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try:
        form_obj = Forms()

        (status, output) = form_obj.get_form_by_name(name.value)

        if status:
            response["output"] = {
                "data": output,
                "message": "Form retrieved successfully."
            }
            response["code"] = 200
        else:
            response["error"] = {
                "data": {},
                "message": output
            }
            response["code"] = 404

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO if status else logging.ERROR

        log_event(
            audit_logger,
            level,
            "Accessed - Get Form",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            response_code=response["code"],
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=response["code"], content=response)

    except Exception as e:
        response["error"] = {
            "data": {},
            "message": f"Form retrieval failed - {str(e)}"
        }
        response["code"] = 500

        return JSONResponse(status_code=response["code"], content=response)
    
@router.put("/api/v1/form/", status_code=200)
async def update_form(payload: FormUpdateRequestModel,
                      request: Request,
                      user_info: User = Depends(get_user_info)) -> dict:

    st_ts = datetime.datetime.now(datetime.UTC)

    json_payload = payload.model_dump()
    response = {}

    try:
        form_obj = Forms()

        json_payload["name"] = json_payload["name"].value
        json_payload["logged_in_user"] = user_info.user_id

        (status, output) = form_obj.update_form_inventory(json_payload)

        if status:
            response["output"] = {
                "data": output,
                "message": "Form updated successfully."
            }
            response["code"] = 200
        else:
            response["error"] = {
                "data": {},
                "message": output
            }
            response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO
        if response["code"] == 500:
            level = logging.ERROR
            message = f"Accessed - Execution Error - {output}"
        else:
            message = "Accessed - Success - Form updated successfully."

        log_event(
            audit_logger,
            level,
            message,
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            response_code=response["code"],
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=response["code"], content=response)

    except Exception as e:
        response["error"] = {
            "data": {},
            "message": f"Form update failed - {str(e)}"
        }
        response["code"] = 500

        en_ts = datetime.datetime.now(datetime.UTC)

        log_event(
            audit_logger,
            logging.ERROR,
            f"Accessed - Execution Error - Form update failed - {str(e)}",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            response_code=response["code"],
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=response["code"], content=response)
    
@router.delete("/api/v1/form/{name}", status_code=200)
async def delete_form(name: FormType,
                      request: Request,
                      user_info: User = Depends(get_user_info)) -> dict:

    st_ts = datetime.datetime.now(datetime.UTC)

    response = {}

    try:
        form_obj = Forms()

        payload = {
            "name": name.value,
            "logged_in_user": user_info.user_id
        }

        (status, output) = form_obj.delete_form(payload)

        if status:
            response["output"] = {
                "data": output,
                "message": "Form deleted successfully."
            }
            response["code"] = 200
        else:
            response["error"] = {
                "data": {},
                "message": output
            }
            response["code"] = 404

        en_ts = datetime.datetime.now(datetime.UTC)

        level = logging.INFO if status else logging.ERROR

        log_event(
            audit_logger,
            level,
            "Accessed - Delete Form",
            user_id=user_info.user_id,
            api=request.url.path,
            api_method=request.method,
            response_code=response["code"],
            exec_duration_in_sec=(en_ts - st_ts).total_seconds()
        )

        return JSONResponse(status_code=response["code"], content=response)

    except Exception as e:
        response["error"] = {
            "data": {},
            "message": f"Form deletion failed - {str(e)}"
        }
        response["code"] = 500

        return JSONResponse(status_code=response["code"], content=response)