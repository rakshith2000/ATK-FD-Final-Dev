# Author - Viraj Purandare
# Created On - November 24, 2025

# Default packages
import os
import sys
import yaml

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
ROOT_PATH = SCRIPT_PATH.split("connectors")[0]
DB_SESSION_PATH = os.path.join(ROOT_PATH, "database")
MODULES_PATH = os.path.join(ROOT_PATH, "modules")

sys.path.append(ROOT_PATH)
sys.path.append(DB_SESSION_PATH)

# Custom packages
import core_crud
import db_session

class ITSMConnector:
    def __init__(self):
       self.connector = None

    # Onboard ITSM connector to database
    def insert_itsm_connector_details(self, itsm_connector_details):
        db_local_session = db_session.get_db()
        response = core_crud.insert_itsm_connector_details(db_local_session, itsm_connector_details)
        db_local_session.close()
        return response
    
    # Get ITSM connector list
    def list_itsm_connectors(self):
        db_local_session = db_session.get_db()
        response = core_crud.list_itsm_connectors(db_local_session)
        db_local_session.close()
        return response
    '''
    # Get ITSM connector list
    def list_itsm_connectors(self):
        itsm_tag_wise_data = {}

        for entry in os.scandir(MODULES_PATH):
            if entry.is_dir():
                module_name = entry.name
                pconf_path = os.path.join(entry.path, "config", "system_prompts.yaml")

                if not os.path.isfile(pconf_path):
                    continue

                with open(pconf_path, "r") as pconf:
                    package_config = yaml.safe_load(pconf.read())

                global_configs = package_config.get("package_configs", None)

                if global_configs:
                    itsm_tags = global_configs.get("itsm_tags", [])

                    for itsm_tag in itsm_tags:
                        if itsm_tag not in itsm_tag_wise_data:
                            itsm_tag_wise_data[itsm_tag] = []

                        itsm_tag_wise_data[itsm_tag].append(module_name)

        db_local_session = db_session.get_db()
        (status, itsm_details) = core_crud.list_itsm_connectors(db_local_session)
        db_local_session.close()

        itsm_details_list = []

        for itsm in itsm_details:
            clean_obj = {
                k: v for k, v in itsm.__dict__.items()
                if not k.startswith("_")
            }

            clean_obj["itsm_type"] = clean_obj["itsm_type"].value

            clean_obj["associated_modules"] = itsm_tag_wise_data.get(
                clean_obj.get("itsm_tag"),
                []
            )

            itsm_details_list.append(clean_obj)

        return (True, itsm_details_list)
    '''
    def get_itsm_connector_details(self, itsm_tag):
        db_local_session = db_session.get_db()
        response = core_crud.get_itsm_connector_details(db_local_session, itsm_tag)
        db_local_session.close()
        return response

    # Delete ITSM connector
    def delete_itsm_connector(self, itsm_connector_details):
        db_local_session = db_session.get_db()
        response = core_crud.delete_itsm_connector(db_local_session, itsm_connector_details)
        db_local_session.close()
        return response
