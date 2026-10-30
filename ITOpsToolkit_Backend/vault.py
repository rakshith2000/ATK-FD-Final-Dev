# Author - Viraj Purandare
# Created On - Feb 26, 2026

# Default Packages
import os
import json
import shutil
import logging

from pathlib import Path
from dotenv import load_dotenv

# Third party packages
import boto3

from azure.keyvault.secrets import SecretClient
from azure.identity import ClientSecretCredential

from google.cloud import secretmanager

import hvac

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)

# Custom packages
from pro_logger import log_event, application_logger

class Vault:
    def __init__(self, vault_type):
        self.vault_type = vault_type
        self.env_file = os.path.join(SCRIPT_PATH, "config", ".vault_env")
        
    # Upload .vault_env file and .vault_type file
    def upload_vault_config(self, vault_env_file):
        try:
            with open(self.env_file, "wb") as buffer:
                shutil.copyfileobj(vault_env_file.file, buffer)

            rconf_path = os.path.join(SCRIPT_PATH, "config", ".vault_type")
            with open(rconf_path, "w+") as rconf:
                rconf.write(f"VAULT_TYPE={self.vault_type}")

            return (True, "Vault configurations uploaded successfully.")
        except Exception as e:
            # Application logging 
            log_str = f"Vault environment file upload failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - upload_vault_env_file")

            return (False, log_str)

    # Obtain secret value from vault
    def read_secret(self, key):
        if self.vault_type == "AWS":
            (status, value) = self.read_secret_from_aws(key)
        elif self.vault_type == "Azure":
            (status, value) = self.read_secret_from_azure(key)
        elif self.vault_type == "Google":
            (status, value) = self.read_secret_from_google(key)
        elif self.vault_type == "Hashicorp":
            (status, value) = self.read_secret_from_hashicorp(key)
        else:
            status = False
            value = f"Vault of type {self.vault_type} is not supported."
            value += "\nSupported vaults - AWS, Azure, Google, Hashicorp"

        return (status, value)

    # Insert secret to vault
    def insert_secret(self, key, value):
        if self.vault_type == "AWS":
            (status, key) = self.insert_secret_to_aws(key, value)
        elif self.vault_type == "Azure":
            (status, key) = self.insert_secret_to_azure(key, value)
        elif self.vault_type == "Google":
            (status, key) = self.insert_secret_to_google(key, value)
        elif self.vault_type == "Hashicorp":
            (status, key) = self.insert_secret_to_hashicorp(key, value)
        else:
            status = False
            key = f"Vault of type {self.vault_type} is not supported."
            key += "\nSupported vaults - AWS, Azure, Google, Hashicorp"

        return (status, key)

    # Obtain secret value from vault
    def delete_secret(self, key):
        if self.vault_type == "AWS":
            (status, value) = self.delete_secret_from_aws(key)
        elif self.vault_type == "Azure":
            (status, value) = self.delete_secret_from_azure(key)
        elif self.vault_type == "Google":
            (status, value) = self.delete_secret_from_google(key)
        elif self.vault_type == "Hashicorp":
            (status, value) = self.delete_secret_from_hashicorp(key)
        else:
            status = False
            value = f"Vault of type {self.vault_type} is not supported."
            value += "\nSupported vaults - AWS, Azure, Google, Hashicorp"

        return (status, value)

    # Obtain secret value from AWS vault
    def read_secret_from_aws(self, key):
        try:
            env_path = Path(self.env_file)
            load_dotenv(dotenv_path = env_path)
        except Exception as e:
            # Application logging
            log_str = f"Secret retrieval failed from vault - Unable to connect to AWS secret manager - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - read_secret_from_aws")
            
            return (False, log_str)

        try:
            session = boto3.session.Session()
            client = session.client(service_name = 'secretsmanager', region_name = os.getenv("AWS_REGION"))

            response = client.get_secret_value(SecretId = key)

            json_response = json.loads(response["SecretString"])
            data = (list(json_response.keys())[0], list(json_response.values())[0])

            return (True, data)
        except Exception as e:
            # Application logging
            log_str = f"Retrieval of secret {key} from vault failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - read_secret_from_aws")

            return (False, log_str)

    # Insert secret to AWS vault
    def insert_secret_to_aws(self, key, value):
        try:
            env_path = Path(self.env_file)
            load_dotenv(dotenv_path = env_path)
        except Exception as e:
            # Application logging
            log_str = "Insertion of secret to vault failed - Unable to connect to AWS secret manager - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - insert_secret_to_aws")

            return (False, log_str)

        try:
            session = boto3.session.Session()
            client = session.client(service_name = 'secretsmanager', region_name = os.getenv("AWS_REGION"))

            response = client.create_secret(Name = key, SecretString = json.dumps(value))

            if response["ARN"]:
                return (True, f"Secret {key} inserted to vault successfully.")
            else:
                log_str = f"Insertion of secret {key} to vault failed - {response.content}"
                log_event(application_logger,
                          logging.ERROR,
                          log_str,
                          module_name = "administration",
                          component_type = "vault_operations",
                          component_name = "vault - insert_secret_to_aws")

                return (False, log_str)
        except Exception as e:
            # Application logging
            log_str = f"Insertion of secret {key} to vault failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - insert_secret_to_aws")

            return (False, log_str)

    # Delete secret from AWS vault
    def delete_secret_from_aws(self, key):
        try:
            env_path = Path(self.env_file)
            load_dotenv(dotenv_path = env_path)
        except Exception as e:
            # Application logging
            log_str = "Secret deletion from vault failed - Unable to connect to AWS secret manager - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - delete_secret_from_aws")

            return (False, log_str)

        try:
            session = boto3.session.Session()
            client = session.client(service_name = 'secretsmanager', region_name = os.getenv("AWS_REGION"))

            response = client.delete_secret(SecretId = key, ForceDeleteWithoutRecovery = True)

            return (True, f"Secret {key} deleted from vault successfully.")
        except Exception as e:
            # Application logging
            log_str = f"Deletion of secret {key} failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - delete_secret_from_azure")

            return (False, log_str)

    # Obtain secret value from Azure vault
    def read_secret_from_azure(self, key):
        # Azure vault doesn't support underscore in secret names
        key = key.replace("_", "-")     
        try:
            env_path = Path(self.env_file)
            load_dotenv(dotenv_path = env_path)
        except Exception as e:
            # Application logging
            log_str = f"Secret retrieval failed from vault - Unable to connect to Azure key vault - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - read_secret_from_azure")

            return (False, log_str)

        try:
            client_id = os.environ["AZURE_CLIENT_ID"]
            client_secret = os.environ["AZURE_CLIENT_SECRET"]
            tenant_id = os.environ["AZURE_TENANT_ID"]
            key_vault_name = os.environ["KEY_VAULT_NAME"]

            kv_uri = f"https://{key_vault_name}.vault.azure.net"

            credential = ClientSecretCredential(
                    tenant_id = tenant_id,
                    client_id = client_id,
                    client_secret = client_secret
                    )

            client = SecretClient(vault_url = kv_uri, credential = credential)
            data = client.get_secret(key)
            
            return (True, tuple(data.split(":")))
        except Exception as e:
            # Application logging
            log_str =  f"Retrieval of secret {key} from vault failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - read_secret_from_azure")

            return (False, log_str)

    # Insert secret to Azure vault
    def insert_secret_to_azure(self, key, value):
        # Azure vault doesn't support underscore in secret names
        key = key.replace("_", "-")     
        try:
            env_path = Path(self.env_file)
            load_dotenv(dotenv_path = env_path)
        except Exception as e:
            # Application logging
            log_str = f"Insertion of secret to vault failed - Unable to connect to Azure key vault - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - insert_secret_to_azure")

            return (False, log_str)

        try:
            client_id = os.environ["AZURE_CLIENT_ID"]
            client_secret = os.environ["AZURE_CLIENT_SECRET"]
            tenant_id = os.environ["AZURE_TENANT_ID"]
            key_vault_name = os.environ["KEY_VAULT_NAME"]

            kv_uri = f"https://{key_vault_name}.vault.azure.net"

            credential = ClientSecretCredential(
                    tenant_id = tenant_id,
                    client_id = client_id,
                    client_secret = client_secret
                    )

            client = SecretClient(vault_url = kv_uri, credential = credential)
            value = f"{list(value.keys())[0]}:{list(value.values())[0]}"
            response = client.set_secret(key, value)

            return (True, f"Secret {key} inserted from vault successfully.")
        except Exception as e:
            # Application logging
            log_str = f"Insertion of secret {key} to vault failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - insert_secret_to_azure")

            return (False, log_str)

    # Delete secret from Azure vault
    def delete_secret_from_azure(self, key):
        # Azure vault doesn't support underscore in secret names
        key = key.replace("_", "-")     
        try:
            env_path = Path(self.env_file)
            load_dotenv(dotenv_path = env_path)
        except Exception as e:
            # Application logging
            log_str = f"Secret deletion from vault failed - Unable to connect to Azure key vault - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - delete_secret_from_azure")

            return (False, log_str)

        try:
            client_id = os.environ["AZURE_CLIENT_ID"]
            client_secret = os.environ["AZURE_CLIENT_SECRET"]
            tenant_id = os.environ["AZURE_TENANT_ID"]
            key_vault_name = os.environ["KEY_VAULT_NAME"]

            kv_uri = f"https://{key_vault_name}.vault.azure.net"

            credential = ClientSecretCredential(
                    tenant_id = tenant_id,
                    client_id = client_id,
                    client_secret = client_secret
                    )

            client = SecretClient(vault_url = kv_uri, credential = credential)
            response = client.purge_deleted_secret(key)

            return (True, f"Secret {key} deleted from vault successfully.")
        except Exception as e:
            # Application logging
            log_str = f"Deletion of secret {key} failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - delete_secret_from_azure")

            return (False, log_str)

    # Obtain secret value from Google vault
    def read_secret_from_google(self, key):
        try:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self.env_file

            with open(self.env_file, "r", encoding = "utf-8") as env_file_ptr:
                conn_config = env_file_ptr.read()

            conn_config = json.loads(conn_config)
        except Exception as e:
            # Application logging
            log_str = f"Secret retrieval failed from vault - Unable to connect to Google secret manager - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - read_secret_from_google")

            return (False, log_str)

        try:
            client = secretmanager.SecretManagerServiceClient()

            project_id = conn_config["project_id"]
            try:
                [secret_id, version_id] = key.split(":")
            except Exception:
                secret_id = key
                version_id = "latest"

            name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"

            response = client.access_secret_version(request={"name": name})
            data = response.payload.data.decode("UTF-8")

            return (True, tuple(data.split(":")))
        except Exception as e:
            # Application logging
            log_str =  f"Retrieval of secret {key} from vault failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - read_secret_from_google")

            return (False, log_str)

    # Insert secret to Google vault
    def insert_secret_to_google(self, key, value):
        try:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self.env_file

            with open(self.env_file, "r", encoding = "utf-8") as env_file_ptr:
                conn_config = env_file_ptr.read()

            conn_config = json.loads(conn_config)
        except Exception as e:
            # Application logging
            log_str = f"Insertion of secret to vault failed - Unable to connect to Google secret manager - Missing connection details {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - insert_secret_to_google")

            return (False, log_str)

        try:
            client = secretmanager.SecretManagerServiceClient()

            project_id = conn_config["project_id"]
            parent = f"projects/{project_id}"

            replication_policy = {"automatic": {}}

            client.create_secret(
                    request = {
                        "parent": parent,
                        "secret_id": key,
                        "secret": {"replication": replication_policy},
                        } 
                    )

            secret_name = f"projects/{project_id}/secrets/{key}"
            value = f"{list(value.keys())[0]}:{list(value.values())[0]}"
            payload_bytes = value.encode("UTF-8")

            response = client.add_secret_version(
                request={
                    "parent": secret_name,
                    "payload": {"data": payload_bytes},
                }
            )

            if response.name:
                return (True, f"Secret {key} inserted to vault successfully.")
            else:
                # Application logging
                log_str = f"Insertion of secret {key} to vault failed - {response.content}"
                log_event(application_logger,
                          logging.ERROR,
                          log_str,
                          module_name = "administration",
                          component_type = "vault_operations",
                          component_name = "vault - insert_secret_to_google")

                return (False, log_str)
        except Exception as e:
            # Application logging
            log_str = f"Insertion of secret {key} to vault failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - insert_secret_to_google")

            return (False, log_str)

    # Delete secret from Google vault
    def delete_secret_from_google(self, key):
        try:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self.env_file

            with open(self.env_file, "r", encoding = "utf-8") as env_file_ptr:
                conn_config = env_file_ptr.read()

            conn_config = json.loads(conn_config)
        except Exception as e:
            # Application logging
            log_str = f"Secret deletion from vault failed - Unable to connect to Google secret manager - Missing connection details {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - delete_secret_from_google")

            return (False, log_str)

        try:
            client = secretmanager.SecretManagerServiceClient()

            project_id = conn_config["project_id"]
            try:
                [secret_id, version_id] = key.split(":")
            except Exception:
                secret_id = key
                version_id = "latest"

            name = f"projects/{project_id}/secrets/{secret_id}"

            response = client.delete_secret(request={"name": name})

            return (True, f"Secret {key} deleted from vault successfully.")
        except Exception as e:
            # Application logging
            log_str = f"Deletion of secret {key} failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - delete_secret_from_google")

            return (False, log_str)

    # Obtain secret value from Hashicorp vault
    def read_secret_from_hashicorp(self, key):
        try:
            env_path = Path(self.env_file)
            load_dotenv(dotenv_path = env_path)
        except Exception as e:
            # Application logging
            log_str = f"Retrieval of secret from vault failed - Unable to connect to Hashicorp vault - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - read_secret_from_hashicorp")

            return (False, log_str)

        try:
            engine = os.environ.get("ENGINE", "secret")

            client = hvac.Client(url = os.environ.get("VAULT_URL"),
                                 token = os.environ.get("VAULT_TOKEN"),
                                 verify = False)

            secret = client.secrets.kv.read_secret_version(mount_point = engine, path = key)
            data = list(secret["data"]["data"].keys())[0], list(secret["data"]["data"].values())[0]

            return (True, data)
        except Exception as e:
            # Application logging
            log_str =  f"Retrieval of secret {key} from vault failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - read_secret_from_hashicorp")

            return (False, log_str)

    # Insert secret to Hashicorp vault
    def insert_secret_to_hashicorp(self, key, value):
        try:
            env_path = Path(self.env_file)
            load_dotenv(dotenv_path = env_path)
        except Exception as e:
            # Application logging
            log_str = f"Insertion of secret to vault failed - Unable to connect to Hashicorp vault - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - insert_secret_to_hashicorp")

        try:
            engine = os.environ.get("ENGINE", "secret")

            client = hvac.Client(url = os.environ.get("VAULT_URL"),
                                 token = os.environ.get("VAULT_TOKEN"),
                                 verify = False)

            response = client.secrets.kv.v2.create_or_update_secret(mount_point = engine, path = key, secret = value)
            
            return (True, f"Secret {key} inserted to vault successfully.")
        except Exception as e:
            # Application logging
            log_str = f"Insertion of secret {key} to vault failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - insert_secret_to_hashicorp")

            return (False, log_str)

    # Delete secret from Hashicorp vault
    def delete_secret_from_hashicorp(self, key):
        try:
            env_path = Path(self.env_file)
            load_dotenv(dotenv_path = env_path)
        except Exception as e:
            # Application logging
            log_str = f"Secret deletion from vault failed - Unable to connect to Hashicorp vault - Missing connection details - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - delete_secret_from_hashicorp")

        try:
            engine = os.environ.get("ENGINE", "secret")

            client = hvac.Client(url = os.environ.get("VAULT_URL"),
                                 token = os.environ.get("VAULT_TOKEN"),
                                 verify = False)

            response = client.secrets.kv.v2.delete_metadata_and_all_versions(mount_point = engine, path = key)

            return (True, f"Secret {key} deleted from vault successfully.")
        except Exception as e:
            # Application logging
            log_str = f"Deletion of secret {key} failed - {str(e)}"
            log_event(application_logger,
                      logging.ERROR,
                      log_str,
                      module_name = "administration",
                      component_type = "vault_operations",
                      component_name = "vault - delete_secret_from_hashicorp")

            return (False, log_str)

# v = Vault("Azure")
# print(v.insert_secret("Test2", {"Test": "Value"}))
# print(v.read_secret("Test2"))
# print(v.delete_secret("Test2"))
