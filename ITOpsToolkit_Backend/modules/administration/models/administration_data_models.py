# Author - Viraj Purandare and Anish Bhandiwad
# Created On - October 1, 2025

# Default packages
from enum import Enum
from typing import Optional, Any, Union, List, Dict, Annotated

# Third party packages
from pydantic import BaseModel, Field, model_validator, StringConstraints, HttpUrl, AfterValidator

# Enums
class VaultType(Enum):
    aws = "AWS"
    azure = "Azure"
    google = "Google"
    hashicorp = "Hashicorp"

class LLMType(Enum):
    nova = "AWS Nova"
    azure = "Azure OpenAI"
    gemini = "Google Gemini"

class LLMGuards(Enum):
    toxicity = "Toxicity"
    malicious_urls = "MaliciousURLs"
    gibberish = "Gibberish"
    bancode = "Bancode"
    prompt_injection = "PromptInjection"
    anonymization = "Anonymization"
    bias = "Bias"

class ITSMType(Enum):
    servicenow = "ServiceNow"

class ITSMAuthType(Enum):
    service_account = "Service Account"
    bearer_token = "Bearer Token"

class FormType(str, Enum):
    incident_form = "Incident Form"
    change_form = "Change Form"
    problem_form = "Problem Form"

'''
Below model is not helpful as Pydatic model doesn't support UploadFile.

# Vault models
class VaultModel(BaseModel):
    vault_type: Annotated[VaultType, Field(description = "Type of vault")]
    vault_env_file: Annotated[UploadFile, File(description = "Environment file for vault")]
'''

# LLM models
class LLMModel(BaseModel):
    llm_tag: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of LLM instance")
    llm_type: LLMType = Field(description = "Type of LLM")
    llm_config: Dict[str, Any] = Field(description = "LLM configuration JSON")
    # logged_in_user: str = Field(description = "User updating the LLM")

class LLMDetailsRequestModel(BaseModel):
    llm_tag: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of LLM instance")

class LLMDeleteRequestModel(BaseModel):
    llm_tag: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of LLM instance")

# LLM proxy models
class LLMProxyModel(BaseModel):
    proxy_base_url: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Base URL for LiteLLM proxy container")
    proxy_key: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "API key for LiteLLM proxy container")

# Prompt library models
class ToolkitPackageGlobalConfigModel(BaseModel):
    package_name: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of toolkit package")
    llm_tag: Optional[str] = Field(description = "Unique name of LLM instance")
    llm_guards: Optional[List[LLMGuards]] = Field(description = "Type/s of LLM Guard") 
    itsm_tags: Optional[List] = Field(description = "One or more ITSM tags")
    # logged_in_user: str = Field(description = "User updating the global configurations for package")

class AgentDefinitionModel(BaseModel):
    package_name: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of toolkit package")
    agent_or_tool_name: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of agent or tool", pattern = r"^[a-zA-Z0-9_]+$")
    description: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Short description of agent role")
    instruction: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Elaborated task list for the agent")
    llm_tag: Optional[str] = Field(description = "Unique name of LLM instance")
    itsm_tags: Optional[List] = Field(description = "One or more ITSM tags")
    # logged_in_user: str = Field(description = "User updating the agent definition")

class ToolkitPackageRequestModel(BaseModel):
    package_name: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of toolkit package")

# SSO client models
class SSOClientModel(BaseModel):
    client_id: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Client ID")
    realm_name: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Realm Name")
    sso_url: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1), AfterValidator(lambda v: v if v.startswith("https://") else exec('raise ValueError("Please enter a valid URL starting with https://")') )] = Field(description = "SSL certified HTTPS URL")
    client_secret: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Authentication for client")
    redirection_url: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Redirection URL for SSO client - URL of source/application")
    # logged_in_user: str = Field(description = "User updating the LLM")

class SSOClientDetailsRequestModel(BaseModel):
    client_id: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Client ID")
    realm_name: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Realm Name")

class SSOClientDeleteRequestModel(BaseModel):
    client_id: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Client ID")
    realm_name: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Realm Name")

# ITSM connector models
class ITSMConnectorModel(BaseModel):
    itsm_tag: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of ITSM connector")
    itsm_type: ITSMType = Field(description = "Type of ITSM connector")
    itsm_auth_type: ITSMAuthType = Field(description = "Type of authentication")
    # itsm_url: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "ITSM URL")
    itsm_url: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1), AfterValidator(lambda v: v if v.startswith("https://") else exec('raise ValueError("Please enter a valid URL starting with https://")') )] = Field(description="ITSM URL")
    itsm_user: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description  = "Username of ITSM service account")
    itsm_password: str = Field(description = "Password of ITSM service account")
    bearer_token: str = Field(description = "Bearer token for ITSM in absence of service account")
    itsm_additional_config: Dict[str, Any] = Field(description = "ITSM configuration JSON - dynamic per ITSM")
    # logged_in_user: str = Field(description = "User updating the LLM")

class ITSMConnectorDetailsRequestModel(BaseModel):
    itsm_tag: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of ITSM connector")

class ITSMConnectorDeleteRequestModel(BaseModel):
    itsm_tag: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of ITSM connector")

class ModuleConfigurationModel(BaseModel):
    module: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of Module")
    parameter: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Configuration parameter name")
    value: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "String form of value of configuration parameter")

class ModuleConfigurationsRequestModel(BaseModel):
    module: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of Module")
    parameter: Optional[str] = Field(description = "Configuration parameter name", default = None)

class ModuleConfigurationUpdateRequestModel(BaseModel):
    module: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of Module")
    parameter: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Configuration parameter name")
    value: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "String form of value of configuration parameter")

class ModuleConfigurationDeleteRequestModel(BaseModel):
    module: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Unique name of Module")
    parameter: Annotated[str, StringConstraints(strip_whitespace = True, min_length = 1)] = Field(description = "Configuration parameter name")

class FormUpdateRequestModel(BaseModel):
    name: FormType = Field(description = "Form type. Allowed values: Incident Form, Change Form, Problem Form")
    form: dict[str, Any] = Field(description = "Form definition in JSON format" )

class FormOnboardRequestModel(BaseModel):
    name: FormType = Field(description = "Form type. Allowed values: Incident Form, Change Form, Problem Form")
    form: dict[str, Any] = Field(description = "Form definition in JSON format" )