# Author - Viraj Purandare, Vishwas K S and Ragavan Veerarajan
# Created On - July 3, 2026

# Default packages
import os
import re
import sys
import json
import logging
import datetime
from datetime import timedelta
import token
from urllib.parse import urlparse, unquote

import msal
import requests
from bs4 import BeautifulSoup
from twilio.rest import Client

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
DB_PATH = os.path.join(ROOT_PATH, "database")
MCP_PATH = os.path.join(ROOT_PATH, "mcp_servers")
CONFIG_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config")
SYSPROMPT_PATH = os.path.join(SCRIPT_PATH.split("utils")[0], "config", "system_prompts.yaml")

TS_FORMAT = "%Y-%m-%d %H:%M:%S"

# Allowed excel extensions for config uploads
ALLOWED_EXCEL_EXTENSIONS = (".xlsx", ".xls")

# Mapping of the config file "type" exposed to the frontend -> actual file name on disk.
# "actual" is the in-use shift roaster that gets replaced on upload.
# "template" is the blank template the frontend offers for download.
CONFIG_FILES = {
    "template": "shift_roaster_template.xlsx",
    "actual": "shift_roaster.xlsx",
}

sys.path.append(MCP_PATH)
sys.path.append(ROOT_PATH)
sys.path.append(CONFIG_PATH)

# Custom packages
import core_crud
import db_session
from vault import Vault
import system_config_mim as scf
from mim_config import DefaultConfig as CONFIG

import mim_assist_agent
from servicenow_mcp import ServiceNow
from stake_holders import EmployeeDirectory
from token_generation import SSOTokenGenerator
from pro_logger import log_event, application_logger


class MIMAssistUtils:
    def __init__(self):
        self.inc_details = {}

        self.configs = scf.get_system_config()
        self.prompts = self.configs["sys_prompts_config"]

    def upload_shift_roaster(self, filename: str, file_bytes: bytes) -> tuple:
        """
        Save an uploaded excel file into the mim_assist config folder as the
        actual (in-use) config file.

        :param filename: Original name of the uploaded file (used for extension validation).
        :param file_bytes: Raw bytes of the uploaded file.
        :return: (status, message_or_path)
        """
        try:
            extension = os.path.splitext(filename)[1].lower()
            if extension not in ALLOWED_EXCEL_EXTENSIONS:
                return (False, f"Invalid file type '{extension}'. Allowed types: {', '.join(ALLOWED_EXCEL_EXTENSIONS)}")

            if not file_bytes:
                return (False, "Uploaded file is empty")

            os.makedirs(CONFIG_PATH, exist_ok = True)
            destination = os.path.join(CONFIG_PATH, CONFIG_FILES["actual"])

            with open(destination, "wb") as out_file:
                out_file.write(file_bytes)

            return (True, destination)

        except Exception as e:
            error_message = f"Failed to upload config file: {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      error_message,
                      is_exception = True,
                      module_name = "mim_assist",
                      component_type = "app_utils_execution",
                      component_name = "mim_assist_utils - upload_shift_roaster")
            return (False, error_message)

    def download_roaster_file(self, file_type: str) -> tuple:
        """
        Resolve the on-disk path of a config file for download.

        :param file_type: Either "template" or "actual".
        :return: (status, (file_path, file_name)) on success, else (False, message)
        """
        try:
            file_name = CONFIG_FILES.get(file_type)
            if not file_name:
                return (False, f"Invalid file type '{file_type}'. Allowed values: {', '.join(CONFIG_FILES.keys())}")

            file_path = os.path.join(CONFIG_PATH, file_name)
            if not os.path.isfile(file_path):
                return (False, f"Config file '{file_name}' not found")

            return (True, (file_path, file_name))

        except Exception as e:
            error_message = f"Failed to resolve config file: {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      error_message,
                      is_exception = True,
                      module_name = "mim_assist",
                      component_type = "app_utils_execution",
                      component_name = "mim_assist_utils - download_roaster_file")
            return (False, error_message)

    async def schedule_meeting(self, incident_number: str, token: str) -> tuple:
        itsm_tags = ",".join(self.configs["itsm_tags"])
        itsm_obj = ServiceNow()
        
        status, inc_details = itsm_obj.list_ticket_details(
            itsm_tags = itsm_tags,
            table = "incident",
            conditions = [{"param": "number", "op": "=", "val": incident_number}], 
            module_name = "mim_assist"
        )
        
        self.inc_details = inc_details[0]

        if not self.inc_details:
            return (False, f"Incident {incident_number} not found")
        
        ed = EmployeeDirectory(os.path.join(CONFIG_PATH, 'shift_roaster.xlsx'))

        #Get Authorization token for client ID
        authority = f"https://login.microsoftonline.com/{CONFIG.APP_TENANTID}"
        scopes = ["https://graph.microsoft.com/.default"]

        app = msal.ConfidentialClientApplication(CONFIG.CLIENT_ID, authority=authority, 
                                                 client_credential=CONFIG.CLIENT_SECRET)

        token_response = app.acquire_token_for_client(scopes=scopes)
        access_token = token_response['access_token']
       
        # End Point URL
        url = f"https://graph.microsoft.com/v1.0/users/{CONFIG.USER_ID}/calendar/events"

        #Date and Time
        Current_Date = datetime.datetime.now()
        #Create Event
        headers = { 
                    'Authorization' : f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
      
        meeting_participants = await self.get_ppl_in_shift_details(token)

        attendees = []
        contact_details = []
        for participant in meeting_participants:
            attendees.append({
                "emailAddress": {
                    "address": participant.get('Email'),
                    "name": participant.get('Name')
                },
                "type": "required"
            })
          
            contact_details.append({
                "name": participant.get('Name'),
                "contact_no": participant.get('Phone Number')
            })
       
        meeting_subject = f"MIM | {self.inc_details.get("number")} | {self.inc_details.get("category")} | {self.inc_details.get("priority")}"
        start_time = datetime.datetime.now()
        end_time = start_time + timedelta(minutes = 30)
        group = self.inc_details.get("assignment_group")

        assignment_group = (
            group.get("display_value") if isinstance(group, dict) and group.get("display_value")
            else group
        )
            
        content = f'''Dear Team,<br>

            A Major Incident has been created and requires immediate attention.<br>



            <b>INCIDENT DETAILS:</b>

            <br>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br>

            <b>Incident Number:</b> {self.inc_details.get("number")}<br>

            <b>Priority:</b> {self.inc_details.get("priority")}<br>

            <b>Issue:</b> {self.inc_details.get("short_description")}<br>

            <b>DESCRIPTION:</b> {self.inc_details.get("description")}<br>

            <b>Assignment Group:</b> {assignment_group}<br>

            <b>Created Time:</b> {self.inc_details.get("sys_created_on")}<br>

            <b>Impact:</b> {self.inc_details.get("impact")}<br><br>



            <b>ACTION REQUIRED:</b>

            Please join the bridge immediately to assist with resolution.<br><br>


            
            <b>NOTE!!</b>

            Add MIMBotLocal to the chat for quick support!<br><br>

            
            <b>Procedure:</b><br>

            <pre>
            1.Click on View and Add Participants.

            2.Click on Add Agents and bots.

            3.Select MIMBotLocal and Add.
            </pre>



            Best Regards,<br>

            Incident Management Team'''

        event = {
                    "subject": meeting_subject,
                    "body": {
                        "contentType": "HTML",
                        "content": content
                    },
                    "start": {
                        "dateTime": start_time.isoformat(),
                        "timeZone": "UTC"
                    },
                    "end": {
                    "dateTime": end_time.isoformat(),
                    "timeZone": "UTC"
                    },
                    "location":{
                        "displayName":"Microsoft Teams"
                    },
                    "attendees": attendees,
                    "isOnlineMeeting": True,
                    "onlineMeetingProvider": "teamsForBusiness",
                }
        try:
            response = requests.post(url, headers=headers, data=json.dumps(event))
            event_details = response.json()
         
            if "error" in event_details:
                return (False, f"Error scheduling meeting: {event_details['error']['message']}")
            
        except Exception as e:
            return (False, f"Error sending meeting invite: {str(e)}")
        
        if response.status_code != 201:
            return (False, f"Error: {response.status_code}")

        for attendee in contact_details:
            (status, output) = self.notify_attendee(attendee)

            if not status:
                erro_msg =  f"Error notifying attendee {attendee['name']}: {output}"
                log_event(application_logger,
                      logging.ERROR,
                      erro_msg,
                      is_exception = True,
                      module_name = "mim_assist",
                      component_type = "app_utils_execution",
                      component_name = "mim_assist_utils - schedule_meeting")

        join_url = response.json().get("onlineMeeting", {}).get("joinUrl")
        
        (status, meeting_info) = self.get_meeting_info(join_url)

        if not status:
            (status, meeting_info)
      
        invitees = [attendee['emailAddress']['address'] for attendee in event_details['attendees']]
        invitees.append(event_details['organizer']['emailAddress']['address'])

        meeting_details = {
            "meeting_id": meeting_info.get("id"),
            "threadId": meeting_info.get("chatInfo").get("threadId")
        }

        insert_mim_details = {
            "incident_number": self.inc_details.get("number"),
            "meeting_details": meeting_details,
            "incident_details": self.inc_details,
            "ticket_state": self.inc_details.get("state"),
            "invitees": invitees,
        }
   
        db_local_session = db_session.get_db()
        (status, mim_details) = core_crud.insert_mim_details(db_local_session, insert_mim_details)
        db_local_session.close()

        if not status:
            return (False, mim_details)
        
        return (True, "Meeting Scheduled Successfully")
    
    async def get_ppl_in_shift_details(self, token):
        group = self.inc_details.get("assignment_group")

        assignment_group = (
            group.get("display_value") if isinstance(group, dict) and group.get("display_value")
            else group
        )

        if not assignment_group:
            log_event(application_logger,
                      logging.ERROR,
                      f"No Assignment Group found for the incident.",
                      is_exception = True,
                      module_name = "mim_assist",
                      component_type = "app_utils_execution",
                      component_name = "mim_assist_utils - get_ppl_in_shift_details")
            return None
        
        ed = EmployeeDirectory(os.path.join(CONFIG_PATH, "shift_roaster.xlsx"))

        technology_towers = ed.get_technology_towers()
        short_description = self.inc_details.get("short_description")
        description = self.inc_details.get("description")

        system_prompts = self.prompts.get('tech_tower_identifier_agent', None)
        
        # Generate initial diagnosis
        prompt = system_prompts.get("instruction").format(
            short_description = short_description,
            description = description,
            technology_towers = technology_towers
        )
   
        response = await mim_assist_agent.run_tech_tower_identifier_agent(query = prompt, token=token)
      
        cleaned = re.sub(r'```json\s*|\s*```', '', response).strip()
        cleaned = "{" + "}".join("{".join(cleaned.split("{")[1:]).split("}")[:-1]) + "}"

        try:
            # parse the response and extraxt json object
            identified_tech_tower = json.loads(cleaned)

        except Exception as e:
            log_event(application_logger,
                      logging.ERROR,
                      f"Error parsing LLM response: {e}",
                      is_exception = True,
                      module_name = "mim_assist",
                      component_type = "app_utils_execution",
                      component_name = "mim_assist_utils - get_ppl_in_shift_details")

            return None
        
        assignment_groups = ed.get_assignment_group(identified_tech_tower.get("technology_tower"))
        assignment_groups.append(assignment_group)

        ppl_in_shift = ed.get_person_by_shift_and_tower(
            date_input = datetime.datetime.now().strftime('%d-%m-%Y'),
            time_input = datetime.datetime.now().strftime('%H:%M:%S'),
            assignment_group = assignment_groups
        )
        
        
        return ppl_in_shift
    
    def notify_attendee(self, attendee):
        
        vault_obj = Vault(core_crud.VAULT_TYPE)
        (status, value) = vault_obj.read_secret("mim_twilio_secret")

        if not status:
            TWILIO_ACCOUNT_SID = TWILIO_AUTH_TOKEN = None
        else:
            TWILIO_ACCOUNT_SID = value[0]
            TWILIO_AUTH_TOKEN = value[1]
        try:
            inc_number = self.inc_details.get("number").split(" ")
            short_description = self.inc_details.get("short_description")
            automated_message = f"Hi {attendee['name']}, This is a voice note from Major Incident Management System. "
            automated_message += f"There is a critical incident reported with number {inc_number}. "
            automated_message += f"{short_description}. "
            automated_message += "The bridge details are shared over an email. "
            automated_message += "Please join the bridge at the earliest and ensure that one of the team members add StreamTeamBotLocal to the meeting for quick assistance. "
            automated_message += "The process to add the bot is documented in the meeting body. Thank you !"
        
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            
            call = client.calls.create(
                twiml = f"<Response><Say>{automated_message}</Say></Response>",
                to = f"{attendee['contact_no']}",
                from_ = os.getenv("TWILIO_PHONE_NUMBER_FROM")
                )
            return (True, call.sid)
        except Exception as e:
            return (False, f"Error notifying attendee {attendee['name']}: {str(e)}")
        
    async def chatbot(self, conversation_history, token):
        query = "\n".join([f"{msg.get('role')}: {msg.get('content')}" for msg in conversation_history.get("context")])
        itsm_tags = ",".join(self.configs["itsm_tags"])
        query += f"\n\nADDITIONAL INFO: \nUse itsm_tags as {itsm_tags} when necessary."
        response = await mim_assist_agent.run_chatbot(query, token)

        # Extract display response  from structured output
        if isinstance(response, dict):
            display_response = response.get("response", "")
        else:
            display_response = response

        return display_response
    
    async def generate_initial_diagnosis(self, incident_number, token):
        itsm_tags = ",".join(self.configs["itsm_tags"])
        system_prompts = self.prompts.get('initial_diagnosis_agent', None)

        itsm_obj = ServiceNow()
        status, inc_details = itsm_obj.list_ticket_details(
            itsm_tags = itsm_tags,
            table = "incident",
            conditions = [{"param": "number", "op": "=", "val": incident_number}], 
            module_name = "mim_assist"
        )
        
        inc_details = inc_details[0]

        prompt = system_prompts.get('instruction').format(incident_number = incident_number)
        prompt += f"\nuse the {itsm_tags} to get the details of the incident"
        response = await mim_assist_agent.run_initial_diagnosis_agent(query = prompt, token = token)

        initial_meeting_message = f"""Hello Team,
            A meeting has been scheduled to discuss the incident {inc_details.get('number')} which is categorized as {inc_details.get('category')} and has a priority of {inc_details.get('priority')}.
            Below are the initial diagnosis details for the incident:\n\n{response}"""
        
        return initial_meeting_message

    def get_access_token(self):
        authority = f"https://login.microsoftonline.com/{CONFIG.APP_TENANTID}"  # <-- tenant-specific
        app = msal.ConfidentialClientApplication(CONFIG.CLIENT_ID, authority = authority, client_credential = CONFIG.CLIENT_SECRET)
        result = app.acquire_token_for_client(scopes = ["https://graph.microsoft.com/.default"])
        access_token = result["access_token"]
        
        return access_token
    
    def get_conversation_history(self, meeting_id):
        since_iso = None
        top = 50
        order_by: str = "lastModifiedDateTime desc"
        base = f"https://graph.microsoft.com/v1.0/chats/{meeting_id}/messages"
        access_token = self.get_access_token()
        headers = {"Authorization": f"Bearer {access_token}", "content-type": "application/json"}
        
        # Build query with $top and $orderby; add $filter if provided (must match the same property)
        params = [f"$top={min(top,50)}", f"$orderby={order_by}"]
        if since_iso:
            field = order_by.split()[0]  # lastModifiedDateTime or createdDateTime
            if field == "lastModifiedDateTime":
                params.append(f"$filter={field} gt {since_iso}")
            elif field == "createdDateTime":
                params.append(f"$filter={field} gt {since_iso}")  # gt not documented for createdDateTime; if ignored, Graph just returns unfiltered
        url = base + "?" + "&".join(params)

        items: List[Dict[str, Any]] = []
        while True:
            resp = requests.get(url, headers = headers, timeout = 30)
            if resp.status_code != 200:
                raise RuntimeError(f"Graph error {resp.status_code}: {resp.text}")
        
            payload = resp.json()
            items.extend(payload.get("value", []))
            next_link = payload.get("@odata.nextLink")
        
            if not next_link:
                break
            url = next_link  # continue paging

        return items

    def get_meeting_info(self, meeting_url):
        access_token = self.get_access_token()
        url = f"https://graph.microsoft.com/v1.0/users/{CONFIG.USER_ID}/onlineMeetings"
        params = {"$filter": f"JoinWebUrl eq '{meeting_url}'"}
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.get(url, headers = headers, params = params)
            response.raise_for_status()  # Raise an exception for HTTP errors
            if "error" in response.json():
                error_message = response.json()["error"].get("message", "Unknown error")
                log_event(application_logger,
                        logging.ERROR,
                        error_message,
                        is_exception = True,
                        module_name = "mim_assist",
                        component_type = "app_utils_execution",
                        component_name = "mim_assist_utils - get_meeting_info")
                return (False, error_message)
            return (True, response.json().get("value")[0])
        except Exception as e:
            error_message = f"MIM meeting info retrieval failed: {str(e)}"
            log_event(application_logger,
                        logging.ERROR,
                        error_message,
                        is_exception = True,
                        module_name = "mim_assist",
                        component_type = "app_utils_execution",
                        component_name = "mim_assist_utils - get_meeting_info")
            return (False, error_message)


    def get_conversation_participants(self, meeting_id):
        """
        Fetches the MIM meeting attendance details for the given meeting ID.
        """
        access_token = self.get_access_token()
        url = f"https://graph.microsoft.com/v1.0/users/{CONFIG.USER_ID}/onlineMeetings/{meeting_id}/attendanceReports"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
       
        participants = []
        try:
            response = requests.get(url, headers = headers)
            response.raise_for_status()  # Raise an exception for HTTP errors
            
            if "error" in response.json():
                error_message = response.json()["error"].get("message", "Unknown error")
                
                log_event(application_logger,
                        logging.ERROR,
                        error_message,
                        is_exception = True,
                        module_name = "mim_assist",
                        component_type = "app_utils_execution",
                        component_name = "mim_assist_utils - get_conversation_participants")
                return(False, error_message)
            
            # meeting_start_datetime = response.json().get("value")[-1].get("meetingStartDateTime")
            values = response.json().get("value", [])

            meeting_start_datetime = (
                values[-1].get("meetingStartDateTime", None)
                if values
                else None
            )

            for item in response.json().get("value", []):
                url = f"https://graph.microsoft.com/v1.0/users/{CONFIG.USER_ID}/onlineMeetings/{meeting_id}/attendanceReports/{item.get('id')}/attendanceRecords"
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                try:
                    response = requests.get(url, headers = headers)
                    response.raise_for_status()  # Raise an exception for HTTP errors
                    
                    for record in response.json().get("value", []):
                        participants.append(record.get("emailAddress"))

                except Exception as e:
                    log_event(application_logger,
                        logging.ERROR,
                        f"MIM meeting attendance records retrieval failed: {str(e)}",
                        is_exception = True,
                        module_name = "mim_assist",
                        component_type = "app_utils_execution",
                        component_name = "mim_assist_utils - get_conversation_participants")
            data = {
                "meeting_start_datetime": meeting_start_datetime,
                "participants": participants
            }
            return (True, data)
                    
        except Exception as e:
            error_message = f"MIM meeting attendance details retrieval failed: {str(e)}"
            log_event(application_logger,
                        logging.ERROR,
                        error_message,
                        is_exception = True,
                        module_name = "mim_assist",
                        component_type = "app_utils_execution",
                        component_name = "mim_assist_utils - get_mim_meeting_attendance_details")
            return (False, error_message)
    
    async def get_mim_details(self, incident_number, token):
        db_local_session = db_session.get_db()
        (status, mim_details) = core_crud.get_mim_details_by_incident_number(db_local_session, incident_number)
        db_local_session.close()
    
        if not status:
            return (False, mim_details)
        
        if not mim_details:
            return (False, f"Meeting data not available for incident: {incident_number}")
        
        if mim_details.ticket_state in ["Closed", "Resolved"] and not mim_details.participants:
        
            db_local_session = db_session.get_db()
            (status, data) = self.get_conversation_participants(mim_details.meeting_details.get("meeting_id"))
            (status, mim_details) = core_crud.update_mim_details(db_local_session, mim_details.incident_number, {"participants": data.get("participants")})
            db_local_session.close()
            if not status:
                return (False, mim_details)
        
            # return (True, mim_details)
        elif mim_details.ticket_state in ["Closed", "Resolved"]:
            pass
        
        else:
            configs = scf.get_system_config()
            itsm_tag = ",".join(configs["itsm_tags"])
            
            itsm_obj = ServiceNow()
            (status, incident_details) = itsm_obj.list_ticket_details(
                itsm_tags = itsm_tag,
                table = "incident",
                conditions = [{"param": "number", "op": "=", "val": incident_number}], 
                module_name = "mim_assist"
            )

            tok_obj = SSOTokenGenerator()
            
            conv_history = self.get_conversation_history(mim_details.meeting_details.get("threadId"))
            conversation_history = []
            chat_participants = []
            for entry in reversed(conv_history):
                conv = {}
                try:
                    user_name = entry["from"]["user"]["displayName"]
                    user_email = tok_obj.get_user_email(entry["from"]["user"]["id"])
                    chat_participants.append(user_email)
                    user = "user"
    
                except Exception:
                    user_name = os.getenv("BOT_NAME", "MIMBotlocal")
                    user = "system"
                
                conv["role"] = user
                
                soup = BeautifulSoup(entry["body"]["content"])
                text = soup.get_text()
                if text and text.strip() != "":
                    conv["content"] = f"{user_name}: {text}"
    
                conversation_history.append(conv)

            filtered_conversation = [
                msg for msg in conversation_history
                if msg.get("content", "").strip()
            ]

            config = scf.get_system_config()
            sys_prompts_config = config["sys_prompts_config"]
            summary_sys_prompt = sys_prompts_config.get("summary_agent", None)
            (description, instruction) = scf.apply_system_prompt_guardrail(summary_sys_prompt)

            query = instruction
            query += f"\nHere are the Incident details: {incident_details}\n\n and Conversation History:\n{filtered_conversation}"
            incident_summary = await mim_assist_agent.run_summary_agent(query, token)

            if incident_summary:
                incident_summary = "{" + "}".join("{".join(incident_summary.strip().split("{")[1:]).strip().split("}")[:-1]) + "}"
                incident_summary = json.loads(incident_summary)

            (status, data) = self.get_conversation_participants(mim_details.meeting_details.get("meeting_id"))
            if status:
                participants = data.get("participants", [])
                meeting_start_datetime = data.get("meeting_start_datetime", datetime.datetime.now())
            
            if chat_participants:
                participants.extend(chat_participants)

            db_local_session = db_session.get_db()
            insert_data = {
                "participants": list(set(participants)) if participants else [],
                "meeting_start_datetime": meeting_start_datetime,
                "incident_summary": incident_summary,
                "conversation_history": filtered_conversation,
                "incident_details": incident_details[0],
                "ticket_state": incident_details[0].get("state")
            }

            (status, mim_details) = core_crud.update_mim_details(db_local_session, mim_details.incident_number, insert_data)
            db_local_session.close()
            if not status:
                return (False, mim_details)

        incident_data = mim_details.incident_summary or {}

        response = {
            column.name: value
            for column in mim_details.__table__.columns
            if (value := getattr(mim_details, column.name)) is not None
        }

        response["incident_summary"] = incident_data.get("incident_summary", "")
        response["rca"] = incident_data.get("rca", "")

        return (True, response)
            

            
