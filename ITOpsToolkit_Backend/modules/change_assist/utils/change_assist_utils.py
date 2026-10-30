# Author - Viraj Purandare and Anish Bhandiwad
# Created On - May 15, 2026

# Default packages
import os
import re
import sys
import shutil
import logging

import json
import yaml
import datetime

from pathlib import Path

# Third party packages
from fastapi import File, UploadFile


from PIL import Image          # BMP -> PNG
import cairosvg                # SVG -> PNG
import io

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
DB_PATH = os.path.join(ROOT_PATH, "database")
MCP_PATH = os.path.join(ROOT_PATH, "mcp_servers")
SYSPROMPT_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config", "system_prompts.yaml")

TS_FORMAT = "%Y-%m-%d %H:%M:%S"

sys.path.append(SCRIPT_PATH)
sys.path.append(ROOT_PATH)
sys.path.append(MCP_PATH)

# Custom packages
import core_crud
import db_session

import system_config_ca as scf

import change_assist_agent
from servicenow_mcp import ServiceNow
from pro_logger import log_event, application_logger

class ImageUploadService:        
    UPLOAD_DIR = Path(ROOT_PATH) / "temp"

    def __init__(self):
        upload_dir = self.UPLOAD_DIR
        # Ensure upload dir exists
        upload_dir.mkdir(parents = True, exist_ok = True)
    
    #@staticmethod
    def secure_filename(self, name: str) -> str:
        # Only keep the final component to prevent path traversal
        name = Path(name or "").name

        # Separate base and extension (single suffix)
        base = Path(name).stem
        ext = Path(name).suffix  # includes the dot, e.g. ".jpg"

        # Normalize base: allow alnum, dot, dash, underscore
        base = re.sub(r"[^A-Za-z0-9._-]+", "_", base).strip("._-")
        if not base:
            base = "file"

        # Normalize extension similarly (keep dot if present)
        if ext:
            raw_ext = ext[1:]  # drop leading dot for validation
            raw_ext = re.sub(r"[^A-Za-z0-9._-]+", "", raw_ext)
            ext = f".{raw_ext}" if raw_ext else ""
        else:
            ext = ""

        # Avoid names like ".bashrc" with empty base
        return f"{base}{ext}"

    # Given a desired destination path, return a path that doesn't exist by
    # appending -1, -2, ... before the extension if necessary.
    def disambiguate_path(self, dest: Path) -> Path:
        if not dest.exists():
            return dest
        
        base = dest.stem
        ext = dest.suffix
        now = datetime.datetime.now()
        custom_format = now.strftime("%Y-%m-%d-%H:%M:%S")

        while True:
            candidate = dest.with_name(f"{base}-{custom_format}{ext}")
            if not candidate.exists():
                return candidate

    def upload_file(self, file: UploadFile = File(...)):
        upload_dir = self.UPLOAD_DIR
        safe_name = self.secure_filename(file.filename)
        dest = self.disambiguate_path(upload_dir / safe_name)

        # Stream to disk
        try:
            with dest.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            # Clean up partial file
            try:
                if dest.exists():
                    dest.unlink(missing_ok = True)
            except Exception:
                pass
            return (False, f"Image file upload failed - {str(e)}")

        # Return what it was saved as and where
        return (True, {
            "message": "Image file uploaded successfully.",
            "original_filename": file.filename,
            "saved_as": dest.name,
            "size_bytes": dest.stat().st_size if dest.exists() else None,
        })


# Change assist functionalities
class ChangeAssistUtils:
    def __init__(self):
        pass

    # Draft change request with impact analysis
    async def draft_change(self, change_material, token):
        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        cc_sys_prompt = sys_prompts_config.get("change_creation_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(cc_sys_prompt)
    
        query = f"{instruction}\n\nConsider following details for raising a change request - \n\n"
        for title, value in change_material.items():
            if value.strip() not in ["", None]:
                query += title + " - " + value + "\n"

                if title == "uploaded_files":
                    query += "Analyze images from uploaded_files.\n"
                elif title == "config_items":
                    query += "Use config_items for architecture topology insights.\n"

        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        atia_sys_prompt = sys_prompts_config.get("architecture_topology_insight_agent", None)
        itsm_tags = atia_sys_prompt.get("itsm_tags", configs["itsm_tags"])

        query += f"\nUse the itsm_tags - {itsm_tags} when needed while accessing the mcp tools"

        query = query.strip()

        output = await change_assist_agent.run(query, token)
        
        if output:
            output = json.loads("{" + "}".join("{".join(output.strip().split("{")[1:]).split("}")[:-1]) + "}")
            return (True, output)
        else:
            return (False, "Please investigate agentic logs.")

    # Upload image
    def upload_image(self, file):
        data = {}
    
        if file is None:
            data = {"code": 200, "message": "No file provided for upload"}
        if not file.filename:
            data = {"code": 400, "message": "File upload failed - Missing filename"}
            
        # Optional: validate content type or extension
        allowed_types = {"image/png", "image/jpeg", "image/svg", 
                         "image/svg+xml","image/bmp", "image/gif"}
        if file.content_type not in allowed_types:
            return (False, {"code": 400, "message": f"File upload failed - Unsupported Image format. Supported formats are PNG, JPEG, SVG, GIF, and BMP."})
            # data = {"code": 400, "message": f"File upload failed - Unsupported Image format. Supported formats are PNG, JPEG, SVG, GIF, and BMP."}


        try:
            upload_service = ImageUploadService()
            (status, result) = upload_service.upload_file(file)

            if status:
                data = {"code": 200, "message": "File uploaded successfully."}
            else:
                data = {"code": 500, "message": result}
        except Exception as e:
            # Application logging
            log_event(application_logger,
                      logging.ERROR,
                      f"Image file upload failed - {str(e)}",
                      is_exception = True,
                      module_name = "change_assist",
                      component_type = "app_utils_execution",
                      component_name = "change_assist_utils - upload_image")

            data = {"code": 500, "message": f"File uploaded failed - {str(e)}"}

        if data["code"] == 200:
            return (True, data)
        else:
            return (False, data)

    # Push change request to ITSM
    def push_change_request_to_itsm(self, itsm_payload):
        # Obtain ITSM tags
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])

        itsm_obj = ServiceNow()
        
        (status, data) = itsm_obj.create_change_request(
            itsm_tags = itsm_tags,
            short_description = itsm_payload.short_description,
            description = itsm_payload.description,
            ci = itsm_payload.ci,
            chg_model = itsm_payload.chg_model,
            implementation_plan = itsm_payload.implementation_plan,
            backout_plan = itsm_payload.backout_plan,
            test_plan = itsm_payload.test_plan,
            risk_impact_analysis = itsm_payload.risk_impact_analysis,
            attachments = itsm_payload.attachments,
            module_name = "change_assist"
        )

        return (status, data)