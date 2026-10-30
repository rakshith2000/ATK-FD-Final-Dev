# Author - Viraj Purandare
# Created On - September 30, 2025

# Default packages
import os
import sys
import time
import logging
import datetime
from dotenv import load_dotenv

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
DB_MODELS_PATH = os.path.join(SCRIPT_PATH, "database")
EMBEDDING_MODEL_PATH = os.path.join(SCRIPT_PATH, "embedding_model", "model")

sys.path.append(DB_MODELS_PATH)

vault_type_file = os.path.join(SCRIPT_PATH, "config", ".vault_type")
load_dotenv(vault_type_file)
VAULT_TYPE = os.getenv("VAULT_TYPE")

# Third party packages
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import func, desc, asc, cast, String, any_, or_, Float

# Custom packages
import db_models
from vault import Vault

from embedding_model.embedding_service import Embedder

from pro_logger import log_event, audit_logger, application_logger

# Administration
# Onboard LLM
def insert_llm_details(db_session, llm_details, cred_env):
    st_ts = datetime.datetime.now(datetime.UTC)

    llm_tag = llm_details["llm_tag"]

    if cred_env:
        vault_obj = Vault(VAULT_TYPE)
        (status, key) = vault_obj.insert_secret(f"{llm_tag}_{cred_env}_secret", {cred_env: llm_details["llm_config"][cred_env]})
        llm_details["llm_config"][cred_env] = f"@vault:{llm_tag}_{cred_env}_secret"

        # Application logging is taken care in vault code here. Hence, not re-logging.
        if not status:
            return (status, f"Incorrect configurations - One or more keys missing - {key}")

    new_llm = db_models.LLMInventory(
            llm_tag = llm_tag,
            llm_type = llm_details["llm_type"],
            llm_config = llm_details["llm_config"],
            updated_by = llm_details["logged_in_user"],
            updated_at = datetime.datetime.now(datetime.timezone.utc)
            )

    try:
        db_session.add(new_llm)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"LLM {llm_tag} onboarded.",
                  user_id = llm_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "LLM onboarded successfully.")
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LLM onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_llm_details")

        return (False, f"LLM onboarding failed - {str(e)}")

# List all LLMs
def list_llms(db_session):
    try:
        response = db_session.query(db_models.LLMInventory.llm_tag, db_models.LLMInventory.llm_type, db_models.LLMInventory.updated_by).all()
        return (True, response)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LLM listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - list_llms")
        return (False, f"LLM listing failed - {str(e)}")

# Retrieve LLM details filtered by LLM tag
def get_llm_details(db_session, llm_tag):
    try:
        response = db_session.query(db_models.LLMInventory).filter(db_models.LLMInventory.llm_tag == llm_tag).first()
        return (True, response)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LLM details retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_llm_details")

        return (False, f"LLM details retrieval failed - {str(e)}")

# Retrieve details for all llms
def get_all_llm_details(db_session):
    try:
        response = db_session.query(db_models.LLMInventory).all()
        return (True, response)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LLM details bulk retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_llm_details")

        return (False, f"Bulk LLM details bulk retrieval failed - {str(e)}")

# Retrieve LLM details filtered by LLM tag with secrets
def get_llm_details_with_creds(db_session, llm_tag):
    try:
        response = db_session.query(db_models.LLMInventory).filter(db_models.LLMInventory.llm_tag == llm_tag).first()

        cred_env = None
        for key, val in response.llm_config.items():
            if val.startswith("@vault"):
                cred_env = key
                break

        if cred_env:
            # Retrieve secret from vault
            vault_obj = Vault(VAULT_TYPE)
            (status, value) = vault_obj.read_secret(f"{llm_tag}_{cred_env}_secret")

            # Application logging is taken care in vault code here. Hence, not re-logging.
            if not status:
                return

            response.llm_config[cred_env] = value[1]
            
        return response
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LLM details retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_llm_details_with_creds")

        return

# Delete LLM
def delete_llm(db_session, llm_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        llm_tag = llm_details["llm_tag"]
        llm_to_be_deleted = db_session.query(db_models.LLMInventory).filter(db_models.LLMInventory.llm_tag == llm_tag).first()

        cred_env = None

        for key, val in llm_to_be_deleted.llm_config.items():
            if val.startswith("@vault"):
                cred_env = key
                break

        if cred_env:
            vault_obj = Vault(VAULT_TYPE)
            (status, key) = vault_obj.delete_secret(f"{llm_tag}_{cred_env}_secret")

            if not status:
                # Application logging is taken care in vault code here. Hence, not re-logging.
                return (status, key)

            cred_env = None

        if not llm_to_be_deleted:
            return (True, f"LLM {llm_tag} not found.")
        else:
            db_session.delete(llm_to_be_deleted)
            db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"LLM {llm_tag} deleted.",
                  user_id = llm_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "LLM deleted successfully.")
    except Exception as e:
        db_session.rollback()
        
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LLM deletion failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - delete_llm")

        return (False, f"LLM deletion failed - {str(e)}")

# Onboard LiteLLM proxy details
def insert_litellm_proxy_details(db_session, llm_proxy_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    vault_obj = Vault(VAULT_TYPE)
    (status, key) = vault_obj.insert_secret(f"llm_proxy_secret", {"llm_proxy": llm_proxy_details["proxy_key"]})

    if not status:
        # Application logging is taken care in vault code here. Hence, not re-logging.
        return (status, key)

    llm_proxy = db_models.LiteLLMProxy(
            proxy_base_url = llm_proxy_details["proxy_base_url"],
            proxy_key = f"@vault:llm_proxy_secret",
            updated_by = llm_proxy_details["logged_in_user"],
            updated_at = datetime.datetime.now(datetime.timezone.utc)
            )

    try:
        db_session.add(llm_proxy)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"LiteLLM proxy onboarded.",
                  user_id = llm_proxy_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "LiteLLM proxy onboarded successfully.")
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LiteLLM proxy onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_litellm_proxy_details")

        return (False, f"LiteLLM proxy onboarding failed - {str(e)}")

# Get LiteLLM proxy details
def get_litellm_proxy_details(db_session):
    try:
        response = db_session.query(db_models.LiteLLMProxy).first()
        return (True, response)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LiteLLM proxy details retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_litellm_proxy_details")

        return (False, f"LiteLLM proxy details retrieval failed - {str(e)}")

# Get LiteLLM proxy details with secrets
def get_litellm_proxy_details_with_creds(db_session):
    try:
        response = db_session.query(db_models.LiteLLMProxy).first()

        # Retrieve secret from vault
        vault_obj = Vault(VAULT_TYPE)
        (status, value) = vault_obj.read_secret(f"llm_proxy_secret")

        # Application logging is taken care in vault code here. Hence, not re-logging.
        if not status:
            return

        response.proxy_key = value[1]
        return response
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LiteLLM proxy details retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_litellm_proxy_details_with_creds")

        return

# Delete LiteLLM proxy
def delete_litellm_proxy(db_session, llm_proxy_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        vault_obj = Vault(VAULT_TYPE)
        (status, key) = vault_obj.delete_secret(f"llm_proxy_secret")

        if not status:
            # Application logging is taken care in vault code here. Hence, not re-logging.
            return (status, key)

        llm_proxy_to_be_deleted = db_session.query(db_models.LiteLLMProxy)

        if not llm_proxy_to_be_deleted:
            return (True, "LiteLLM proxy not found.")
        else:
            llm_proxy_to_be_deleted.delete()
            db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"LiteLLM proxy deleted successfully.",
                  user_id = llm_proxy_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "LiteLLM proxy deleted successfully.")
    except Exception as e:
        db_session.rollback()
        
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LiteLLM proxy deletion failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - delete_litellm_proxy")

        return (False, f"LiteLLM proxy deletion failed - {str(e)}")

# Report LLM usage details
def insert_llm_usage_details(db_session, llm_usage_details):
    llm_usage_entry = db_models.LLMUsage(
            timestamp = datetime.datetime.now(datetime.timezone.utc),
            user = llm_usage_details["logged_in_user"],
            module = llm_usage_details["module"],
            agent = llm_usage_details["agent"],
            llm_tag = llm_usage_details["llm_tag"],
            prompt_tokens = llm_usage_details["prompt_tokens"],
            cache_tokens = llm_usage_details["cache_tokens"],
            internal_processing_and_output_tokens = llm_usage_details["internal_processing_and_output_tokens"],
            total_tokens = llm_usage_details["total_tokens"]
            )

    try:
        db_session.add(llm_usage_entry)
        db_session.commit()

        return (True, "LLM usage reported successfully.")
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"LLM usage reporting failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_llm_usage_details")

        return (False, f"LLM usage reporting failed - {str(e)}")

# Onboard SSO client
def insert_sso_client_details(db_session, sso_client_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    client_id = sso_client_details["client_id"]
    realm_name = sso_client_details["realm_name"]
    client_secret =  sso_client_details["client_secret"]

    vault_obj = Vault(VAULT_TYPE)
    (status, key) = vault_obj.insert_secret(f"{realm_name}_{client_id}_secret", {client_id: client_secret})

    if not status:
        # Application logging is taken care in vault code here. Hence, not re-logging.
        return (status, key)

    new_sso_client = db_models.SSOClientInventory(
            client_id = client_id,
            realm_name = realm_name,
            sso_url = sso_client_details["sso_url"],
            client_secret = f"@vault:{realm_name}_{client_id}_secret",
            redirection_url = sso_client_details["redirection_url"],
            updated_by = sso_client_details["logged_in_user"],
            updated_at = datetime.datetime.now(datetime.timezone.utc)
            )

    try:
        db_session.add(new_sso_client)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"SSO client {client_id} onboarded in realm {realm_name}.",
                  user_id = sso_client_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "SSO client onboarded successfully.")
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                   f"SSO client onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_sso_client_details")

        return (False, f"SSO client onboarding failed - {str(e)}")

# List all SSO clients
def list_sso_clients(db_session):
    try:
        response = db_session.query(db_models.SSOClientInventory.client_id, db_models.SSOClientInventory.realm_name, db_models.SSOClientInventory.updated_by).all()
        return (True, response)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"SSO clients listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - list_sso_clients")

        return (False, f"SSO clients listing failed - {str(e)}")

# Retrieve SSO client configuration filtered by client ID and realm name
def get_sso_client_details(db_session, client_id, realm_name):
    try:
        response = db_session.query(db_models.SSOClientInventory).filter(db_models.SSOClientInventory.client_id == client_id,
                                                                     db_models.SSOClientInventory.realm_name == realm_name).first()
        return (True, response)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"SSO client details retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_sso_client_details")
        return (False, f"SSO client details retrieval failed - {str(e)}")

# Retrieve SSO client configuration filtered by client ID and realm name with secrets
def get_sso_client_details_with_creds(db_session, client_id, realm_name):
    try:
        response = db_session.query(db_models.SSOClientInventory).filter(db_models.SSOClientInventory.client_id == client_id,
                                                                         db_models.SSOClientInventory.realm_name == realm_name).first()

        # Retrieve secret from vault
        vault_obj = Vault(VAULT_TYPE)
        (status, value) = vault_obj.read_secret(f"{realm_name}_{client_id}_secret")

        # Application logging is taken care in vault code here. Hence, not re-logging.
        if not status:
            return

        response.client_secret = value[1]
        return response
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"SSO client details retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_sso_client_details_with_creds")

        return

# Delete SSO client
def delete_sso_client(db_session, sso_client_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        client_id = sso_client_details["client_id"]
        realm_name = sso_client_details["realm_name"]

        vault_obj = Vault(VAULT_TYPE)
        (status, key) = vault_obj.delete_secret(f"{realm_name}_{client_id}_secret")

        if not status:
            # Application logging is taken care in vault code here. Hence, not re-logging.
            return (status, key)

        sso_client_to_be_deleted = db_session.query(db_models.SSOClientInventory).filter(db_models.SSOClientInventory.client_id == client_id,
                                                                                         db_models.SSOClientInventory.realm_name == realm_name).first()

        if not sso_client_to_be_deleted:
            return (True, f"SSO client with client ID {client_id} and realm {realm_name} not found.")
        else:
            db_session.delete(sso_client_to_be_deleted)
            db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"SSO client {client_id} deleted in realm {realm_name}.",
                  user_id = sso_client_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "SSO client deleted successfully.")
    except Exception as e:
        db_session.rollback()
        
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"SSO client deletion failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - delete_sso_client")

        return (False, f"SSO client deletion failed - {str(e)}")

# Onboard ITSM connector details
def insert_itsm_connector_details(db_session, itsm_connector_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    itsm_tag = itsm_connector_details["itsm_tag"]
    itsm_user = itsm_connector_details["itsm_user"]
    itsm_password = itsm_connector_details["itsm_password"]

    vault_obj = Vault(VAULT_TYPE)
    (status, key) = vault_obj.insert_secret(f"{itsm_tag}_secret", {itsm_user: itsm_password})

    # Application logging is taken care in vault code here. Hence, not re-logging.
    if not status:
        return (status, key)

    new_itsm_connector = db_models.ITSMConnectorInventory(
            itsm_tag = itsm_tag,
            itsm_type = itsm_connector_details["itsm_type"],
            itsm_auth_type = itsm_connector_details["itsm_auth_type"],
            itsm_url = itsm_connector_details["itsm_url"],
            itsm_user = itsm_user,
            itsm_password = f"@vault:{itsm_tag}_secret",
            bearer_token = itsm_connector_details["bearer_token"],
            itsm_additional_config = itsm_connector_details["itsm_additional_config"],
            updated_by = itsm_connector_details["logged_in_user"],
            updated_at = datetime.datetime.now(datetime.timezone.utc)
            )

    try:
        db_session.add(new_itsm_connector)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"ITSM connector {itsm_tag} onboarded.",
                  user_id = itsm_connector_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "ITSM connector onboarded successfully.")
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"ITSM connector onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_itsm_connector_details")

        return (False, f"ITSM connector onboarding failed - {str(e)}")

# List all ITSM connectors
def list_itsm_connectors(db_session):
    try:
        response = db_session.query(db_models.ITSMConnectorInventory.itsm_tag, db_models.ITSMConnectorInventory.itsm_type, db_models.ITSMConnectorInventory.updated_by).all()
        return (True, response)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"ITSM connectors listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - list_itsm_connectors")
        return (False, f"ITSM connectors listing failed - {str(e)}")

# Retrieve ITSM connector configuration filtered by ITSM tag
def get_itsm_connector_details(db_session, itsm_tag):
    try:
        response = db_session.query(db_models.ITSMConnectorInventory).filter(db_models.ITSMConnectorInventory.itsm_tag == itsm_tag).first()
        return (True, response)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"ITSM connector details retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_itsm_connector_details")

        return (False, f"ITSM connector details retrieval failed - {str(e)}")

# Retrieve ITSM connector configuration with secrets filtered by ITSM tag
def get_itsm_connector_details_with_creds(db_session, itsm_tag):
    try:
        response = db_session.query(db_models.ITSMConnectorInventory).filter(db_models.ITSMConnectorInventory.itsm_tag == itsm_tag).first()
        
        # Retrieve secret from vault
        vault_obj = Vault(VAULT_TYPE)
        (status, value) = vault_obj.read_secret(f"{itsm_tag}_secret")
   
        # Application logging is taken care in vault code here. Hence, not re-logging.
        if not status:
            return

        response.itsm_user = value[0]
        response.itsm_password = value[1]
        return response
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"ITSM connector details retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_itsm_connector_details_with_details")

        return

# Delete ITSM connector
def delete_itsm_connector(db_session, itsm_connector_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        itsm_tag = itsm_connector_details["itsm_tag"]

        vault_obj = Vault(VAULT_TYPE)
        (status, key) = vault_obj.delete_secret(f"{itsm_tag}_secret")

        if not status:
            # Application logging is taken care in vault code here. Hence, not re-logging.
            return (status, key)

        itsm_connector_to_be_deleted = db_session.query(db_models.ITSMConnectorInventory).filter(db_models.ITSMConnectorInventory.itsm_tag == itsm_tag).first()

        if not itsm_connector_to_be_deleted:
            return (True, f"ITSM connector {itsm_tag} not found.")
        else:
            db_session.delete(itsm_connector_to_be_deleted)
            db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"ITSM connector {itsm_tag} deleted.",
                  user_id = itsm_connector_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "ITSM connector deleted successfully.")
    except Exception as e:
        db_session.rollback()
        
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"ITSM connector deletion failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - delete_itsm_connector")

        return (False, f"ITSM connector deletion failed - {str(e)}")

# Onboard module configurations
def insert_module_configuration(db_session, module_config_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    module = module_config_details["module"]
    parameter = module_config_details["parameter"]
    value = module_config_details["value"]

    try:
        new_module_config = db_models.ModuleConfigurationInventory(
            module = module,
            parameter = parameter,
            value = value
        )

        db_session.add(new_module_config)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Accessed - Success - {parameter} configured for {module} successfully.",
                  user_id = module_config_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "Module configuration onboarded successfully.")
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Module configuration onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_module_configuration")

        return (False, f"Module configuration onboarding failed - {str(e)}")

# Retrieve module configurations
def get_module_configurations(db_session, module, parameter = None):
    try:
        # Parameter is optional
        conditions = [db_models.ModuleConfigurationInventory.module == module]
        if parameter:
            conditions.append(db_models.ModuleConfigurationInventory.parameter == parameter)

        response = db_session.query(db_models.ModuleConfigurationInventory).filter(*conditions).all()

        return (True, response)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Module configurations retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_module_configurations")

        return (False, f"Module configurations retrieval failed - {str(e)}")

# Update module configurations
def update_module_configuration(db_session, module_config_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        module = module_config_details["module"]
        parameter = module_config_details["parameter"]
        new_value = module_config_details["value"]

        module_config_to_be_updated = db_session.query(db_models.ModuleConfigurationInventory)\
            .filter(db_models.ModuleConfigurationInventory.module == module)\
            .filter(db_models.ModuleConfigurationInventory.parameter == parameter).first()

        if not module_config_to_be_updated:
            return (False, f"{parameter} not found in {module}.")

        module_config_to_be_updated.value = new_value
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Configuration for {parameter} from {module} updated successfully.",
                  user_id = module_config_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "Module configuration updated successfully.")
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Module configuration update failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - update_module_configuration")

        return (False, f"Module configuration update failed - {str(e)}")

# Delete module configureations
def delete_module_configuration(db_session, module_config_details):
    st_ts = datetime.datetime.now(datetime.UTC)
    try:
        module = module_config_details["module"]
        parameter = module_config_details["parameter"]

        module_config_to_be_deleted = db_session.query(db_models.ModuleConfigurationInventory)\
            .filter(db_models.ModuleConfigurationInventory.module == module)\
            .filter(db_models.ModuleConfigurationInventory.parameter == parameter)

        module_config_to_be_deleted.delete()
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"{parameter} from {module} deleted successfully.",
                  user_id = module_config_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "Module configuration deleted successfully.")
    except Exception as e:
        db_session.rollback()
        
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Module configuration deletion failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - delete_module_configuration")

        return (False, f"Module configuration deletion failed - {str(e)}")  


# Problem Assist
# Get problem tickets filtered by approval status
def get_problem_tickets(db_session, status = "all"):
    try:
        query = db_session.query(db_models.ProblemTicketDetailsInventory)

        if status.lower() != "all":
            query = query.filter(db_models.ProblemTicketDetailsInventory.approval_status == status)

        data = query.all()
        return (True, data)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Problem ticket retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - get_problem_tickets")
        
        return (False , f"Problem ticket retrieval failed - {str(e)}")

# Update problem ticket details filtered by ticket ID
def update_problem_ticket(db_session, id, update_dict = {}):
    try:
        db_session.query(db_models.ProblemTicketDetailsInventory).filter(db_models.ProblemTicketDetailsInventory.id == id).update(update_dict)
        db_session.commit()
        
        return (True, "Problem Ticket details updated successfully.")
    except Exception as e:
        db_session.rollback()
        
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Problem ticket update failed - {str(e)}",
                  is_exception = True,
                  module_name = "administration",
                  component_type = "db_operations",
                  component_name = "core_crud - update_problem_ticket")
        
        return (False, f"Problem ticket update failed - {str(e)}")
     
# Insert proactively generated problem tickets
def insert_problem_tickets(db_session, problem_list):
    try:
        objects = [
            db_models.ProblemTicketDetailsInventory(
                short_description=p["short_description"],
                description=p["description"][:1000],
                associated_incidents=p["associated_incidents"],
                approval_status="recommended",
            )
            for p in problem_list
        ]
        db_session.add_all(objects)
        db_session.commit()

        return (True, len(objects))
    except Exception as e:
        db_session.rollback()

        log_event(application_logger,
                  logging.ERROR,
                  f"Problem ticket insert failed - {str(e)}",
                  is_exception = True,
                  module_name = "problem_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_problem_tickets")

        return (False, f"Problem ticket insert failed - {str(e)}")
    
    
# Common across Knowledge Assist and Train Assist
# List knowledge articles filtered by numbers
def list_knowledge_articles(db_session, numbers, module_name):
    try:
        results = (
            db_session.query(
                db_models.KnowledgeArticleInventory.content,
                db_models.KnowledgeArticleInventory.kb_metadata["number"].astext.label("number")
                )
            .filter(
                db_models.KnowledgeArticleInventory.kb_metadata["number"].astext.in_(numbers)
                )
            .all()
            )

        content = {}
        for row in results:
            content[row.number] = row.content

        return (True, content)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Knowledge articles retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = module_name,
                  component_type = "db_operations",
                  component_name = "core_crud - list_knowledge_articles")

        return (False, f"Knowledge articles retrieval failed - {str(e)}")
    
# List knowledge articles filtered score (score can be none)
def list_knowledge_articles_by_score(db_session, rating, param, limit, module_name):
    try:
        conditions = []
        rating_column = cast(
            func.nullif(
                db_models.KnowledgeArticleInventory.kb_metadata["rating"].astext,
                ""
            ),
            Float
        )

        if rating is None or (isinstance(rating, str) and rating.strip() == ""):
            conditions.append(rating_column.is_(None))

        else:
            value = float(rating)

            comparisons = {
                "gte": rating_column >= value,
                "lte": rating_column <= value,
                "eq": rating_column == value,
                "gt": rating_column > value,
                "lt": rating_column < value,
            }

            if param not in comparisons:
                return (False, f"Invalid comparison parameter - {param}")

            conditions.append(comparisons[param])

        results = (
            db_session.query(
                db_models.KnowledgeArticleInventory.kb_metadata["number"].astext.label("number"),
                db_models.KnowledgeArticleInventory.content,
                db_models.KnowledgeArticleInventory.kb_metadata["rating"].label("rating")
            )
            .filter(*conditions)
            .limit(limit)
            .all()
        )

        return (True, results)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Knowledge articles retrieval by score failed - {str(e)}",
                  is_exception = True,
                  module_name = module_name,
                  component_type = "db_operations",
                  component_name = "core_crud - list_knowledge_articles_by_score")

        return (False, f"Knowledge articles retrieval by score failed - {str(e)}")

# Insert Knowledge Article scores
def insert_kb_scores(db_session, kb_details):
    try:
        kb_article = db_models.KnowledgeArticleScoreInventory(
            kb_number = kb_details["kb_number"],
            score_details = kb_details["score_details"],
            average_score = kb_details["average_score"]
        )

        db_session.add(kb_article)
        db_session.commit()

        return (True, "Knowledge article scores inserted successfully.")

    except Exception as e:
        db_session.rollback()

        log_event(
            application_logger,
            logging.ERROR,
            f"KB scores insertion failed - {str(e)}",
            is_exception = True,
            module_name = "knowledge_assist",
            component_type = "db_operations",
            component_name = "core_crud - insert_kb_scores"
        )

        return (False, f"Knowledge article scores insertion failed - {str(e)}")

# Retrieve KB scores by KB number
def list_article_scores(db_session, kb_number = None):
    conditions = []

    if kb_number:
        conditions.append(db_models.KnowledgeArticleScoreInventory.kb_number == kb_number)
    else:
        conditions.append(db_models.KnowledgeArticleScoreInventory.kb_number.isnot(None))
    try:
        response = (
            db_session.query(db_models.KnowledgeArticleScoreInventory.score_details,
                             db_models.KnowledgeArticleScoreInventory.average_score,
                             db_models.KnowledgeArticleScoreInventory.kb_number)
            .filter(*conditions)
            .all()
        )
        return (True, response)

    except Exception as e:
        log_event(
            application_logger,
            logging.ERROR,
            f"KB scores retrieval failed - {str(e)}",
            is_exception = True,
            module_name = "knowledge_assist",
            component_type = "db_operations",
            component_name = "core_crud - get_kb_scores"
        )

        return (False, f"KB scores retrieval failed - {str(e)}")
    
# Update KB scores by KB number
def update_kb_scores(db_session, number, score):
    try:
        kb_article = db_session.query(db_models.KnowledgeArticleInventory).filter(db_models.KnowledgeArticleInventory.kb_metadata["number"].astext == number).first()

        if not kb_article:
            return (False, f"Knowledge article with KB number {number} not found.")

        metadata = dict(kb_article.kb_metadata or {})
        metadata["rating"] = str(score)

        kb_article.kb_metadata = metadata
        db_session.commit()

        return (True, "Knowledge article scores updated successfully.")

    except Exception as e:
        db_session.rollback()

        log_event(
            application_logger,
            logging.ERROR,
            f"KB scores update failed - {str(e)}",
            is_exception = True,
            module_name = "knowledge_assist",
            component_type = "db_operations",
            component_name = "core_crud - update_kb_scores"
        )

        return (False, f"Knowledge article scores update failed - {str(e)}")

# Update KB score details inventory record by KB number
def update_article_scores(db_session, kb_details):
    try:
        kb_article = db_session.query(db_models.KnowledgeArticleScoreInventory).filter(
            db_models.KnowledgeArticleScoreInventory.kb_number == kb_details["kb_number"]
        ).first()

        if not kb_article:
            return (False, f"Knowledge article scores with KB number {kb_details['kb_number']} not found.")

        kb_article.score_details = kb_details["score_details"]
        kb_article.average_score = kb_details["average_score"]
        db_session.commit()

        return (True, "Knowledge article scores updated successfully.")

    except Exception as e:
        db_session.rollback()

        log_event(
            application_logger,
            logging.ERROR,
            f"KB score details update failed - {str(e)}",
            is_exception = True,
            module_name = "knowledge_assist",
            component_type = "db_operations",
            component_name = "core_crud - update_article_scores"
        )

        return (False, f"Knowledge article score details update failed - {str(e)}")


# Train Assist
# Onboard quiz details
def insert_quiz_details(db_session, quiz_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    quiz_code = str(int(time.time() * 1000))
    quiz_list = quiz_details["quiz_list"]

    try:
        quiz_objects = [
                db_models.Quiz(
                    quiz_code = quiz_code,
                    kb_number = q.get("kb_number"),
                    quiz = q.get("quiz"),
                    user_id = quiz_details["logged_in_user"]
                    )
                for q in quiz_list
                ]

        db_session.add_all(quiz_objects)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Quiz {quiz_code} onboarded successfully.",
                  user_id = quiz_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, quiz_code)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  str(e),
                  is_exception = True,
                  module_name = "train_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_quiz_details")

        return (False, f"Quiz onboarding failed - {str(e)}")

# Retrieve quiz details filtered by quiz code/user ID/quiz status
# Please note that user ID is mandatory for retrieving any data with NON-NULL quiz status (attempted by user)
# It is made optional for the fact of retrieval of quiz not attempted by any user
def get_quiz_details(db_session, quiz_code = None, user_id = None, quiz_status = None, columns = None):
    try:
        qc_condition = None if not quiz_code else db_models.Quiz.quiz_code == quiz_code
        ui_condition = None if not user_id else db_models.Quiz.user_id == user_id

        conditions = []

        if user_id:
            conditions.append(ui_condition)
            
        if quiz_code:
            conditions.append(qc_condition)

        # Special conditions
        if quiz_status:
            if quiz_status == "pending":
                conditions.append(db_models.Quiz.score.is_(None))
            elif quiz_status == "completed":
                conditions.append(db_models.Quiz.score >= 0)

        if columns:
            cols = [getattr(db_models.Quiz, col) for col in columns]
            result = db_session.query(*cols).filter(*conditions).all()
        else:
            result = db_session.query(db_models.Quiz).filter(*conditions).all()

        return (True, result)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Quiz retrieval details failed - {str(e)}",
                  is_exception = True,
                  module_name = "train_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - get_quiz_details")

        return (False, f"Quiz retrieval details failed - {str(e)}")

# Retrieve quiz description
def get_quiz_description(db_session, numbers):
    try:
        results = (
            db_session.query(
                db_models.KnowledgeArticleInventory.kb_metadata["number"].astext.label("number"),
                db_models.KnowledgeArticleInventory.kb_metadata["title"].astext.label("title"),
                db_models.KnowledgeArticleInventory.kb_metadata["kb_knowledge_base"].astext.label("kb_knowledge_base"),
                db_models.KnowledgeArticleInventory.kb_metadata["kb_category"].astext.label("kb_category")
                )
            .filter(
                db_models.KnowledgeArticleInventory.kb_metadata["number"].astext.in_(numbers)
                )
            .all()
            )

        quiz_description = {"description": "", "category": "", "sub_category": ""}
        for result in results:
            quiz_description["description"] += f"{result.number} - {result.title}\n"
            quiz_description["category"] = result.kb_knowledge_base
            quiz_description["sub_category"] = result.kb_category

        quiz_description["description"] = quiz_description["description"].strip()

        return (True, quiz_description)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Quiz description retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "train_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - get_quiz_description")

        return (False, f"Quiz description retrieval failed - {str(e)}")

# Update quiz details
def update_quiz_details(db_session, quiz_details, updates = {}):
    st_ts = datetime.datetime.now(datetime.UTC)

    quiz_code = quiz_details.get("quiz_code")
    quiz_id = quiz_details.get("quiz_id")
    user_id = quiz_details.get("user_id")

    conditions = [db_models.Quiz.quiz_code == quiz_code]

    if user_id:
        conditions.append(db_models.Quiz.user_id == user_id)

    if quiz_id:
        conditions.append(db_models.Quiz.id == quiz_id)

    try:
        results = db_session.query(db_models.Quiz).filter(*conditions).all()

        if not results:
            return (False, f"Quiz {quiz_code} not found.")

        for result in results:
            for key, value in updates.items():
                if hasattr(result, key):
                    setattr(result, key, value)
                    db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Quiz {quiz_code} updated successfully",
                  user_id = quiz_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "Quiz updated successfully.")
    except Exception as e:
        db_session.rollback()
        
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  str(e),
                  is_exception = True,
                  module_name = "train_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - update_quiz_details")

        return (False, f"Unable to update quiz - {str(e)}")

# Insert quiz summary details
def insert_quiz_summary_details(db_session, quiz_summary_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    quiz_summary = quiz_summary_details["quiz_summary"]
    
    try:
        quiz_summary_objects = [
                db_models.QuizSummary(
                    quiz_code = q.get("quiz_code"),
                    user_id = q.get("user_id"),
                    summary = q.get("summary")
                    )
                for q in quiz_summary
                ]

        quiz_code = quiz_summary[0].get("quiz_code")

        db_session.add_all(quiz_summary_objects)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Quiz summary for quiz {quiz_code} onboarded successfully",
                  user_id = quiz_summary_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "Quiz summary onboarded successfully.")
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Quiz summary onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "train_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_quiz_summary_details")

        return (False, f"Quiz summary onboarding failed - {str(e)}")

# Onboard quiz summary details filtered by quiz code and user ID
def get_quiz_summary_details(db_session, quiz_code, user_id, columns = None):
    try:
        conditions = (
            db_models.QuizSummary.quiz_code == quiz_code,
            db_models.QuizSummary.user_id == user_id
            )

        if columns:
            cols = [getattr(db_models.QuizSummary, col) for col in columns]
            result = db_session.query(*cols).filter(*conditions).all()
        else:
            result = db_session.query(db_models.QuizSummary).filter(*conditions).all()

        return (True, result)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Quiz summary retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "train_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - get_quiz_summary_details")

        return (False, f"Quiz summary retrieval failed - {str(e)}")


# Knowledge Assist
# Retrieve knowledge articles filtered by user roles
def list_articles_by_roles(db_session, roles):
    try:
        # Fetch the row based on the roles (roles is a list and saved in database as array)
        results = (db_session.query(
            db_models.KnowledgeArticleInventory)
            .filter(
                db_models.KnowledgeArticleInventory.kb_metadata["roles"].op("?|")(cast(roles, ARRAY(String)))
                )
            .all()
        )

        return (True, [
                {k: v for k, v in row.__dict__.items() if not k.startswith('_')}
                for row in results
            ])
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Knowledge articles listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "knowledge_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - list_articles_by_roles")

        return (False, f"Knowledge article listing failed - {str(e)}")

# Retrieve knowledge articles by vector similarity (cosine distance), filtered by user roles
def list_articles_by_similarity(db_session, query, limit = 3):
    (status, similarity_threshold) = get_module_configurations(db_session, "knowledge_assist", "RELATED_ARTICLE_THRESHOLD")
    if status and similarity_threshold:
        threshold_val = similarity_threshold[0].value
        if isinstance(threshold_val, list):
            threshold_val = threshold_val[0]
        similarity_threshold = float(threshold_val)
    else:
        similarity_threshold = 0.5

    query_embedding = "" 
    
    # Import embedder for query embedding to be passed for vector search
    em_obj = Embedder(EMBEDDING_MODEL_PATH)
    em_obj.download_if_not_present()
    (status, query_embedding) = em_obj.embed(query)

    if not status:
        return (status, query_embedding)

    try:
        similarity = func.cosine_distance(
            db_models.KnowledgeArticleInventory.embedding,
            cast(query_embedding, Vector)
        )
        
        # Lower is the cosine similarity score, higher is the similarity
        results = (
            db_session.query(
                db_models.KnowledgeArticleInventory.content,
                db_models.KnowledgeArticleInventory.kb_metadata,
                similarity.label("similarity")
            )
            .filter(similarity <= similarity_threshold)
            .order_by(similarity.asc())
            .limit(3)
            .all()
        )

        return (True, [row._asdict() for row in results])
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Similar knowledge articles listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "knowledge_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - list_articles_by_similarity")

        return (False, f"Similar knowledge articles listing failed - {str(e)}")


# Meeting Assist
# List all meetings attended by user or required to be available to the group 
def list_meetings_by_participant_or_group(db_session, participant_email = None, group_names = None):
    conditions = []

    # Filter all meetings attended by user
    if participant_email:
        conditions.append(
            participant_email == any_(db_models.MeetingInventory.participants) 
        )

    # Filter all meetings belonging to groups to which user belongs
    if group_names:
        for g in group_names.split("|"):
            g = g.strip()
            if not g:
                continue

            conditions.extend([
                db_models.MeetingInventory.groups == g,
                db_models.MeetingInventory.groups.like(f"{g}|%"),
                db_models.MeetingInventory.groups.like(f"%|{g}"),
                db_models.MeetingInventory.groups.like(f"%|{g}|%"),
            ])

    if not conditions:
        return (True, [])

    try:
        db_meetings = db_session.query(db_models.MeetingInventory).filter(or_(*conditions)).order_by(desc(db_models.MeetingInventory.started_at)).all()
        return (True, db_meetings)
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting list retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - list_meetings_by_participant_or_group")

        return (False, f"Meeting list retrieval failed - {str(e)}")

# Get the details of specific meeting
def get_meeting_details(db_session, meeting_id):
    try:
        return (True, db_session.query(db_models.MeetingInventory).filter(db_models.MeetingInventory.id == meeting_id).first())
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - get_meeting_details")

        return (False, f"Meeting retrieval failed - {str(e)}")

# Onboard meeting
def insert_meeting_details(db_session, meeting_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    meeting = meeting_details["meeting"]
    auth_required = True

    try:
        db_meeting = db_models.MeetingInventory(
            title = meeting.title,
            web_meeting_url = meeting.web_meeting_url,
            auth_required = auth_required,
            groups = meeting.groups
        )

        db_session.add(db_meeting)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Meeting {db_meeting.id} onboarded successfully.",
                  user_id = meeting_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, db_meeting)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_meeting_details")

        return (False, f"Meeting onboarding failed - {str(e)}")

# Update meeting details
def update_meeting_details(db_session, meeting_id, meeting_update_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    (status, db_meeting) = get_meeting_details(db_session, meeting_id)

    if not status:
        return (status, db_meeting)

    if not db_meeting:
        return (False, "Meeting not found.")

    update_data = meeting_update_details["meeting_update"]

    try:
        for field, value in update_data.items():
            setattr(db_meeting, field, value)

        db_session.commit()
        db_session.refresh(db_meeting)
        
        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Meeting {db_meeting.id} updated successfully.",
                  user_id = meeting_update_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())
        
        return (True, db_meeting)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting update failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - update_meeting_details")

        return (False, f"Meeting update failed - {str(e)}")

# Delete meeting
def delete_meeting_by_meeting_id(db_session, meeting_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    meeting_id = meeting_details["meeting_id"]
    (status, db_meeting) = get_meeting_details(db_session, meeting_id)
    if not status:
        return (status, db_meeting)

    if not db_meeting:
        return (False, "Meeting not found.")

    try:
        db_session.delete(db_meeting)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Meeting {db_meeting.id} deleted successfully.",
                  user_id = meeting_details["logged_in_user"],
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, "Meeting deleted succesfully.")
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting deletion failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - delete_meeting")

        return (False, f"Meeting deletion failed - {str(e)}")

# List participants
def list_meeting_participants(db_session, meeting_id):
    try:
        (status, db_meeting) = get_meeting_details(db_session, meeting_id)
        if not status:
            return (False, db_meeting)

        return (True, db_meeting.participants)
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting participants listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - list_meeting_participants")

        return (False, f"Meeting participants listing failed - {str(e)}")

# update groups
def update_groups(db_session, group_update, meeting_id):
    (status, db_meeting) = get_meeting_details(db_session, meeting_id)
    if not status:
        db_session.close()
        return (status, db_meeting)
    
    setattr(db_meeting, "groups", group_update.groups)

    db_session.commit()
    db_session.refresh(db_meeting)
    return (True, db_meeting)

# Onboard authentication session for meeting - Public flow
def insert_meeting_auth_session_public(db_session, meeting_id, auth_code):
    try:
        db_auth = db_models.MeetingAuthSessionPublic(
            meeting_id = meeting_id,
            auth_url = f"https://microsoft.com/devicelogin",
            auth_code = auth_code,
            client_id = "demo-client-id"
        )
        db_session.add(db_auth)
        db_session.commit()
        db_session.refresh(db_auth)

        # Audit log is intentionally excluded for security reasons.

        return (True, db_auth)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Azure App authentication with public flow failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_meeting_auth_session_public")

        return (False, f"Azure App authentication with public flow failed - {str(e)}")

# Retrieve authentication session for meeting - Public flow
def get_meeting_auth_session_public(db_session, meeting_id):
    try:
        return (True, db_session.query(db_models.MeetingAuthSessionPublic).filter(db_models.MeetingAuthSessionPublic.meeting_id == meeting_id).first())
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Auth session retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - get_meeting_auth_session_public")

        return (False, f"Auth session retrieval failed - {str(e)}")

# Update authentication session for meeting - Public flow
def update_meeting_auth_session_public_tokens(db_session, meeting_id, access_token, refresh_token, expires_in):
    (status, db_auth) = get_meeting_auth_session_public(db_session, meeting_id)
    if not status:
        return (status, db_auth)

    if not db_auth:
        return (False, "Azure App public auth session to be updated not found.")

    try:
        db_auth.access_token = access_token
        db_auth.refresh_token = refresh_token
        db_auth.expires_in = expires_in

        db_session.commit()
        db_session.refresh(db_auth)

        # Audit log is intentionally excluded for security reasons.

        return (True, db_auth)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Azure App public auth session update failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - update_meeting_auth_session_public_tokens")

        return (False, f"Azure App public auth session update failed - {str(e)}")

# Delete authentication session for meeting - Public flow
def delete_meeting_auth_session_public(db_session, meeting_id):
    (status, db_auth) = get_meeting_auth_session_public(db_session, meeting_id)
    if not status:
        return (status, db_auth)

    if not db_auth:
        return (False, "Azure App public auth session to be updated not found.")

    try:
        db_session.delete(db_auth)
        db_session.commit()
        return (True, "Azure App public auth session deleted successfully.")

    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Azure App public auth session deletion failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - delete_meeting_auth_session_public")

        return (False, f"Azure App public auth session deletion failed - {str(e)}")

# Onboard meeting transcript tagged to meeting ID
def insert_meeting_transcript_details(db_session, transcript):
    st_ts = datetime.datetime.now(datetime.UTC)
    transcript_data = transcript if isinstance(transcript, dict) else transcript.dict()

    try:
        db_transcript = db_models.MeetingTranscriptInventory(
            id = transcript_data.get("id"),
            meeting_id = transcript_data.get("meeting_id"),
            content = "\n".join(transcript_data.get("content")),
            transcript_timestamp = transcript_data.get("transcript_timestamp")
        )
        db_session.add(db_transcript)
        db_session.commit()
        
        en_ts = datetime.datetime.now(datetime.UTC)

        log_event(audit_logger,
                  logging.INFO,
                  f"Meeting transcript onboarded for meeting {db_transcript.meeting_id} successfully.",
                  user_id = "system",
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())
        
        return (True, db_transcript)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting transcript onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_meeting_transcript_details")

        return (False, f"Meeting transcript onboarding failed - {str(e)}")

# Retrieve all meeting transcripts filtered by meeting ID 
def list_meeting_transcripts_by_meeting_id(db_session, meeting_id):
    try:
        return (True, db_session.query(db_models.MeetingTranscriptInventory).filter(
                db_models.MeetingTranscriptInventory.meeting_id == meeting_id
                ).order_by(asc(db_models.MeetingTranscriptInventory.transcript_timestamp)).all())
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting transcripts listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - list_meeting_transcripts_by_meeting_id")

        return (False, f"Meeting transcripts listing failed - {str(e)}")

# Retrieve all meeting transcripts filtered by meeting link ID (group meeting)
def list_meeting_transcripts_by_meeting_link_id(db_session, meeting_link_id):
    try:
        return (True, db_session.query(db_models.MeetingTranscriptInventory).filter(
                db_models.MeetingTranscriptInventory.meeting_link_id == meeting_link_id
                ).order_by(asc(db_models.MeetingTranscriptInventory.transcript_timestamp)).all())
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting transcripts listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - list_meeting_transcripts_by_meeting_link_id")

        return (False, f"Meeting transcripts listing failed - {str(e)}")

# List all meeting transcripts filtered by multiple meeting IDs
# Intentionally created to handle group meeting scenario 
def list_meeting_transcripts_by_meeting_ids(db_session, meeting_ids):
    try:
        return (True, db_session.query(db_models.MeetingTranscriptInventory)
                .filter(db_models.MeetingTranscriptInventory.meeting_id.in_(meeting_ids))
                .order_by(asc(db_models.MeetingTranscriptInventory.transcript_timestamp))
                .all()                      
            ) 
    
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Multiple meeting transcript listing failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - list_meeting_transcripts_by_meeting_id")
        return (False, f"Multiple meeting transcript listing failed - {str(e)}")

# Onboard meeting summary tagged to meeting ID
def insert_meeting_summary_details(db_session, summary):
    st_ts = datetime.datetime.now(datetime.UTC)
    summary_data = summary if isinstance(summary, dict) else summary.dict()

    try:
        db_summary = db_models.MeetingSummaryInventory(
            meeting_id = summary_data.get("meeting_id"),
            title = summary_data.get("title"),
            content = summary_data.get("content")
        )

        db_session.add(db_summary)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Meeting summary onboarded for meeting {db_summary.meeting_id} successfully.",
                  user_id = "system",
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, db_summary)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting summary onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_meeting_summary_details")

        return (False, f"Meeting summary onboarding failed - {str(e)}")

# Retrieve meeting summary filtered by meeting ID
def get_meeting_summary(db_session, meeting_id):
    try:
        return (True, db_session.query(db_models.MeetingSummaryInventory).filter(db_models.MeetingSummaryInventory.meeting_id == meeting_id).first())
    except Exception as e:
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting summary retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - get_meeting_summary")

        return (False, f"Meeting summary retrieval failed - {str(e)}")
    
# Delete meeting summary by meeting ID
def delete_meeting_summary(db_session, meeting_id):
    try:
        summary = db_session.query(db_models.MeetingSummaryInventory).filter(db_models.MeetingSummaryInventory.meeting_id == meeting_id).first()

        if summary:
            db_session.delete(summary)
            db_session.commit()
            return (True, f"Meeting summary deleted for meeting {meeting_id} successfully.")
        else:
            return (False, "Meeting summary not found.")
        
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting summary deletion failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - delete_meeting_summary")

        return (False, f"Meeting summary deletion failed - {str(e)}")

# Onboard meeting article details tagged to meeting ID
def insert_meeting_article_details(db_session, article):
    st_ts = datetime.datetime.now(datetime.UTC)

    article_data = article if isinstance(article, dict) else article.dict()

    try:
        db_article = db_models.MeetingArticleInventory(
            meeting_id = article_data.get("meeting_id"),
            title = article_data.get("title"),
            content = article_data.get("content")
        )
        db_session.add(db_article)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Meeting article onboarded for meeting {db_article.meeting_id} successfully.",
                  user_id = "system",
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, db_article)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting articles onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_meeting_article_details")

        return (False, f"Meeting articles onboarding failed - {str(e)}")
    
# Retrieve meeting article filtered by meeting ID
def list_meeting_articles_by_meeting_id(db_session, meeting_id):
    try:
        return (True, db_session.query(db_models.MeetingArticleInventory).filter(db_models.MeetingArticleInventory.meeting_id == meeting_id, db_models.MeetingArticleInventory.archived == False).all())
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Meeting articles listing failed- {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - get_meeting_article")

        return (False, f"Meeting articles listing failed - {str(e)}")

# Retrieve archive meeting articles by meeting ID
def list_archived_meeting_articles_by_meeting_id(db_session, meeting_id):
    try:
        return (True, db_session.query(db_models.MeetingArticleInventory).filter(db_models.MeetingArticleInventory.meeting_id == meeting_id, db_models.MeetingArticleInventory.archived == True).all())
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Archived meeting articles listing for meeting {meeting_id} failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - list_archived_meeting_articles_by_meeting_id")

        return (False, f"Archived meeting articles listing failed")
    
# Retrieve archive meeting articles by meeting_link_id (group meeting)
def list_archived_meeting_articles_by_meeting_link_id(db_session, meeting_link_id):
    try:
        return (True, db_session.query(db_models.MeetingArticleInventory).filter(db_models.MeetingArticleInventory.meeting_link_id == meeting_link_id, db_models.MeetingArticleInventory.archived == True).all())
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"Archived meeting articles listing for group {meeting_link_id} failed - {str(e)}",
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - list_archived_meeting_articles_by_meeting_link_id")

        return (False, f"Archived group meeting articles listing failed - {str(e)}")

# Update meeting article filtered by meeting and article ID
def update_meeting_article(db_session, article_id, article_update):
    st_ts = datetime.datetime.now(datetime.UTC)

    db_article = db_session.query(db_models.MeetingArticleInventory).filter(db_models.MeetingArticleInventory.id == article_id).first()
    if not db_article:
        return (False, "Meeting article to be updated not found.")

    try:
        for field, value in article_update.items():
            setattr(db_article, field, value)

        db_session.commit()
        db_session.refresh(db_article)

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"Meeting article '{db_article.title}' for meeting {db_article.meeting_id} updated successfully.",
                  user_id = "system",
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, db_article)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  str(e),
                  is_exception = True,
                  module_name = "meeting_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - update_meeting_article")

        return (False, f"Update meeting article failed- {str(e)}")
    
# MIM Assist
# insert mim details
def insert_mim_details(db_session, mim_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        
        db_mim = db_models.MIMInventory(
            incident_number = mim_details.get("incident_number"),
            meeting_details = mim_details.get("meeting_details"),
            incident_details = mim_details.get("incident_details"),
            ticket_state = mim_details.get("ticket_state"),
            invitees = mim_details.get("invitees")
        )
        db_session.add(db_mim)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(audit_logger,
                  logging.INFO,
                  f"MIM details onboarded for incident {db_mim.incident_number} successfully.",
                  user_id = "system",
                  api = "",
                  api_method = "",
                  response_code = -1,
                  exec_duration_in_sec = (en_ts - st_ts).total_seconds())

        return (True, db_mim)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"MIM details onboarding failed - {str(e)}",
                  is_exception = True,
                  module_name = "mim_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - insert_mim_details")

        return (False, f"MIM details onboarding failed - {str(e)}")

# update mim details
def update_mim_details(db_session, incident_number, mim_update_details):
    (status, db_mim) = get_mim_details_by_incident_number(db_session, incident_number)
    if not status:
        return (status, db_mim)

    if not db_mim:
        return (False, "MIM details to be updated not found.")

    try:
        for field, value in mim_update_details.items():
            setattr(db_mim, field, value)

        db_session.commit()
        db_session.refresh(db_mim)
        
        return (True, db_mim)
    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"MIM details update failed - {str(e)}",
                  is_exception = True,
                  module_name = "mim_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - update_mim_details")

        return (False, f"MIM details update failed - {str(e)}")
    
# get mim details by incident number
def get_mim_details_by_incident_number(db_session, incident_number):
    try:
        return (True, db_session.query(db_models.MIMInventory).filter(db_models.MIMInventory.incident_number == incident_number).first())
    except Exception as e:
        # Application logging
        log_event(application_logger,
                  logging.ERROR,
                  f"MIM details retrieval failed - {str(e)}",
                  is_exception = True,
                  module_name = "mim_assist",
                  component_type = "db_operations",
                  component_name = "core_crud - get_mim_details_by_incident_number")

        return (False, f"MIM details retrieval failed - {str(e)}")
    
# Form Data

def onboard_form(db_session, form_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        form_inventory = db_models.FormInventory(
            name = form_details["name"],
            form = form_details["form"]
        )

        db_session.add(form_inventory)
        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(
            audit_logger,
            logging.INFO,
            f"Form {form_details['name']} created successfully.",
            user_id = form_details["logged_in_user"],
            api = "",
            api_method = "",
            response_code = -1,
            exec_duration_in_sec = (en_ts - st_ts).total_seconds()
        )

        return (True, "Form created successfully.")

    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(
            application_logger,
            logging.ERROR,
            f"Form creation failed - {str(e)}",
            is_exception = True,
            module_name = "administration",
            component_type = "db_operations",
            component_name = "core_crud - insert_form_inventory"
        )

        return (False, f"Form creation failed - {str(e)}")

def get_form_by_name(db_session, name):
    try:
        form_inventory = (
            db_session.query(db_models.FormInventory)
            .filter(db_models.FormInventory.name == name)
            .first()
        )

        if not form_inventory:
            return (False, f"Form {name} not found.")

        return (
            True,
            {
                "form": form_inventory.form
            }
        )

    except Exception as e:

        log_event(
            application_logger,
            logging.ERROR,
            f"Form retrieval failed - {str(e)}",
            is_exception=True,
            module_name="administration",
            component_type="db_operations",
            component_name="core_crud - get_form_inventory_by_name"
        )

        return (False, f"Form retrieval failed - {str(e)}")
    
def update_form_inventory(db_session, form_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        name = form_details["name"]

        form_inventory = (
            db_session.query(db_models.FormInventory)
            .filter(db_models.FormInventory.name == name)
            .first()
        )

        if not form_inventory:
            return (False, f"Form {name} not found.")

        form_inventory.form = form_details["form"]

        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(
            audit_logger,
            logging.INFO,
            f"Form {name} updated successfully.",
            user_id = form_details["logged_in_user"],
            api = "",
            api_method = "",
            response_code = -1,
            exec_duration_in_sec = (en_ts - st_ts).total_seconds()
        )

        return (True, "Form updated successfully.")

    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(
            application_logger,
            logging.ERROR,
            f"Form update failed - {str(e)}",
            is_exception = True,
            module_name = "administration",
            component_type = "db_operations",
            component_name = "core_crud - update_form_inventory"
        )

        return (False, f"Form update failed - {str(e)}")

def delete_form(db_session, form_details):
    st_ts = datetime.datetime.now(datetime.UTC)

    try:
        name = form_details["name"]

        form_inventory = (
            db_session.query(db_models.FormInventory)
            .filter(db_models.FormInventory.name == name)
        )

        deleted_count = form_inventory.delete()

        if deleted_count == 0:
            return (False, f"Form {name} not found.")

        db_session.commit()

        en_ts = datetime.datetime.now(datetime.UTC)

        # Audit logging
        log_event(
            audit_logger,
            logging.INFO,
            f"Form {name} deleted successfully.",
            user_id = form_details["logged_in_user"],
            api = "",
            api_method = "",
            response_code = -1,
            exec_duration_in_sec = (en_ts - st_ts).total_seconds()
        )

        return (True, "Form deleted successfully.")

    except Exception as e:
        db_session.rollback()

        # Application logging
        log_event(
            application_logger,
            logging.ERROR,
            f"Form deletion failed - {str(e)}",
            is_exception = True,
            module_name = "administration",
            component_type = "db_operations",
            component_name = "core_crud - delete_form_inventory"
        )

        return (False, f"Form deletion failed - {str(e)}")