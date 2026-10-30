# Author - Viraj Purandare, Vishwas K S and Ragavan Veerarajan
# Created On - July 4, 2026

import logging
import os
import sys
import json
import asyncio
import requests

from bs4 import BeautifulSoup

import msal
from botbuilder.core import ActivityHandler, MessageFactory, TurnContext
from botbuilder.schema import ChannelAccount
from botbuilder.core.teams import TeamsInfo
from botbuilder.core.teams.teams_activity_extensions import teams_get_meeting_info
from botbuilder.schema import Activity, ActivityTypes

# Global variable and paths
SCRIPT_PATH = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
ROOT_PATH = os.path.join(SCRIPT_PATH.split("modules")[0])
AUTH_PATH = os.path.join(ROOT_PATH, "modules", "auth", "utils")

sys.path.append(ROOT_PATH)
sys.path.append(AUTH_PATH)
sys.path.append(CONFIG_PATH)

from mim_config import DefaultConfig

from mim_assist_utils import MIMAssistUtils
from token_generation import SSOTokenGenerator
from pro_logger import log_event, application_logger

CONFIG = DefaultConfig()


class MIMAssistBot(ActivityHandler):
    async def send_typing_until_cancelled(self,
        turn_context: TurnContext,
        interval_seconds: float = 4.0,
        cancel_event: asyncio.Event | None = None,
        ):
        """
        Immediately sends a 'typing' activity, then sends it periodically until cancel_event is set.
        """
        if cancel_event is None:
            cancel_event = asyncio.Event()

        # Send immediately so users see it right away
        await turn_context.send_activity(Activity(type=ActivityTypes.typing))

        try:
            while not cancel_event.is_set():
                await asyncio.wait_for(cancel_event.wait(), timeout=interval_seconds)
                if not cancel_event.is_set():
                    await turn_context.send_activity(Activity(type=ActivityTypes.typing))
        except asyncio.TimeoutError:
            # Normal path: timeout means time to send the next typing activity
            # Loop continues; do nothing here.
            pass
        except asyncio.CancelledError:
            # If the task itself is cancelled, just exit silently
            return
        
        
    async def on_installation_update_add(self, turn_context: TurnContext):
        stop_typing = asyncio.Event()
        typing_task = asyncio.create_task(
            self.send_typing_until_cancelled(turn_context, interval_seconds=4.0, cancel_event=stop_typing)
        )
        # This reliably indicates the app/bot was installed in this conversation
        conversation_type = getattr(turn_context.activity.conversation, "conversation_type", None)
        meeting_info = await TeamsInfo.get_meeting_info(turn_context)
        title = meeting_info.details['title']
        
        inc = {}
        data = title.split("|")
        inc["number"] = data[1].strip()
        inc["category"] = data[2].strip()
        inc["priority"] = data[3].strip()
        
        tok_obj = SSOTokenGenerator()
        email = tok_obj.get_user_email(CONFIG.USER_ID)
        token = tok_obj.generate_token(email = email)
        
        
        ms = MIMAssistUtils()
        initial_diagnosis = await ms.generate_initial_diagnosis(inc["number"], token = token)
        
        stop_typing.set()
        await turn_context.send_activity(
            initial_diagnosis
        )

    async def on_message_activity(self, turn_context: TurnContext):
       
        mim_utils_obj = MIMAssistUtils()
        meeting_id = turn_context.activity.conversation.id
        conversation_history = mim_utils_obj.get_conversation_history(meeting_id)
     
        conv_history = {"context": []}
        user_obj_id = {}

        
        for entry in reversed(conversation_history):
            conv = {}
            try:
                user_name = entry["from"]["user"]["displayName"]
                user = "user"
                user_obj_id[user_name] = entry["from"]["user"]["id"] if user_name not in user_obj_id else       user_obj_id[user_name]

            except Exception:
                user_name = "StreamTeamBotlocal"
                user = "system"
            
            conv["role"] = user
            
            soup = BeautifulSoup(entry["body"]["content"])
            text = soup.get_text()
            if text and text.strip() != "":
                conv["content"] = f"{user_name}: {text}"
        
                conv_history["context"].append(conv)

    
        botname = os.getenv("BOT_NAME", "MIMBotlocal")
        if botname.lower() in conv_history["context"][-1].get("content").lower():
            stop_typing = asyncio.Event()
            typing_task = asyncio.create_task(
                self.send_typing_until_cancelled(turn_context, interval_seconds=4.0, cancel_event=stop_typing)
            )
            user_name = conv_history["context"][-1].get("content").split(":")[0]
            user_obj_id = user_obj_id.get(user_name)
            tok_obj = SSOTokenGenerator()
            user_email = tok_obj.get_user_email(user_obj_id)
            user_token = tok_obj.generate_token(email = user_email)

            response = await mim_utils_obj.chatbot(conv_history, token = user_token)
            stop_typing.set()
            return await turn_context.send_activity(
                MessageFactory.text(response)
            )
        
    # def get_conversation_participants(self, meeting_id):
    #     """
    #     Fetches the MIM meeting attendance details for the given meeting ID.
    #     """
    #     access_token = self.get_access_token()
    #     url = f"https://graph.microsoft.com/v1.0/users/{CONFIG.USER_ID}/onlineMeetings/{meeting_id}/attendanceReports"
    #     headers = {
    #         "Authorization": f"Bearer {access_token}",
    #         "Content-Type": "application/json"
    #     }
    #     try:
    #         response = requests.get(url, headers = headers)
    #         response.raise_for_status()  # Raise an exception for HTTP errors

    #         if "error" in response.json():
    #             error_message = response.json()["error"].get("message", "Unknown error")
                
    #             log_event(application_logger,
    #                   logging.ERROR,
    #                   error_message,
    #                   is_exception = True,
    #                   module_name = "mim_assist",
    #                   component_type = "app_utils_execution",
    #                   component_name = "mim_assist_utils - get_mim_meeting_attendance_details")
    #             return(False, error_message)
            
    #         participants = []
    #         meeting_start_datetime = response.json().get("value")[-1].get("meetingStartDateTime")
    #         for item in response.json().get("value", []):
                
    #             url = f"https://graph.microsoft.com/v1.0/users/{CONFIG.USER_ID}/onlineMeetings/{meeting_id}/attendanceReports/{item.get('id')}/attendanceRecords"
    #             headers = {
    #                 "Authorization": f"Bearer {access_token}",
    #                 "Content-Type": "application/json"
    #             }
    #             try:
    #                 response = requests.get(url, headers = headers)
    #                 response.raise_for_status()  # Raise an exception for HTTP errors
                    
    #                 for record in response.json().get("value", []):
    #                     participants.append(record.get("emailAddress"))

    #             except Exception as e:
    #                 log_event(application_logger,
    #                   logging.ERROR,
    #                   f"MIM meeting attendance records retrieval failed: {str(e)}",
    #                   is_exception = True,
    #                   module_name = "mim_assist",
    #                   component_type = "app_utils_execution",
    #                   component_name = "mim_assist_utils - get_mim_meeting_attendance_details")
    #         data = {
    #             "meeting_start_datetime": meeting_start_datetime,
    #             "participants": participants
    #         }
    #         return (True, data)
                    
    #     except Exception as e:
    #         error_message = f"MIM meeting attendance details retrieval failed: {str(e)}"
    #         log_event(application_logger,
    #                   logging.ERROR,
    #                   error_message,
    #                   is_exception = True,
    #                   module_name = "mim_assist",
    #                   component_type = "app_utils_execution",
    #                   component_name = "mim_assist_utils - get_mim_meeting_attendance_details")
    #         return (False, error_message)

