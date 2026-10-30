# Author - Viraj Purandare
# Created On - December 4, 2025

# Default packages
from typing import Optional, Any, Union, List, Dict

# Third party packages
from pydantic import BaseModel, Field, model_validator, EmailStr

class User(BaseModel):
    user_id: str = Field(description = "Login ID")
    name: str = Field(description = "Full name of the user")
    email: Optional[EmailStr] = Field(description = "")
    email_verified: bool = Field(description = "Operating systems of configuration item subjected to the change", default = False)
    groups: Optional[list] = Field(description = "Comma separated list of architecture image names with .png extension", default = [])
