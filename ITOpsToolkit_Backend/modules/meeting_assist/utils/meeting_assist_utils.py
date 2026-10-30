# Author - Viraj Purandare and Vishwas K S
# Created On - May 15, 2026

# Default packages
import os
import re
import sys
import json
import datetime

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("modules")[0]
DB_PATH = os.path.join(ROOT_PATH, "database")
MCP_PATH = os.path.join(ROOT_PATH, "mcp_servers")

sys.path.append(SCRIPT_PATH)
sys.path.append(ROOT_PATH)
sys.path.append(MCP_PATH)

# Custom packages
import core_crud
import db_session

import system_config_ma as scf

import meeting_handler as mh

from meeting_assist_agents import run_transcript_summary_agent, run_articles_generator_agent, run_inferrer, run_converter

from servicenow_mcp import ServiceNow

# Meeting assist functionalities
class MeetingAssistUtils:
    def __init__(self):
        pass

    # Onboarding meeting
    def insert_meeting_details(self, meeting_details):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.insert_meeting_details(db_local_session, meeting_details)
        db_local_session.close()
        return (status, data)

    # Retrieve meeting details
    def get_meeting_details(self, meeting_id):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.get_meeting_details(db_local_session, meeting_id)
        db_local_session.close()
        return (status, data)

    # List meetings
    def list_meetings_by_participant_or_group(self, participant = None, group = None):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.list_meetings_by_participant_or_group(db_local_session, participant, group)
        db_local_session.close()
        return (status, data)

    # Update meeting details
    def update_meeting_details(self, meeting_id, meeting_update_details):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.update_meeting_details(db_local_session, meeting_id, meeting_update_details)
        db_local_session.close()
        return (status, data)

    # Delete meeting
    def delete_meeting_by_meeting_id(self, meeting_details):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.delete_meeting_by_meeting_id(db_local_session, meeting_details)
        db_local_session.close()
        return (status, data)

    # Start meeting
    def start_or_refresh_meeting(self, meeting_id, user_id, retrieval_type = "reload"):
        # Retrieve meeting
        (status, db_meeting) = self.get_meeting_details(meeting_id)
        if not status:
            return (status, db_meeting)
        
        # Meeting not found
        if db_meeting is None:
            return (False, "Meeting not found")

        # Validate authentication
        (status, existing_auth) = self.get_meeting_auth_session_public(meeting_id)
        if not status or existing_auth is None:
            return (status, existing_auth)

        # Retrieve access token
        (status, tokens) = mh.get_ms_tokens_public_flow(existing_auth.auth_code)
        if not status:
            return (status, tokens)

        if "error" in tokens:
            if tokens["error"] == "expired_token":
                (status, tokens) = self.get_refreshed_auth_token(tokens.get("refresh_token"))

                if not status:
                    return (status, tokens)
                    
        # Simulate token exchange
        if "access_token" in tokens and "refresh_token" in tokens:
            access_token = tokens["access_token"]
            refresh_token = tokens["refresh_token"]
            expires_in = 3600
            
            # Update auth session with tokens
            (status, data) = self.update_meeting_auth_session_public_tokens(meeting_id, access_token, refresh_token, expires_in)
            if not status:
                return (status, data)
            
            # Fetch meeting info
            (status, meeting_info) = mh.get_meeting_info(db_meeting.web_meeting_url, access_token)
            if not status:
                return (status, meeting_info)

            (status, participants) = self.list_meeting_participants_by_meeting_id(meeting_id, user_id, retrieval_type)
            if not status:
                return (status, participants)
        
            # Update meeting status
            meeting_update_details = {
                "meeting_update": {
                    "created_at": meeting_info.get("value")[0].get("startDateTime"),
                    "ended_at": meeting_info.get("value")[0].get("endDateTime"),
                    "started_at": datetime.datetime.now(datetime.UTC),
                    "subject": meeting_info.get("value")[0].get("subject"),
                    "auth_required": False
                },
                "logged_in_user": user_id 
            }

            (status, data) = self.update_meeting_details(meeting_id, meeting_update_details)
            if not status:
                return (status, data)

            if retrieval_type == "refresh":
                (status, data) = self.archive_meeting_articles(meeting_id)
                if not status:
                    return (status, data)
                
                db_local_session = db_session.get_db()
                (status, data) = core_crud.delete_meeting_summary(db_local_session, meeting_id)
                db_local_session.close()
                if not status:
                    return (status, data)

        else:
            access_token = ""
            refresh_token = ""
            expires_in = 0

        # Return tokens
        output = {"access_token": access_token, "refresh_token": refresh_token, "expires_in": expires_in}
        return (True, output)

    # Retrieve public auth session for meeting
    def get_meeting_auth_session_public(self, meeting_id):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.get_meeting_auth_session_public(db_local_session, meeting_id)
        db_local_session.close()
        return (status, data)
    
    # Retrieve public flow auth details
    def get_public_flow_auth_details(self, meeting_id, retrieval_type = "reload"):
        db_local_session = db_session.get_db()

        (status, auth_session) = core_crud.get_meeting_auth_session_public(db_local_session, meeting_id)
        if not status:
            db_local_session.close()
            return (status, auth_session)
    
        if auth_session and retrieval_type == "reload":
            db_local_session.close()
            return (status, auth_session)
            
        elif (auth_session and retrieval_type == "refresh") or not auth_session:
            (status, data) = self.delete_meeting_auth_session_public(meeting_id)
            if not status and auth_session:
                db_local_session.close()
                return (status, data)

            (status, auth_code) = mh.get_user_verification_code_public_flow()
            if not status:
                db_local_session.close()
                return (status, auth_code)

            (status, auth_details) = core_crud.insert_meeting_auth_session_public(db_local_session, meeting_id, auth_code)
            db_local_session.close()
            return (status, auth_details)

    # Update public auth session for meeting
    def update_meeting_auth_session_public_tokens(self, meeting_id, access_token, refresh_token, expires_in):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.update_meeting_auth_session_public_tokens(db_local_session, meeting_id, access_token, refresh_token, expires_in)
        db_local_session.close()
        return (status, data)

    # Fetch access token for meeting
    def get_access_token_by_meeting_id(self, meeting_id):
        (status, existing_auth) = self.get_meeting_auth_session_public(meeting_id)
        if not status:
            return (status, existing_auth)

    # Get refreshed auth token
    def get_refreshed_auth_token(self, refresh_token):
        (status, token_response) = mh.refresh_ms_token_public_flow(refresh_token)
        return (status, token_response)

    # Delete public auth session for meeting
    def delete_meeting_auth_session_public(self, meeting_id):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.delete_meeting_auth_session_public(db_local_session, meeting_id)
        db_local_session.close()
        return (status, data)

    # Onboard transcript for meeting
    def insert_meeting_transcript(self, transcript_details):
        db_local_session = db_session.get_db()
        for transcript in transcript_details:
            (status, data) = core_crud.insert_meeting_transcript_details(db_local_session, transcript)

            if not status:
                db_local_session.close()
                return (status, data)
            
        db_local_session.close()
        return (True, "Meeting transcripts onboarded successfully.")
    
    # List multiple meeting transcripts 
    def list_meeting_transcripts_by_meeting_ids(self, meeting_ids):
        db_local_session = db_session.get_db()
        meeting_ids = meeting_ids.split(",")
        (status, db_transcripts) = core_crud.list_meeting_transcripts_by_meeting_ids(db_local_session, meeting_ids)
        db_local_session.close()
        return (status, db_transcripts)
            
    # List meeting transcripts for recursive meeting
    def list_meeting_transcripts_by_meeting_id(self, meeting_id, retrieval_type = "reload"):
        db_local_session = db_session.get_db()
        (status, db_meeting) = self.get_meeting_details(meeting_id)
        if not status:
            db_local_session.close()
            return (False, db_meeting)

        # List the existing meeting transcripts
        (status, existing_transcripts) = core_crud.list_meeting_transcripts_by_meeting_id(db_local_session, meeting_id)
        if not status:
            db_local_session.close()
            return (status, existing_transcripts)
        
        # If transcripts exists and retrieval type is reload, return the existing transcripts without making API call to MS Graph
        if existing_transcripts and retrieval_type == "reload":
            db_local_session.close()
            return (True, existing_transcripts)
        
        # If no transcripts exists or if retrieval type is refresh, make API call to MS Graph
        elif (existing_transcripts and retrieval_type == "refresh") or not existing_transcripts:
            (status, existing_auth) = self.get_meeting_auth_session_public(meeting_id)
            if not status:
                db_local_session.close()
                return (status, existing_auth)
            
            token = existing_auth.access_token
            (status, meeting_info) = mh.get_meeting_info(db_meeting.web_meeting_url, token)
            if not status:
                db_local_session.close()
                return (status, meeting_info)

            teams_meeting_id = meeting_info.get("value")[0].get("id")
            (status, transcript_list) = mh.list_transcripts(teams_meeting_id, token)

            if not status:
                db_local_session.close()
                return (status, transcript_list)
            
            if "error" in transcript_list:
                if transcript_list.get("error").get("code") == "InvalidAuthenticationToken":
                    (status, token_details) = self.get_refreshed_auth_token(existing_auth.refresh_token)
                    if not status:
                         db_local_session.close()
                         return (status, token_details)
                     
                    (status, token_details) = self.update_meeting_auth_session_public_tokens(meeting_id, token_details.get("access_token"), token_details.get("refresh_token"), token_details.get("expires_in"))
                    if not status:
                        db_local_session.close()
                        return (status, token_details)
                    
                    (status, transcript_list) = mh.list_transcripts(teams_meeting_id, token_details.access_token)
                    if not status:
                        db_local_session.close()
                        return (status, transcript_list)
                    
            existing_transcript_ids = []
            new_transcripts = []

            if existing_transcripts:
                existing_transcript_ids = [t.id for t in existing_transcripts]
            
            # Filter and prepare new transcripts to be inserted
            for transcript in transcript_list.get("value"):
                if transcript.get("id") not in existing_transcript_ids:
                    temp_transcript = {}
                    temp_transcript["id"] = transcript.get("id")
                    temp_transcript["meeting_id"] = meeting_id
                    temp_transcript["transcript_timestamp"] = transcript.get("createdDateTime")

                    (status, content) = mh.get_transcript_content(teams_meeting_id, transcript.get("id"), token)
                    if not status:
                        db_local_session.close()
                        return (status, content)

                    temp_transcript["content"] = content

                    new_transcripts.append(temp_transcript)

            # Insert new transcripts to database
            (status, data) = self.insert_meeting_transcript(new_transcripts)
            if not status:
                db_local_session.close()
                return (status, data)
            
            # Prepare final list of meeting transcripts to be returned
            (status, refreshed_transcripts) = core_crud.list_meeting_transcripts_by_meeting_id(db_local_session, meeting_id)
            db_local_session.close()
            return (status, refreshed_transcripts)

    # List participants by meeting id
    def list_meeting_participants_by_meeting_id(self, meeting_id, user_id, retrieval_type = "reload"):
        db_local_session = db_session.get_db()

        (status, participants) = core_crud.list_meeting_participants(db_local_session, meeting_id)
        if not status:
            db_local_session.close()
            return (status, participants)
        
        # If transcripts exists and retrieval type is reload, return the existing transcripts without making API call to MS Graph
        if participants and retrieval_type == "reload":
            db_local_session.close()
            return (True, participants)
        
        # If no participants exists or if retrieval type is refresh, make API call to MS Graph
        elif (participants and retrieval_type == "refresh") or not participants:
            (status, existing_auth) = self.get_meeting_auth_session_public(meeting_id)

            if not status:
                db_local_session.close()
                return (status, existing_auth)
            
            (status, db_meeting) = self.get_meeting_details(meeting_id)
            if not status:
                db_local_session.close()
                return (status, db_meeting)
            
            token = existing_auth.access_token

            (status, meeting_info) = mh.get_meeting_info(db_meeting.web_meeting_url, token)
            if not status:
                db_local_session.close()
                return (status, meeting_info)

            if "error" in meeting_info:
                if meeting_info.get("error").get("code") == "InvalidAuthenticationToken":
                    (status, token_details) = self.get_refreshed_auth_token(existing_auth.refresh_token)
                    if not status:
                         db_local_session.close()
                         return (status, token_details)
                     
                    (status, token_details) = self.update_meeting_auth_session_public_tokens(meeting_id, token_details.get("access_token"), token_details.get("refresh_token"), token_details.get("expires_in"))
                    if not status:
                        db_local_session.close()
                        return (status, token_details)
                    
                    (status, meeting_info) = mh.get_meeting_info(db_meeting.web_meeting_url, token_details.access_token)
                    if not status and not meeting_info:
                        db_local_session.close()
                        return (status, meeting_info)
                    
            if "error" in meeting_info:
                return (False, f"Meeting information retrieval failed (list meeting participants) - {meeting_info.get("error").get("message")}")

            participants = []
            participants.append(meeting_info.get("value")[0].get("participants").get("organizer").get("upn"))
            attendees = meeting_info.get("value")[0].get("participants").get("attendees")

            for attendee in attendees:
                participants.append(attendee.get("upn"))

            meeting_update_details = {
                "meeting_update": {
                    "participants": [participant.lower() for participant in participants],
                },
                "logged_in_user": user_id
            }

            (status, data) = core_crud.update_meeting_details(db_local_session, meeting_id, meeting_update_details)
            if not status:
                db_local_session.close()
                return (status, data)

        return (status, data.participants)
    
    # List meeting transcripts for recursive meeting
    def list_meeting_transcripts_by_meeting_link_id(self, meeting_link_id):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.list_meeting_transcripts_by_meeting_link_id(db_local_session, meeting_link_id)
        db_local_session.close()
        return (status, data)
    
    # Update keycloak groups
    def update_groups_by_meeting_id(self, groups, meeting_id):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.update_groups(db_local_session, groups, meeting_id)
        
        return (status, data)
    
    # Generate meeting details
    async def generate_meeting_details(self, meeting_id, token):
        (status, db_meeting) = self.get_meeting_details(meeting_id)
        if not status:
            return (status, db_meeting)
        
        (status, db_transcripts) = self.list_meeting_transcripts_by_meeting_id(meeting_id, "reload")
        if not status:
            return (status, db_transcripts)

        (status, db_summary) = await self.get_meeting_summary(meeting_id, token)
        if not status:
            db_summary = None

        (status, db_article) = await self.list_meeting_articles(meeting_id, token)
        if not status:
            db_article = None

        meeting_details = {
            "meeting": db_meeting,
            "transcripts": [{t.transcript_timestamp: t.content} for t in db_transcripts] if db_transcripts else [],
            "summary": db_summary.content,
            "knowledge_articles": [{"title": a.title, "content": a.content} for a in db_article] if db_article else []        
        }
        
        return (True, meeting_details)

    # Generate summary for meeting
    async def generate_meeting_summary(self, meeting_id, token):
        db_local_session = db_session.get_db()
        status, meeting_transcripts = core_crud.list_meeting_transcripts_by_meeting_id(db_local_session, meeting_id)
        
        if not status:
            return (status, meeting_transcripts)
        
        transcripts = "\n\n".join([t.content for t in meeting_transcripts])

        # Call LLM to generate summary
        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        pra_sys_prompt = sys_prompts_config.get("meeting_transcript_summary_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

        query = f"{instruction} \nSummarize the following meeting transcript - \n\n{transcripts}"
        summary_content = await run_transcript_summary_agent(query, token)

        if not summary_content:
            return (False, "Please investigate agentic logs.")

        # Agent returns a JSON object as text (optionally fenced). Strip fences and parse.
        summary_content =  "{" + "}".join("{".join(summary_content.strip().split("{")[1:]).strip().split("}")[:-1]) + "}"
        summary_content = json.loads(summary_content)
    
        summary_content["meeting_id"] = meeting_id

        # Onboard summary to the database
        (status, db_summary) = core_crud.insert_meeting_summary_details(db_local_session, summary_content)

        if not status:
            return (status, db_summary)
        
        return (True, db_summary)

    # Fetch summary for meeting
    async def get_meeting_summary(self, meeting_id, token):
        db_local_session = db_session.get_db()
        (status, db_summary) = core_crud.get_meeting_summary(db_local_session, meeting_id)
        db_local_session.close()

        if not status:
            return (status, db_summary)
        
        if not db_summary:
            (status, db_summary) = await self.generate_meeting_summary(meeting_id, token)

        return (status, db_summary)
    
    # Generate article for meeting
    async def generate_meeting_article(self, meeting_id, token):
        db_local_session = db_session.get_db()
        (status, meeting_transcripts) = core_crud.list_meeting_transcripts_by_meeting_id(db_local_session, meeting_id)
        
        if not status:
            return (status, meeting_transcripts)
        
        transcripts = "\n\n".join([t.content for t in meeting_transcripts])

        # Call LLM to generate Articles
        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        pra_sys_prompt = sys_prompts_config.get("meeting_articles_generator_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)


        query = f"{instruction} \nGenerate knowledge articles from the meeting transcripts - \n\n{transcripts}"
        raw_articles = await run_articles_generator_agent(query, token)

        if not raw_articles:
            db_local_session.close()
            return (False, "Please investigate agentic logs.")

        # Agent returns a JSON list of articles as text (optionally fenced). Strip fences and parse.
        raw_articles = re.sub(r"^```json\s*|\s*```$", "", raw_articles.strip())
        raw_articles = json.loads(raw_articles)

        # Tolerate a {"articles": [...]} wrapper or a single article object.
        if isinstance(raw_articles, dict):
            raw_articles = raw_articles.get("articles", [raw_articles])

        for article_data in raw_articles:
            article_data["meeting_id"] = meeting_id

            # Onboard summary to the database
            (status, db_articles) = core_crud.insert_meeting_article_details(db_local_session, article_data)
            
            if not status:
                db_local_session.close()
                return (status, db_articles)
            
        (status, db_articles) = core_crud.list_meeting_articles_by_meeting_id(db_local_session, meeting_id)
         
        db_local_session.close()
        return (True, db_articles)
    
    # Fetch articles for meeting
    async def list_meeting_articles(self, meeting_id, token):
        db_local_session = db_session.get_db()
        (status, db_articles) = core_crud.list_meeting_articles_by_meeting_id(db_local_session, meeting_id)
        db_local_session.close()
        
        if not status:
            return (status, db_articles)
        
        if not db_articles:
            (status, db_articles) = await self.generate_meeting_article(meeting_id, token)

        return (status, db_articles)
    
    # Interactive chatbot contextualizing multiple meetings
    async def chat_bot(self, meeting_ids, query, conversation_history, token):
        # Transcripts of meetings - setting context
        if conversation_history == []:
            (status, transcripts) = self.list_meeting_transcripts_by_meeting_ids(meeting_ids,)
            if not status:
                return (status, transcripts)

            transcripts = "\n\n".join([f"--------------------{t.transcript_timestamp}--------------------\n{t.content}" for t in transcripts])
            context = f"{transcripts}\n\n---------------------------------------------------------\n\n"
            context += "WITH THE ABOVE CONTEXT, HANDLE BELOW LIVE CONVERSATION WITH ME -\n\n"

            conversation_history.append({"role": "user", "content": context})

        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        pra_sys_prompt = sys_prompts_config.get("meeting_chat_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)
        
        # Conversation history
        conversation_history.append({"role": "user", "content": query})
        query += f"\n\n{instruction}\n\nconversation history:"
        query = "\n".join([f"{msg.get('role')}: {msg.get('content')}" for msg in conversation_history])

        # Conversation history
        conversation_history.append({"role": "user", "content": query})
        query += f"\n\n{instruction}\n\nconversation history:"
        query = "\n".join([f"{msg.get('role')}: {msg.get('content')}" for msg in conversation_history])

        answer = await run_inferrer(query, token)
        if not answer:
            return ("Failed to response to user query", conversation_history)

        conversation_history.append({"role": "assistant", "content": answer})
        return (answer, conversation_history)
    
    # Generate knowledge article
    async def convert_to_html(self, details, token):
        configs = scf.get_system_config()
        sys_prompts_config = configs["sys_prompts_config"]
        pra_sys_prompt = sys_prompts_config.get("article_conversion_agent", None)
        (description, instruction) = scf.apply_system_prompt_guardrail(pra_sys_prompt)

        query = f"{instruction} \n\n"
        query += f"Generate detailed knowledge article for below content - \n\n"
        query += f"title: {details.title}\n\n"
        query += f"content: {details.content}\n\n"

        output = await run_converter(query, token)
        print("____________________")
        if output:
            output = "{" + "}".join("{".join(output.strip().split("{")[1:]).strip().split("}")[:-1]) + "}"
            output = json.loads(output)

            output_dict = {}
            output_dict["title"] = output.get("title", "")
            output_dict["converted_article"] = re.sub(r"^```html\s*|\s*```$", "", output["converted_article"].strip())

            return (True, output_dict)
        else:
            return (False, "Please investigate agentic logs.")
    
    # Fetch archive article for meeting
    def list_archived_meeting_articles_by_meeting_id(self, meeting_id):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.list_archived_meeting_articles_by_meeting_id(db_local_session, meeting_id)
        db_local_session.close()
        return (status, data)
    
    # Fetch archive article for group meeting
    def list_archived_meeting_article_by_meeting_link_id(self, meeting_link_id):
        db_local_session = db_session.get_db()
        (status, data) = core_crud.list_archived_meeting_articles_by_meeting_link_id(db_local_session, meeting_link_id)
        db_local_session.close()
        return (status, data)
    
    # Set archive flag for article
    def archive_meeting_articles(self, meeting_id):
        db_local_session = db_session.get_db()

        (status, db_articles) = core_crud.list_meeting_articles_by_meeting_id(db_local_session, meeting_id)
        if not status:
            db_local_session.close()
            return (status, db_articles)
        
        for article in db_articles:
            (status, data) = core_crud.update_meeting_article(db_local_session, article.id, {"archived": True})
            if not status:
                db_local_session.close()
                return (status, data)
            
        db_local_session.close()

        return (status, "Article/s archived successfully")

    # Knowledge article draft creation in ITSM
    def push_knowledge_article_to_itsm(self, payload, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, data) = itsm_obj.create_knowledge_article(itsm_tags = itsm_tags, user_id = user_id, short_description = payload.short_description, 
                                                           text = payload.text, kb_knowledge_base = payload.kb_knowledge_base, kb_category = payload.kb_category, 
                                                           module_name = "meeting_assist")

        return (status, data)

    # List knowledge base categories
    def list_knowledge_base_categories(self, user_id):
        configs = scf.get_system_config()
        itsm_tags = ",".join(configs["itsm_tags"])
        itsm_obj = ServiceNow()

        (status, data) = itsm_obj.list_knowledge_base_categories(itsm_tags = itsm_tags, user = user_id, module_name = "meeting_assist")

        return (status, data)
    
            
