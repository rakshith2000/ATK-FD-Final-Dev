# Author - Viraj Purandare and Anish Bhandiwad
# Created On - October 1, 2025

# Default packages
from typing import Optional, Any, Union, List, Dict

# Third party packages
from pydantic import BaseModel, Field, model_validator

class ChangePromptRequestModel(BaseModel):
    change_title: str = Field(description = "Change topic")
    change_purpose: str = Field(description = "Purpose of the change")
    config_items: Optional[str] = Field(description = "Comma separated list of configuration items")
    os_info: Optional[str] = Field(description = "Operating systems of configuration item subjected to the change")
    uploaded_files: Optional[str] = Field(description = "Comma separated list of architecture image names with .png extension")

    @model_validator(mode = "after")
    def validate_payload(self):
        if not self.uploaded_files and not self.config_items:
            raise ValueError("At least one of 'uploaded_files' or 'config_items' must be provided")
        return self

class ChangeRequestCreationITSMModel(BaseModel):
    # itsm_tags: str = Field(description = "Comma separated list of ITSM tags")
    short_description: str = Field(..., min_length = 1, description = "Short description of the change request")
    description: str = Field(..., min_length = 1, description = "Description of the change request")
    ci: str = Field(None, description = "Configuration item related to the change request")
    chg_model: str = Field(None, description = "Change model to be followed for the change request")
    implementation_plan: str = Field(None, description = "Implementation plan for the change request")
    backout_plan: str = Field(None, description = "Backout plan for the change request")
    test_plan: str = Field(None, description = "Test plan for the change request")
    risk_impact_analysis: str = Field(None, description = "Risk impact analysis for the change request")
    attachments: list = Field([], description = "List of attachments to be added to the change request")
