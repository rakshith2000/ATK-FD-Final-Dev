# Author - Viraj Purandare, Vishwas K S and Ragavan Veerarajan
# Created On - July 3, 2026

# Default packages
from enum import Enum
from typing import Optional, Any, Union, List, Dict

# Third party packages
from pydantic import BaseModel, Field, model_validator

class ScheduleMeetingRequestModel(BaseModel):
    incident_number: str = Field(..., min_length = 1,
                                 description = "Incident number for which the meeting is to be scheduled")

class GetMIMDetailsRequestModel(BaseModel):
    incident_number: str = Field(..., min_length = 1,
                                 description = "Incident number for which the MIM details are to be fetched")

class ConfigFileType(str, Enum):
    """Type of config file to download - the blank template or the actual (in-use) file."""
    template = "template"
    actual = "actual"