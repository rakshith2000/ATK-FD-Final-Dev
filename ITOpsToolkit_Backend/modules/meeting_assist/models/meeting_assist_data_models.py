# Author - Viraj Purandare
# Created On - April 30, 2026

# Default packages
from typing import Optional, Any, Union, List, Dict, Annotated

# Third party packages
from pydantic import BaseModel, Field, model_validator, StringConstraints

class MeetingBaseModel(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Onboard title of the meeting")
    web_meeting_url: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Meeting URL")

class GroupUpdateRequestModel(BaseModel):
    groups: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "| separated groups")

class OnboardMeetingRequestModel(MeetingBaseModel):
    groups: str = Field(description = "Pipe separated list of Keycloak groups to make meeting accessible by all participants of the group",
                        default = None)

class MeetingByPersonGroupRequestModel(BaseModel):
    email: str = Field(description = "Email ID of logged in person", default = None)
    groups: str = Field(description = "Pipe separated list of Keycloak groups to make meeting accessible by all participants of the group",
                        default = None)

class QuestionRequestModel(BaseModel):
    meeting_ids: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "comma separated meeting ids")
    question: str = Field(description = "User query over a chat")
    conversation_history: list[dict] = Field(description = "Chatbot conversation history")

class UploadKnowledgeArticlesRequestModel(BaseModel):
    short_description: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Short description of the article")
    text: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Content of the article")
    kb_knowledge_base: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Knowledge base to which the article belongs")
    kb_category: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Category of the article")

class ArticleConversionRequestModel(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Title of the article")
    content: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Content of the article in markdown format")