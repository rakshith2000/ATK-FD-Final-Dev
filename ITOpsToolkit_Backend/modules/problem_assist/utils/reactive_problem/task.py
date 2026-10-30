# Author - Viraj Purandare
# Created On - May 22, 2024

import os
import datetime

import logging
import json
import requests

import core_crud
import db_session
import system_config_pa as scf

from pro_logger import log_event, application_logger

SCRIPT_PATH = os.path.dirname(__file__)

class ServiceNowTasks:
    def __init__(self):
        configs = scf.get_system_config()
        itsm_tags = configs.get("itsm_tags", [])

        db_local_session = db_session.get_db()
        itsm_details = core_crud.get_itsm_connector_details_with_creds(db_local_session, itsm_tags[0])
        db_local_session.close()

        self.itsm_url = itsm_details.itsm_url
        self.itsm_tag = itsm_tags[0]

        if self.itsm_url.endswith('/'):
            self.itsm_url = self.itsm_url[:-1]

        self.itsm_username = itsm_details.itsm_user
        self.itsm_password = itsm_details.itsm_password

        proxy_url = (itsm_details.itsm_additional_config or {}).get("proxy_url")

        if proxy_url:
            self.proxies = {
              "http"  : proxy_url,
              "https" : proxy_url
            }
        else:
            self.proxies = None

        self.headers = {'content-type': 'application/json'}

    # Fetch list of tasks
    def get_task_details(self, number = None):
        task_url = self.itsm_url + '/api/now/table/problem_task?sysparm_query=problem='

        task_filters = {}

        if number == None:
            return []
        else:
            task_url += number

        task_filters['sysparm_fields'] = 'comments_and_work_notes,short_description,description,number,state'

        task_filters['sysparm_display_value'] = 'true'
        # filters['sysparm_exclude_reference_link'] = 'true'

        for fl_nm, fl_val in task_filters.items():
            task_url += '&' + fl_nm + '=' + fl_val

        try:
            response = requests.get(task_url, auth = (self.itsm_username, self.itsm_password), \
                    headers = self.headers, verify = False, proxies = self.proxies)
        except Exception as e:
            log_event(application_logger,
                      logging.ERROR,
                      f"Failed to fetch task details: {str(e)}",
                      is_exception=True,
                      module_name="problem_assist",
                      component_type="itsm_request",
                      component_name="ServiceNowTasks - get_task_details")
            return []

        return response.json()['result']

    #create task
    def create_task(self, short_description = "", number = "", description = "", assignment_group = "", priority= "",assigned_to= "", cmdb_ci = "", due_date = "", work_notes = ""):
        task_url = self.itsm_url + '/api/now/table/problem_task?problem_id='

        #print(due_date)
        payload = {}

        if short_description == "":
            payload['short_description'] = 'Root cause analysis creation'
            payload['problem'] = number
            payload['description'] = ''
            payload['assignment_group'] = assignment_group
            payload['priority'] = '3 - Moderate'
            payload['assigned_to'] = assigned_to

        else:
            payload['problem'] = number
            payload['short_description'] = short_description
            payload['work_notes'] = work_notes
            payload['description'] = description
            payload['assignment_group'] = assignment_group
            payload['cmdb_ci'] = cmdb_ci
            payload['due_date'] = due_date


        #print(payload)
        try:
            response = requests.post(task_url, auth = (self.itsm_username, self.itsm_password), \
                    data = json.dumps(payload), headers = self.headers, verify = False, proxies = self.proxies)
            output = {'number': response.json()['result']['number']}
            output['target_link'] = self.itsm_url + '/api/now/table/problem_task?problem_id=' + response.json()['result']['sys_id']
        except Exception as e:
            log_event(application_logger,
                      logging.ERROR,
                      f"Failed to create task for problem {number}: {str(e)}",
                      is_exception=True,
                      module_name="problem_assist",
                      component_type="itsm_request",
                      component_name="ServiceNowTasks - create_task")
            output = {}

        #print(output)
        return output

    #Fetch Assignment group links
    def get_assignment_grp(self):
        grp_url = self.itsm_url + '/api/now/table/sys_user_group?sysparm_fields=name'

        try:
            response = requests.get(grp_url, auth = (self.itsm_username, self.itsm_password), \
                    headers = self.headers, verify = False, proxies = self.proxies)
        except Exception as e:
            log_event(application_logger,
                      logging.ERROR,
                      f"Failed to fetch assignment groups: {str(e)}",
                      is_exception=True,
                      module_name="problem_assist",
                      component_type="itsm_request",
                      component_name="ServiceNowTasks - get_assignment_grp")
            return []

        a_grp = ''
        group = response.json()
        for grp in group['result']:
            if a_grp:
                a_grp += '\n' + grp['name']
            else:
                a_grp = grp['name']

        return a_grp
