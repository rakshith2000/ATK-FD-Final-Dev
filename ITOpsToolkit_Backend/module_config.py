# Author - Viraj Purandare
# Created On - May 24, 2026

# Default packages
import os
import sys
import yaml
import datetime

# Global variables
SCRIPT_PATH = os.path.dirname(__file__)
DB_SESSION_PATH = os.path.join(SCRIPT_PATH, "database")
MODULES_PATH = os.path.join(SCRIPT_PATH, "modules")
sys.path.append(DB_SESSION_PATH)

TS_FORMAT = "%Y-%m-%d %H:%M:%S"

# Custom packages
import core_crud
import db_session

class ModuleConfig:
    def __init__(self):
       pass

    # Onboard module configuration
    def insert_module_configuration(self, module_config_details):
        db_local_session = db_session.get_db()
        response = core_crud.insert_module_configuration(db_local_session, module_config_details)
        db_local_session.close()
        return response

    # Retrieve module configurations
    def get_module_configurations(self, module, parameter = None):
        db_local_session = db_session.get_db()
        response = core_crud.get_module_configurations(db_local_session, module, parameter)
        db_local_session.close()
        return response

    # Update module configuration
    def update_module_configuration(self, module_config_details):
        db_local_session = db_session.get_db()
        response = core_crud.update_module_configuration(db_local_session, module_config_details)
        db_local_session.close()
        return response

    # Delete module configuration
    def delete_module_configuration(self, module_config_details):
        db_local_session = db_session.get_db()
        response = core_crud.delete_module_configuration(db_local_session, module_config_details)
        db_local_session.close()
        return response