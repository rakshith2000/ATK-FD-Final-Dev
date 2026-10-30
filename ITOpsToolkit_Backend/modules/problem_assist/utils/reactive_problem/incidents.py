# Author - Viraj Purandare
# Created On - May 22, 2024

import os
import datetime

import logging
import requests

import core_crud
import db_session
import system_config_pa as scf

from pro_logger import log_event, application_logger

SCRIPT_PATH = os.path.dirname(__file__)

class ServiceNowIncidents:
    def __init__(self):
        configs = scf.get_system_config()
        itsm_tags = configs.get("itsm_tags", [])

        db_local_session = db_session.get_db()
        itsm_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags[0])
        (status, poling_interval_config) = core_crud.get_module_configurations(db_local_session, "problem_assist", "POLING_INTERVALS_IN_MINUTES")
        db_local_session.close()

        self.itsm_url = itsm_details.itsm_url
        self.itsm_tag = itsm_tags[0]

        if self.itsm_url.endswith('/'):
            self.itsm_url = self.itsm_url[:-1]

        self.itsm_username = itsm_details.itsm_user
        self.itsm_password = itsm_details.itsm_password

        if status and poling_interval_config:
            self.poling_interval = str(poling_interval_config[0].value)
        else:
            self.poling_interval = "5"

        proxy_url = (itsm_details.itsm_additional_config or {}).get("proxy_url")

        if proxy_url:
            self.proxies = {
              "http"  : proxy_url,
              "https" : proxy_url
            }
        else:
            self.proxies = None

        self.headers = {'content-type': 'application/json'}

    # Fetch list of incidents
    def get_incidents_details(self, number = None, priority = None):
        incident_url = self.itsm_url + '/api/now/table/incident'

        incident_filters = {}

        if priority != None and number == None:
            incident_filters['sysparm_query'] = 'resolved_atRELATIVEGT@minute@ago@' + \
                                                self.poling_interval + \
                                                '^stateIN6' + '^priorityIN1,2'
            #print(incident_filters)
        elif number != None and priority == None:
            incident_filters['problem_id'] = number
        else:
            return []

        incident_filters['sysparm_fields'] = 'comments_and_work_notes,short_description,description,number,close_notes,sys_id,sys_created_on,resolved_at,priority,assignment_group,assigned_to'

        incident_filters['sysparm_display_value'] = 'true'
        # filters['sysparm_exclude_reference_link'] = 'true'

        if incident_filters != {}:
            incident_url += '?'

        for fl_nm, fl_val in incident_filters.items():
            incident_url += '&' + fl_nm + '=' + fl_val

        #print(incident_url)
        try:
            response = requests.get(incident_url, auth = (self.itsm_username, self.itsm_password), \
                    headers = self.headers, verify = False, proxies = self.proxies)
        except Exception as e:
            log_event(application_logger,
                      logging.ERROR,
                      f"Failed to fetch incidents: {str(e)}",
                      is_exception=True,
                      module_name="problem_assist",
                      component_type="itsm_request",
                      component_name="ServiceNowIncidents - get_incidents_details")
            return []

        #print(response.json())
        return response.json()['result']


