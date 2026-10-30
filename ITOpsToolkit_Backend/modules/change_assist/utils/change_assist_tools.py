# Author - Viraj Purandare
# Created On - October 8, 2025

# Default packages
import os
import sys
import logging
from typing import Annotated
from pydantic import Field

import yaml
import base64
import io

from PIL import Image
import cairosvg

# Third party packages
from litellm import completion
from agent_framework import tool, MCPStreamableHTTPTool

import litellm

from contextlib import asynccontextmanager
# litellm._turn_on_debug()

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = SCRIPT_PATH.split("modules")[0].strip()

sys.path.append(SCRIPT_PATH)
sys.path.append(ROOT_PATH)

# Custom packages
import system_config_ca as scf

from llm import LLM

from pro_logger import log_event, application_logger

# Tool to analyze image
@tool#(name="image_analyzer", description="Given image name and default system prompt for the tool, provides professional analysis of image.")
def analyze_image(
    image_name: Annotated[str, Field(description="Name of the image file to analyze")],
    system_prompt: Annotated[str, Field(description="System prompt guiding the analysis")]
) -> str:

    # Obtain configurations
    configs = scf.get_system_config()
    sys_prompts_config = configs["sys_prompts_config"]

    if sys_prompts_config == None:
        return "Guardrail note - System prompts not defined for any tool. Cannot proceed with the action. Contact developer."

    # Get LLM model and Override default system prompt if configured for tool
    aiaa_sys_prompt = sys_prompts_config.get("architecture_image_analyzer_tool", None)

    if aiaa_sys_prompt and (
            aiaa_sys_prompt.get("description", None) == None and aiaa_sys_prompt.get("instruction", None) == None or
            aiaa_sys_prompt.get("description").strip() == "" and aiaa_sys_prompt.get("instruction") == ""
            ):
        pass
    else:
        description = aiaa_sys_prompt.get("description", "")
        instruction = aiaa_sys_prompt.get("instruction", "")
        system_prompt = f"Purpose: {description}\n\nInstructions:\n{instruction}"

    llm_tag = aiaa_sys_prompt.get("llm_tag", configs["llm_tag"])

    llm_obj = LLM()
    llm_obj.set_litellm_environment(llm_tag)

    if not llm_obj.model:
        return "ERROR: Model not configured for ArchitectureImageAnalyzerTool. Configure valid model."

    # Encode image to base64 model
    image_path = os.path.join(ROOT_PATH, "temp", image_name)
    DIRECT = {"png": "image/png", "jpeg": "image/jpeg", "gif": "image/gif"}

    def _detect(path):
        with open(path, "rb") as f:
            head = f.read(16)
        if head.startswith(b"\x89PNG"): return "png"
        if head.startswith(b"\xff\xd8"): return "jpeg"
        if head[:6] in (b"GIF87a", b"GIF89a"): return "gif"
        if head.startswith(b"BM"): return "bmp"
        if b"<svg" in head.lower() or head.lstrip().startswith(b"<?xml"): return "svg"
        return None

    try:
        fmt = _detect(image_path)

        if fmt in DIRECT:
            # PNG / JPEG / GIF - already accepted by the model, use as-is
            final_path = image_path
            mime = DIRECT[fmt]

        elif fmt == "bmp":
            # Convert BMP -> PNG and save into temp/
            final_path = os.path.splitext(image_path)[0] + ".png"
            Image.open(image_path).save(final_path, "PNG")
            mime = "image/png"

        elif fmt == "svg":
            # Convert SVG -> PNG and save into temp/
            final_path = os.path.splitext(image_path)[0] + ".png"
            cairosvg.svg2png(url=image_path, write_to=final_path)
            print("SVG Image Converted to PNG Sucessfully")
            mime = "image/png"

        else:
            return "ERROR: Unsupported image format. Allowed: PNG, JPEG, GIF, SVG, BMP."

        # Read the final image (converted PNG for svg/bmp, original otherwise) and encode
        with open(final_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")

    except Exception as e:

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  str(e),
                  is_exception = True,
                  module_name = "change_assist",
                  component_type = "app_tool_execution",
                  component_name = "change_assist_tools - analyze_image")
        return ""

    formatted_url = f"data:{mime};base64,{encoded_string}"

    messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": system_prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": formatted_url
                            }
                        }
                    ]
                }
            ]
    try:
        response = completion(
                model = llm_obj.model,
                messages = messages
                )
        print("[IMAGE_ANALYSIS_RESPONSE]\n\n\n", response)
    except Exception as e:
        # print(str(e))
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  str(e),
                  is_exception = True,
                  module_name = "change_assist",
                  component_type = "app_tool_execution",
                  component_name = "change_assist_tools - analyze_image")

    # return response

    return response.choices[0].message["content"]

# Tool to obtain architecture topology from ITSM CMDB
def get_servicenow_architecture_topology_insight(auth_token):
    """
        Call to internal ServiceNow MCP server
    """
    try:
        tool = MCPStreamableHTTPTool(
            name = "Servicenow MCP",
            url = "http://127.0.0.1:8000/mcp",#"https://demoadk.intelligentservicedeliveryplatform.com:9876/mcp",
            header_provider = lambda kwargs: {"Authorization": f"Bearer {auth_token}"},
        )

    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  str(e),
                  is_exception = True,
                  module_name = "change_assist",
                  component_type = "app_tool_execution - MCP",
                  component_name = "change_assist_tools - get_servicenow_architecture_topology_insight")
