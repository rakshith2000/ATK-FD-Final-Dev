# Author - Viraj Purandare
# Created On - May 5, 2026

# Default packages
from typing import List, Annotated

# Third party packages
from pydantic import BaseModel, Field, StringConstraints

class MCQGenerationRequestModel(BaseModel):
    articles_number: List[str] = Field(description = 'List of article numbers up to 3, Reference: ["KB00001",  "KB00002", "KB00003"]', min_length = 1)

class MCQGenerationRequestModel_v1(BaseModel):
    articles_number: List[str] = Field(description = 'List of article numbers up to 3, Reference: ["KB00001",  "KB00002", "KB00003"]', min_length = 1
    )
    difficulty_level: str = Field(
        default="Beginner",
        description="Beginner | Specialist | Expert"
    )

class QuizRetrievalRequestModel(BaseModel):
    quiz_code: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Quiz code of the current user")
    type_of_submit: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "One of the following values - start, refresh, submit or expired", default = "start")

class QuizSubmissionRequestModel(BaseModel):
    quiz_code: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Quiz code of the current user")
    type_of_submit: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "One of the following values - start, refresh, submit or expired", default = "submit")
    questions: List[dict] = Field(description = "Questions with user response filled", default = [])

class ScenarioGenerationRequestModel(BaseModel):
    articles_number: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = 'Article for scenario generation - E.g. ["KB00001"]')
    prompt: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "User request", default = "")
    conv_history: list = []

class IncorrectQuizResponseRequestModel(BaseModel):
    quiz_code: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Quiz code of the current user")
