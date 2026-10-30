# Author - Viraj Purandare
# Created On - May 19, 2026

from pydantic import BaseModel, Field

class ProblemAssistModel(BaseModel):
    status: str = Field(description = "Status of problem tickets - Recommended, Approved, Rejected", default = "all")

class UploadProblemTicketRequestModel(BaseModel):
    short_description: str = Field(description = "Short description of the problem ticket")
    description: str = Field(description = "Detailed description of the problem ticket")
    impact: str = Field(description = "Impact of the problem (1 - High, 2 - Medium, 3 - Low)", default = "")
    urgency: str = Field(description = "Urgency of the problem (1 - High, 2 - Medium, 3 - Low)", default = "")
    assignment_group: str = Field(description = "Assignment group sys_id for the problem ticket", default = "")
    assigned_to: str = Field(description = "Assigned user sys_id for the problem ticket", default = "")
    related_incidents: list[dict] = Field(description = "Incident detailswith number", default = [])
    cmdb_ci: str = Field(description = "Configuration item sys_id related to the problem", default = "")
    opened_by: str = Field(description = "User sys_id who is opening the problem ticket", default = "")

class UpdateProblemTicketRequestModel(BaseModel):
    id: str = Field(description = "Local DB record ID of the problem ticket to update", default = "")
    number: str = Field(description = "Problem ticket number to update in ITSM", default = "")
    short_description: str = Field(description = "Updated short description of the problem ticket", default = "")
    description: str = Field(description = "Updated detailed description of the problem ticket", default = "")
    impact: str = Field(description = "Updated impact of the problem (1 - High, 2 - Medium, 3 - Low)", default = "")
    urgency: str = Field(description = "Updated urgency of the problem (1 - High, 2 - Medium, 3 - Low)", default = "")
    assignment_group: str = Field(description = "Updated assignment group sys_id", default = "")
    assigned_to: str = Field(description = "Updated assigned user sys_id", default = "")
    related_incidents: list[dict] = Field(description = "Incident detailswith number", default = [])
    cmdb_ci: str = Field(description = "Updated configuration item sys_id related to the problem", default = "")

class ListProblemTicketRequestModel(BaseModel):
    numbers: str = Field(description = "Problem ticket numbers to fetch details from ITSM (e.g. PRB0000001, PRB0000002)", default = "")


class ProblemRCARequestModel(BaseModel):
    problem_number: str = Field(description = "Problem ticket number to generate RCA document for")

class ProblemDetailsUpdateModel(BaseModel):
    update_dict: dict = Field(description = "Problem ticket updates")
    id: str = Field(description = "Recommendation ID")