from pydantic import BaseModel, Field
from typing import Optional, List

class UpdateIncidentRequestModel(BaseModel):
    incident_number: str = Field(..., min_length=1, description="Incident number to be updated (e.g. INC0010001)")
    close_notes: Optional[str] = Field(default="", description="Resolution notes to be added to the ticket")
    resolve: Optional[bool] = Field(default=False, description="Whether to resolve the ticket")
    assignment_group: Optional[str] = Field(default="", description="Assignment group to reassign the ticket to")
    assigned_to: Optional[str] = Field(default="", description="User to reassign the ticket to")
    urgency: Optional[str] = Field(default="", description="Urgency value (e.g. 1=High, 2=Medium, 3=Low)")
    impact: Optional[str] = Field(default="", description="Impact value (e.g. 1=High, 2=Medium, 3=Low)")
    state: Optional[str] = Field(default="", description="Incident state value (e.g. 2=In Progress, 6=Resolved)")
    priority: Optional[str] = Field(default="", description="Priority value (e.g. 1=Critical, 2=High, 3=Moderate)")
    short_description: Optional[str] = Field(default="", description="Short description / summary of the incident")
    description: Optional[str] = Field(default="", description="Detailed description of the incident")
    close_code: Optional[str] = Field(default="", description="Close/resolution code (e.g. 'Solved (Permanently)')")
    comments_and_work_notes: Optional[str] = Field(default="", description="Combined note written to both comments and work_notes")

class UpdateSRRequestModel(BaseModel):
    service_request_number: str = Field(..., min_length=1, description="Service request number to be updated (e.g. REQ0010001)")
    close_notes: Optional[str] = Field(default="", description="Resolution notes to be added to the service request")
    resolve: Optional[bool] = Field(default=False, description="Whether to resolve the ticket")
    assignment_group: Optional[str] = Field(default="", description="Assignment group to reassign the service request to")
    assigned_to: Optional[str] = Field(default="", description="User to reassign the service request to")
    urgency: Optional[str] = Field(default="", description="Urgency value (e.g. 1=High, 2=Medium, 3=Low)")
    impact: Optional[str] = Field(default="", description="Impact value (e.g. 1=High, 2=Medium, 3=Low)")
    state: Optional[str] = Field(default="", description="Incident state value (e.g. 2=In Progress, 6=Resolved)")
    priority: Optional[str] = Field(default="", description="Priority value (e.g. 1=Critical, 2=High, 3=Moderate)")
    short_description: Optional[str] = Field(default="", description="Short description / summary of the service request")
    description: Optional[str] = Field(default="", description="Detailed description of the incident")
    close_code: Optional[str] = Field(default="", description="Close/resolution code (e.g. 'Solved (Permanently)')")
    work_notes: Optional[str] = Field(default="", description="Note written to both work notes")


class ListIncidentJournalRequestModel(BaseModel):
    sys_id: str = Field(..., min_length = 1, description = "sys_id of the incident to list work notes and comments")

class ListRelatedAlertsRequestModel(BaseModel):
    inc_sys_id: str = Field(..., min_length = 1, description = "sys_id of the incident for which alerts need to be listed")

class ListGroupMembersRequestModel(BaseModel):
    assignment_group: str = Field(..., min_length = 1, description = "Name of the assignment group")

class ListCiIncidentsRequestModel(BaseModel):
    cmdb_ci_sys_id: str = Field(..., min_length = 1, description = "sys_id of the CMDB CI to list related incidents")

class ListCiChangeRequestsRequestModel(BaseModel):
    cmdb_ci_sys_id: str = Field(..., min_length = 1, description = "sys_id of the CMDB CI to list related change requests")

class ListRelevantArticlesRequestModel(BaseModel):
    # short_description: str = Field(..., min_length = 1, description = "Short description of the incident")
    # description: str = Field(..., min_length = 1, description = "Description of the incident")
    # close_notes: str = Field(description = "Close notes of the incident")
    # comments: str = Field(description = "Comments of the incident")
    incident_details: dict = Field(..., min_length = 1, description = "Incident details")
    
class ChatBotRequestModel(BaseModel):
    query: str = Field(..., min_length = 1, description = "User query")
    conversation_history: List[dict] = Field([], description = "Conversation history of the chat.")

class ResolutionSummaryRequestModel(BaseModel):
    conversation_history: List[dict] = Field([], description = "Conversation history of the chat.")

    
