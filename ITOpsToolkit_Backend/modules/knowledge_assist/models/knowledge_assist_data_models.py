# Author - Viraj Purandare
# Created On - April 28, 2026

# Default packages
from typing import Optional, Dict, Annotated

# Third party packages
from pydantic import BaseModel, Field, StringConstraints

class ArticleMergerRequestModel(BaseModel):
    kb_article_1: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "First duplicate knowledge article")
    kb_article_2: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Second duplicate knowledge article")

class ArticleRefinementRequestModel(BaseModel):
    kb_article: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Knowledge article to be refined")

class ArticleGenerationRequestModel(BaseModel):
    short_description : Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Short description of the issue")
    resolution_notes: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Resolution notes")
    description: Optional[str] = Field(description = "Description of the issue")
    work_notes_and_comments: Optional[str] = Field(description = "Diagnostic and troubleshooting notes")

class ArticleRetrievalRequestModel(BaseModel):
    kb_article: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Knowledge article to be refined")

class UploadKnowledgeArticlesRequestModel(BaseModel):
    short_description: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Short description of the article")
    text: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Content of the article")
    kb_knowledge_base: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Knowledge base to which the article belongs")
    kb_category: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Category of the article")

class UpdateKnowledgeArticleRequestModel(BaseModel):
    number: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique identifier (KB Number) of the knowledge article")
    text: Optional[str] = Field(description = "Content of the article")
    short_description: Optional[str] = Field(description = "Short description of the article")
    kb_knowledge_base: Optional[str] = Field(description = "Knowledge base to which the article belongs")
    kb_category: Optional[str] = Field(description = "Category of the article")

class ScoreArticleRequestModel(BaseModel):
    kb_article_content: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Content of the knowledge article to be scored")

class GetArticleScoreRequestModel(BaseModel):
    kb_article_number: Optional[str]= Field(
        default = "",
        description = "Unique identifier (KB Number) of the knowledge article to retrieve the score for"
    )